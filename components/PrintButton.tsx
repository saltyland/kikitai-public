'use client';

/** ブラウザの印刷ダイアログ（PDF保存）を開くボタン。印刷時は print:hidden で消える。 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer print:hidden"
    >
      PDFとして保存 / 印刷
    </button>
  );
}
