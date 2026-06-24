#!/usr/bin/env python3
"""
100ペルソナ(personas_casual.json)の「回答ごと品質スコア」平均を算出する。

ペルソナの回答は実データ(labels_remapped.csv)の再標本化なので、実データを一度
採点した結果(features_with_llm.jsonl: 各行に _text と llmRisk)を текст→score で
引くだけで、追加のAPI呼び出しなしに 100人の平均を出せる。

前提: 先に新プロンプト版で実データを採点しておく:
    python scripts/score_with_gemini.py     # gemini_progress.json により再開可
これで features_with_llm.jsonl が新プロンプトのスコアに更新される。

使い方:
    python scripts/score_personas.py
"""
import json, os, pathlib, statistics, collections

HERE = pathlib.Path(__file__).parent
OFFLINE = HERE / "scores_offline.jsonl"        # オフライン予測(a -> score)
SCORED = HERE / "features_with_llm.jsonl"      # 実LLM採点結果(_text -> llmRisk)
PERSONAS = HERE / "personas_casual.json"


def load_text2score():
    """優先: オフライン予測(scores_offline.jsonl・新プロンプト相当)。
    環境変数 USE_LLM=1 のときのみ 実LLM採点(features_with_llm.jsonl) を使う。"""
    t2s = {}
    use_llm = os.environ.get("USE_LLM")
    if use_llm and SCORED.exists():
        for line in open(SCORED, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r.get("_text") is not None and "llmRisk" in r:
                t2s[r["_text"]] = round(100 * (1 - float(r["llmRisk"])), 1)
        if t2s:
            print(f"[source] {SCORED.name}（実LLM採点）")
            return t2s
    if OFFLINE.exists():
        for line in open(OFFLINE, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r.get("a") is not None and "score" in r:
                t2s[r["a"]] = float(r["score"])
        print(f"[source] {OFFLINE.name}（オフライン予測・新プロンプト相当）")
        return t2s
    raise SystemExit("採点結果がありません。offline_judge.py --write を先に実行してください。")


def main():
    t2s = load_text2score()
    bench = json.loads(PERSONAS.read_text(encoding="utf-8"))
    personas = bench["personas"]

    per_persona = []
    missing = 0
    label_scores = collections.defaultdict(list)
    for p in personas:
        scores = []
        for qi, ans in p["answers"].items():
            s = t2s.get(ans["text"])
            if s is None:
                missing += 1
                continue
            scores.append(s)
            lab = p["labels"][int(qi)]
            label_scores[lab].append(s)
        if scores:
            per_persona.append(statistics.mean(scores))

    grand = statistics.mean(per_persona)
    print(f"=== 100ペルソナ 品質スコア ===")
    print(f"対象ペルソナ: {len(per_persona)}人  (未照合回答: {missing}件)")
    print(f"回答ごとスコアの全体平均 = {statistics.mean([s for v in label_scores.values() for s in v]):.1f}")
    print(f"ペルソナ平均(各人の回答平均の平均) = {grand:.1f}")
    print()
    print("ラベル帯別 平均スコア:")
    for lab in ["genuine_high", "genuine_mid", "low_effort"]:
        v = label_scores.get(lab, [])
        if v:
            print(f"  {lab:14} n={len(v):4} mean={statistics.mean(v):.1f}")

    # 目標80との差分から MIX 調整ヒントを出す
    target = 80.0
    print()
    if abs(grand - target) <= 2:
        print(f"[OK] ペルソナ平均 {grand:.1f} は目標80±2に収まっています。")
    else:
        gmean = statistics.mean(
            [s for lab, vs in label_scores.items() if lab.startswith("genuine") for s in vs]
        )
        lmean = statistics.mean(label_scores.get("low_effort", [gmean])) if label_scores.get("low_effort") else gmean
        if gmean > lmean:
            p_low = max(0.0, min(1.0, (gmean - target) / (gmean - lmean)))
            print(f"[調整ヒント] genuine平均={gmean:.1f}, low_effort平均={lmean:.1f}")
            print(f"  平均を80にするには low_effort 比率 ≈ {p_low:.0%} が目安。")
            print(f"  例: MIX_LOW={p_low:.2f} MIX_HIGH={(1-p_low)/2:.2f} MIX_MID={(1-p_low)/2:.2f} "
                  f"python scripts/gen_casual_personas.py")


if __name__ == "__main__":
    main()
