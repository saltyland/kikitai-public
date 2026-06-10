'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

/**
 * ログイン後の共通ヘッダー。
 * 小画面（<sm）ではハンバーガーメニューに畳み、ニックネームが長くてもヘッダーが
 * 崩れないようにする。sm以上は従来どおり横並び。
 */
export default function Header({ nickname }: { nickname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative bg-white border-b border-zinc-200">
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-indigo-700">
          キキタイ
        </Link>

        {/* sm以上：横並びナビ */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/surveys" className="text-zinc-600 hover:text-indigo-700">
            回答する
          </Link>
          <Link href="/profile" className="max-w-[12rem] truncate text-zinc-600 hover:text-indigo-700">
            {nickname}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-zinc-600 hover:text-red-600 cursor-pointer">
              ログアウト
            </button>
          </form>
        </nav>

        {/* sm未満：ハンバーガー */}
        <button
          type="button"
          aria-label="メニュー"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden rounded-md p-2 text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {/* sm未満：ドロップダウン */}
      {open && (
        <nav className="sm:hidden absolute inset-x-0 top-14 z-40 border-b border-zinc-200 bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-4 py-2 flex flex-col text-sm">
            <Link href="/surveys" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-zinc-700 hover:bg-zinc-50">
              回答する
            </Link>
            <Link href="/profile" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-zinc-700 hover:bg-zinc-50">
              {nickname}（プロフィール）
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="w-full rounded-md px-2 py-2 text-left text-zinc-700 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                ログアウト
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
