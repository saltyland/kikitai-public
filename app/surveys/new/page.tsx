import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';
import SurveyEditor from '@/components/SurveyEditor';
import AppPageHeader from '@/components/ui/AppPageHeader';

export default async function NewSurveyPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="app-main mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <AppPageHeader
          eyebrow="Survey studio"
          title="問いを、伝わる調査へ。"
          description="基本情報から設問、公開前の品質チェックまで。迷わず進められる3ステップで調査を組み立てます。"
        />
        <SurveyEditor survey={null} />
      </main>
    </>
  );
}
