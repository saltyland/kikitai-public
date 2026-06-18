import { describe, expect, it } from 'vitest';
import { RuleBasedEvaluator } from './ruleBased';
import { scoreToMultiplier } from './types';
import type { EvaluationItem } from './types';
import type { AnswerInput, QuestionType, QuestionWithOptions } from '@/lib/types/database';

/** テスト用に設問＋選択肢を組み立てる */
function question(
  id: string,
  type: QuestionType,
  optionTexts: string[] = []
): QuestionWithOptions {
  return {
    id,
    survey_id: 's',
    type,
    text: id,
    description: null,
    required: false,
    config: null,
    section_index: 0,
    order_index: 0,
    condition: null,
    options: optionTexts.map((t, i) => ({ id: `${id}-o${i}`, question_id: id, text: t, order_index: i })),
  };
}

function item(
  q: QuestionWithOptions,
  answer: AnswerInput | undefined,
  correctOptionText?: string
): EvaluationItem {
  return { question: q, answer, correctOptionText };
}

const evaluator = new RuleBasedEvaluator();

describe('RuleBasedEvaluator', () => {
  it('問題のない回答は満点（100）を返す', async () => {
    const q = question('q1', 'single', ['A', 'B']);
    const res = await evaluator.evaluate([item(q, { question_id: 'q1', option_ids: ['q1-o0'] })]);
    expect(res.score).toBe(100);
  });

  it('アテンションチェック不正解は即座にスコア0', async () => {
    const q = question('att', 'attention', ['正解', '不正解']);
    const res = await evaluator.evaluate([
      item(q, { question_id: 'att', option_ids: ['att-o1'] }, '正解'),
    ]);
    expect(res.score).toBe(0);
  });

  it('アテンションチェック正解はスコアを下げない', async () => {
    const q = question('att', 'attention', ['正解', '不正解']);
    const res = await evaluator.evaluate([
      item(q, { question_id: 'att', option_ids: ['att-o0'] }, '正解'),
    ]);
    expect(res.score).toBe(100);
  });

  it('短すぎる自由記述（10文字未満）は減点される', async () => {
    const q = question('t', 'paragraph');
    const res = await evaluator.evaluate([item(q, { question_id: 't', text_answer: '短い' })]);
    expect(res.score).toBeLessThan(100);
  });

  it('回答時間が短すぎると減点される', async () => {
    const q = question('q1', 'single', ['A', 'B']);
    const res = await evaluator.evaluate(
      [item(q, { question_id: 'q1', option_ids: ['q1-o0'] })],
      { durationSec: 0 }
    );
    expect(res.score).toBeLessThan(100);
  });

  it('選択式5問が全て同じ位置の選択肢だと機械的回答として減点される', async () => {
    // 各設問で order_index=0（先頭）の選択肢を選び続ける一直線回答
    const items = ['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => {
      const q = question(id, 'single', ['A', 'B', 'C']);
      return item(q, { question_id: id, option_ids: [`${id}-o0`] });
    });
    const res = await evaluator.evaluate(items);
    expect(res.score).toBeLessThan(100);
  });

  it('選択位置がばらけた通常の回答は減点されない', async () => {
    const items = ['q1', 'q2', 'q3', 'q4', 'q5'].map((id, idx) => {
      const q = question(id, 'single', ['A', 'B', 'C']);
      return item(q, { question_id: id, option_ids: [`${id}-o${idx % 3}`] });
    });
    const res = await evaluator.evaluate(items);
    expect(res.score).toBe(100);
  });

  it('スコアは0〜100にクランプされる', async () => {
    // アテンション不正解（0）＋他の減点が重なっても下限0
    const att = question('att', 'attention', ['正解', '誤り']);
    const res = await evaluator.evaluate([
      item(att, { question_id: 'att', option_ids: ['att-o1'] }, '正解'),
    ]);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
  });
});

describe('scoreToMultiplier（スコア→ポイント倍率）', () => {
  it('80以上は高品質1.5倍', () => {
    expect(scoreToMultiplier(80)).toBe(1.5);
    expect(scoreToMultiplier(100)).toBe(1.5);
  });

  it('50〜79は標準1.0倍', () => {
    expect(scoreToMultiplier(50)).toBe(1.0);
    expect(scoreToMultiplier(79)).toBe(1.0);
  });

  it('50未満は無効0倍', () => {
    expect(scoreToMultiplier(49)).toBe(0);
    expect(scoreToMultiplier(0)).toBe(0);
  });
});
