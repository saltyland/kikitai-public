import Link from 'next/link';
import Avatar from '@/components/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import { calcProgress } from '@/lib/ui/surveyStats';
import { formatDateJa } from '@/lib/utils';
import type { PreviewQuestionLite, SurveyWithStats } from '@/lib/types/database';

/** 設問1問分のコンパクトな見た目（非操作・あくまで雰囲気を見せるだけ） */
export function MiniQuestion({ q, index }: { q: PreviewQuestionLite; index: number }) {
  return (
    <div className="space-y-1.5">
      <p className="line-clamp-1 text-xs font-medium text-slate-700">
        <span className="mr-1 text-brand-600">Q{index + 1}.</span>
        {q.text || '（設問文）'}
      </p>
      <MiniInput q={q} />
    </div>
  );
}

function MiniInput({ q }: { q: PreviewQuestionLite }) {
  if (q.type === 'single' || q.type === 'multiple' || q.type === 'dropdown') {
    const opts = q.options.filter(Boolean).slice(0, 4);
    if (opts.length === 0) return <div className="h-6 rounded-md border border-slate-200 bg-white" />;
    return (
      <div className="space-y-1.5">
        {opts.map((o, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
          >
            <span
              className={`h-3.5 w-3.5 shrink-0 border border-slate-300 bg-white ${
                q.type === 'multiple' ? 'rounded' : 'rounded-full'
              }`}
            />
            <span className="line-clamp-1 text-[11px] text-slate-600">{o}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === 'scale') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] text-slate-500"
          >
            {n}
          </span>
        ))}
      </div>
    );
  }

  if (q.type === 'paragraph') {
    return <div className="h-10 rounded-md border border-slate-200 bg-white" />;
  }
  if (q.type === 'date') {
    return (
      <div className="flex h-7 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-400">
        年 / 月 / 日
      </div>
    );
  }
  if (q.type === 'grid') {
    return (
      <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-[11px] text-slate-400">
        表形式の設問
      </div>
    );
  }
  // text
  return <div className="h-7 rounded-md border border-slate-200 bg-white" />;
}

/** アンケート一覧の1枚。投稿者・タイトル・設問プレビューをまとめて見せる。 */
export default function SurveyCard({ survey }: { survey: SurveyWithStats }) {
  const author = survey.author_nickname ?? '不明';
  const remaining = Math.max(0, survey.required_count - survey.response_count);
  const progress = calcProgress(survey.response_count, survey.required_count);
  const preview = survey.preview ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* 投稿者（カード枠の外・上） */}
      <Link
        href={survey.author_id ? `/users/${survey.author_id}` : '#'}
        className="mb-3 flex items-center gap-3 px-1 group"
      >
        <Avatar name={author} src={survey.author_avatar_url} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{author}</p>
          <p className="truncate text-xs text-slate-400">
            残り {remaining}枠
            {survey.deadline && ` ・期限 ${formatDateJa(survey.deadline)}`}
          </p>
        </div>
      </Link>

      <article className="card-3d card-3d-hover flex h-full flex-1 flex-col overflow-hidden p-0">
        {/* タイトル・説明 */}
        <div className="px-5 pt-5">
          <h3 className="line-clamp-2 select-none text-base font-bold text-slate-800">{survey.title}</h3>
          <p className="mt-1 min-h-[2.5rem] line-clamp-2 select-none text-sm text-slate-500">{survey.description}</p>
        </div>

        {/* 設問プレビュー（下が見切れて「もっとある」感を出す） */}
        <div className="relative mx-5 mt-3">
          {preview.length > 0 ? (
            <>
              <div className="h-44 space-y-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                {preview.map((q, i) => (
                  <MiniQuestion key={i} q={q} index={i} />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-gradient-to-t from-white via-white/80 to-transparent" />
            </>
          ) : (
            <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-xs text-slate-400">
              設問プレビューはありません
            </div>
          )}
        </div>

        {/* 回答の集まり具合（required_count に到達すると自動で締め切られる） */}
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              回答 {survey.response_count} / {survey.required_count}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1">
            <ProgressBar progress={progress} />
          </div>
        </div>

        {/* フッター */}
        <div className="mt-auto flex items-center justify-between gap-3 px-5 py-4">
          {survey.avg_reward_points != null ? (
            <span className="inline-flex shrink items-center gap-1 truncate rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
              全問回答で平均 {survey.avg_reward_points}pt
              {survey.max_reward_points != null && (
                <span className="font-normal text-brand-500">
                  （最高 {survey.max_reward_points}pt）
                </span>
              )}
            </span>
          ) : (
            <span className="truncate text-xs text-slate-400">
              {preview.length > 0 ? `${preview.length}問のプレビュー` : '設問を見る'}
            </span>
          )}
          <Link
            href={`/surveys/${survey.id}`}
            className="btn-3d btn-3d-primary shrink-0 px-5 py-2 text-sm"
          >
            回答する
          </Link>
        </div>
      </article>

    </div>
  );
}
