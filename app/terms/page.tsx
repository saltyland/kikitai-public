import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = {
  title: '利用規約｜キキタイ',
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" aria-label="キキタイ トップ" className="inline-block">
        <Logo className="text-brand-600" />
      </Link>
      <h1 className="mt-8 text-2xl font-extrabold text-slate-800">利用規約</h1>
      <div className="card-3d mt-6 space-y-4 p-6 text-sm leading-relaxed text-slate-600">
        <p>
          本ページは現在準備中です。正式な利用規約の公開までしばらくお待ちください。
        </p>
        <p>
          キキタイは、学生・研究者が互いにアンケートに回答し合うためのサービスです。
          ご利用にあたっては、他の利用者への配慮と、研究倫理にもとづく誠実な回答・調査をお願いします。
        </p>
        <p className="text-slate-400">最終更新：準備中</p>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/" className="font-bold text-brand-600 hover:underline">
          ← トップへ戻る
        </Link>
      </p>
    </main>
  );
}
