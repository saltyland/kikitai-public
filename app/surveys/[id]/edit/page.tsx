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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-zinc-800">アンケートを編集</h1>
        <SurveyEditor survey={survey} />
      </main>
    </>
  );
}
