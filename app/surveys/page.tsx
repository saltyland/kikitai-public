import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import SurveyCard from '@/components/SurveyCard';
import RefreshButton from '@/components/ui/RefreshButton';
import EmptyState from '@/components/EmptyState';
import Link from 'next/link';

export default async function SurveyListPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const surveys = await new SurveyService(supabase).listAnswerableSurveys(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">回答できるアンケート</h1>
            <p className="mt-1 text-sm text-slate-400">スクロールしていろんなアンケートを見てみましょう。</p>
          </div>
          <RefreshButton />
        </div>
        {surveys.length === 0 ? (
          <EmptyState
            title="いま回答できるアンケートはありません"
            description="新しいアンケートが公開されると、ここに表示されます。あなたのアンケートを先に置いて、回答を待つこともできます。"
          >
            <Link href="/surveys/new" className="btn-3d btn-3d-primary px-5 py-2.5 text-sm">
              ＋ アンケートを作る
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {surveys.map((s) => (
              <SurveyCard key={s.id} survey={s} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
