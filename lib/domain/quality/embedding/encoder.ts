/**
 * ローカル文埋め込みエンコーダの共通インターフェース（設計書 §4.2 B-2 / §13.2 補正2）。
 *
 * 不変条件（§13.2 補正2「空間の一致」）:
 *   参照ベクトルと回答ベクトルは必ず同一のエンコーダで埋め込む。
 *   外部LLMの埋め込みとは別空間なので絶対に混ぜない。
 *   その担保のため各エンコーダは一意の `id` を持ち、
 *   参照ベクトルにこの id を刻んで保存し、利用時に一致を検証する。
 */
export interface ILocalEncoder {
  /** エンコーダの一意識別子（例: 'hashing-v1', 'e5-small-onnx-v1'）。空間一致の検証に使う。 */
  readonly id: string;
  /** 出力ベクトルの次元（固定長）。 */
  readonly dim: number;
  /** 1テキストを埋め込む。出力はL2正規化済み（cos類似度＝内積）。 */
  embed(text: string): Promise<number[]>;
  /** 複数テキストを埋め込む（バッチ）。 */
  embedBatch(texts: string[]): Promise<number[][]>;
}

/** コサイン類似度（-1〜1）。L2正規化済みベクトルなら内積と一致する。 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: 次元不一致 (${a.length} vs ${b.length})`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** ベクトルをL2正規化する（in-placeではなく新配列を返す）。 */
export function l2normalize(v: readonly number[]): number[] {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm === 0) return [...v];
  return v.map((x) => x / norm);
}
