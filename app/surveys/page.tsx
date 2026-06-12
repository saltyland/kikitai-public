import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import SurveyCard from '@/components/SurveyCard';
import RefreshButton from '@/components/ui/RefreshButton';

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
          <div className="card-3d px-4 py-10 text-center">
            <p className="text-4xl" aria-hidden="true">📭</p>
            <p className="mt-2 text-sm font-medium text-slate-800">回答できるアンケートはありません</p>
            <p className="mt-1 text-sm text-slate-500">
              現在、公開中のアンケートはありません。自分でアンケートを作って交換を始めましょう。
            </p>
          </div>
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
