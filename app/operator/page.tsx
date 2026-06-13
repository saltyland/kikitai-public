import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = {
  title: '運営者情報｜キキタイ',
};

export default function OperatorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" aria-label="キキタイ トップ" className="inline-block">
        <Logo className="text-brand-600" />
      </Link>
      <h1 className="mt-8 text-2xl font-extrabold text-slate-800">運営者情報</h1>
      <div className="card-3d mt-6 space-y-3 p-6 text-sm leading-relaxed text-slate-600">
        <p>本ページは現在準備中です。正式な運営者情報の公開までしばらくお待ちください。</p>
        <dl className="mt-2 divide-y divide-slate-100">
          <div className="flex gap-4 py-2">
            <dt className="w-28 shrink-0 font-bold text-slate-700">サービス名</dt>
            <dd>キキタイ</dd>
          </div>
          <div className="flex gap-4 py-2">
            <dt className="w-28 shrink-0 font-bold text-slate-700">運営者</dt>
            <dd className="text-slate-400">準備中</dd>
          </div>
          <div className="flex gap-4 py-2">
            <dt className="w-28 shrink-0 font-bold text-slate-700">お問い合わせ</dt>
            <dd className="text-slate-400">準備中</dd>
          </div>
        </dl>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/" className="font-bold text-brand-600 hover:underline">
          ← トップへ戻る
        </Link>
      </p>
    </main>
  );
}
