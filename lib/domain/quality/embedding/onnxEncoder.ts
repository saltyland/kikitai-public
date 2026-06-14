import { l2normalize, type ILocalEncoder } from './encoder';

/**
 * ローカル多言語文埋め込み（ONNX Runtime / CPU推論）のスケルトン（設計書 §4.2 B-2）。
 *
 * 想定モデル（いずれも日本語対応の小型多言語Sentence-Transformer）:
 *   - intfloat/multilingual-e5-small   … 384次元 / 重み fp32≈470MB・int8量子化≈120MB
 *   - cl-nagoya/sup-simcse-ja-base 等の日本語特化も候補
 *   推論はCPUで十分（1文あたり数ms〜数十ms目安。PRに実測を記載すること）。
 *
 * 実装方針（後日 onnxruntime-node 導入時に本体を埋める）:
 *   1. `onnxruntime-node` と トークナイザ（例: @xenova/transformers のtokenizer）を
 *      動的 import する（optional dependency。未導入なら例外）。
 *   2. tokenize → input_ids/attention_mask を Tensor 化 → session.run。
 *   3. mean pooling（attention_mask重み付き）→ L2正規化。
 *
 * 重要（§13.2 補正2）: id を固定し、この空間で作った参照ベクトルとだけ突き合わせる。
 *
 * 現状は未配線のため `create()` は失敗し、呼び出し側（factory）が
 * HashingEncoder へフォールバックする（＝未整備でも全体は安全に動く）。
 */
export class OnnxEncoder implements ILocalEncoder {
  readonly id: string;
  readonly dim: number;

  // onnxruntime-node のセッション等は any 回避のため unknown で保持（本実装で型付け）
  private readonly session: unknown;
  private readonly tokenize: (text: string) => Promise<{ ids: number[]; mask: number[] }>;

  private constructor(
    id: string,
    dim: number,
    session: unknown,
    tokenize: (text: string) => Promise<{ ids: number[]; mask: number[] }>
  ) {
    this.id = id;
    this.dim = dim;
    this.session = session;
    this.tokenize = tokenize;
  }

  /**
   * モデルをロードしてエンコーダを生成する。
   * onnxruntime-node 未導入・モデル未配置なら例外を投げる（factoryがフォールバック）。
   */
  static async create(_opts?: { modelPath?: string }): Promise<OnnxEncoder> {
    void _opts;
    // 後日実装: const ort = await import('onnxruntime-node');
    //           const session = await ort.InferenceSession.create(modelPath);
    //           const tokenizer = await loadTokenizer(...);
    throw new Error(
      'OnnxEncoder is not wired yet. onnxruntime-node とモデル重みを導入後に create() を実装してください。'
    );
  }

  async embed(text: string): Promise<number[]> {
    const [v] = await this.embedBatch([text]);
    return v;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // 後日実装の骨格（現状は到達しない: create() が throw するため）
    const out: number[][] = [];
    for (const t of texts) {
      const enc = await this.tokenize(t);
      void enc;
      void this.session;
      // const result = await session.run({ input_ids, attention_mask });
      // const pooled = meanPool(result.last_hidden_state, attention_mask);
      out.push(l2normalize(new Array<number>(this.dim).fill(0)));
    }
    return out;
  }
}
