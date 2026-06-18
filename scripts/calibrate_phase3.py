#!/usr/bin/env python3
"""Phase 3 キャリブレーションスクリプト（設計書 §13.5.4 Phase3 Steps 2〜4）。

【目的】
  400 件のラベル済みデータ（特徴量 JSONL）から:
    1. ロジスティック回帰で shouldPenalize を予測する確率スコア P(penalize) を学習
    2. FNR（誤検知率：genuine を penalize と誤判定）≤ 10%、
       FPR（誤許容率：penalize を pass と誤判定）≤ 10% を満たす
       5 ティア境界（thetaHard / thetaL1c / thetaL1b / thetaSoft）を決定
    3. 結果を calibration.json（grade.ts が読む形式）に出力

【入力（extract_features.py の出力）】
  features.jsonl 各行:
    {
      "mechRisk": float,        # 0〜1（機械フィルタリスク）
      "llmRisk": float,         # 0〜1（Gemini リスク。未計算なら 0）
      "relRisk": float,         # 0〜1（参照ベクトル関連性リスク。未計算なら 0）
      "answerMs": int,          # 回答時間 ms（-1 = 不明）
      "shouldPenalize": bool    # 目的変数
    }

【出力】
  calibration.json:
    grade.ts の CalibrationParams と同じ形。

【使い方】
  pip install scikit-learn numpy --break-system-packages
  python scripts/calibrate_phase3.py --input features.jsonl --output calibration.json

【動作概要】
  特徴量: [mechRisk, llmRisk, relRisk, answerMs_norm]
    answerMs_norm = clamp(answerMs / 30000, 0, 1)  // 30秒で正規化
  目的変数: shouldPenalize（0/1）
  モデル: LogisticRegression（L2正則化、class_weight='balanced'）
  確率: P(penalize) = sigmoid(w·x + b)
  閾値探索: FNR ≤ MAX_FNR かつ FPR ≤ MAX_FPR を満たす最小閾値を選択
  5ティア境界: P(penalize) の分位点から自動算出（PASS/L1a/L1b/L1c/T0）
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_score
    from sklearn.metrics import (
        confusion_matrix,
        classification_report,
        roc_auc_score,
    )
except ImportError:
    print(
        "[ERROR] scikit-learn / numpy が必要です:\n"
        "  pip install scikit-learn numpy --break-system-packages",
        file=sys.stderr,
    )
    sys.exit(1)

# ─────────────────────────────────────────────────
# ポリシー定数（設計書 §0.4）
# ─────────────────────────────────────────────────
MAX_FNR = 0.10   # genuine を penalize と誤判定する率の上限（非対称コスト原則）
MAX_FPR = 0.10   # penalize を pass と誤判定する率の上限

ANSWER_MS_NORM_DIVISOR = 30_000   # 30 秒で正規化

# ─────────────────────────────────────────────────
# デフォルト値（calibration なし時の grade.ts 初期値と同じ）
# ─────────────────────────────────────────────────
DEFAULT_THRESHOLDS = {
    "thetaHard": 0.80,
    "thetaL1c":  0.65,
    "thetaL1b":  0.50,
    "thetaSoft": 0.30,
    "mechSafeThreshold": 0.15,
    "relOffTopicRisk":   0.50,
}
DEFAULT_RESCUE = {
    "highTrustThreshold": 80,
    "highTrust":          0.08,
    "shortAnswer":        0.04,
    "pasteJustified":     0.02,
    "max":                0.12,
}


# ─────────────────────────────────────────────────
# データローダ
# ─────────────────────────────────────────────────

def load_features(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """
    features.jsonl を読み込み、特徴量行列 X と目的変数 y を返す。

    特徴量（4次元）:
      [mechRisk, llmRisk, relRisk, answerMs_norm]
    """
    X_rows = []
    y_rows = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"[WARN] 行 {i} のパース失敗（スキップ）: {e}", file=sys.stderr)
                continue

            mech_risk = float(row.get("mechRisk", 0.0))
            llm_risk  = float(row.get("llmRisk",  0.0))
            rel_risk  = float(row.get("relRisk",  0.0))
            answer_ms = int(row.get("answerMs", -1))
            penalize  = bool(row.get("shouldPenalize", False))

            ans_norm = (
                min(answer_ms / ANSWER_MS_NORM_DIVISOR, 1.0)
                if answer_ms >= 0
                else 0.5   # 不明時は中立値
            )

            X_rows.append([mech_risk, llm_risk, rel_risk, ans_norm])
            y_rows.append(1 if penalize else 0)

    if not X_rows:
        print("[ERROR] 特徴量が 0 件です。入力ファイルを確認してください。", file=sys.stderr)
        sys.exit(1)

    return np.array(X_rows, dtype=float), np.array(y_rows, dtype=int)


# ─────────────────────────────────────────────────
# ロジスティック回帰学習
# ─────────────────────────────────────────────────

def train_model(X: np.ndarray, y: np.ndarray) -> LogisticRegression:
    clf = LogisticRegression(
        C=1.0,
        max_iter=1000,
        class_weight="balanced",   # クラス不均衡補正
        random_state=42,
        solver="lbfgs",
    )
    clf.fit(X, y)
    return clf


def cross_validate(X: np.ndarray, y: np.ndarray, clf: LogisticRegression) -> dict:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(clf, X, y, cv=cv, scoring="roc_auc")
    return {"cv_auc_mean": float(scores.mean()), "cv_auc_std": float(scores.std())}


# ─────────────────────────────────────────────────
# 5ティア閾値の決定
# ─────────────────────────────────────────────────

def find_thresholds(
    probs: np.ndarray,
    y: np.ndarray,
    max_fnr: float = MAX_FNR,
    max_fpr: float = MAX_FPR,
) -> dict[str, float]:
    """
    P(penalize) の連続確率から 5 ティア境界を決定する。

    アルゴリズム:
      1. thetaSoft: FNR ≤ max_fnr を満たす最小の penalize 確率閾値。
         （これより下は PASS = genuine とみなす）
      2. thetaHard: FPR ≤ max_fpr を満たす最大の penalize 確率閾値。
         （これより上は T0 = penalize 確定）
      3. L1c/L1b/L1a は thetaSoft〜thetaHard を 4 等分。
      4. mechSafeThreshold はデフォルト（0.15）を維持（学習対象外）。
    """
    sorted_p = np.sort(probs)

    # thetaSoft を探す: genuine（y=0）を penalize（予測1）と誤判定する率 ≤ max_fnr
    theta_soft = DEFAULT_THRESHOLDS["thetaSoft"]
    for threshold in sorted_p:
        pred = (probs >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
        fnr_val = fn / max(tp + fn, 1)   # genuine が penalize と誤判定される率（非対称コスト）
        if fnr_val <= max_fnr:
            theta_soft = float(threshold)
            break

    # thetaHard を探す: penalize（y=1）を pass と誤判定する率 ≤ max_fpr
    theta_hard = DEFAULT_THRESHOLDS["thetaHard"]
    for threshold in sorted_p[::-1]:
        pred = (probs >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
        fpr_val = fp / max(tn + fp, 1)   # penalize が pass と誤判定される率
        if fpr_val <= max_fpr:
            theta_hard = float(threshold)
            break

    # theta_hard が theta_soft 以下になる場合はデフォルトで保護
    if theta_hard <= theta_soft:
        print(
            f"[WARN] thetaHard({theta_hard:.3f}) ≤ thetaSoft({theta_soft:.3f})。"
            "データが少なすぎる可能性があります。デフォルト値を維持します。",
            file=sys.stderr,
        )
        return {**DEFAULT_THRESHOLDS}

    # L1c/L1b/L1a を thetaSoft〜thetaHard の間で均等分割
    span = theta_hard - theta_soft
    theta_l1c = theta_hard  - span * 0.10   # thetaHard 直下（T0 の直前）
    theta_l1b = theta_soft  + span * 0.55   # 中間よりやや高め
    theta_l1a_alias = theta_soft + span * 0.25  # thetaSoft 直上（PASS の直前）

    # 単調性の保証
    thresholds = {
        "thetaHard": round(theta_hard, 4),
        "thetaL1c":  round(max(theta_l1c, theta_l1b + 0.01), 4),
        "thetaL1b":  round(max(theta_l1b, theta_l1a_alias + 0.01), 4),
        "thetaSoft": round(theta_soft, 4),
        "mechSafeThreshold": DEFAULT_THRESHOLDS["mechSafeThreshold"],
        "relOffTopicRisk":   DEFAULT_THRESHOLDS["relOffTopicRisk"],
    }
    return thresholds


# ─────────────────────────────────────────────────
# 最終統計の計算
# ─────────────────────────────────────────────────

def compute_stats(
    y: np.ndarray,
    probs: np.ndarray,
    theta_soft: float,
    n_samples: int,
) -> dict:
    pred = (probs >= theta_soft).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    fnr = fn / max(tp + fn, 1)
    fpr = fp / max(tn + fp, 1)
    accuracy = (tp + tn) / n_samples
    try:
        auc = float(roc_auc_score(y, probs))
    except Exception:
        auc = -1.0
    return {
        "nSamples":  n_samples,
        "fnr":       round(fnr, 4),
        "fpr":       round(fpr, 4),
        "accuracy":  round(accuracy, 4),
        "rocAuc":    round(auc, 4),
    }


# ─────────────────────────────────────────────────
# calibration.json 出力
# ─────────────────────────────────────────────────

def build_calibration_json(
    thresholds: dict,
    stats: dict,
    cv_stats: dict,
) -> dict:
    return {
        "version":   "1.0",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "thresholds": thresholds,
        "rescue":     DEFAULT_RESCUE,
        "stats":      {**stats, **cv_stats},
    }


# ─────────────────────────────────────────────────
# メイン
# ─────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Phase 3 キャリブレーション: 特徴量 JSONL → calibration.json"
    )
    ap.add_argument("--input",  "-i", required=True, help="features.jsonl パス")
    ap.add_argument("--output", "-o", default="calibration.json",
                    help="出力 calibration.json パス（既定: calibration.json）")
    ap.add_argument("--max-fnr", type=float, default=MAX_FNR,
                    help=f"許容 FNR 上限（既定: {MAX_FNR}）")
    ap.add_argument("--max-fpr", type=float, default=MAX_FPR,
                    help=f"許容 FPR 上限（既定: {MAX_FPR}）")
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    in_path  = Path(args.input)
    out_path = Path(args.output)

    if not in_path.exists():
        print(f"[ERROR] 入力ファイルが見つかりません: {in_path}", file=sys.stderr)
        sys.exit(1)

    # ── Step 1: データロード
    print(f"[1/4] 特徴量をロード中: {in_path}")
    X, y = load_features(in_path)
    n = len(y)
    n_penalize = int(y.sum())
    print(f"      {n} 件読込 / penalize={n_penalize} ({n_penalize/n:.1%}), "
          f"genuine={n - n_penalize} ({(n - n_penalize)/n:.1%})")

    if n < 50:
        print("[WARN] サンプル数が少なすぎます（推奨: 200件以上）。", file=sys.stderr)

    # ── Step 2: ロジスティック回帰学習
    print("[2/4] ロジスティック回帰を学習中...")
    clf = train_model(X, y)
    probs = clf.predict_proba(X)[:, 1]   # P(penalize) の確率

    cv_stats = cross_validate(X, y, clf)
    print(f"      CV AUC: {cv_stats['cv_auc_mean']:.3f} ± {cv_stats['cv_auc_std']:.3f}")

    if args.verbose:
        print(f"      係数: mechRisk={clf.coef_[0][0]:.3f}, llmRisk={clf.coef_[0][1]:.3f}, "
              f"relRisk={clf.coef_[0][2]:.3f}, answerMs_norm={clf.coef_[0][3]:.3f}")
        print(f"      バイアス: {clf.intercept_[0]:.3f}")
        print(classification_report(y, (probs >= 0.5).astype(int),
                                     target_names=["genuine", "penalize"]))

    # ── Step 3: 閾値決定
    print(f"[3/4] 5ティア境界を決定中 (FNR≤{args.max_fnr:.0%}, FPR≤{args.max_fpr:.0%})...")
    thresholds = find_thresholds(probs, y, args.max_fnr, args.max_fpr)
    print(f"      thetaHard={thresholds['thetaHard']}, thetaL1c={thresholds['thetaL1c']}, "
          f"thetaL1b={thresholds['thetaL1b']}, thetaSoft={thresholds['thetaSoft']}")

    stats = compute_stats(y, probs, thresholds["thetaSoft"], n)
    print(f"      FNR={stats['fnr']:.1%}, FPR={stats['fpr']:.1%}, "
          f"Accuracy={stats['accuracy']:.1%}, AUC={stats['rocAuc']:.3f}")

    if stats["fnr"] > args.max_fnr:
        print(
            f"[WARN] FNR {stats['fnr']:.1%} が許容値 {args.max_fnr:.1%} を超えています。"
            "ラベルやデータを再確認してください。",
            file=sys.stderr,
        )

    # ── Step 4: calibration.json 出力
    print(f"[4/4] calibration.json を書き出し中: {out_path}")
    calib = build_calibration_json(thresholds, stats, cv_stats)
    out_path.write_text(
        json.dumps(calib, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[done] {out_path} を出力しました。")
    print()
    print("  ★ 次のステップ（設計書 §13.5.4 Phase 3 完了後）:")
    print("    1. calibration.json を kikitai/ 直下に配置（grade.ts が自動ロード）")
    print("    2. npm run dev で動作確認（grade() がキャリブレーション後の閾値を使う）")
    print("    3. Phase 4: シャドーモードで本番回答に適用して FNR/FPR を実測する")


if __name__ == "__main__":
    main()
