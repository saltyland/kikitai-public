import { l2normalize, type ILocalEncoder } from './encoder';
import { normalizeText } from './text';

/**
 * 依存ゼロ・完全ローカル・決定論的な「ハッシングトリック」エンコーダ。
 *
 * 役割（設計書 §4.2 B-2 / §13.2）:
 *   - 本命は多言語Sentence-Transformer（ONNX）だが、モデル未配置・CI・テスト環境でも
 *     必ず動く床（フォールバック）として用意する。
 *   - 文字 n-gram を固定長ベクトルへ feature hashing し、L2正規化する。
 *     意味埋め込みほどの表現力は無いが「表層が近い＝近い」を捉え、
 *     off-topic / 丸写しの粗い判定には機能する。
 *   - 決定論的なのでユニットテストの安定化（ダミー空間）にも使える。
 *
 * ※ id を 'hashing-v1' に固定。ONNXエンコーダとは別空間なので、
 *   参照ベクトルを作ったエンコーダと回答埋め込みのエンコーダが食い違えば
 *   referenceVector 側で弾く（§13.2 補正2）。
 */
export class HashingEncoder implements ILocalEncoder {
  readonly id = 'hashing-v1';
  readonly dim: number;
  private readonly k: number;

  constructor(dim = 256, charNgram = 3) {
    this.dim = dim;
    this.k = charNgram;
  }

  async embed(text: string): Promise<number[]> {
    return this.embedSync(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedSync(t));
  }

  private embedSync(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0);
    const norm = normalizeText(text).replace(/\s/g, '');
    if (norm.length === 0) return v;
    const grams: string[] = [];
    // 文字 unigram〜k-gram を素性化（短文でも素性が立つように粒度を混ぜる）
    for (let n = 1; n <= this.k; n++) {
      if (norm.length < n) break;
      for (let i = 0; i + n <= norm.length; i++) grams.push(norm.slice(i, i + n));
    }
    for (const g of grams) {
      const h = this.hash(g);
      const idx = h % this.dim;
      // 符号付きハッシュ（衝突時の偏りを減らす定番テク）
      const sign = (this.hash('s' + g) & 1) === 0 ? 1 : -1;
      v[idx] += sign;
    }
    return l2normalize(v);
  }

  /** 決定論的な符号なし32bitハッシュ（FNV-1a）。 */
  private hash(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
}
