import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import MySurveysSummaryCard from '@/components/MySurveysSummaryCard';
import HorizontalSurveyRow from '@/components/HorizontalSurveyRow';
import FaqAccordion from '@/components/FaqAccordion';
import { SurveyService } from '@/lib/services/surveyService';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    statusError?: string;
  }>;
}) {
  const { statusError } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  const profile = await auth.getCurrentProfile();
  // 未ログインはサービス紹介のランディングページを表示
  if (!profile) return <LandingPage />;

  const service = new SurveyService(supabase);
  const [mySurveys, recommended, byFollowedUsers, newest] = await Promise.all([
    service.listMySurveys(profile.id),
    service.listAnswerableSurveys(profile.id),
    service.listByFollowedUsers(profile.id),
    service.listNewest(profile.id),
  ]);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
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

        {/* アンケート作成・管理セクション */}
        <div className="mb-2 border-l-4 border-brand-400 pl-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            アンケートを作成・管理する
          </h2>
        </div>
        <MySurveysSummaryCard surveys={mySurveys} />

        {/* アンケート回答セクション */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="mb-4 border-l-4 border-brand-400 pl-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              アンケートに回答する
            </h2>
          </div>
        </div>

        <HorizontalSurveyRow
          title="あなたへのおすすめ"
          surveys={recommended.slice(0, 8)}
          viewMoreHref="/surveys"
        />
        <HorizontalSurveyRow
          title="フォロー中ユーザーの新着アンケート"
          surveys={byFollowedUsers.slice(0, 8)}
          viewMoreHref="/surveys"
        />
        <HorizontalSurveyRow
          title="新着アンケート"
          surveys={newest.slice(0, 8)}
          viewMoreHref="/surveys"
        />

        <FaqAccordion />
      </main>
    </>
  );
}
