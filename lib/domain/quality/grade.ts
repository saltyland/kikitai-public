/**
 * S3: Scoring integration layer (LLM design doc S7)
 * Merges mech_score and llm_risk to determine 5-tier grade and payout rate.
 *
 * All parameters are constants, overridable via calibration.json (S7.1 / S13.5.4 Phase3).
 */

// ----------------------------------------------------------------
// calibration.json schema (output of scripts/calibrate_phase3.py)
// ----------------------------------------------------------------

/**
 * Top-level type for calibration.json.
 * Must match the JSON output of scripts/calibrate_phase3.py.
 */
export interface CalibrationParams {
  version: string;
  createdAt: string;
  thresholds: {
    thetaHard: number;
    thetaL1c: number;
    thetaL1b: number;
    thetaSoft: number;
    mechSafeThreshold: number;
    relOffTopicRisk: number;
  };
  rescue: {
    highTrustThreshold: number;
    highTrust: number;
    shortAnswer: number;
    pasteJustified: number;
    max: number;
  };
  stats?: {
    nSamples: number;
    fnr: number;
    fpr: number;
    accuracy: number;
  };
}

/**
 * Load calibration.json from the project root.
 * Returns null if file does not exist, fails to parse, or has an invalid version.
 * Node.js server-side only (not for Edge Runtime or browser bundles).
 */
