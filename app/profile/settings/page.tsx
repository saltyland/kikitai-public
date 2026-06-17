import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';
import ProfileSettingsForm from '@/components/ProfileSettingsForm';

export default async function ProfileSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-slate-800">設定</h1>
        <ProfileSettingsForm profile={profile} settings={profile.notification_settings} />
      </main>
    </>
  );
}
