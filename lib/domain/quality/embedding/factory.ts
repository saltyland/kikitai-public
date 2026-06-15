import type { ILocalEncoder } from './encoder';
import { HashingEncoder } from './hashingEncoder';
import { OnnxEncoder } from './onnxEncoder';

/**
 * ローカルエンコーダのファクトリ（設計書 §4.2 B-2 / §13.2 補正2）。
 *
 * - `LOCAL_ENCODER=onnx` かつモデルが配置済みなら ONNX を使う。
 * - それ以外（既定・モデル未配置・ロード失敗）は HashingEncoder にフォールバック。
 *   → 環境が未整備でも参照ベクトル生成・関連性判定は常に動作する（安全側）。
 *
 * プロセス内でシングルトンにキャッシュする（モデルロードは高コストなため）。
 * 参照生成と回答埋め込みで必ず同じインスタンス＝同じ空間を使う（補正2）。
 */
let cached: Promise<ILocalEncoder> | null = null;

export function getLocalEncoder(): Promise<ILocalEncoder> {
  if (!cached) cached = build();
  return cached;
}

/** テスト用：キャッシュを差し替える（ダミーエンコーダ注入で決定論化）。 */
export function setLocalEncoderForTest(encoder: ILocalEncoder | null): void {
  cached = encoder ? Promise.resolve(encoder) : null;
}

async function build(): Promise<ILocalEncoder> {
  if (process.env.LOCAL_ENCODER === 'onnx') {
    try {
      return await OnnxEncoder.create({ modelPath: process.env.LOCAL_ENCODER_MODEL_PATH });
    } catch (e) {
      console.warn('[quality/embedding] ONNXエンコーダのロードに失敗。Hashingにフォールバック:', e);
    }
  }
  return new HashingEncoder();
}
