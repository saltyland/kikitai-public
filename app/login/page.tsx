import Link from 'next/link';
import { LoginForm } from '@/components/AuthForms';
import { LogoMark } from '@/components/Logo';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card-3d w-full max-w-sm p-8">
        <Link href="/" className="block text-brand-600" aria-label="キキタイ トップへ">
          <LogoMark className="mx-auto h-12" />
          <h1 className="mt-2 text-center text-2xl font-extrabold">キキタイ</h1>
        </Link>
        <p className="mt-1 text-center text-sm text-slate-500">Googleアカウントでログイン・新規登録できます</p>
        <ul className="mb-6 mt-3 space-y-1 text-center text-xs text-slate-400">
          <li>非公開アンケートはポイント不要・ずっと無料</li>
          <li>AIが質問を自動作成／Excelで結果をすぐ確認</li>
          <li>独自のAI評価で悪質な回答を自動ブロック</li>
        </ul>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
