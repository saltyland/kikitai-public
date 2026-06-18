import { describe, expect, it } from 'vitest';
import { RuleBasedEvaluator } from './ruleBased';
import type { EvaluationItem } from './types';
import type { AnswerInput, QuestionType, QuestionWithOptions } from '@/lib/types/database';

/** テスト用に設問を組み立てる（B-1拡張テスト用。本文テキストを指定可能） */
function tq(id: string, type: QuestionType, text: string): QuestionWithOptions {
  return {
    id,
    survey_id: 's',
    type,
    text,
    description: null,
    required: false,
    config: null,
    section_index: 0,
    order_index: 0,
    condition: null,
    options: [],
  };
}

function item(q: QuestionWithOptions, answer: AnswerInput | undefined): EvaluationItem {
  return { question: q, answer };
}

const evaluator = new RuleBasedEvaluator();

describe('RuleBasedEvaluator B-1拡張（情報量・被覆率・コピペ）', () => {
  it('中身のある自由記述は減点されない（満点）', async () => {
    const q = tq('q1', 'paragraph', '休日の過ごし方について自由に教えてください');
    const res = await evaluator.evaluate([
      item(q, {
        question_id: 'q1',
        text_answer: '休日は家族と公園に出かけたり、読書をしたりしてゆっくり過ごすことが多いです。',
      }),
    ]);
    expect(res.score).toBe(100);
  });

  it('情報量: 定型句中心の回答は減点される', async () => {
    const q = tq('q1', 'paragraph', 'この商品の改善点を具体的に教えてください');
    const res = await evaluator.evaluate([
      item(q, { question_id: 'q1', text_answer: '特になし特になし特になしわからない' }),
    ]);
    expect(res.score).toBeLessThan(100);
  });

  it('コピペ: 設問文の丸写しは減点される', async () => {
    const text = 'あなたが最近読んで面白かった本のタイトルを教えてください';
    const q = tq('q1', 'paragraph', text);
    const res = await evaluator.evaluate([item(q, { question_id: 'q1', text_answer: text })]);
    expect(res.score).toBeLessThan(100);
  });

  it('近傍重複: 複数の自由記述がほぼ同一だと減点される', async () => {
    const q1 = tq('q1', 'paragraph', 'サービスの良かった点を教えてください');
    const q2 = tq('q2', 'paragraph', 'サービスの悪かった点を教えてください');
    const dup = '対応がとても丁寧で、説明も分かりやすくて満足できる内容でした。';
    const res = await evaluator.evaluate([
      item(q1, { question_id: 'q1', text_answer: dup }),
      item(q2, { question_id: 'q2', text_answer: dup }),
    ]);
    expect(res.score).toBeLessThan(100);
  });

  it('既存ルール（選択式のみ）は影響を受けず満点のまま', async () => {
    const q = tq('q1', 'single', '好きな色');
    q.options = [{ id: 'q1-o0', question_id: 'q1', text: '赤', order_index: 0 }];
    const res = await evaluator.evaluate([item(q, { question_id: 'q1', option_ids: ['q1-o0'] })]);
    expect(res.score).toBe(100);
  });
});
