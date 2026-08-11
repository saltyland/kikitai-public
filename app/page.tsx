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
import AppPageHeader from '@/components/ui/AppPageHeader';

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
      <main className="app-main mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {statusError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {statusError}
          </div>
        )}

        <AppPageHeader
          eyebrow="Your research workspace"
          title={
            <>
              答えて、
              <br />
              集める研究の輪
            </>
          }
          description="アンケートに答えてポイントを貯め、自分の研究に回答者を集める。今日の一歩を、ここから始めましょう。"
          backgroundImage="/images/app/research-network-dashboard-v3-pale.webp"
          backgroundAlt="回答と研究がつながるネットワーク"
        />

        {/* アンケート回答セクション（回答してポイントを貯めるのが最初の一歩なので先頭に置く） */}
        <div className="app-section-heading">
          <div>
            <p className="app-kicker">Answer & earn</p>
            <h2>次にこたえるアンケート</h2>
            <p>内容を確認しながら、自分に合う調査を選べます。</p>
          </div>
        </div>
        <div data-tour="answer" className="mx-auto max-w-4xl">
          <AnswerDeck surveys={answerQueue} />
        </div>

        {/* アンケート作成・管理セクション */}
        <div className="app-section-heading mt-12 border-t border-slate-200/70 pt-8">
          <div>
            <p className="app-kicker">Create & manage</p>
            <h2>あなたの調査</h2>
            <p>作成中のアンケートから、公開後の回答状況までまとめて確認できます。</p>
          </div>
          <p className="mb-5 pl-4 text-sm text-slate-500">
            カードを1枚ずつチェックして、回答するかスキップするか選べます。
          </p>
        </div>
        <div data-tour="my-surveys" className="mx-auto mb-10 max-w-4xl">
          <MySurveysSummaryCard surveys={mySurveys} />
        </div>

        <div className="mx-auto max-w-4xl"><FaqAccordion /></div>
      </main>
      <HomeTour />
    </>
  );
}
