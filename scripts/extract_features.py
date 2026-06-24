#!/usr/bin/env python3
"""Phase 3 特徴量抽出スクリプト（設計書 §13.5.4 Phase3 Step 1）。

【入力】Google Sheets からエクスポートした CSV（または JSONL）
  CSV ヘッダ例:
    text, questionText, questionType, label, answerMs
  JSONL 例（1行1JSON）:
    {"text":"...", "questionText":"...", "questionType":"paragraph",
     "label":"genuine_high", "answerMs":12000}

  label 値: genuine_high / genuine_mid / low_effort / off_topic
  questionType: text | paragraph | single | scale | etc.

【出力】calibrate_phase3.py に渡す JSONL
  各行:
    {
      "mechRisk": 0.12,        # ルールベース評価の近似（0〜1）
      "llmRisk":  0.0,         # Gemini 未実行時は 0（安全側）
      "relRisk":  0.0,         # 参照ベクトル未生成時は 0（安全側）
      "answerMs": 12000,       # null の場合は -1
      "shouldPenalize": false, # label が low_effort or off_topic なら true
      "_label":   "genuine_high",  # デバッグ用（calibration には使わない）
      "_text":    "..."            # デバッグ用
    }

【使い方】
  pip install pandas --break-system-packages   # pandas のみ必要
  python scripts/extract_features.py --input labels.csv --output features.jsonl
  python scripts/extract_features.py --input labels.jsonl --output features.jsonl

【注意】
  mechRisk は TypeScript の RuleBasedEvaluator を Python で近似したもの。
  完全な再現ではないが、B-1 ルール（情報量・定型句・コピペ）を再実装している。
  より精度の高い mechRisk が必要な場合は Node.js ベースの extract_features.mjs（別途）を使う。
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from pathlib import Path
from typing import Iterator

# ─────────────────────────────────────────────────
# 定数（ruleBased.ts の対応値と揃える）
# ─────────────────────────────────────────────────
MIN_TEXT_LEN_FOR_CONTENT_RULES = 10
FORMULAIC_RATIO_THRESHOLD = 0.8
FORMULAIC_PENALTY = 10
COPY_QUESTION_SIMILARITY = 0.85
COPY_QUESTION_PENALTY = 15

# mechRisk 計算時の変換元スコア上下限
RULE_SCORE_MAX = 100
RULE_SCORE_MIN = 0

# ─────────────────────────────────────────────────
# 日本語向け定型句辞書（ruleBased.ts の formulaicRatio と揃える）
# ─────────────────────────────────────────────────
FORMULAIC_PHRASES = [
    "特になし", "特にない", "特に", "わからない", "わかりません",
    "ない", "なし", "不明", "いいと思う", "問題ない", "普通",
    "よくわからない", "とくになし", "ありません",
]


def formulaic_ratio(text: str) -> float:
    """定型句が占める割合（0〜1）。"""
    if not text:
        return 0.0
    total = len(text)
    matched = 0
    for phrase in FORMULAIC_PHRASES:
        matched += text.count(phrase) * len(phrase)
    return min(matched / total, 1.0)


def unique_content_words(text: str) -> set[str]:
    """2文字以上のひらがな以外トークンを内容語の近似として返す。"""
    tokens = re.findall(r"[^\s、。！？\.,!?]+", text)
    return {t for t in tokens if len(t) >= 2}


def edit_similarity(a: str, b: str) -> float:
    """文字レベルの編集類似度（0〜1）。"""
    if not a and not b:
        return 1.0
    la, lb = len(a), len(b)
    dp = list(range(lb + 1))
    for i in range(1, la + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, lb + 1):
            temp = dp[j]
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[j] = min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
            prev = temp
    dist = dp[lb]
    return 1.0 - dist / max(la, lb)


# ─────────────────────────────────────────────────
# mechRisk 計算（RuleBasedEvaluator の Python 近似）
# ─────────────────────────────────────────────────

def compute_mech_risk(text: str, question_text: str, question_type: str) -> float:
    """
    1件分の自由記述回答から mechRisk（0〜1）を計算する。
    TypeScript の RuleBasedEvaluator の B-1 ルール相当。

    Returns:
        float: 0.0（低リスク）〜 1.0（高リスク）。
    """
    score = RULE_SCORE_MAX
    is_free_text = question_type in ("text", "paragraph")

    if not is_free_text:
        # 選択式は mechRisk=0（ルールベース評価対象外）
        return 0.0

    # ルール2: 短すぎる
    stripped = text.strip()
    if 0 < len(stripped) < 10:
        score -= 20

    if len(stripped) >= MIN_TEXT_LEN_FOR_CONTENT_RULES:
        # ルール6: 情報量（定型句率）
        if formulaic_ratio(stripped) >= FORMULAIC_RATIO_THRESHOLD:
            score -= FORMULAIC_PENALTY

        # ルール7: 設問キーワード被覆率ゼロ＋内容語僅少
        content_words = unique_content_words(stripped)
        if len(content_words) <= 1:
            score -= 10

        # ルール8: 設問文の丸写し
        if edit_similarity(stripped, question_text) >= COPY_QUESTION_SIMILARITY:
            score -= COPY_QUESTION_PENALTY

    score = max(RULE_SCORE_MIN, min(RULE_SCORE_MAX, score))
    return (RULE_SCORE_MAX - score) / RULE_SCORE_MAX


# ─────────────────────────────────────────────────
# 入力パーサ
# ─────────────────────────────────────────────────

def iter_rows_csv(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield {k.strip(): v.strip() for k, v in row.items()}


def iter_rows_jsonl(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def iter_rows(path: Path) -> Iterator[dict]:
    if path.suffix.lower() == ".jsonl":
        yield from iter_rows_jsonl(path)
    else:
        yield from iter_rows_csv(path)


# ─────────────────────────────────────────────────
# shouldPenalize 判定
# ─────────────────────────────────────────────────

PENALIZE_LABELS = {"low_effort", "off_topic"}


def should_penalize(label: str) -> bool:
    return label.strip().lower() in PENALIZE_LABELS


# ─────────────────────────────────────────────────
# メイン
# ─────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Google Sheets ラベルCSV → Phase3 特徴量 JSONL"
    )
    ap.add_argument("--input",  "-i", required=True, help="入力 CSV または JSONL パス")
    ap.add_argument("--output", "-o", default="features.jsonl",
                    help="出力 JSONL パス（既定: features.jsonl）")
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    in_path  = Path(args.input)
    out_path = Path(args.output)

    if not in_path.exists():
        print(f"[ERROR] 入力ファイルが見つかりません: {in_path}", file=sys.stderr)
        sys.exit(1)

    n_total = n_ok = n_skip = 0
    label_counts: dict[str, int] = {}
    penalize_counts = {True: 0, False: 0}

    with out_path.open("w", encoding="utf-8") as fout:
        for row in iter_rows(in_path):
            n_total += 1
            text          = row.get("text", "").strip()
            question_text = row.get("questionText", "").strip()
            question_type = row.get("questionType", "paragraph").strip()
            label         = row.get("label", "").strip()
            answer_ms_raw = row.get("answerMs", "")

            if not label:
                n_skip += 1
                if args.verbose:
                    print(f"[SKIP] row {n_total}: label なし", file=sys.stderr)
                continue

            try:
                answer_ms = int(answer_ms_raw) if answer_ms_raw else -1
            except ValueError:
                answer_ms = -1

            mech_risk = compute_mech_risk(text, question_text, question_type)
            penalize  = should_penalize(label)

            label_counts[label] = label_counts.get(label, 0) + 1
            penalize_counts[penalize] += 1

            record = {
                "mechRisk":       round(mech_risk, 6),
                "llmRisk":        0.0,  # Gemini 未実行時は安全側
                "relRisk":        0.0,  # 参照ベクトル未生成時は安全側
                "answerMs":       answer_ms,
                "shouldPenalize": penalize,
                "_label":         label,
                "_text":          text[:80],  # デバッグ用（長すぎるものは切る）
            }
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
            n_ok += 1

    print(f"[done] {n_ok} 件出力（スキップ: {n_skip} 件）→ {out_path}")
    print(f"  ラベル内訳: {json.dumps(label_counts, ensure_ascii=False)}")
    print(f"  shouldPenalize: True={penalize_counts[True]}, False={penalize_counts[False]}")
    fneg_ratio = penalize_counts[True] / max(n_ok, 1)
    print(f"  Penalize 率: {fneg_ratio:.1%}  （≈ クラス不均衡の参考値）")
    if fneg_ratio < 0.1 or fneg_ratio > 0.7:
        print(
            "  [WARN] Penalize 率が想定外です。ラベル列名・値を再確認してください。",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
