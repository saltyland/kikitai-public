import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { TopicService } from '@/lib/services/topicService';
import Header from '@/components/Header';
import SurveyEditor from '@/components/SurveyEditor';

export default async function NewSurveyPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const topics = await new TopicService(supabase).listAll();

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-zinc-800">アンケートを作成</h1>
        <SurveyEditor survey={null} topics={topics} />
      </main>
    </>
  );
}
