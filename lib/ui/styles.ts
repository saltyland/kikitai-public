/**
 * フォーム・ボタンの共通スタイル。
 *
 * フォーカスリングは focus-visible で 2px＋オフセットを付け、キーボード操作時に
 * フォーカス位置を明確にする（マウスクリック時は出さない）。各コンポーネントで
 * バラバラに定義していたものをここへ集約し、アクセシビリティを一括で底上げする。
 */
export const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1';

export const labelClass = 'block text-sm font-medium text-zinc-700 mb-1';

/** 主要アクション（送信・保存など）のボタン */
export const primaryButtonClass =
  'rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';
