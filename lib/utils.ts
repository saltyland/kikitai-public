/**
 * クラス名結合ヘルパ（軽量版 cn）。
 * 真値の文字列だけを連結する。外部依存（clsx / tailwind-merge）を増やさないための最小実装で、
 * className による上書きは「後勝ち」前提（このプロジェクトの使い方では衝突を起こさない）。
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
