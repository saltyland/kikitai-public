import json

progress = {}
with open("scripts/gemini_progress.json") as f:
    progress = json.load(f)

features = []
with open("scripts/features.jsonl", encoding="utf-8") as f:
    for i, line in enumerate(f):
        row = json.loads(line)
        row["llmRisk"] = progress.get(str(i), 0.0)
        features.append(row)

with open("scripts/features_with_llm.jsonl", "w", encoding="utf-8") as f:
    for row in features:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

scored = sum(1 for i in range(len(features)) if str(i) in progress)
print(f"出力: {len(features)}件 (実スコア={scored}件, デフォルト0.0={len(features)-scored}件)")
