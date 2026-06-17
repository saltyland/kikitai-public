/**
 * S3: 採点統合層（LLM設計書 §7）
 * mech_score と llm_risk を合流させ、5段ティアと付与率を決定する。
 *
 * 全パラメータは定数化されており、後日キャリブレーション可能。
 *
 * 安全弁なし: finalRisk >= THETA_HARD なら mechScore 問わず T0(0%)。
 */

// ────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────

export type GradeTier = 'T0' | 'L1c' | 'L1b' | 'L1a' | 'PASS';

/** 5段付与率（機械フィルタ設計書 §4.2 と統一） */
export type PayoutRate = 0 | 0.3 | 0.5 | 0.8 | 1.0;

export interface GradeInput {
  /** 機械フィルタのリスクスコア 0〜1（1 = 高リスク） */
  mechScore: number;
  /** LLMリスク = (100 − llm_score) / 100、0〜1（1 = 高リスク） */
  llmRisk: number;
  /**
   * 関連性リスク 0〜1（LocalEmbeddingEvaluator が供給）。
   * 未供給時は 0（安全側＝判定不能は減点しない）。
   */
  relRisk?: number;
  /** ユーザー信頼スコア 0〜100（省略時は中立値として扱う） */
  trust?: number;
  /** 機械層から申し送られたhintフラグ群 */
  hints?: string[];
}

export interface GradeResult {
  tier: GradeTier;
  payoutRate: PayoutRate;
  /** clamp 後の最終リスク値 0〜1 */
  finalRisk: number;
}

// ────────────────────────────────────────────────
// キャリブレーション可能な定数（§7.1 初期値）
// ────────────────────────────────────────────────

/** T0 境界（機械フィルタ設計書 §4.3 θ_hard と統一） */
const THETA_HARD = 0.80;
/** L1c/L1b 境界 */
const THETA_L1C  = 0.65;
/** L1b/L1a 境界 */
const THETA_L1B  = 0.50;
/** L1a/PASS 境界（θ_soft） */
const THETA_SOFT = 0.30;

/** 高信頼ユーザーと判定する trust_score の下限 */
const RESCUE_HIGH_TRUST_THRESHOLD = 80;
/** 高信頼による救済量 */
const RESCUE_HIGH_TRUST    = 0.08;
/** 短答可メタによる救済量 */
const RESCUE_SHORT_ANSWER  = 0.04;
/** 正当ペーストhintによる救済量 */
const RESCUE_PASTE_JUSTIFIED = 0.02;
/** 救済量の上限（ゲーミング防止・≈1ティア幅） */
const RESCUE_MAX = 0.12;

/** 関連性リスク項の重み（W_REL・設計書 §13.2）。未供給時は 0 として無効化される。 */
const W_REL = 0.5;

// ────────────────────────────────────────────────
// 内部ヘルパ
// ────────────────────────────────────────────────

function computeRescue(trust?: number, hints?: string[]): number {
  let r = 0;
  if (trust !== undefined && trust >= RESCUE_HIGH_TRUST_THRESHOLD) {
    r += RESCUE_HIGH_TRUST;
  }
  if (hints?.includes('short_answer_ok'))    r += RESCUE_SHORT_ANSWER;
  if (hints?.includes('paste_justified'))    r += RESCUE_PASTE_JUSTIFIED;
  return Math.min(r, RESCUE_MAX);
}

// ────────────────────────────────────────────────
// メイン関数
// ────────────────────────────────────────────────

/**
 * mech_score と llm_risk を確率合成し、5段ティアと付与率を返す（LLM設計書 §7.1）。
 *
 *   finalRisk = clamp(1 − (1−mechScore)(1−llmRisk) − rescue, 0, 1)
 *
 * finalRisk ≥ THETA_HARD なら mechScore 問わず T0(0%)。
 */
export function grade(input: GradeInput): GradeResult {
  const { mechScore, llmRisk, trust, hints } = input;
  const relRisk = input.relRisk ?? 0;

  // 第3項（関連性リスク）を確率合成に組み込む（設計書 §13.2）
  const raw = 1 - (1 - mechScore) * (1 - llmRisk) * (1 - W_REL * relRisk) - computeRescue(trust, hints);
  const finalRisk = Math.max(0, Math.min(1, raw));

  let tier: GradeTier;
  let payoutRate: PayoutRate;

  if (finalRisk >= THETA_HARD) {
    tier = 'T0';
    payoutRate = 0;
  } else if (finalRisk >= THETA_L1C) {
    tier = 'L1c';
    payoutRate = 0.3;
  } else if (finalRisk >= THETA_L1B) {
    tier = 'L1b';
    payoutRate = 0.5;
  } else if (finalRisk >= THETA_SOFT) {
    tier = 'L1a';
    payoutRate = 0.8;
  } else {
    tier = 'PASS';
    payoutRate = 1.0;
  }

  return { tier, payoutRate, finalRisk };
}
