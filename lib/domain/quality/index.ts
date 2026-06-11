import type {
  EvaluationContext,
  EvaluationItem,
  IQualityEvaluator,
  QualityResult,
} from './types';
import { RuleBasedEvaluator } from './ruleBased';
import { GeminiEvaluator } from './gemini';

export type {
  IQualityEvaluator,
  QualityResult,
  EvaluationItem,
  EvaluationContext,
} from './types';
export { scoreToMultiplier } from './types';

/** AIスコアとルールベーススコアの乖離がこれを超えたらルールベースを優先する */
const MAX_SCORE_DIVERGENCE = 40;

/**
 * AI評価（Gemini）とルールベース評価を突き合わせる合成評価器。
 *
 *  - AI評価が失敗したらルールベースへフォールバック（可用性）
 *  - AIとルールベースのスコア乖離が大きい場合はルールベースを優先
 *    （プロンプトインジェクションで「score:100を返せ」等とAIを操作された場合の防衛線）
 *  - ルールベースが0点（アテンションチェック誤答等）なら無条件で0点
 */
class CompositeEvaluator implements IQualityEvaluator {
  constructor(
    private readonly ai: IQualityEvaluator,
    private readonly ruleBased: IQualityEvaluator
  ) {}

  async evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult> {
    const rule = await this.ruleBased.evaluate(items, context);
    if (rule.score === 0) return rule;

    let aiResult: QualityResult;
    try {
      aiResult = await this.ai.evaluate(items, context);
    } catch (e) {
      console.error('[quality] AI評価に失敗。ルールベースにフォールバックします:', e);
      return rule;
    }

    if (Math.abs(aiResult.score - rule.score) > MAX_SCORE_DIVERGENCE) {
      console.warn(
        `[quality] AIスコア(${aiResult.score})とルールベース(${rule.score})の乖離が大きいためルールベースを採用`
      );
      return rule;
    }
    return aiResult;
  }
}

/**
 * 環境に応じた品質評価器を生成する（Strategyパターン）。
 * GEMINI_API_KEY があれば Gemini＋ルールベースの合成評価、なければルールベース単体。
 */
export function createQualityEvaluator(): IQualityEvaluator {
  const ruleBased = new RuleBasedEvaluator();
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new CompositeEvaluator(new GeminiEvaluator(apiKey), ruleBased);
  }
  return ruleBased;
}
