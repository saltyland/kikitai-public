'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { NAV_ITEMS } from '@/lib/ui/navItems';

/**
 * sm未満で使うハンバーガーメニュー。
 * 通知ベルはサーバー側（Header）で取得するため、ここではナビゲーションのみを扱う。
 * ニックネームが長くてもヘッダーが崩れないよう、ドロップダウンに畳む。
 */
export default function HeaderMobileMenu({ nickname }: { nickname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="メニュー"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-slate-700 hover:bg-brand-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? (
            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <nav className="sm:hidden absolute inset-x-0 top-14 z-40 border-b border-brand-100/70 bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-4 py-2 flex flex-col text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-slate-700 hover:bg-brand-50"
              >
                {item.href === '/profile' ? `${item.label}（${nickname}）` : item.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button type="submit" className="w-full rounded-md px-2 py-2 text-left text-slate-700 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                ログアウト
              </button>
            </form>
          </div>
        </nav>
      )}
    </>
  );
}
