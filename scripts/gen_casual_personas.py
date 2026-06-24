#!/usr/bin/env python3
"""
実データ(labels_remapped.csv)に基づく「日常カジュアル・アンケート回答者」ペルソナを100人生成する。

設計:
- 実データは回答ごと(設問+回答+人手ラベル)。回答者単位のグルーピングは無いため、
  ペルソナは「健全な実回答者」を模した合成体として組み立てる。
- 各ペルソナは固定のカジュアル設問セット(実データから採用)に回答する。回答は
  同一設問・同一ラベル帯の実回答からサンプリングして割り当てる(=実データの再標本化)。
- 既定の品質プロファイルは genuine 中心(健全な回答者)。平均が約80点になるよう、
  genuine_high / genuine_mid を主体に、ごく一部に low_effort を混ぜて自然な分散を作る。

出力: scripts/personas_casual.json  (benchmark 互換に近い構造)
スコア検証は score_personas.py(別ファイル)が score_cache.jsonl を用いて行う。
"""
import csv, json, collections, random, pathlib, os

HERE = pathlib.Path(__file__).parent
LABELS = pathlib.Path(os.environ.get("LABELS_CSV", HERE.parent.parent / "scripts_input_labels_remapped.csv"))
OUT = HERE / "personas_casual.json"

N_PERSONAS = int(os.environ.get("N_PERSONAS", 100))
N_QUESTIONS = int(os.environ.get("N_QUESTIONS", 8))  # 1人あたり設問数
SEED = int(os.environ.get("SEED", 20260623))

# 品質プロファイル混合比(健全回答者中心・平均80狙い)。
# 各回答ごとに、この比率でラベル帯を選び、その帯の実回答をサンプリングする。
MIX = {
    "genuine_high": float(os.environ.get("MIX_HIGH", 0.45)),
    "genuine_mid":  float(os.environ.get("MIX_MID",  0.45)),
    "low_effort":   float(os.environ.get("MIX_LOW",  0.10)),
}


def main():
    rows = [r for r in csv.DictReader(open(LABELS, newline="", encoding="utf-8"))
            if r["questionType"] == "paragraph" and r["label"].strip()]
    # 設問 -> ラベル -> 回答リスト
    q2l2a = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in rows:
        q2l2a[r["questionText"]][r["label"]].append(r["text"])

    # 採用設問: low_effort/genuine 双方の実回答が存在する設問を優先(リアルな混合のため)。
    questions = sorted(q2l2a.keys(), key=lambda q: -sum(len(v) for v in q2l2a[q].values()))
    # 上位N_QUESTIONS*3 から、genuine回答が複数あるものを選ぶ
    pool_q = [q for q in questions if len(q2l2a[q].get("genuine_high", [])) +
              len(q2l2a[q].get("genuine_mid", [])) >= 2]

    rnd = random.Random(SEED)
    survey_qs = rnd.sample(pool_q, min(N_QUESTIONS, len(pool_q)))

    labels = list(MIX.keys())
    weights = [MIX[l] for l in labels]

    personas = []
    for i in range(N_PERSONAS):
        prnd = random.Random(SEED * 7919 + i)
        answers = {}
        plabels = []
        for qi, q in enumerate(survey_qs):
            # この設問でこのペルソナが取るラベル帯を選ぶ。空帯はgenuine_midへフォールバック。
            lab = prnd.choices(labels, weights=weights)[0]
            cand = q2l2a[q].get(lab) or q2l2a[q].get("genuine_mid") or q2l2a[q].get("genuine_high")
            if not cand:
                # どの帯も無ければ全帯から
                allc = [a for v in q2l2a[q].values() for a in v]
                cand = allc
                lab = "genuine_mid"
            answers[str(qi)] = {"text": prnd.choice(cand)}
            plabels.append(lab)
        n_low = plabels.count("low_effort")
        personas.append({
            "id": f"c{i+1:03}",
            "archetype": "casual_genuine" if n_low <= 1 else "casual_mixed",
            "labels": plabels,
            "answers": answers,
        })

    bench = {
        "version": "1.0-casual",
        "source": "scripts_input_labels_remapped.csv (実データ再標本化)",
        "seed": SEED,
        "mix": MIX,
        "survey": {"questions": [{"order": i, "type": "paragraph", "text": q}
                                  for i, q in enumerate(survey_qs)]},
        "personas": personas,
    }
    OUT.write_text(json.dumps(bench, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"生成: {OUT}  ペルソナ{len(personas)}人 / 設問{len(survey_qs)}問")
    low_total = sum(p["labels"].count("low_effort") for p in personas)
    tot = N_PERSONAS * len(survey_qs)
    print(f"回答ラベル内訳: low_effort {low_total}/{tot} ({low_total/tot:.0%})  残りgenuine")


if __name__ == "__main__":
    main()
