import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

/** ログイン後の共通ヘッダー */
export default function Header({ nickname }: { nickname: string }) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-sky-100/70">
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-lg text-sky-600">
          キキタイ
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/surveys" className="text-slate-600 hover:text-sky-600">
            回答する
          </Link>
          <Link href="/profile" className="font-medium text-slate-600 hover:text-sky-600">
            {nickname}
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
