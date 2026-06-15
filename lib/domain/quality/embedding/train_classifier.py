#!/usr/bin/env python3
"""ローカル品質分類器（B-2）の学習スクリプト雛形（設計書 §4.2 B-2 / §13.3）。

【位置づけ】
  - 合成ラベル（Claudeが分布指定で生成した仮想回答：手抜き/真面目/AI生成/gibberish/
    直線/off-topic）でブートストラップ学習する想定の雛形。後日、実ラベルが少量
    貯まり次第かならず再較正する（合成のみを本番judgeに据えない＝§13.3）。
  - 出力は lib/domain/quality/embedding/classifier.ts の LinearModelWeights と同じ JSON。

【前提（後日整備）】
  pip install onnxruntime sentence-transformers scikit-learn numpy
  ローカルエンコーダ（multilingual-e5-small 等）で回答を埋め込み、表層特徴量を連結。

【使い方（想定）】
  python train_classifier.py --labels labeled.jsonl --out model.json
  labeled.jsonl の各行: {"text": "...", "label": 1}  # 1=真面目, 0=手抜き
"""
from __future__ import annotations

import argparse
import json


def build_features(text: str, embed) -> list[float]:
    """埋め込み + 表層特徴量（contentWordCount, charLength）。
    classifier.ts の buildFeatures と並びを一致させること。"""
    emb = embed(text)  # L2正規化済みベクトル（list[float]）
    content_word_count = len([t for t in text.split() if len(t) >= 2])  # 簡易。本番はTSと揃える
    return list(emb) + [float(content_word_count), float(len(text))]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--labels", required=True, help="JSONL: {text,label}")
    ap.add_argument("--out", default="model.json")
    ap.add_argument("--encoder-id", default="e5-small-onnx-v1")
    args = ap.parse_args()

    # --- 後日実装: エンコーダのロード ---------------------------------------
    # from sentence_transformers import SentenceTransformer
    # st = SentenceTransformer("intfloat/multilingual-e5-small")
    # def embed(t): return st.encode(t, normalize_embeddings=True).tolist()
    def embed(_t: str) -> list[float]:
        raise NotImplementedError("エンコーダ未配線。multilingual-e5-small 等をロードして実装")

    X: list[list[float]] = []
    y: list[int] = []
    with open(args.labels, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            X.append(build_features(row["text"], embed))
            y.append(int(row["label"]))

    # --- 後日実装: ロジスティック回帰の学習 ---------------------------------
    # from sklearn.linear_model import LogisticRegression
    # clf = LogisticRegression(max_iter=1000).fit(X, y)
    # weights = clf.coef_[0].tolist(); bias = float(clf.intercept_[0])
    weights: list[float] = []
    bias = 0.0

    feature_names = [f"emb_{i}" for i in range(len(X[0]) - 2)] + ["contentWordCount", "charLength"] if X else []
    model = {
        "featureNames": feature_names,
        "weights": weights,
        "bias": bias,
        "encoderId": args.encoder_id,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, indent=2)
    print(f"wrote {args.out} ({len(X)} samples)")


if __name__ == "__main__":
    main()
