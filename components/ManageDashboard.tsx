import Link from 'next/link';
import ProgressBar from '@/components/ui/ProgressBar';
import { summarizeMySurveys } from '@/lib/ui/surveyStats';
import type { SurveyStatus, SurveyWithStats } from '@/lib/types/database';

const STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: '下書き',
  open: '公開中',
  closed: '終了済み',
};

const STATUSES: SurveyStatus[] = ['draft', 'open', 'closed'];

/** /manage上部の集計ダッシュボード（ステータス別件数バッジ＋公開中アンケートの回答進捗） */
export default function ManageDashboard({
  surveys,
  activeTab,
}: {
  surveys: SurveyWithStats[];
  activeTab?: SurveyStatus;
}) {
  const summary = summarizeMySurveys(surveys);

  return (
    <div className="card-3d mb-4 p-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Link
            key={status}
            href={`/manage?tab=${status}`}
            className={
              activeTab === status
                ? 'rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white'
                : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200'
            }
          >
            {STATUS_LABELS[status]} {summary.statusCounts[status]}件
          </Link>
        ))}
      </div>

      {summary.openSurveys.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-slate-500">
            公開中アンケートの総回答数：{summary.openTotalResponses}件
          </p>
          <ul className="mt-2 space-y-2">
            {summary.openSurveys.map((s) => (
              <li key={s.id}>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="truncate">{s.title}</span>
                  <span className="shrink-0">
                    {s.responseCount} / {s.requiredCount}（{s.progress}%）
                  </span>
                </div>
                <div className="mt-1">
                  <ProgressBar progress={s.progress} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
