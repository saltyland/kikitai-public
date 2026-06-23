/**
 * 10ペルソナ・シミュレーション（採点パイプラインの厳しさ診断用）。
 *
 * 目的: 現状の「ルールベース → 関連性 → LLM → grade」一連の採点が、
 *       低品質回答をどの程度素通し（甘く採点）してしまうかを定量化する。
 *
 * 実行: npx vitest run lib/domain/quality/personaSimulation.test.ts
 *       （--reporter=verbose 不要。console.table を出力する）
 *
 * LLM は API を叩かずモック化する。実在 Gemini と同程度の「やや甘め」挙動を再現し、
 * 集約ロジック（CompositeEvaluator / grade）側の甘さを切り分けて観測する。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type {
  EvaluationItem,
  IQualityEvaluator,
  MechSignals,
  QualityResult,
} from './types';
import type { QuestionWithOptions, AnswerInput } from '@/lib/types/database';
import { RuleBasedEvaluator } from './ruleBased';
import { grade as gradeImpl } from './grade';
import { buildReferenceVectors, type SurveyReferenceVectors } from './referenceVector';
import { LocalEmbeddingEvaluator } from './embedding/localEvaluator';
import { HashingEncoder } from './embedding/hashingEncoder';
import { setLocalEncoderForTest } from './embedding/factory';
import { shouldCallLLM } from './routing';

// ───────────────────────── アンケート定義 ─────────────────────────

function q(
  order: number,
  type: QuestionWithOptions['type'],
  text: string,
  options: string[] = [],
): QuestionWithOptions {
  return {
    id: `q${order}`,
    survey_id: 's',
    type,
    text,
    description: null,
    required: true,
    config: null,
    section_index: 0,
    order_index: order,
    condition: null,
    options: options.map((t, i) => ({ id: `q${order}o${i}`, question_id: `q${order}`, text: t, order_index: i })),
  };
}

const SCALE = ['1', '2', '3', '4', '5'];

const QUESTIONS: QuestionWithOptions[] = [
  q(0, 'paragraph', '普段の業務で最も課題に感じていることを、具体的な場面を交えて教えてください。'),
  q(1, 'paragraph', 'その課題に対して現在工夫していることがあれば教えてください。'),
  q(2, 'scale', 'この製品の使い勝手に満足していますか。', SCALE),
  q(3, 'scale', '価格は妥当だと感じますか。', SCALE),
  q(4, 'scale', '同僚にこの製品を勧めたいと思いますか。', SCALE),
  q(5, 'attention', 'これは注意確認です。選択肢の中から「3」を選んでください。', SCALE),
  q(6, 'paragraph', '今後改善してほしい点があれば具体的に教えてください。'),
];

// アテンション設問の正解
const ATTENTION_CORRECT = '3';

// 参照ベクトル生成用：各 paragraph 設問の理想回答例（領域化アンカー）
const REFERENCE_SOURCES = [
  {
    questionOrder: 0,
    questionText: QUESTIONS[0].text,
    idealAnswers: [
      '複数案件の締め切りが重なると優先順位付けが難しく、レビュー待ちで作業が止まることが多いです。',
      '会議が多くまとまった作業時間が取れず、ドキュメント整備が後回しになりがちです。',
    ],
  },
  {
    questionOrder: 1,
    questionText: QUESTIONS[1].text,
    idealAnswers: [
      'タスクをチケット化して朝に優先順位を決め、午前中は会議を入れない時間を確保しています。',
      'テンプレートを用意して定型作業を自動化し、レビュー依頼を早めに出すようにしています。',
    ],
  },
  {
    questionOrder: 6,
    questionText: QUESTIONS[6].text,
    idealAnswers: [
      '通知が多すぎるので重要度でフィルタできる設定がほしいです。検索が遅いのも改善してほしいです。',
      'モバイルアプリの動作が重いので軽量化と、CSVエクスポート機能の追加を希望します。',
    ],
  },
];

// ───────────────────────── ペルソナ定義 ─────────────────────────

interface Persona {
  name: string;
  desc: string;
  /** 期待される正しい判定（甘さ評価の基準）: true=報酬を満額付与すべきでない低品質 */
  shouldBeFlagged: boolean;
  answers: Record<number, AnswerInput>;
  durationSec: number;
}

