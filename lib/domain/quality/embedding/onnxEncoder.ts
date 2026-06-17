import { l2normalize, type ILocalEncoder } from './encoder';

/**
 * ローカル多言語文埋め込み（transformers.js / ONNX Runtime）。
 *
 * モデル: Xenova/multilingual-e5-small（384次元・日本語対応）。
 * id='e5-small-onnx-v1' を刻み、同一空間の参照ベクトルとだけ突き合わせる（設計書 §13.2 補正2）。
 * e5 系は入力に "passage: " プレフィックスを付けて埋め込む（対称比較用）。
 *
 * create() は @huggingface/transformers が未導入 or モデルダウンロード失敗時に throw し、
 * factory が HashingEncoder へフォールバックする（安全側）。
 */
export class OnnxEncoder implements ILocalEncoder {
  readonly id = 'e5-small-onnx-v1';
  readonly dim = 384;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private constructor(private readonly extractor: any) {}

  static async create(): Promise<OnnxEncoder> {
    // 動的 import で optional dependency 扱い（未導入なら import 自体が throw）
    const { pipeline, env } = await import('@huggingface/transformers');
    // Vercel/Node 環境では WASM バックエンドを使う（onnxruntime-node 不要）
    env.allowLocalModels = false;

    const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      dtype: 'q8',
    });
    return new OnnxEncoder(extractor);
  }

  async embed(text: string): Promise<number[]> {
    const [v] = await this.embedBatch([text]);
    return v;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // e5 系は passage: プレフィックスが必要（対称比較なので参照も回答も同じプレフィックス）
    const prefixed = texts.map((t) => `passage: ${t}`);
    const output = await this.extractor(prefixed, { pooling: 'mean', normalize: true });
    // output は Tensor[batch, dim]。tolist() で number[][] を得る
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: number[][] = (output as any).tolist();
    return list.map((vec) => l2normalize(vec));
  }
}
