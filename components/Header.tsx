import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

/** ログイン後の共通ヘッダー */
export default function Header({ nickname }: { nickname: string }) {
  return (
    <header className="bg-white border-b border-zinc-200">
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-indigo-700">
          キキタイ
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/surveys" className="text-zinc-600 hover:text-indigo-700">
            回答する
          </Link>
          <Link href="/profile" className="text-zinc-600 hover:text-indigo-700">
            {nickname}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-zinc-500 hover:text-red-600 cursor-pointer"
            >
              ログアウト
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