function ans(order: number, a: Partial<AnswerInput>): [number, AnswerInput] {
  return [order, { question_id: `q${order}`, ...a }];
}
function opt(order: number, idx: number) {
  return { option_ids: [`q${order}o${idx}`] };
}

const PERSONAS: Persona[] = [
  {
    name: '1.誠実',
    desc: '具体的で丁寧な回答',
    shouldBeFlagged: false,
    durationSec: 240,
    answers: Object.fromEntries([
      ans(0, { text_answer: '月末に複数案件の締め切りが重なると優先順位の判断が難しく、上長のレビュー待ちで半日作業が止まることがあります。特に仕様変更が口頭で来ると後で齟齬が出ます。' }),
      ans(1, { text_answer: '毎朝チケットを棚卸しして優先度を3段階で付け、午前中は会議を入れない集中時間を確保しています。レビュー依頼も前倒しで出すようにしました。' }),
      ans(2, opt(2, 3)), ans(3, opt(3, 2)), ans(4, opt(4, 3)),
      ans(5, opt(5, 2)), // 「3」= index2
      ans(6, { text_answer: '通知が多すぎて重要なものを見逃すので、重要度フィルタが欲しいです。あと検索が遅いので高速化してほしいです。' }),
    ]),
  },
  {
    name: '2.手抜き短文',
    desc: '「特にない」連発',
    shouldBeFlagged: true,
    durationSec: 25,
    answers: Object.fromEntries([
      ans(0, { text_answer: '特にない' }),
      ans(1, { text_answer: 'ありません' }),
      ans(2, opt(2, 3)), ans(3, opt(3, 3)), ans(4, opt(4, 3)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: 'わからない' }),
    ]),
  },
  {
    name: '3.設問丸写し',
    desc: '設問文をコピペ',
    shouldBeFlagged: true,
    durationSec: 40,
    answers: Object.fromEntries([
      ans(0, { text_answer: '普段の業務で最も課題に感じていることを具体的な場面を交えて教えてください' }),
      ans(1, { text_answer: 'その課題に対して現在工夫していることがあれば教えてください' }),
      ans(2, opt(2, 3)), ans(3, opt(3, 3)), ans(4, opt(4, 3)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: '今後改善してほしい点があれば具体的に教えてください' }),
    ]),
  },
  {
    name: '4.的外れ',
    desc: '無関係な話題',
    shouldBeFlagged: true,
    durationSec: 50,
    answers: Object.fromEntries([
      ans(0, { text_answer: '昨日の夜ご飯はカレーでした。とても美味しかったので満足しています。来週は旅行に行く予定です。' }),
      ans(1, { text_answer: '最近は天気が良くて散歩が気持ちいいです。猫を飼い始めたのでとても癒されています。' }),
      ans(2, opt(2, 4)), ans(3, opt(3, 4)), ans(4, opt(4, 4)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: '好きな映画はアクション映画です。週末はよく映画館に行きます。' }),
    ]),
  },
  {
    name: '5.直線回答',
    desc: 'スケール全て同じ＋空文字回避',
    shouldBeFlagged: true,
    durationSec: 30,
    answers: Object.fromEntries([
      ans(0, { text_answer: 'いいと思います。' }),
      ans(1, { text_answer: 'いいと思います。' }),
      ans(2, opt(2, 4)), ans(3, opt(3, 4)), ans(4, opt(4, 4)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: 'いいと思います。' }),
    ]),
  },
  {
    name: '6.爆速',
    desc: '極端に短い所要時間',
    shouldBeFlagged: true,
    durationSec: 6,
    answers: Object.fromEntries([
      ans(0, { text_answer: '締め切りが厳しいことです。' }),
      ans(1, { text_answer: '早めに着手しています。' }),
      ans(2, opt(2, 3)), ans(3, opt(3, 3)), ans(4, opt(4, 3)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: '特にありません。' }),
    ]),
  },
  {
    name: '7.AI生成',
    desc: '流暢だが一般論で中身が薄い',
    shouldBeFlagged: true,
    durationSec: 90,
    answers: Object.fromEntries([
      ans(0, { text_answer: '業務における課題は多岐にわたりますが、効率化とコミュニケーションの最適化が重要だと考えています。日々改善に努めることが大切です。' }),
      ans(1, { text_answer: '工夫として、計画的にタスクを管理し、チームと連携を取りながら柔軟に対応することを心がけています。継続的な改善が鍵となります。' }),
      ans(2, opt(2, 4)), ans(3, opt(3, 3)), ans(4, opt(4, 4)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: '全体的に良い製品ですが、さらなる利便性の向上を期待しています。今後の発展に期待しています。' }),
    ]),
  },
  {
    name: '8.使い回し',
    desc: '同じ長文を全設問にコピペ',
    shouldBeFlagged: true,
    durationSec: 60,
    answers: Object.fromEntries([
      ans(0, { text_answer: 'タスク管理が大変で締め切りに追われることが多く、もっと効率化したいと常々感じています。' }),
      ans(1, { text_answer: 'タスク管理が大変で締め切りに追われることが多く、もっと効率化したいと常々感じています。' }),
      ans(2, opt(2, 3)), ans(3, opt(3, 3)), ans(4, opt(4, 3)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: 'タスク管理が大変で締め切りに追われることが多く、もっと効率化したいと常々感じています。' }),
    ]),
  },
  {
    name: '9.注意失敗',
    desc: 'アテンション誤答',
    shouldBeFlagged: true,
    durationSec: 120,
    answers: Object.fromEntries([
      ans(0, { text_answer: 'レビュー待ちで作業が止まることが課題で、属人化も進んでいます。具体的には承認フローが遅いです。' }),
      ans(1, { text_answer: '自動化スクリプトを書いて定型作業を減らし、ドキュメントを整備しています。' }),
      ans(2, opt(2, 3)), ans(3, opt(3, 2)), ans(4, opt(4, 3)),
      ans(5, opt(5, 4)), // 「5」を選択 → 誤答
      ans(6, { text_answer: '検索機能の精度を上げてほしいです。タグ付けも自動化されると助かります。' }),
    ]),
  },
  {
    name: '10.乱文',
    desc: '意味のない文字列',
    shouldBeFlagged: true,
    durationSec: 35,
    answers: Object.fromEntries([
      ans(0, { text_answer: 'あああああ asdf てきとう 12345' }),
      ans(1, { text_answer: 'aaaaaaa bbbbbb ccccc てすと' }),
      ans(2, opt(2, 0)), ans(3, opt(3, 4)), ans(4, opt(4, 2)),
      ans(5, opt(5, 2)),
      ans(6, { text_answer: 'qwerty zxcvb てきとうな文字列 99999' }),
    ]),
  },
];

