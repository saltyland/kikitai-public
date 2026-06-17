import type {
  EvaluationContext,
  EvaluationItem,
  IQualityEvaluator,
  QualityResult,
} from '../types';
import type { ILocalEncoder } from './encoder';
import { getLocalEncoder } from './factory';
import {
  scoreRelevance,
  type SurveyReferenceVectors,
} from '../referenceVector';
import { LocalQualityClassifier } from './classifier';
import { extractContentWords } from './text';

/**
 * ローカル埋め込みベースの品質評価器（設計書 §4.2 B-2 / §13.2）。
 * `IQualityEvaluator` 互換。外部送信なし・完全ローカルで動く。
 *
 * 守備範囲（補正1）: 参照ベクトルがあれば「関連性」軸を評価。off-topic を粗く検出する。
 *   AI生成・手抜きは別軸（機械層＝ruleBased）が担当する。
 *
 * 安全側の原則:
 *   - 参照ベクトルが無い／空間不一致 → 関連性は判定不能として減点しない（relRisk=0）。
 *   - 古典ML分類器が未学習（重み未配置）→ 減点しない（return 100相当）。
 *   - likelyCopy（設問丸写し）→ relevance スコアは使わず relRisk=0.6 固定。
 */
export class LocalEmbeddingEvaluator implements IQualityEvaluator {
  constructor(
    private readonly references: SurveyReferenceVectors | null = null,
    private readonly encoderProvider: () => Promise<ILocalEncoder> = getLocalEncoder,
    private readonly classifier: LocalQualityClassifier = new LocalQualityClassifier()
  ) {}

  /**
   * 各自由記述の関連性リスク（0〜1）を計算し、その平均を返す。
   * responseService が MechSignals.relevanceRisk に供給するためのメソッド。
   *
   * ルール:
   *   - likelyCopy   → 0.6 固定（relevance スコア不使用）
   *   - !indeterminate && !likelyCopy → 1 - relevance
   *   - indeterminate → 0（安全側＝減点しない）
   *   - 自由記述なし → 0
   */
  async computeRelRisk(items: EvaluationItem[]): Promise<number> {
    const encoder = await this.encoderProvider();
    const textItems = items.filter(
      (i) =>
        (i.question.type === 'text' || i.question.type === 'paragraph') &&
        (i.answer?.text_answer ?? '').trim().length > 0
    );
    if (textItems.length === 0) return 0;

    const perItemRisks: number[] = [];
    for (const item of textItems) {
      const text = (item.answer?.text_answer ?? '').trim();
      const emb = await encoder.embed(text);
      const r = scoreRelevance(encoder, emb, text, this.references, item.question.order_index);
      if (r.likelyCopy) {
        perItemRisks.push(0.6);
      } else if (!r.indeterminate) {
        perItemRisks.push(Math.max(0, 1 - r.relevance));
      } else {
        perItemRisks.push(0);
      }
    }
    return perItemRisks.reduce((a, b) => a + b, 0) / perItemRisks.length;
  }

  async evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult> {
    void context;
    const encoder = await this.encoderProvider();
    const reasons: string[] = [];

    const textItems = items.filter(
      (i) =>
        (i.question.type === 'text' || i.question.type === 'paragraph') &&
        (i.answer?.text_answer ?? '').trim().length > 0
    );

    if (textItems.length === 0) {
      return { score: 100, feedback: 'ローカル評価: 自由記述がないため関連性判定は対象外です。' };
    }

    // ── 関連性軸（参照ベクトルがあるときのみ。補正1/補正2/補正3）──────────
    const relevanceScores: number[] = [];
    let copyFlags = 0;
    for (const item of textItems) {
      const text = (item.answer?.text_answer ?? '').trim();
      const emb = await encoder.embed(text);
      const r = scoreRelevance(encoder, emb, text, this.references, item.question.order_index);
      if (r.likelyCopy) {
        // 丸写し → relRisk=0.6 相当のスコア（40）を採用。relevance は使わない。
        relevanceScores.push(0.4);
        copyFlags++;
        reasons.push('設問文の丸写しに近い自由記述があります（コピペ判定は機械層で確認）。');
      } else if (!r.indeterminate) {
        relevanceScores.push(r.relevance);
        if (!r.onTopic) {
          reasons.push('設問の主旨から外れている可能性のある自由記述があります（関連性）。');
        }
      }
      // indeterminate → relevanceScores に加えない（安全側）
    }

    // ── 古典ML分類器（未学習なら null＝減点しない。設計書 §4.2 B-2）────────
    const mlScores: number[] = [];
    if (this.classifier.isReady()) {
      for (const item of textItems) {
        const text = (item.answer?.text_answer ?? '').trim();
        const emb = await encoder.embed(text);
        const feats = this.classifier.buildFeatures({
          embedding: emb,
          contentWordCount: extractContentWords(text).length,
          charLength: text.length,
        });
        mlScores.push(this.classifier.predictQuality(feats));
      }
    }

    // 関連性スコア（床なし・素通し）。判定不能なら 100（安全側）。
    const relevance100 =
      relevanceScores.length > 0
        ? Math.round((relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length) * 100)
        : 100;
    const ml100 =
      mlScores.length > 0
        ? Math.round(mlScores.reduce((a, b) => a + b, 0) / mlScores.length)
        : 100;

    const score = Math.max(0, Math.min(100, Math.min(relevance100, ml100)));

    void copyFlags;
    const feedback =
      reasons.length === 0
        ? 'ローカル評価: 設問との関連性に問題は見られませんでした。'
        : [...new Set(reasons)].join(' ');
    return { score, feedback };
  }
}
