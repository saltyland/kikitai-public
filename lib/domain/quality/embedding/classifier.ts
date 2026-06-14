/**
 * 古典ML品質分類器のスケルトン（設計書 §4.2 B-2）。
 *
 * 役割: 文埋め込み＋表層特徴量から「手抜き/真面目」を分類し、0〜100の品質スコアを出す。
 * モデル: ロジスティック回帰（線形）を既定とする。学習は別途オフラインで行い、
 *   重み（weights/bias）を JSON で配置 → ここでロードする。
 *
 * 重要（安全側の不変条件）:
 *   - 重みが未配置（未学習）なら `isReady()===false`。呼び出し側は減点しない。
 *   - 合成ラベル前提のため（§13.3）、実ラベルが貯まるまで本番judgeには据えない。
 *
 * 学習スクリプト雛形: `embedding/train_classifier.py`（合成ラベルからweightsを出力）。
 */

/** ロジスティック回帰の重み（学習スクリプトが出力するJSONの形）。 */
export interface LinearModelWeights {
  /** 特徴量名の順序（buildFeatures の並びと一致させる）。 */
  featureNames: string[];
  /** 各特徴量の係数。featureNames と同順・同長。 */
  weights: number[];
  /** バイアス項。 */
  bias: number;
  /** 学習に使ったエンコーダID（埋め込み空間の一致確認用）。 */
  encoderId?: string;
}

/** 分類器に渡す素性の元データ。 */
export interface FeatureSource {
  /** 回答テキストの埋め込み（L2正規化済み）。 */
  embedding: number[];
  /** ユニーク内容語数（情報量の代理）。 */
  contentWordCount: number;
  /** 文字数。 */
  charLength: number;
}

export class LocalQualityClassifier {
  private model: LinearModelWeights | null;

  /** 学習済み重みを渡せばロード済みになる。null（既定）＝未学習＝減点しない。 */
  constructor(model: LinearModelWeights | null = null) {
    this.model = model;
  }

  /** 学習済み重みが配置されているか。false なら呼び出し側は減点しない。 */
  isReady(): boolean {
    return this.model !== null && this.model.weights.length > 0;
  }

  /** 学習済み重みを後から差し込む（オフライン学習結果のロード）。 */
  load(model: LinearModelWeights): void {
    this.model = model;
  }

  /**
   * 素性ベクトルを組み立てる（埋め込み＋表層特徴量）。
   * featureNames は [emb_0..emb_{d-1}, contentWordCount, charLength] の順を想定。
   */
  buildFeatures(src: FeatureSource): number[] {
    return [...src.embedding, src.contentWordCount, src.charLength];
  }

  /**
   * 品質スコア（0〜100）を予測する。
   * 未学習時は安全側で 100（減点しない）を返す。
   */
  predictQuality(features: number[]): number {
    if (!this.model) return 100;
    const { weights, bias } = this.model;
    const n = Math.min(weights.length, features.length);
    let z = bias;
    for (let i = 0; i < n; i++) z += weights[i] * features[i];
    const p = 1 / (1 + Math.exp(-z)); // 真面目である確率
    return Math.round(p * 100);
  }
}
