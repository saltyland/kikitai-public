import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import MySurveysSummaryCard from '@/components/MySurveysSummaryCard';
import AnswerDeck from '@/components/AnswerDeck';
import FaqAccordion from '@/components/FaqAccordion';
import type { SurveyWithStats } from '@/lib/types/database';
import { SurveyService } from '@/lib/services/surveyService';
import HomeTour from '@/components/HomeTour';

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

  // おすすめ→フォロー中→新着 を重複排除して1つの回答キューに統合
  const seen = new Set<string>();
  const answerQueue: SurveyWithStats[] = [];
  for (const s of [...recommended, ...byFollowedUsers, ...newest]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    answerQueue.push(s);
  }

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
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-brand-100/70 bg-gradient-to-br from-white via-brand-50/60 to-brand-100/40 px-6 py-8 text-center shadow-[0_8px_30px_-12px_rgba(38,166,154,0.35)] sm:px-8 sm:py-10 sm:text-left">
          {/* 背景の装飾ブロブ（やわらかい奥行き） */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-brand-200/40 blur-3xl" />
          <h1 className="relative text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400 bg-clip-text text-transparent">
              こたえて、あつめる。
            </span>
            <span className="text-slate-800">研究の輪。</span>
          </h1>
          <p className="relative mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            アンケートに答えてポイントを貯め、自分の研究に回答者を集めよう。<br className="hidden sm:inline" />
            みんなで回答し合う、アンケート交換サービス。
          </p>
        </section>

        {/* アンケート回答セクション（回答してポイントを貯めるのが最初の一歩なので先頭に置く） */}
        <div className="mb-1 border-l-4 border-brand-400 pl-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            アンケートに回答する
          </h2>
        </div>
        <p className="mb-5 pl-4 text-sm text-slate-500">
          カードを1枚ずつチェックして、回答するかスキップするか選べます。
        </p>
        <div data-tour="answer">
          <AnswerDeck surveys={answerQueue} />
        </div>

        {/* アンケート作成・管理セクション */}
        <div className="mt-8 border-t border-slate-300/70 pt-6">
          <div className="mb-2 border-l-4 border-brand-400 pl-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              アンケートを作成・管理する
            </h2>
          </div>
        </div>
        <div data-tour="my-surveys" className="mb-10">
          <MySurveysSummaryCard surveys={mySurveys} />
        </div>

        <FaqAccordion />
      </main>
      <HomeTour />
    </>
  );
}
