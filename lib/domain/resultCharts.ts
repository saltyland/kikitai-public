import type { QuestionAggregate, QuestionType } from '@/lib/types/database';
import { numericStats, numericValuesFromAggregate, type NumericStats } from '@/lib/domain/statistics';

/** クライアントへ渡せる設問チャート用データ（シリアライズ可能） */
export interface QuestionChartData {
  id: string;
  index: number; // 0始まり
  text: string;
  type: QuestionType;
  /** 選択肢ごとの度数（選択式のみ。テキスト/日付は空） */
  items: { label: string; count: number }[];
  /** multiple=true は割合分母が回答数（合計≠回答数）になる */
  multiple: boolean;
  /** 割合の分母 */
  total: number;
  /** 数値設問の基礎統計量（scale のみ） */
  stats: NumericStats | null;
  /** テキスト系の回答一覧（自由記述・日付） */
  textAnswers: string[];
  /** グリッド集計（行→列→件数） */
  gridCounts?: Record<string, Record<string, number>>;
}

/** 集計結果（aggregates＋回答数）をチャート描画用データへ変換する */
export function toChartData(
  aggregates: QuestionAggregate[],
  responseCount: number
): QuestionChartData[] {
  return aggregates.map((agg, index) => {
    const q = agg.question;
    const items = q.options.map((o) => ({
      label: o.text,
      count: agg.optionCounts[o.id] ?? 0,
    }));
    const sum = items.reduce((a, b) => a + b.count, 0);
    const multiple = q.type === 'multiple';
    const values = numericValuesFromAggregate(agg);
    return {
      id: q.id,
      index,
      text: q.text,
      type: q.type,
      items,
      multiple,
      total: multiple ? responseCount : sum,
      stats: values ? numericStats(values) : null,
      textAnswers: agg.textAnswers,
      gridCounts: agg.gridCounts,
    };
  });
}
