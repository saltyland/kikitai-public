import type {
  EvaluationContext,
  EvaluationItem,
  GradeFn,
  IQualityEvaluator,
  QualityResult,
} from './types';
import { scoreToMultiplier } from './types';
import { grade as gradeImpl } from './grade';
import { RuleBasedEvaluator } from './ruleBased';
import { GeminiEvaluator } from './gemini';
// S2/S4 が配置したLLMプロバイダ実装。AI_PROVIDER_SPECS に載せて連鎖に組み込む。
import { GroqEvaluator } from './groq';
import { CerebrasEvaluator } from './cerebras';
import { LocalLLMEvaluator } from './local';

export type {
  IQualityEvaluator,
  QualityResult,
  EvaluationItem,
  EvaluationContext,
  QualityTier,
  GradeResult,
  RoutingDecision,
  QualityHints,
  MechSignals,
  SanitizeItemsFn,
  GradeFn,
} from './types';
export { scoreToMultiplier } from './types';
export { RuleBasedEvaluator } from './ruleBased';
export { shouldCallLLM } from './routing';
export type { RoutingUser } from './routing';
export {
  evaluateWithDeadline,
  resolveQualityDeadlineMs,
  DEFAULT_QUALITY_DEADLINE_MS,
} from './deadline';
export type { DeadlineEvaluation } from './deadline';

/**
 * AI評価（LLM）とルールベース評価を突き合わせる合成評価器。
 *
 * スコア合成ルール（injection防御・非対称min）:
 *  - rule.score===0（アテンション誤答等）      → 無条件 0
 *  - AI 失敗                                   → ルールベースへフォールバック
 *  - ai <= rule                                → ai               // LLMが厳しい→そのまま尊重
 *  - ai > rule+15 かつ !(ai>=80 && rule>=70)   → rule              // 吊り上げ疑い→rule天井
 *  - それ以外                                  → ai
 *
 * feedbackは採用側（スコアを決定した評価器）から取る。
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

    const aiScore   = aiResult.score;
    const ruleScore = rule.score;

    let finalScore: number;
    let useAiFeedback: boolean;

    if (aiScore <= ruleScore) {
      // LLM が厳しく評価している → そのまま尊重する。
      // （旧実装は aiScore+10 の下駄を履かせ、LLM の厳格な低評価を緩めて甘さの一因になっていた）
      finalScore    = aiScore;
      useAiFeedback = true;
    } else if (aiScore > ruleScore + 15) {
      // AI スコアが rule を大幅に上回る → 吊り上げ（injection）疑い → rule 天井
      // ヒステリシス: 両者ともに高スコアなら AI を許容
      if (aiScore >= 80 && ruleScore >= 70) {
        finalScore    = aiScore;
        useAiFeedback = true;
      } else {
        console.warn(
          `[quality] AIスコア(${aiScore})がルールベース(${ruleScore})を大幅に上回るためルール天井を適用`
        );
        finalScore    = ruleScore;
        useAiFeedback = false;
      }
    } else {
      finalScore    = aiScore;
      useAiFeedback = true;
    }

    return {
      score:    finalScore,
      feedback: useAiFeedback ? aiResult.feedback : rule.feedback,
    };
  }
}

/**
 * 複数のAIプロバイダを順に試すフォールバック連鎖（設計書 §0/§7）。
 * 先頭から順に evaluate を試し、最初に成功した結果を返す。すべて失敗したら
 * 最後の例外を投げ、上位の {@link CompositeEvaluator} がルールベースへ退避する。
 *
 * S2/S4 が groq/cerebras/local 等の {@link IQualityEvaluator} 実装を
 * {@link AI_PROVIDER_SPECS} に追加すると、自動でこの連鎖に載る。
 */
class FallbackChainEvaluator implements IQualityEvaluator {
  constructor(private readonly providers: readonly IQualityEvaluator[]) {}

  async evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult> {
    let lastError: unknown;
    for (const p of this.providers) {
      try {
        return await p.evaluate(items, context);
      } catch (e) {
        lastError = e;
        console.warn('[quality] AIプロバイダが失敗。次のプロバイダへフォールバックします:', e);
      }
    }
    throw lastError ?? new Error('利用可能なAIプロバイダがありません');
  }
}

/* ============================================================================
 * AIプロバイダ配線（拡張ポイント・設計書 §0/§7）
 *
 * 【S2/S4 への案内】新しいLLMプロバイダ（groq / cerebras / local 等）を足すには:
 *   1. `./groq` など別ファイルに `IQualityEvaluator` 実装クラスを置く。
 *   2. このファイル冒頭でそのクラスを static import する。
 *   3. 下の AI_PROVIDER_SPECS に { name, build } を1要素追加する。
 *      build() は環境変数が無ければ null を返すこと（未設定なら連鎖から自動で外れる）。
 *
 * build() が例外を投げても safeBuild が握りつぶして null 化するため、
 * 「プロバイダ実装が未配置／壊れていても全体は動く」ことを保証する。
 * 配列の順序がフォールバックの優先順位（先頭が一次）になる。
 * ========================================================================== */

/** AIプロバイダの生成仕様。build は未設定（env無し等）なら null を返す。 */
interface AIProviderSpec {
  name: string;
  build: () => IQualityEvaluator | null;
}

