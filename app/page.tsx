import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import { SurveyStatusBadge } from '@/components/SurveyStatusBadge';
import { changeStatusAction } from '@/app/actions/survey';
import DeleteSurveyButton from '@/components/DeleteSurveyButton';
import ShareLinkButton from '@/components/ShareLinkButton';
import LandingPage from '@/components/LandingPage';
import RefreshButton from '@/components/ui/RefreshButton';
import PublishSurveyButton from '@/components/PublishSurveyButton';
import EmptyState from '@/components/EmptyState';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    answered?: string;
    score?: string;
    pts?: string;
    closed?: string;
    statusError?: string;
  }>;
}) {
  const { answered, score, pts, closed, statusError } = await searchParams;
  const earnedPts = pts ? Number(pts) : null;
  const qScore = score ? Number(score) : null;
  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  const profile = await auth.getCurrentProfile();
  // 未ログインはサービス紹介のランディングページを表示
  if (!profile) return <LandingPage />;

  const surveys = await new SurveyService(supabase).listMySurveys(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {answered && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            回答を送信しました。ありがとう！
            {earnedPts !== null && qScore !== null && (
              <span className="mt-1 block text-green-800">
                {earnedPts > 0
                  ? `ていねいな回答ありがとう！ ${earnedPts}pt 獲得しました。`
                  : `今回はポイントがもらえませんでした。次はもう少しくわしく答えてみよう。`}
              </span>
            )}
            {closed && (
              <span className="mt-1 block text-green-800">
                このアンケートは必要な回答数が集まったので、自動的に締め切られました。
              </span>
            )}
          </div>
        )}

        {statusError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {statusError}
          </div>
        )}

        {/* ヒーローコピー（DESIGN_SPEC 準拠） */}
        <section className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
            こたえて、あつめる。研究の輪。
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            アンケートに答えてポイントを貯め、自分の研究に回答者を集めよう。<br className="hidden sm:inline" />
            みんなで回答し合う、アンケート交換サービス。
          </p>
        </section>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/surveys"
            className="card-3d card-3d-hover block p-6"
          >
            <p className="text-lg font-extrabold text-brand-600">アンケートに答えてポイントをためる</p>
            <p className="mt-1 text-sm text-slate-500">答えるとポイントがたまります。まずはここから。</p>
          </Link>
          <Link
            href="/surveys/new"
            className="card-3d card-3d-hover block p-6"
          >
            <p className="text-lg font-extrabold text-slate-800">＋ アンケートを作る</p>
            <p className="mt-1 text-sm text-slate-500">ためたポイントで回答者を集めましょう</p>
          </Link>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800">作成したアンケート</h2>
          <RefreshButton />
        </div>
        {surveys.length === 0 ? (
          <EmptyState
            title="まだ作ったアンケートはありません"
            description="まずは他の人のアンケートに答えてポイントをため、そのポイントで自分のアンケートに回答者を集めましょう。"
          >
            <Link href="/surveys" className="btn-3d btn-3d-primary px-5 py-2.5 text-sm">
              アンケートに答えてポイントをためる
            </Link>
            <Link href="/surveys/new" className="btn-3d btn-3d-secondary px-5 py-2.5 text-sm">
              ＋ アンケートを作る
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => (
              <li
                key={s.id}
                className="card-3d p-4"
              >
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
                  {s.status === 'draft' && <PublishSurveyButton surveyId={s.id} />}
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
