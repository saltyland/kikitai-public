# 100ペルソナ・採点ベンチマーク

採点パイプライン（ルールベース → 関連性[ローカル埋め込み] → `grade()`）の**通過率（pass-rate）**を
継続的に監視するための、**固定の回帰ベンチマーク**です。改修で「甘くなった／厳しくなりすぎた」を即検知します。

## ファイル

- **`personas.json`** … 凍結されたベンチマーク本体（100ペルソナ＋アンケート定義＋参照例）。
  グラウンドトゥルース（`shouldFlag`）付き。**これが正典**で、git で版管理して使い回します。
  - 良質 36 件（`genuine_rich` / `genuine_moderate`）… 満額付与されるべき（payout ≥ 0.8）。
  - 低品質 64 件（`empty_formulaic` / `too_short` / `question_copy` / `off_topic` /
    `ai_generic` / `duplicated` / `gibberish` / `straight_line` / `speed_run` /
    `attention_fail`）… 捕捉されるべき（payout < 0.8）。
- **`benchmark.test.ts`** … `personas.json` を本番同等のローカル採点に通し、
  recall / false-positive / アーキタイプ別捕捉率を算出する vitest。
- **`../../../scripts/gen_personas.mjs`** … `personas.json` の決定論的生成器（シード固定）。

## 実行

```bash
# ベンチマーク実行（ONNXモデル multilingual-e5-small を取得。初回はDLで数十秒）
npm run benchmark

# personas.json を再生成（アーキタイプ追加・件数変更時のみ）
npm run benchmark:gen
```

既定の `npm test` では**実行されません**（`RUN_BENCHMARK` 未設定時は `describe.skipIf` でスキップ）。
ネットワークと時間を要するためです。レポートは `_benchmark_result.txt`（gitignore）に出力されます。

## 合格基準（`benchmark.test.ts` の assert）

- **false-positive ≤ 15%**（良質回答を誤って弾かない＝最優先）
- **recall ≥ 85%**（低品質回答の捕捉率）

## 注意・前提

- 外部LLMは呼びません（APIキー不要・決定論）。**ローカル最弱構成**での下限性能を測ります。
  本番でLLMを併用すれば recall はさらに上がります。
- 関連性軸は **ONNXエンコーダ＋baseline等方化** が前提（`referenceVector.ts`）。
  e5 等の異方性（無関係でも cos が高止まり）を重心減算で打ち消し、意味的 off-topic と
  一般論を分離します。ONNX取得に失敗すると HashingEncoder にフォールバックし、
  埋め込み依存の指標は参考値になります（その旨レポートに表示）。
- `personas.json` のアンカー（参照例）は良質回答の空間を広めに覆う設定です。
  正当な言い換えの誤検知を抑えるため、実運用でも作成者に良質な理想回答を促すのが望ましいです。