const AI_PROVIDER_SPECS: AIProviderSpec[] = [
  {
    // ローカルLLM（Ollama / LM Studio 等の OpenAI 互換サーバ）。
    // 日次クォータが無いため、設定されていれば最優先で使い Gemini の 1500件/日 を温存する。
    // LOCAL_LLM_URL 未設定（Vercel 本番等）なら自動で連鎖から外れ、従来どおり gemini が一次になる。
    name: 'local',
    build: () => {
      const url = process.env.LOCAL_LLM_URL;
      if (!url) return null;
      const model = process.env.LOCAL_LLM_MODEL || undefined;
      const timeoutRaw = Number(process.env.LOCAL_LLM_TIMEOUT_MS);
      const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : undefined;
      return new LocalLLMEvaluator(url, model, timeoutMs);
    },
  },
  {
    name: 'gemini',
    build: () => {
      const key = process.env.GEMINI_API_KEY;
      return key ? new GeminiEvaluator(key) : null;
    },
  },
  // ── 拡張ポイント（S2/S4 が配置したプロバイダ）─────────────────────
  // 優先順位＝配列順（local → gemini → groq → cerebras）。各 build は env が
  // 無ければ null を返し、連鎖から自動で外れる。
  {
    name: 'groq',
    build: () => {
      const key = process.env.GROQ_API_KEY;
      return key ? new GroqEvaluator(key) : null;
    },
  },
  {
    name: 'cerebras',
    build: () => {
      const key = process.env.CEREBRAS_API_KEY;
      return key ? new CerebrasEvaluator(key) : null;
    },
  },
];

/** build() の例外を握りつぶし、未配置/破損プロバイダで全体が落ちないようにする。 */
function safeBuild(spec: AIProviderSpec): IQualityEvaluator | null {
  try {
    return spec.build();
  } catch (e) {
    console.warn(`[quality] AIプロバイダ「${spec.name}」の初期化に失敗。スキップします:`, e);
    return null;
  }
}

/** 有効な（env等が揃った）AIプロバイダを優先順位どおりに組み立てる。 */
function buildAIProviders(): IQualityEvaluator[] {
  return AI_PROVIDER_SPECS.map(safeBuild).filter((p): p is IQualityEvaluator => p !== null);
}

/**
 * 環境に応じた品質評価器を生成する（Strategyパターン・設計書 §0/§7）。
 *  - 常時：ルールベース（床＝外部依存なしのフォールバック）
 *  - 有効なAIプロバイダがあれば、それを一次にした合成評価
 *    （プロバイダが複数なら FallbackChain で連鎖）
 */
export function createQualityEvaluator(): IQualityEvaluator {
  const ruleBased = new RuleBasedEvaluator();
  const providers = buildAIProviders();
  if (providers.length === 0) return ruleBased;
  const ai =
    providers.length === 1 ? providers[0] : new FallbackChainEvaluator(providers);
  return new CompositeEvaluator(ai, ruleBased);
}

/* ============================================================================
 * sanitize / grade（凍結契約のバレル・設計書 §2/§5/§7）
 *
 * 【S3/S5 への案内】下記はスタブ実装。実装が未着地でも tsc/呼び出し側が通るよう、
 * 恒等サニタイズ＋scoreToMultiplier換算の暫定 grade をここに置いている。
 *   - S3: `./sanitize` に SanitizeItemsFn 実装を置き、下の sanitizeItems を
 *         `export { sanitizeItems } from './sanitize';` に差し替える。
 *   - S5: `./grade` に GradeFn 実装を置き、下の grade を
 *         `export { grade } from './grade';` に差し替える。
 * 呼び出し側（responseService）は本バレル（'@/lib/domain/quality'）からのみ
 * import するため、差し替え時に呼び出し側の変更は不要。
 * ========================================================================== */

export { sanitizeItems } from './sanitize';
export { LocalEmbeddingEvaluator } from './embedding/localEvaluator';

/**
 * 最終グレーディング（設計書 §1/§7）。S5実装（grade.ts）をバレル経由でラップする。
 *
 * GradeFn のシグネチャ（quality, mech）→ grade.ts の GradeInput に変換し、
 * GradeResult（tier/payoutRate/score/feedback）として返す。
 *   mechScore = (100 − ruleScore) / 100  ← ルールベーススコアをリスク値に変換
 *   llmRisk   = (100 − quality.score) / 100  ← LLMスコアをリスク値に変換
 */
export const grade: GradeFn = (quality, mech) => {
  void scoreToMultiplier; // @deprecated との後方互換を維持するため import を残す
  const mechScore = Math.max(0, Math.min(1, (100 - mech.ruleScore) / 100));
  const llmRisk   = Math.max(0, Math.min(1, (100 - quality.score)  / 100));
  const hints = mech.hints
    ? (Object.entries(mech.hints) as [string, boolean | undefined][])
        .filter(([, v]) => v)
        .map(([k]) => k)
    : undefined;
  const r = gradeImpl({ mechScore, llmRisk, hints, relRisk: mech.relevanceRisk });
  return { tier: r.tier, payoutRate: r.payoutRate, score: quality.score, feedback: quality.feedback };
};
