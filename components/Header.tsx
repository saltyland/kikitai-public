import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import Avatar from '@/components/Avatar';
import Logo from '@/components/Logo';
import NotificationBell from '@/components/NotificationBell';
import HeaderMobileMenu from '@/components/HeaderMobileMenu';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { NotificationService } from '@/lib/services/notificationService';
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
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link href="/" aria-label="キキタイ ホーム">
          <Logo />
        </Link>

        {/* sm以上：横並びナビ */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-brand-600">
            ホーム
          </Link>
          <Link href="/surveys/new" className="text-slate-600 hover:text-brand-600">
            作成する
          </Link>
          <Link href="/surveys" className="text-slate-600 hover:text-brand-600">
            回答する
          </Link>
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <Link
            href="/profile"
            className="flex items-center gap-2 font-medium text-slate-600 hover:text-brand-600"
          >
            <Avatar name={nickname} src={avatarUrl} className="h-7 w-7 text-xs" />
            <span className="max-w-[12rem] truncate">{nickname}</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-slate-400 hover:text-red-500 cursor-pointer"
            >
              ログアウト
            </button>
          </form>
        </nav>

        {/* sm未満：ベル＋ハンバーガー */}
        <div className="flex items-center gap-1 sm:hidden">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <HeaderMobileMenu nickname={nickname} />
        </div>
      </div>
    </header>
  );
}