export function loadCalibration(): CalibrationParams | null {
  if (typeof process === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const filePath = path.resolve(process.cwd(), 'calibration.json');
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as CalibrationParams;
    if (!parsed.version || !parsed.thresholds) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Cache: read once per process startup. */
let _calibCache: CalibrationParams | null | undefined = undefined;

function getCalib(): CalibrationParams | null {
  if (_calibCache === undefined) _calibCache = loadCalibration();
  return _calibCache;
}

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type GradeTier = 'T0' | 'L1c' | 'L1b' | 'L1a' | 'PASS';

/** 5-tier payout rates (machine filter design doc S4.2) */
export type PayoutRate = 0 | 0.3 | 0.5 | 0.8 | 1.0;

export interface GradeInput {
  /** Machine filter risk score 0-1 (1 = high risk) */
  mechScore: number;
  /** LLM risk = (100 - llm_score) / 100, range 0-1 */
  llmRisk: number;
  /**
   * Relevance risk 0-1 (supplied by LocalEmbeddingEvaluator).
   * Defaults to 0 (safe side: unknown = no penalty).
   */
  relRisk?: number;
  /** User trust score 0-100 (neutral if omitted) */
  trust?: number;
  /** Hint flags from the machine layer */
  hints?: string[];
}

export interface GradeResult {
  tier: GradeTier;
  payoutRate: PayoutRate;
  /** Final clamped risk value 0-1 */
  finalRisk: number;
}

// ----------------------------------------------------------------
// Calibratable constants (S7.1 initial values)
// Overridden by calibration.json when present.
// ----------------------------------------------------------------

/** T0 boundary (machine filter design doc S4.3 theta_hard) */
const DEFAULT_THETA_HARD = 0.80;
/** L1c/L1b boundary */
const DEFAULT_THETA_L1C  = 0.65;
/** L1b/L1a boundary */
const DEFAULT_THETA_L1B  = 0.50;
/** L1a/PASS boundary (theta_soft) */
const DEFAULT_THETA_SOFT = 0.30;

/**
 * Safety valve: when mechScore < this threshold, do not assign T0
 * even if finalRisk >= thetaHard.
 * Prevents LLM-only false positives from completely invalidating genuine responses.
 */
const DEFAULT_MECH_SAFE_THRESHOLD = 0.15;

/** Trust threshold for high-trust rescue */
const DEFAULT_RESCUE_HIGH_TRUST_THRESHOLD = 80;
/** High-trust rescue amount */
const DEFAULT_RESCUE_HIGH_TRUST    = 0.08;
/** short_answer_ok rescue amount */
const DEFAULT_RESCUE_SHORT_ANSWER  = 0.04;
/** paste_justified rescue amount */
const DEFAULT_RESCUE_PASTE_JUSTIFIED = 0.02;
/** Maximum total rescue (anti-gaming cap) */
const DEFAULT_RESCUE_MAX = 0.12;

/**
 * Fixed risk value for clearly off-topic responses (S13.2).
 * Applied only when relRisk > 0 (gate pattern).
 * Overridden to 0 for short_answer_ok hints.
 */
const DEFAULT_REL_OFFTOPIC_RISK = 0.5;

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function computeRescue(trust?: number, hints?: string[], calib?: CalibrationParams | null): number {
  const c = calib?.rescue;
  const HIGH_TRUST_THRESHOLD = c?.highTrustThreshold ?? DEFAULT_RESCUE_HIGH_TRUST_THRESHOLD;
  const HIGH_TRUST      = c?.highTrust       ?? DEFAULT_RESCUE_HIGH_TRUST;
  const SHORT_ANSWER    = c?.shortAnswer     ?? DEFAULT_RESCUE_SHORT_ANSWER;
  const PASTE_JUSTIFIED = c?.pasteJustified  ?? DEFAULT_RESCUE_PASTE_JUSTIFIED;
  const MAX             = c?.max             ?? DEFAULT_RESCUE_MAX;

  let r = 0;
  if (trust !== undefined && trust >= HIGH_TRUST_THRESHOLD) r += HIGH_TRUST;
  if (hints?.includes('short_answer_ok'))  r += SHORT_ANSWER;
  if (hints?.includes('paste_justified'))  r += PASTE_JUSTIFIED;
  return Math.min(r, MAX);
}

// ----------------------------------------------------------------
// Main function
// ----------------------------------------------------------------

/**
 * Merge mech_score and llm_risk into a 5-tier grade and payout rate (LLM design doc S7.1).
 *
 *   finalRisk = clamp(1 - (1-mechScore)(1-llmRisk)(1-relRisk_eff) - rescue, 0, 1)
 *
 * Uses calibration.json thresholds when available (S13.5.4 Phase3).
 *
 * Safety valve: when mechScore < mechSafeThreshold (default 0.15),
 * finalRisk >= thetaHard will be capped at L1c instead of T0
 * to prevent LLM-only misclassification.
 */
export function grade(input: GradeInput): GradeResult {
  const { mechScore, llmRisk, trust, hints } = input;
  const relRisk = input.relRisk ?? 0;
  const calib = getCalib();
  const t = calib?.thresholds;

  const THETA_HARD          = t?.thetaHard          ?? DEFAULT_THETA_HARD;
  const THETA_L1C           = t?.thetaL1c           ?? DEFAULT_THETA_L1C;
  const THETA_L1B           = t?.thetaL1b           ?? DEFAULT_THETA_L1B;
  const THETA_SOFT          = t?.thetaSoft          ?? DEFAULT_THETA_SOFT;
  const MECH_SAFE_THRESHOLD = t?.mechSafeThreshold  ?? DEFAULT_MECH_SAFE_THRESHOLD;
  const REL_OFFTOPIC_RISK   = t?.relOffTopicRisk    ?? DEFAULT_REL_OFFTOPIC_RISK;

  // Gate pattern (S13.2): off-topic uses fixed value; short_answer_ok disables rel axis.
  const relRisk_eff =
    hints?.includes('short_answer_ok') ? 0
    : relRisk > 0 ? REL_OFFTOPIC_RISK
    : 0;

  const raw = 1 - (1 - mechScore) * (1 - llmRisk) * (1 - relRisk_eff) - computeRescue(trust, hints, calib);
  const finalRisk = Math.max(0, Math.min(1, raw));

  let tier: GradeTier;
  let payoutRate: PayoutRate;

  if (finalRisk >= THETA_HARD) {
    // Safety valve: low machine risk -> cap at L1c, not T0
    if (mechScore < MECH_SAFE_THRESHOLD) {
      tier = 'L1c';
      payoutRate = 0.3;
    } else {
      tier = 'T0';
      payoutRate = 0;
    }
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
