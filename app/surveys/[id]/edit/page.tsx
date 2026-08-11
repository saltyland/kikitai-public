import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import SurveyEditor from '@/components/SurveyEditor';

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  let survey;
  try {
    survey = await new SurveyService(supabase).getSurveyForEdit(profile.id, id);
  } catch {
    redirect('/');
  }

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="app-main mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-7">
          <p className="app-kicker">Survey studio / edit</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">アンケートを編集</h1>
          <p className="mt-2 text-sm text-slate-500">回答者に伝わる流れを確認しながら、調査内容を仕上げましょう。</p>
        </div>
        <SurveyEditor survey={survey} />
      </main>
    </>
  );
}
