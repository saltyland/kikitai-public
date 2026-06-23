/**
 * 100ペルソナ・ベンチマーク（採点パイプラインの通過率＝pass-rate 回帰テスト）。
 *
 * personas.json（scripts/gen_personas.mjs が生成・凍結）を読み込み、本番と同じ
 * 「ルールベース → 関連性(ローカル埋め込み) → grade」のローカル採点を全件に通して、
 * 低品質回答をどれだけ捕捉できるか／良質回答を誤って弾かないかを定量化する。
 *
 * 既定では ONNX エンコーダ（multilingual-e5-small）を使い、baseline 等方化込みで
 * 意味的 off-topic / 一般論を検出する。モデル取得に失敗した環境では HashingEncoder に
 * フォールバックし、その旨を表示する（埋め込み依存の指標は参考値になる）。
 *
 * 実行: npx vitest run lib/domain/quality/benchmark/benchmark.test.ts
 * 注意: 外部LLMは呼ばない（APIキー不要・決定論）。LLMを足せば recall はさらに上がる。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { QuestionWithOptions, AnswerInput } from '@/lib/types/database';
import type { EvaluationItem } from '../types';
import { RuleBasedEvaluator } from '../ruleBased';
import { grade as gradeImpl } from '../grade';
import { buildReferenceVectors, type ReferenceSource } from '../referenceVector';
import { LocalEmbeddingEvaluator } from '../embedding/localEvaluator';
import { OnnxEncoder } from '../embedding/onnxEncoder';
import { HashingEncoder } from '../embedding/hashingEncoder';
import type { ILocalEncoder } from '../embedding/encoder';

interface PersonaAns { text?: string; opt?: number }
interface Persona {
  id: string; name: string; archetype: string; shouldFlag: boolean;
  note: string; durationSec: number; answers: Record<string, PersonaAns>;
}
interface Benchmark {
  survey: { questions: { order: number; type: string; text: string; options?: string[]; correct?: string }[] };
  referenceSources: ReferenceSource[];
  attentionCorrectIndex: number;
  personas: Persona[];
}

const bench = JSON.parse(
  readFileSync(resolve(__dirname, 'personas.json'), 'utf-8')
) as Benchmark;

function buildQuestions(): QuestionWithOptions[] {
  return bench.survey.questions.map((q) => ({
    id: `q${q.order}`,
    survey_id: 's',
    type: q.type as QuestionWithOptions['type'],
    text: q.text,
    description: null,
    required: true,
    config: null,
    section_index: 0,
    order_index: q.order,
    condition: null,
    options: (q.options ?? []).map((t, i) => ({
      id: `q${q.order}o${i}`, question_id: `q${q.order}`, text: t, order_index: i,
    })),
  }));
}

function toAnswer(order: number, a: PersonaAns | undefined): AnswerInput | undefined {
  if (!a) return undefined;
  if (typeof a.text === 'string') return { question_id: `q${order}`, text_answer: a.text };
  if (typeof a.opt === 'number') return { question_id: `q${order}`, option_ids: [`q${order}o${a.opt}`] };
  return undefined;
}

async function getEncoder(): Promise<{ encoder: ILocalEncoder; kind: string }> {
  try {
    const encoder = await OnnxEncoder.create();
    return { encoder, kind: 'onnx(e5-small)' };
  } catch (e) {
    console.warn('[benchmark] ONNX 取得失敗。HashingEncoder にフォールバック:', (e as Error).message);
    return { encoder: new HashingEncoder(), kind: 'hashing(fallback)' };
  }
}

// 既定の `npm test` では実行しない（モデル取得=ネットワーク＋数十秒のため）。
// 実行するには:  RUN_BENCHMARK=1 npx vitest run lib/domain/quality/benchmark/benchmark.test.ts
describe.skipIf(!process.env.RUN_BENCHMARK)('100ペルソナ・ベンチマーク', () => {
  it('低品質を捕捉し良質を素通しさせる（recall / false-positive を満たす）', async () => {
    const { encoder, kind } = await getEncoder();
    const questions = buildQuestions();
    const refs = await buildReferenceVectors(encoder, bench.referenceSources);
    const localEval = new LocalEmbeddingEvaluator(refs, async () => encoder);
    const ruleEval = new RuleBasedEvaluator();

    const correctText = bench.survey.questions.find((q) => q.type === 'attention')?.correct;

    let tp = 0, fn = 0, fp = 0, tn = 0;
    const perArch: Record<string, { n: number; flagged: number; shouldFlag: boolean; relSum: number }> = {};
    const rows: Record<string, unknown>[] = [];

    for (const p of bench.personas) {
      const items: EvaluationItem[] = questions.map((question) => ({
        question,
        correctOptionText: question.type === 'attention' ? correctText : undefined,
        answer: toAnswer(question.order_index, p.answers[String(question.order_index)]),
      }));
      const ctx = { durationSec: p.durationSec };

      const rule = await ruleEval.evaluate(items, ctx);
      const relevanceRisk = await localEval.computeRelRisk(items);
      // ローカルのみ（外部LLMなし）: quality は rule スコアを採用
      const quality = rule.score;

      const mechScore = Math.max(0, Math.min(1, (100 - rule.score) / 100));
      const llmRisk = Math.max(0, Math.min(1, (100 - quality) / 100));
      const g = gradeImpl({ mechScore, llmRisk, relRisk: relevanceRisk });

      const flagged = g.payoutRate < 0.8; // PASS/L1a 未満なら「低品質として捕捉」
      if (p.shouldFlag && flagged) tp++;
      else if (p.shouldFlag && !flagged) fn++;
      else if (!p.shouldFlag && flagged) fp++;
      else tn++;

      const a = (perArch[p.archetype] ??= { n: 0, flagged: 0, shouldFlag: p.shouldFlag, relSum: 0 });
      a.n++; a.relSum += relevanceRisk; if (flagged) a.flagged++;

      if ((p.shouldFlag && !flagged) || (!p.shouldFlag && flagged)) {
        rows.push({ id: p.id, archetype: p.archetype, shouldFlag: p.shouldFlag, rule: rule.score, relRisk: +relevanceRisk.toFixed(2), tier: g.tier, payout: g.payoutRate });
      }
    }

    const recall = tp / (tp + fn || 1);
    const precision = tp / (tp + fp || 1);
    const fpr = fp / (fp + tn || 1);
    const accuracy = (tp + tn) / bench.personas.length;

    const archLines = Object.entries(perArch)
      .sort((x, y) => Number(y[1].shouldFlag) - Number(x[1].shouldFlag))
      .map(([k, v]) =>
        `  ${k.padEnd(18)} n=${String(v.n).padStart(2)} 捕捉=${String(v.flagged).padStart(2)}/${v.n}` +
        ` (期待:${v.shouldFlag ? '捕捉' : '素通し'}) avgRelRisk=${(v.relSum / v.n).toFixed(2)}`
      );

    const report = [
      `エンコーダ: ${kind}`,
      `件数: ${bench.personas.length}（低品質 ${tp + fn} / 良質 ${fp + tn}）`,
      `recall(低品質の捕捉率)   = ${(recall * 100).toFixed(1)}%  (${tp}/${tp + fn})`,
      `false-positive(良質の誤弾)= ${(fpr * 100).toFixed(1)}%  (${fp}/${fp + tn})`,
      `precision = ${(precision * 100).toFixed(1)}%   accuracy = ${(accuracy * 100).toFixed(1)}%`,
      '',
      'アーキタイプ別:',
      ...archLines,
      '',
      `誤判定（FN=見逃し / FP=誤弾）${rows.length}件:`,
      ...rows.map((r) => '  ' + JSON.stringify(r)),
    ].join('\n');

    writeFileSync(resolve(__dirname, '_benchmark_result.txt'), report, 'utf-8');

    // ── 合否基準（回帰の番人）──
    // 良質を誤って弾かない方を最優先（FPR）。次に低品質の捕捉率（recall）。
    expect(fpr).toBeLessThanOrEqual(0.15);
    expect(recall).toBeGreaterThanOrEqual(0.85);
  }, 120_000);
});
