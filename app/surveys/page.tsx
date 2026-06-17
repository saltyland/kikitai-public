import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import HorizontalSurveyRow from '@/components/HorizontalSurveyRow';
import RefreshButton from '@/components/ui/RefreshButton';
import EmptyState from '@/components/EmptyState';
import Link from 'next/link';

export default async function SurveyListPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const service = new SurveyService(supabase);
  const [byTopics, byFollowedUsers, recommended, newest] = await Promise.all([
    service.listByFollowedTopics(profile.id),
    service.listByFollowedUsers(profile.id),
    service.listAnswerableSurveys(profile.id),
    service.listNewest(profile.id),
  ]);

  const isEmpty =
    byTopics.length === 0 &&
    byFollowedUsers.length === 0 &&
    recommended.length === 0 &&
    newest.length === 0;

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-2 rounded-xl bg-brand-50/50 px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">回答できるアンケート</h1>
            <p className="mt-1 text-sm text-slate-400">スクロールしていろんなアンケートを見てみましょう。</p>
          </div>
          <RefreshButton />
        </div>

        {isEmpty ? (
          <EmptyState
            title="いま回答できるアンケートはありません"
            description="新しいアンケートが公開されると、ここに表示されます。あなたのアンケートを先に置いて、回答を待つこともできます。"
          >
            <Link href="/surveys/new" className="btn-3d btn-3d-primary px-5 py-2.5 text-sm">
              ＋ アンケートを作る
            </Link>
          </EmptyState>
        ) : (
          <>
            {byTopics.map(({ topic, surveys }) => (
              <HorizontalSurveyRow
                key={topic.id}
                title={`「${topic.name}」の新着アンケート`}
                surveys={surveys}
              />
            ))}
            <HorizontalSurveyRow
              title="フォロー中ユーザーの新着アンケート"
              surveys={byFollowedUsers}
            />
            <HorizontalSurveyRow title="あなたへのおすすめ" surveys={recommended} />
            <HorizontalSurveyRow title="新着アンケート" surveys={newest} />
          </>
        )}
      </main>
    </>
  );
}
