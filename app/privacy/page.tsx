import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = {
  title: 'プライバシーポリシー｜キキタイ',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" aria-label="キキタイ トップ" className="inline-block">
        <Logo className="text-brand-600" />
      </Link>
      <h1 className="mt-8 text-2xl font-extrabold text-slate-800">プライバシーポリシー</h1>
      <div className="card-3d mt-6 space-y-4 p-6 text-sm leading-relaxed text-slate-600">
        <p>本ページは現在準備中です。正式なプライバシーポリシーの公開までしばらくお待ちください。</p>
        <p>
          キキタイでは、登録情報やプロフィール属性（年齢・性別・所属など）を、
          アンケートのマッチング配信のために利用します。各属性は項目ごとに公開・非公開を選べます。
        </p>
        <p>
          回答データはアンケート作成者が研究目的で集計・利用します。個人を特定する情報の取り扱いには
          十分配慮し、保持期間を超えたデータは自動的に削除されます。
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
