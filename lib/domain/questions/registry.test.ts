import { describe, expect, it } from 'vitest';
import { QuestionTypeRegistry } from './registry';
import { ScaleQuestion } from './ChoiceQuestion';
import type { QuestionInput, QuestionType, ScaleConfig } from '@/lib/types/database';

/** テスト用の最小 QuestionInput を組み立てる */
function input(partial: Partial<QuestionInput> & { type: QuestionType }): QuestionInput {
  return {
    text: 'Q',
    description: null,
    required: false,
    options: [],
    config: null,
    section_index: 0,
    condition: null,
    ...partial,
  };
}

describe('QuestionTypeRegistry', () => {
  it('登録済みの全タイプの定義を取得できる', () => {
    const types: QuestionType[] = [
      'single',
      'multiple',
      'dropdown',
      'text',
      'paragraph',
      'date',
      'scale',
      'grid',
    ];
    for (const t of types) {
      expect(QuestionTypeRegistry.get(t).type).toBe(t);
    }
  });

  it('未対応のタイプは例外を投げる', () => {
    expect(() => QuestionTypeRegistry.get('unknown' as QuestionType)).toThrow(/未対応/);
  });

  it('all() はタイプ選択メニューの表示順を保つ（先頭は単一選択）', () => {
    const all = QuestionTypeRegistry.all();
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(all[0].type).toBe('single');
  });
});

describe('ScaleQuestion.buildOptions（#19 段階評価の選択肢生成）', () => {
  const scale = new ScaleQuestion();

  it('min=1,max=5 なら 5 段階（1〜5）を生成する', () => {
    const opts = scale.buildOptions(
      input({ type: 'scale', config: { min: 1, max: 5, minLabel: null, maxLabel: null } })
    );
    expect(opts.map((o) => o.text)).toEqual(['1', '2', '3', '4', '5']);
    // order_index は 0 始まりの連番
    expect(opts.map((o) => o.order_index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('min=0,max=10 なら 11 段階（0〜10）を生成する', () => {
    const opts = scale.buildOptions(
      input({ type: 'scale', config: { min: 0, max: 10, minLabel: null, maxLabel: null } })
    );
    expect(opts).toHaveLength(11);
    expect(opts[0].text).toBe('0');
    expect(opts[10].text).toBe('10');
  });

  it('config 未設定なら既定の 1〜5 になる', () => {
    const opts = scale.buildOptions(input({ type: 'scale', config: null }));
    expect(opts.map((o) => o.text)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('max が範囲外（>10）でも 10 に丸めて生成する', () => {
    const cfg = { min: 1, max: 99, minLabel: null, maxLabel: null } as ScaleConfig;
    const opts = scale.buildOptions(input({ type: 'scale', config: cfg }));
    expect(opts).toHaveLength(10);
    expect(opts[9].text).toBe('10');
  });

  it('min>=max の不正設定でも min<max を保証して少なくとも2段階を生成する', () => {
    const cfg = { min: 1, max: 1, minLabel: null, maxLabel: null } as ScaleConfig;
    const opts = scale.buildOptions(input({ type: 'scale', config: cfg }));
    expect(opts.length).toBeGreaterThanOrEqual(2);
  });
});
