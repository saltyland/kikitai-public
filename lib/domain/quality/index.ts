import type { EvaluationItem, IQualityEvaluator, QualityResult } from './types';
import { RuleBasedEvaluator } from './ruleBased';
import { GeminiEvaluator } from './gemini';

export type { IQualityEvaluator, QualityResult, EvaluationItem } from './types';
export { scoreToMultiplier } from './types';

/**
 * Gemini を優先し、失敗時はルールベースへ自動フォールバックする評価器。
 * APIキーがなくても必ず評価結果を返せるようにする（DESIGN_SPEC §2）。
 */
class FallbackEvaluator implements IQualityEvaluator {
  constructor(
    private readonly primary: IQualityEvaluator,
    private readonly fallback: IQualityEvaluator
  ) {}

  async evaluate(items: EvaluationItem[]): Promise<QualityResult> {
    try {
      return await this.primary.evaluate(items);
    } catch (e) {
      console.error('[quality] Gemini評価に失敗。ルールベースにフォールバックします:', e);
      return this.fallback.evaluate(items);
    }
  }
}

/**
 * 環境に応じた品質評価器を生成する（Strategyパターン）。
 * GEMINI_API_KEY があれば Gemini（失敗時はルールベース）、なければルールベース単体。
 */
export function createQualityEvaluator(): IQualityEvaluator {
  const ruleBased = new RuleBasedEvaluator();
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new FallbackEvaluator(new GeminiEvaluator(apiKey), ruleBased);
  }
  return ruleBased;
}
