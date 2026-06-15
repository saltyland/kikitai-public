import Link from 'next/link';
import type { SurveyWithStats } from '@/lib/types/database';

/** ホーム上部のサマリーカード：公開中アンケートが0件の場合は作成CTAを表示する */
export default function MySurveysSummaryCard({ surveys }: { surveys: SurveyWithStats[] }) {
  const openCount = surveys.filter((s) => s.status === 'open').length;
  const draftCount = surveys.filter((s) => s.status === 'draft').length;

  if (openCount === 0) {
    return (
      <Link href="/surveys/new" className="card-3d card-3d-hover mb-8 block p-6">
        <p className="text-lg font-extrabold text-brand-600">＋ アンケートを作成する</p>
        <p className="mt-1 text-sm text-slate-500">
          {draftCount > 0
            ? `下書きが${draftCount}件あります。公開して回答を集めましょう。`
            : '設問を作って回答を集めましょう。'}
        </p>
      </Link>
    );
  }

  return (
    <Link href="/manage" className="card-3d card-3d-hover mb-8 block p-6">
      <p className="text-lg font-extrabold text-slate-800">公開中のアンケート {openCount}件</p>
      <p className="mt-1 text-sm text-slate-500">
        アンケートの管理・結果の確認は「アンケート管理」から行えます。
      </p>
    </Link>
  );
}