// ───────────────────────── モックLLM（やや甘めの実在Gemini相当）─────────────────────────

/**
 * 実在 Gemini は positivity bias によりおおむね 55〜75 を返す傾向。
 * 明確な無内容（空・乱文・丸写し）は下げるが、流暢な一般論（AI生成）には甘い。
 * ここでは「内容語数・流暢さ」に基づく素朴なヒューリスティックで近似する。
 */
class MockLenientLLM implements IQualityEvaluator {
  async evaluate(items: EvaluationItem[]): Promise<QualityResult> {
    const texts = items
      .filter((i) => i.question.type === 'paragraph')
      .map((i) => (i.answer?.text_answer ?? '').trim());
    let sum = 0;
    for (const t of texts) {
      const len = t.length;
      // 語彙の多様性（ユニークな2-gramの種類数）でおおまかに「具体性」を測る
      const grams = new Set<string>();
      const s2 = t.replace(/\s/g, '');
      for (let i = 0; i + 2 <= s2.length; i++) grams.add(s2.slice(i, i + 2));
      const variety = grams.size;
      const looksGibberish = /^[a-z0-9\s]+$/i.test(t.replace(/[ぁ-んァ-ヶ一-龠ー、。]/g, ''));
      let s: number;
      if (len < 6) s = 25;
      else if (looksGibberish) s = 30;
      else if (len < 15) s = 50; // 短い定型でも「形式は埋まる」→甘め
      else if (variety >= 35) s = 84; // 具体的で語彙が豊か → 高評価
      else s = 68; // 流暢だが一般論 → positivity bias で合格点止まり
      sum += s;
    }
    const score = texts.length ? Math.round(sum / texts.length) : 70;
    return { score, feedback: `モックLLM評価: ${score}点` };
  }
}

