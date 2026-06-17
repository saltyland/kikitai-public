import Link from 'next/link';
import Logo from '@/components/Logo';
import NotificationBell from '@/components/NotificationBell';
import HeaderMobileMenu from '@/components/HeaderMobileMenu';
import IconNavLink from '@/components/ui/IconNavLink';
import ProfileNavMenu from '@/components/ui/ProfileNavMenu';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { NotificationService } from '@/lib/services/notificationService';
import { NAV_ITEMS } from '@/lib/ui/navItems';
import type { AppNotification } from '@/lib/types/database';

/**
 * ログイン後の共通ヘッダー。
 * 通知（ベル）はページ側の props を増やさないよう、Header 自身がサーバーで取得する。
 * sm以上は横並びナビ、sm未満はハンバーガー（HeaderMobileMenu／クライアント）に畳む。
 */
export default async function Header({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl?: string | null;
}) {
  let notifications: AppNotification[] = [];
  let unreadCount = 0;
  try {
    const supabase = await createSupabaseServerClient();
    const user = await new AuthService(supabase).getCurrentUser();
    if (user) {
      ({ notifications, unreadCount } = await new NotificationService(supabase).getBellData(
        user.id
      ));
    }
  } catch (e) {
    // 通知は補助機能。取得失敗でもヘッダー自体は表示する。
    console.error('[Header] 通知の取得に失敗:', e);
  }

  return (
    <header className="glass sticky top-0 z-30 border-b border-brand-100/70">
      <div className="mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
        <Link href="/" aria-label="キキタイ ホーム">
          <Logo />
        </Link>

        {/* sm以上：アイコンのみの横並びナビ（ホバー/フォーカスでツールチップ表示） */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.filter((item) => item.href !== '/notifications' && item.href !== '/profile').map(
            (item) => (
              <IconNavLink key={item.href} href={item.href} label={item.label} icon={item.icon!} />
            )
          )}
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <ProfileNavMenu nickname={nickname} avatarUrl={avatarUrl} />
        </nav>

        {/* sm未満：ベル＋ハンバーガー */}
        <div className="flex items-center gap-1 sm:hidden">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <HeaderMobileMenu nickname={nickname} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}
