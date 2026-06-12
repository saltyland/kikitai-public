/**
 * 処理中・読み込み中を示すスピナー（SVG）。
 * `kikitai-spin`（globals.css）で回転。色は currentColor を継承する。
 */
export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={`kikitai-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

/** ページ遷移時などに中央へ表示するフルスクリーンのローディング表示 */
export function LoadingScreen({ label = '読み込み中…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-brand-600">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-zinc-600">{label}</p>
    </div>
  );
}
