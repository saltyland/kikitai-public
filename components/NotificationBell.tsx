'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AppNotification } from '@/lib/types/database';
import { markAllNotificationsReadAction } from '@/app/actions/notification';

/** 通知センターのベル（未読バッジ＋ドロップダウン一覧） */
export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: AppNotification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`通知（未読${unreadCount}件）`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.42V11a6 6 0 1 0-12 0v3.18a2 2 0 0 1-.6 1.42L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-brand-100 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-700">通知</span>
            {unreadCount > 0 && (
              <form action={markAllNotificationsReadAction}>
                <button type="submit" className="text-xs text-brand-600 hover:underline cursor-pointer">
                  すべて既読にする
                </button>
              </form>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">通知はありません</li>
            )}
            {notifications.map((n) => {
              const inner = (
                <>
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="未読" />
                    )}
                    <div className={n.read ? 'opacity-60' : ''}>
                      <p className="text-sm font-medium text-slate-700">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(n.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </>
              );
              return (
                <li key={n.id} className="border-b border-slate-50 last:border-0">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block px-4 py-3 hover:bg-brand-50/50"
                      onClick={() => setOpen(false)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <Link
              href="/notifications"
              className="text-xs text-brand-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              もっと見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
