'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Spinner } from './Spinner';

/**
 * サーバーコンポーネントの内容を再取得する更新ボタン（issue #10）。
 * `router.refresh()` を transition 内で呼び、再取得中はスピナーを表示する。
 */
export default function RefreshButton({ label = '更新' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="最新の状態に更新"
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
    >
      {pending ? <Spinner className="h-4 w-4" /> : <span aria-hidden="true">↻</span>}
      {label}
    </button>
  );
}
