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
      item.href !== '/notifications' &&
      item.href !== '/profile' &&
      item.href !== '/search' &&
      item.href !== '/points'
  );

  return (
    <header className="app-header sticky top-0 z-30">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-2 px-4 sm:px-6">

        {/* 左: ロゴ + ページラベル */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" aria-label="キキタイ ホーム" className="app-header__logo rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73eadb]">
            <Logo className="text-white" />
          </Link>
          {pageLabel && (
            <span className="hidden border-l border-white/15 pl-3 text-xs font-semibold tracking-wide text-white/55 sm:inline">
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
          <Link
            href="/points"
            data-tour="points"
            className="app-header__points flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-white transition-colors"
          >
            <Coins className="h-4 w-4 text-[#d9ff72]" aria-hidden />
            <span>{points.toLocaleString()}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">pt</span>
          </Link>
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
