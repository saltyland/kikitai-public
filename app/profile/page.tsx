import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <>
      <Header nickname={profile.nickname} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-slate-800">プロフィール</h1>
        <ProfileForm profile={profile} />
      </main>
    </>
  );
}
