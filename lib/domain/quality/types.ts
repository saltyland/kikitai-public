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
   * アテンションチェックの正解選択肢テキスト。
   * type='attention' の設問では config.correctOptionText から供給される。
   */
  correctOptionText?: string;
}

/** 回答全体に関する評価コンテキスト（設問単位の items とは別のメタ情報） */
export interface EvaluationContext {
  /** 回答開始〜送信までの所要秒数（クライアント計測。改ざん可能なため参考値） */
  durationSec?: number;
}

/** 品質評価器の共通インターフェース（Strategyパターン） */
export interface IQualityEvaluator {
  evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult>;
}

/** スコアからポイント付与倍率を求める（DESIGN_SPEC §2）。 */
export function scoreToMultiplier(score: number): number {
  if (score >= 80) return 1.5; // 高品質
  if (score >= 50) return 1.0; // 標準
  return 0; // 無効
}
