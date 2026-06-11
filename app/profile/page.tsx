import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import Header from '@/components/Header';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const points = await new ProfileService(supabase).getPointsSummary(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-slate-800">プロフィール</h1>
        <ProfileForm profile={profile} points={points} />
      </main>
    </>
  );
}
