import { describe, expect, it } from 'vitest';
import { numericStats, numericValuesFromAggregate, topChoice } from './statistics';
import type { QuestionAggregate, QuestionWithOptions } from '@/lib/types/database';

describe('numericStats', () => {
  it('空配列は null', () => {
    expect(numericStats([])).toBeNull();
  });

  it('奇数個の中央値・平均・標準偏差を求める', () => {
    const s = numericStats([1, 2, 3, 4, 5])!;
    expect(s.n).toBe(5);
    expect(s.mean).toBe(3);
    expect(s.median).toBe(3);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.sd).toBeCloseTo(Math.sqrt(2), 5); // 母標準偏差
  });

  it('偶数個の中央値は中央2値の平均', () => {
    const s = numericStats([1, 2, 3, 4])!;
    expect(s.median).toBe(2.5);
  });

  it('最頻値を返す', () => {
    const s = numericStats([1, 2, 2, 2, 3])!;
    expect(s.mode).toBe(2);
  });
});

function scaleAggregate(optionValues: string[], counts: number[]): QuestionAggregate {
  const question = {
    id: 'q',
    survey_id: 's',
    type: 'scale',
    text: 'q',
    description: null,
    required: false,
    config: null,
    section_index: 0,
    order_index: 0,
    condition: null,
    options: optionValues.map((t, i) => ({ id: `o${i}`, question_id: 'q', text: t, order_index: i })),
  } satisfies QuestionWithOptions;
  const optionCounts: Record<string, number> = {};
  optionValues.forEach((_, i) => (optionCounts[`o${i}`] = counts[i] ?? 0));
  return { question, optionCounts, textAnswers: [] };
}

describe('numericValuesFromAggregate', () => {
  it('スケール以外は null', () => {
    const agg = scaleAggregate(['1', '2'], [1, 1]);
    const notScale = { ...agg, question: { ...agg.question, type: 'single' as const } };
    expect(numericValuesFromAggregate(notScale)).toBeNull();
  });

  it('選択肢の件数から値配列を復元する', () => {
    const agg = scaleAggregate(['1', '2', '3'], [2, 0, 1]);
    expect(numericValuesFromAggregate(agg)).toEqual([1, 1, 3]);
  });
});

describe('topChoice', () => {
  it('最も多い選択肢を返す', () => {
    const agg = scaleAggregate(['A', 'B', 'C'], [1, 5, 2]);
    expect(topChoice(agg)).toEqual({ text: 'B', count: 5 });
  });
});
