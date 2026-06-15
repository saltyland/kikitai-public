import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import ManageDashboard from '@/components/ManageDashboard';
import { SurveyStatusBadge } from '@/components/SurveyStatusBadge';
import { changeStatusAction } from '@/app/actions/survey';
import DeleteSurveyButton from '@/components/DeleteSurveyButton';
import ShareLinkButton from '@/components/ShareLinkButton';
import RefreshButton from '@/components/ui/RefreshButton';
import type { SurveyStatus } from '@/lib/types/database';

const TABS: { key: 'all' | SurveyStatus; label: string }[] = [
  { key: 'draft', label: '下書き' },
  { key: 'open', label: '公開中' },
  { key: 'closed', label: '終了済み' },
  { key: 'all', label: 'すべて' },
];

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? (tab as 'all' | SurveyStatus) : 'all';

  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const allSurveys = await new SurveyService(supabase).listMySurveys(profile.id);
  const surveys =
    activeTab === 'all' ? allSurveys : allSurveys.filter((s) => s.status === activeTab);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-800">アンケート管理</h1>
          <RefreshButton />
        </div>

        <ManageDashboard surveys={allSurveys} activeTab={activeTab === 'all' ? undefined : activeTab} />

        {/* タブ */}
        <div className="mb-4 flex gap-2 border-b border-zinc-200">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === 'all' ? '/manage' : `/manage?tab=${t.key}`}
              className={
                activeTab === t.key
                  ? 'border-b-2 border-brand-500 px-3 py-2 text-sm font-bold text-brand-600'
                  : 'px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700'
              }
            >
              {t.label}
            </Link>
          ))}
        </div>

        {surveys.length === 0 ? (
          <div className="card-3d px-4 py-10 text-center">
            <p className="mt-2 text-sm font-medium text-slate-800">
              {activeTab === 'all' ? 'まだアンケートがありません' : '該当するアンケートはありません'}
            </p>
            {activeTab === 'all' && (
              <>
                <p className="mt-1 text-sm text-slate-500">最初のアンケートを作成して回答を集めましょう。</p>
                <Link
                  href="/surveys/new"
                  className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  ＋ アンケートを作成する
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => (
              <li key={s.id} className="card-3d p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-bold text-slate-800">{s.title}</h3>
                      <SurveyStatusBadge status={s.status} />
                      {s.visibility === 'unlisted' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          限定公開
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      回答数 {s.response_count} / {s.required_count}
                      {s.deadline && ` ・期限 ${s.deadline}`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={`/surveys/${s.id}/results`}
                    className="btn-3d btn-3d-secondary px-3 py-1"
                  >
                    結果を見る
                  </Link>
                  {s.status === 'draft' && (
                    <Link
                      href={`/surveys/${s.id}/edit`}
                      className="btn-3d btn-3d-secondary px-3 py-1"
                    >
                      編集
                    </Link>
                  )}
                  {s.status === 'draft' && (
                    <form action={changeStatusAction}>
                      <input type="hidden" name="surveyId" value={s.id} />
                      <input type="hidden" name="status" value="open" />
                      <button className="btn-3d btn-3d-primary px-3 py-1">
                        公開する
                      </button>
                    </form>
                  )}
                  {s.status === 'open' && (
                    <form action={changeStatusAction}>
                      <input type="hidden" name="surveyId" value={s.id} />
                      <input type="hidden" name="status" value="closed" />
                      <button className="btn-3d btn-3d-danger px-3 py-1">
                        終了する
                      </button>
                    </form>
                  )}
                  {s.status === 'open' && <ShareLinkButton token={s.share_token} />}
                  <DeleteSurveyButton surveyId={s.id} title={s.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
