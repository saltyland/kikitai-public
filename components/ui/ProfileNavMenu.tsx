'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import Avatar from '@/components/Avatar';

/** ヘッダーの「マイページ」アイコン（アバター）。ホバー/クリックでログアウト等の簡易メニューを開く */
export default function ProfileNavMenu({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="マイページ"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Avatar name={nickname} src={avatarUrl} className="h-8 w-8 text-xs" />
      </button>

      {open && (
        <div className="absolute right-0 top-full w-44 pt-2">
          <div
            role="menu"
            className="rounded-xl border border-brand-100 bg-white py-1 shadow-lg z-50"
          >
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-brand-50"
            >
              マイページ
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
