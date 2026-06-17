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

/**
 * スコアからポイント付与倍率を求める（DESIGN_SPEC §2）。
 *
 * @deprecated 回答品質LLM層（設計書 §0〜§3,§7）への移行に伴い、付与率の決定は
 *   {@link GradeFn | grade()} → {@link GradeResult.payoutRate} へ一本化する。
 *   新規コードは scoreToMultiplier を直接使わず grade() を経由すること。
 *   既存呼び出しの後方互換のため当面は残置する（grade のスタブ実装も内部でこれを使う）。
 */
export function scoreToMultiplier(score: number): number {
  if (score >= 80) return 1.5; // 高品質
  if (score >= 50) return 1.0; // 標準
  return 0; // 無効
}

/* ============================================================================
 * 凍結契約（回答品質LLM層・設計書 §0〜§3,§7）
 *
 * ここで宣言する型・関数シグネチャは複数ストリーム（S1基盤／S2,S4プロバイダ／
 * S3 sanitize／S5 grade）が共有する「凍結契約」。各ストリームはこの契約に
 * 適合する実装を別ファイルに置く。契約自体の変更は全ストリーム合意が必要。
 * ========================================================================== */

/**
 * 品質ティア（設計書 §1・LLM設計書 §7.1）。付与率の最終決定単位。
 *  - T0   : 無効。報酬なし（payoutRate=0）＋信頼スコア減点。
 *  - L1c  : 低品質（payoutRate=0.3）。
 *  - L1b  : やや低品質（payoutRate=0.5）。
 *  - L1a  : 標準（payoutRate=0.8）。
 *  - PASS : 高品質（payoutRate=1.0）。
 */
export type QualityTier = 'T0' | 'L1c' | 'L1b' | 'L1a' | 'PASS';

/**
 * 最終判定結果（設計書 §1/§7）。grade() の戻り値。
 * payoutRate を下流（報酬付与RPC）へ渡す。
 */
export interface GradeResult {
  /** 品質ティア */
  tier: QualityTier;
  /** ポイント付与率（倍率）。0 / 1.0 / 1.5 等。RPC へそのまま渡す。 */
  payoutRate: number;
  /** 0〜100 の最終スコア（参考値・UI表示用） */
  score: number;
  /** 回答者向け日本語フィードバック */
  feedback: string;
}

/**
 * ルーティング判定結果（設計書 §3）。
 * LLM を呼ぶか否かと、その理由（観測・デバッグ用）。
 */
export interface RoutingDecision {
  /** true なら LLM 評価を実行、false なら機械評価のみで確定 */
  callLLM: boolean;
  /** 判定理由（ログ・計測用の短い説明） */
  reason: string;
}

/**
 * クライアント由来の不正シグナルのヒント（設計書 §2/§3）。
 * いずれも「疑わしさ」の弱い手がかり。確定判定には使わずルーティングに用いる。
 */
export interface QualityHints {
  /** 自由記述に貼り付け（paste）が検出された */
  paste?: boolean;
  /** AI生成文体の疑い */
  aiStyle?: boolean;
  /** 入力ダイナミクス（打鍵リズム等）が不自然 */
  inputDynamics?: boolean;
}

/**
 * 機械評価シグナル（設計書 §2/§3）。
 * ルールベース評価の結果＋クライアントヒントをまとめた、LLM を呼ぶ前に
 * 得られる「安価な」信号。ルーティングと grade() の双方が参照する。
 */
export interface MechSignals {
  /** ルールベース評価がPASS（減点なし＝満点）だったか */
  rulePass: boolean;
  /** ルールベーススコア 0〜100。0 は T0 確定（アテンション誤答等） */
  ruleScore: number;
  /** クライアント由来のヒント（任意） */
  hints?: QualityHints;
  /** 回答所要秒数（クライアント計測・参考値） */
  durationSec?: number;
  /**
   * ローカル埋め込みによる関連性リスク（0〜1）。
   * LocalEmbeddingEvaluator が供給する。未供給時は 0（安全側＝減点しない）。
   */
  relevanceRisk?: number;
}

/**
 * 送信前サニタイズ（設計書 §2）。LLM へ渡す前に必ず通す。
 * 実装は S3（別ファイル）。型のみここで凍結する。
 */
export type SanitizeItemsFn = (items: EvaluationItem[]) => EvaluationItem[];

/**
 * 最終グレーディング（設計書 §1/§7）。品質結果＋機械シグナルから
 * ティアと付与率を決定する。実装は S5（別ファイル）。型のみここで凍結する。
 */
export type GradeFn = (quality: QualityResult, mech: MechSignals) => GradeResult;
