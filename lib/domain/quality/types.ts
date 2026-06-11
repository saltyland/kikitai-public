import type { AnswerInput, QuestionWithOptions } from '@/lib/types/database';

/**
 * AI品質評価（DESIGN_SPEC §2）。
 * 回答者が送信した回答を自動で品質評価し、ポイント付与倍率を決定するための共通インターフェース。
 */
export interface QualityResult {
  /** 0〜100 のスコア */
  score: number;
  /** 日本語フィードバック */
  feedback: string;
}

/** 評価器に渡す1設問ぶんの入力（設問定義＋その回答） */
export interface EvaluationItem {
  question: QuestionWithOptions;
  answer: AnswerInput | undefined;
  /**
   * アテンションチェックの正解選択肢テキスト（指定があれば）。
   * 現行スキーマには正解欄がないため通常は undefined。将来 config 等で
   * 正解を持たせた場合にルールベース評価が即座に対応できるよう用意している。
   */
  correctOptionText?: string;
}

/** 品質評価器の共通インターフェース（Strategyパターン） */
export interface IQualityEvaluator {
  evaluate(items: EvaluationItem[]): Promise<QualityResult>;
}

/** スコアからポイント付与倍率を求める（DESIGN_SPEC §2）。 */
export function scoreToMultiplier(score: number): number {
  if (score >= 80) return 1.5; // 高品質
  if (score >= 50) return 1.0; // 標準
  return 0; // 無効
}
