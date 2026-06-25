import Link from 'next/link';
import Logo from '@/components/Logo';
import NotificationBell from '@/components/NotificationBell';
import HeaderMobileMenu from '@/components/HeaderMobileMenu';
import HeaderSearchBar from '@/components/HeaderSearchBar';
import IconNavLink from '@/components/ui/IconNavLink';
import ProfileNavMenu from '@/components/ui/ProfileNavMenu';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { NotificationService } from '@/lib/services/notificationService';
import { NAV_ITEMS } from '@/lib/ui/navItems';
import { Coins } from 'lucide-react';
import type { AppNotification } from '@/lib/types/database';

/**
 * ログイン後の共通ヘッダー。
 * 通知とポイント残高はページ側の props を増やさないよう、Header 自身がサーバーで取得する。
 * sm以上は検索バー＋横並びナビ、sm未満はハンバーガー（HeaderMobileMenu／クライアント）に畳む。
 */
export default async function Header({
  nickname,
  avatarUrl,
  pageLabel,
}: {
  nickname: string;
  avatarUrl?: string | null;
  /** ロゴ横に表示するページラベル（例: "アンケート管理"）。省略時は非表示。 */
  pageLabel?: string;
}) {
  let notifications: AppNotification[] = [];
  let unreadCount = 0;
  let points = 0;
  try {
    const supabase = await createSupabaseServerClient();
    const profile = await new AuthService(supabase).getCurrentProfile();
    if (profile) {
      [{ notifications, unreadCount }] = await Promise.all([
        new NotificationService(supabase).getBellData(profile.id),
      ]);
      points = profile.points;
    }
  } catch (e) {
    // 通知・ポイントは補助機能。取得失敗でもヘッダー自体は表示する。
    console.error('[Header] データの取得に失敗:', e);
  }

  // /search・/notifications・/profile はそれぞれ専用UIで置き換えるためフィルタ
  const navLinks = NAV_ITEMS.filter(
    (item) =>
      item.href !== '/notifications' && item.href !== '/profile' && item.href !== '/search'
  );

  return (
    <header className="glass sticky top-0 z-30 border-b border-brand-100/70">
      <div className="mx-auto max-w-4xl px-4 h-16 flex items-center gap-2">

        {/* 左: ロゴ + ページラベル */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" aria-label="キキタイ ホーム">
            <Logo />
          </Link>
          {pageLabel && (
            <span className="hidden border-l border-brand-200 pl-2 text-xs font-semibold text-brand-600 sm:inline">
              {pageLabel}
            </span>
          )}
        </div>

        {/* 中央: 検索バー（PC のみ） */}
        <div data-tour="search" className="hidden flex-1 justify-center px-2 sm:flex">
          <HeaderSearchBar />
        </div>

        {/* 右: PC横並びナビ */}
        <nav className="ml-auto hidden shrink-0 items-center gap-1 sm:flex">
          {navLinks.map((item) => (
            <IconNavLink key={item.href} href={item.href} label={item.label} icon={item.icon!} />
          ))}
          {/* ポイント残高 */}
          <div
            data-tour="points"
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-brand-700"
          >
            <Coins className="h-4 w-4 text-brand-500" aria-hidden />
            <span>{points.toLocaleString()}</span>
            <span className="text-xs font-normal text-slate-400">pt</span>
          </div>
          <span data-tour="notifications">
            <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          </span>
          <span data-tour="profile">
            <ProfileNavMenu nickname={nickname} avatarUrl={avatarUrl} />
          </span>
        </nav>

        {/* モバイル: ベル＋ハンバーガー */}
        <div className="ml-auto flex items-center gap-1 sm:hidden">
          <span data-tour="notifications">
            <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          </span>
          <span data-tour="profile">
            <HeaderMobileMenu nickname={nickname} avatarUrl={avatarUrl} />
          </span>
        </div>
      </div>
    </header>
  );
}
