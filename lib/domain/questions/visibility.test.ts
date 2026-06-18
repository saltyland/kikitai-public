import { describe, expect, it } from 'vitest';
import { computeVisibleQuestionIds } from './visibility';
import type { QuestionWithOptions } from '@/lib/types/database';

/** テスト用に最小限の設問を組み立てる */
function q(
  id: string,
  order: number,
  condition: QuestionWithOptions['condition'] = null,
  optionTexts: string[] = []
): QuestionWithOptions {
  return {
    id,
    survey_id: 's',
    type: 'single',
    text: id,
    description: null,
    required: false,
    config: null,
    section_index: 0,
    order_index: order,
    condition,
    options: optionTexts.map((t, i) => ({ id: `${id}-o${i}`, question_id: id, text: t, order_index: i })),
  };
}

describe('computeVisibleQuestionIds', () => {
  it('条件なしの設問はすべて表示される', () => {
    const questions = [q('a', 0), q('b', 1)];
    const visible = computeVisibleQuestionIds(questions, () => []);
    expect(visible).toEqual(new Set(['a', 'b']));
  });

  it('条件が満たされたときだけ条件付き設問を表示する', () => {
    const a = q('a', 0, null, ['はい', 'いいえ']);
    const b = q('b', 1, { sourceQuestionOrder: 0, optionTexts: ['はい'] });
    const selected = (qid: string) => (qid === 'a' ? ['はい'] : []);
    const visible = computeVisibleQuestionIds([a, b], selected);
    expect(visible.has('b')).toBe(true);
  });

  it('条件が満たされないと条件付き設問は非表示', () => {
    const a = q('a', 0, null, ['はい', 'いいえ']);
    const b = q('b', 1, { sourceQuestionOrder: 0, optionTexts: ['はい'] });
    const selected = (qid: string) => (qid === 'a' ? ['いいえ'] : []);
    const visible = computeVisibleQuestionIds([a, b], selected);
    expect(visible.has('b')).toBe(false);
  });

  it('複数選択で条件の選択肢が含まれていれば表示する', () => {
    const a = q('a', 0, null, ['赤', '青', '緑']);
    const b = q('b', 1, { sourceQuestionOrder: 0, optionTexts: ['青'] });
    const selected = (qid: string) => (qid === 'a' ? ['赤', '青'] : []);
    const visible = computeVisibleQuestionIds([a, b], selected);
    expect(visible.has('b')).toBe(true);
  });

  it('条件元が非表示なら、その先の条件付き設問も連鎖的に非表示', () => {
    const a = q('a', 0, null, ['はい', 'いいえ']);
    const b = q('b', 1, { sourceQuestionOrder: 0, optionTexts: ['はい'] });
    // c は b（非表示）の選択に依存する
    const c = q('c', 2, { sourceQuestionOrder: 1, optionTexts: ['次へ'] });
    const selected = (qid: string) => {
      if (qid === 'a') return ['いいえ']; // b は非表示
      if (qid === 'b') return ['次へ'];
      return [];
    };
    const visible = computeVisibleQuestionIds([a, b, c], selected);
    expect(visible.has('b')).toBe(false);
    expect(visible.has('c')).toBe(false);
  });

  it('順不同で渡しても order_index 順に評価される', () => {
    const a = q('a', 0, null, ['はい']);
    const b = q('b', 1, { sourceQuestionOrder: 0, optionTexts: ['はい'] });
    const selected = (qid: string) => (qid === 'a' ? ['はい'] : []);
    const visible = computeVisibleQuestionIds([b, a], selected);
    expect(visible).toEqual(new Set(['a', 'b']));
  });

  it('複数の条件選択肢のいずれかが一致すれば表示する', () => {
    const a = q('a', 0, null, ['赤', '青', '緑']);
    const b = q('b', 1, { sourceQuestionOrder: 0, optionTexts: ['青', '緑'] });
    const selected1 = (qid: string) => (qid === 'a' ? ['青'] : []);
    const selected2 = (qid: string) => (qid === 'a' ? ['緑'] : []);
    const selected3 = (qid: string) => (qid === 'a' ? ['赤'] : []);
    expect(computeVisibleQuestionIds([a, b], selected1).has('b')).toBe(true);
    expect(computeVisibleQuestionIds([a, b], selected2).has('b')).toBe(true);
    expect(computeVisibleQuestionIds([a, b], selected3).has('b')).toBe(false);
  });
});
