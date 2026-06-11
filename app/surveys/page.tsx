import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import SurveyCard from '@/components/SurveyCard';

export default async function SurveyListPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const surveys = await new SurveyService(supabase).listAnswerableSurveys(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-1 text-xl font-bold text-slate-800">回答できるアンケート</h1>
        <p className="mb-6 text-sm text-slate-400">スクロールしていろんなアンケートを見てみましょう。</p>
        {surveys.length === 0 ? (
          <p className="card-3d px-4 py-8 text-center text-sm text-slate-500">
            現在、回答できるアンケートはありません。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {surveys.map((s) => (
              <SurveyCard key={s.id} survey={s} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
