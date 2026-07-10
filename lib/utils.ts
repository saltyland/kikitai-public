/**
 * クラス名結合ヘルパ（軽量版 cn）。
 * 真値の文字列だけを連結する。外部依存（clsx / tailwind-merge）を増やさないための最小実装で、
 * className による上書きは「後勝ち」前提（このプロジェクトの使い方では衝突を起こさない）。
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * 'YYYY-MM-DD'（またはISO日時）の先頭の日付部分を「2026年7月5日」形式に整形する。
 * タイムゾーンによる日付ズレを避けるため Date を経由せず文字列のまま変換する。
 * パースできない値はそのまま返す（表示が壊れるより生値の方がまし）。
 */
export function formatDateJa(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}
