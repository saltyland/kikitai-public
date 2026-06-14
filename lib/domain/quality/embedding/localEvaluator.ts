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
 *   - 参照ベクトルが無い／空間不一致 → 関連性は判定不能として減点しない。
 *   - 古典ML分類器が未学習（重み未配置）→ 減点しない（return 100相当）。
 *   - 丸写し（likelyCopy）は**ここでは破棄せず**、feedbackに注意を添えるのみ（機械層が判断）。
 */
export class LocalEmbeddingEvaluator implements IQualityEvaluator {
  constructor(
    private readonly references: SurveyReferenceVectors | null = null,
    private readonly encoderProvider: () => Promise<ILocalEncoder> = getLocalEncoder,
    private readonly classifier: LocalQualityClassifier = new LocalQualityClassifier()
  ) {}

  async evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult> {
    void context;
    const encoder = await this.encoderProvider();
    const reasons: string[] = [];

    const textItems = items.filter(
      (i) =>
        (i.question.type === 'text' || i.question.type === 'paragraph') &&
        (i.answer?.text_answer ?? '').trim().length > 0
    );

    // 自由記述が無ければ関連性は測れない（安全側＝満点）。
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
      if (!r.indeterminate) {
        relevanceScores.push(r.relevance);
        if (!r.onTopic) {
          reasons.push('設問の主旨から外れている可能性のある自由記述があります（関連性）。');
        }
        if (r.likelyCopy) copyFlags++;
      }
    }
    if (copyFlags > 0) {
      reasons.push('設問文の丸写しに近い自由記述があります（コピペ判定は機械層で確認）。');
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

    // 関連性スコアを0〜100へ。判定不能なら100（安全側）。
    const relevance100 =
      relevanceScores.length > 0
        ? Math.round((relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length) * 100)
        : 100;
    const ml100 =
      mlScores.length > 0
        ? Math.round(mlScores.reduce((a, b) => a + b, 0) / mlScores.length)
        : 100;

    // 補正1: 関連性は単独で破棄しない＝床を高めに取り、緩やかに反映する。
    const relevanceComponent = Math.max(60, relevance100);
    const score = Math.max(0, Math.min(100, Math.min(relevanceComponent, ml100)));

    const feedback =
      reasons.length === 0
        ? 'ローカル評価: 設問との関連性に問題は見られませんでした。'
        : reasons.join(' ');
    return { score, feedback };
  }
}
