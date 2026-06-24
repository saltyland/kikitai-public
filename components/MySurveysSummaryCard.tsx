import Link from 'next/link';
import ProgressBar from '@/components/ui/ProgressBar';
import { calcProgress } from '@/lib/ui/surveyStats';
import type { SurveyWithStats } from '@/lib/types/database';

/** ホーム上部のサマリーカード：公開中アンケートが0件の場合は作成CTAを表示する */
export default function MySurveysSummaryCard({ surveys }: { surveys: SurveyWithStats[] }) {
  const openSurveys = surveys.filter((s) => s.status === 'open');
  const draftCount = surveys.filter((s) => s.status === 'draft').length;

  if (openSurveys.length === 0) {
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
    <div className="card-3d mb-8 p-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-lg font-extrabold text-slate-800">
          公開中のアンケート {openSurveys.length}件
        </p>
        <div className="flex items-center gap-2">
          <Link href="/manage" className="btn-3d btn-3d-primary px-3 py-1.5 text-xs">
            作成・管理
          </Link>
        </div>
      </div>
      <p className="mb-3 text-sm text-slate-500">
        アンケートの管理・結果の確認は「作成・管理」から行えます。
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {openSurveys.slice(0, 4).map((s) => {
          const progress = calcProgress(s.response_count, s.required_count);
          return (
            <Link
              key={s.id}
              href={`/surveys/${s.id}/results`}
              className="card-3d card-3d-hover block bg-brand-50 p-4"
            >
              <p className="line-clamp-1 text-sm font-bold text-slate-800">{s.title}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  回答 {s.response_count} / {s.required_count}件
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1">
                <ProgressBar progress={progress} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
