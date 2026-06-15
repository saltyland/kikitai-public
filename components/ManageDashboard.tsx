import ProgressBar from '@/components/ui/ProgressBar';
import { summarizeMySurveys } from '@/lib/ui/surveyStats';
import type { SurveyWithStats } from '@/lib/types/database';

/** /manage上部の集計ダッシュボード（公開中アンケートの回答進捗） */
export default function ManageDashboard({ surveys }: { surveys: SurveyWithStats[] }) {
  const summary = summarizeMySurveys(surveys);

  if (summary.openSurveys.length === 0) return null;

  return (
    <div className="card-3d mb-4 p-4">
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
  );
}
