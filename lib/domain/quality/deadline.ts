import type {
  EvaluationContext,
  EvaluationItem,
  IQualityEvaluator,
  QualityResult,
} from './types';

/**
 * 同期採点の締切（ms）のデフォルト。
 *
 * 回答者は送信後この時間以内に必ずスコア・付与ポイントを受け取る（構造的なUX保証）。
 * LLM（特にCPU推論のローカルLLM）がこれより遅い場合は機械評価（ルールベース＋
 * 埋め込み関連性）で即確定し、走り続けるLLM評価は背景監査へ回る。
 */
export const DEFAULT_QUALITY_DEADLINE_MS = 4_000;

/** 環境変数 QUALITY_DEADLINE_MS から締切を解決する（未設定・不正値はデフォルト）。 */
export function resolveQualityDeadlineMs(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = Number(env.QUALITY_DEADLINE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_QUALITY_DEADLINE_MS;
}

/** {@link evaluateWithDeadline} の結果 */
export interface DeadlineEvaluation {
  /** 回答者への即時提示・ポイント確定に使う品質結果 */
  quality: QualityResult;
  /** true: 締切超過により fallback（機械評価）で確定した */
  timedOut: boolean;
  /**
   * timedOut 時のみ非null: 走り続けているAI評価の完了を待つPromise（背景監査用）。
   * AI評価が最終的に失敗した場合は null に解決する（reject しない）。
   */
  late: Promise<QualityResult | null> | null;
}

/**
 * AI評価を締切つきで実行する（すぐ採点の構造的保証・設計書 §3 拡張）。
 *
 *  - 締切内に完了 → その結果を採用（従来どおり）
 *  - 締切内に失敗 → fallback（機械評価）を採用
 *  - 締切超過     → fallback を即採用し、AI評価は {@link DeadlineEvaluation.late}
 *                   として返す（呼び出し側が背景監査へ回す）
 *
 * どのプロバイダがどれだけ遅くても、この関数は deadlineMs 以内に必ず返る。
 */
export async function evaluateWithDeadline(
  ai: IQualityEvaluator,
  items: EvaluationItem[],
  context: EvaluationContext | undefined,
  fallback: QualityResult,
  deadlineMs: number = resolveQualityDeadlineMs()
): Promise<DeadlineEvaluation> {
  type Settled = { ok: true; value: QualityResult } | { ok: false; error: unknown };
  const settled: Promise<Settled> = ai.evaluate(items, context).then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error })
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), deadlineMs);
  });

  try {
    const winner = await Promise.race([settled, timeout]);
    if (winner === 'timeout') {
      return {
        quality: fallback,
        timedOut: true,
        late: settled.then((s) => (s.ok ? s.value : null)),
      };
    }
    if (!winner.ok) {
      // CompositeEvaluator が内部でフォールバックするため通常ここには来ないが、
      // 評価器が裸で渡された場合の防御として機械評価で確定する。
      console.error('[quality] AI評価に失敗。機械評価で確定します:', winner.error);
      return { quality: fallback, timedOut: false, late: null };
    }
    return { quality: winner.value, timedOut: false, late: null };
  } finally {
    clearTimeout(timer);
  }
}
