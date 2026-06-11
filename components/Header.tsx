import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import Avatar from '@/components/Avatar';
import Logo from '@/components/Logo';

/** ログイン後の共通ヘッダー */
export default function Header({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl?: string | null;
}) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-brand-100/70">
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link href="/" aria-label="キキタイ ホーム">
          <Logo />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/surveys" className="text-slate-600 hover:text-brand-600">
            回答する
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 font-medium text-slate-600 hover:text-brand-600"
          >
            <Avatar name={nickname} src={avatarUrl} className="h-7 w-7 text-xs" />
            <span className="hidden sm:inline">{nickname}</span>
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
      </div>
    </header>
  );
}