// CompositeEvaluator は index.ts 内で非公開なので、ここで同じ合成規則を再現する。
function composite(ai: QualityResult, rule: QualityResult): QualityResult {
  if (rule.score === 0) return rule;
  const a = ai.score, r = rule.score;
  if (a <= r) return { score: a, feedback: ai.feedback };
  if (a > r + 15) {
    if (a >= 80 && r >= 70) return { score: a, feedback: ai.feedback };
    return { score: r, feedback: rule.feedback };
  }
  return { score: a, feedback: ai.feedback };
}

// ───────────────────────── 実行 ─────────────────────────

describe('10ペルソナ採点シミュレーション', () => {
  let refs: SurveyReferenceVectors;
  const encoder = new HashingEncoder();

  beforeAll(async () => {
    setLocalEncoderForTest(encoder);
    refs = await buildReferenceVectors(encoder, REFERENCE_SOURCES);
  });

  it('現状パイプラインで各ペルソナを最終ティアまで採点する', async () => {
    const rows: Record<string, unknown>[] = [];
    const llm = new MockLenientLLM();

    for (const p of PERSONAS) {
      const items: EvaluationItem[] = QUESTIONS.map((question) => ({
        question,
        correctOptionText: question.type === 'attention' ? ATTENTION_CORRECT : undefined,
        answer: p.answers[question.order_index],
      }));
      const ctx = { durationSec: p.durationSec };

      const rule = await new RuleBasedEvaluator().evaluate(items, ctx);
      const localEval = new LocalEmbeddingEvaluator(refs, async () => encoder);
      const relevanceRisk = await localEval.computeRelRisk(items);

      const mech: MechSignals = {
        rulePass: rule.score >= 100,
        ruleScore: rule.score,
        durationSec: p.durationSec,
        relevanceRisk,
      };

      const routing = shouldCallLLM(items, mech, {});
      const quality = routing.callLLM ? composite(await llm.evaluate(items), rule) : rule;

      const mechScore = Math.max(0, Math.min(1, (100 - mech.ruleScore) / 100));
      const llmRisk = Math.max(0, Math.min(1, (100 - quality.score) / 100));
      const g = gradeImpl({ mechScore, llmRisk, relRisk: relevanceRisk });

      rows.push({
        persona: p.name,
        要注意: p.shouldBeFlagged ? 'YES' : '-',
        rule: rule.score,
        relRisk: relevanceRisk.toFixed(2),
        LLM呼: routing.callLLM ? 'Y' : 'N',
        quality: quality.score,
        finalRisk: g.finalRisk.toFixed(2),
        tier: g.tier,
        payout: g.payoutRate,
        判定: p.shouldBeFlagged && g.payoutRate >= 0.8 ? '★甘い見逃し' : '',
      });
    }

    // 結果表を出力（vitestのconsole抑制を避けるためファイルにも書く）
    const flaggedButPassed = rows.filter((r) => r['判定'] === '★甘い見逃し');
    const header = ['persona', '要注意', 'rule', 'relRisk', 'LLM呼', 'quality', 'finalRisk', 'tier', 'payout', '判定'];
    const lines = [
      header.join('\t'),
      ...rows.map((r) => header.map((h) => String(r[h] ?? '')).join('\t')),
      '',
      `要注意 ${PERSONAS.filter((p) => p.shouldBeFlagged).length} 件中、payout>=0.8 で素通し: ${flaggedButPassed.length} 件`,
    ];
    const out = lines.join('\n');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').writeFileSync(require('path').resolve(process.cwd(), '_sim_result.tsv'), out, 'utf-8');

    expect(rows.length).toBe(10);
  });
});
