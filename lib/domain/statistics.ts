import type { QuestionAggregate } from '@/lib/types/database';

/** 数値統計量（スケール設問など、数値とみなせる回答に対して算出） */
export interface NumericStats {
  n: number;
  mean: number;
  median: number;
  /** 母標準偏差 */
  sd: number;
  min: number;
  max: number;
  /** 最頻値 */
  mode: number;
}

/** 数値配列の基礎統計量を求める。空配列なら null。 */
export function numericStats(values: number[]): NumericStats | null {
  const n = values.length;
  if (n === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);

  // 最頻値
  const freq = new Map<number, number>();
  values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  let mode = sorted[0];
  let best = 0;
  freq.forEach((count, v) => {
    if (count > best) {
      best = count;
      mode = v;
    }
  });

  return { n, mean, median, sd, min: sorted[0], max: sorted[n - 1], mode };
}

/**
 * 集計結果から「数値とみなせる回答値」を復元する。
 * スケール設問（選択肢テキストが数値）を対象に、選択肢ごとの件数から値の配列を作る。
 * 数値化できない設問は null を返す。
 */
export function numericValuesFromAggregate(agg: QuestionAggregate): number[] | null {
  if (agg.question.type !== 'scale') return null;
  const values: number[] = [];
  for (const o of agg.question.options) {
    const v = Number(o.text);
    if (Number.isNaN(v)) continue;
    const count = agg.optionCounts[o.id] ?? 0;
    for (let i = 0; i < count; i++) values.push(v);
  }
  return values;
}

/** 選択式設問の最頻選択肢（テキスト, 件数）を返す。なければ null。 */
export function topChoice(agg: QuestionAggregate): { text: string; count: number } | null {
  let best: { text: string; count: number } | null = null;
  for (const o of agg.question.options) {
    const count = agg.optionCounts[o.id] ?? 0;
    if (!best || count > best.count) best = { text: o.text, count };
  }
  return best;
}
