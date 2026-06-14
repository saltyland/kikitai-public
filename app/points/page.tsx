import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import Header from '@/components/Header';
import PointsSummaryCard from '@/components/PointsSummaryCard';

export default async function PointsPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const service = new ProfileService(supabase);
  const [points, lots] = await Promise.all([
    service.getPointsSummary(profile.id),
    service.getPointLots(profile.id),
  ]);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-slate-800">ポイント</h1>
        <PointsSummaryCard summary={points} lots={lots} />
      </main>
    </>
  );
}
