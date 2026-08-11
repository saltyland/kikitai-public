import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import Header from '@/components/Header';
import PointsSummaryCard from '@/components/PointsSummaryCard';
import AppPageHeader from '@/components/ui/AppPageHeader';

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
      <main className="app-main mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <AppPageHeader
          eyebrow="Point wallet"
          title="回答が、次の調査を動かす。"
          description="回答で得たポイントと有効期限を確認できます。ポイントは、あなたのアンケートに回答を集めるために使われます。"
        />
        <PointsSummaryCard summary={points} lots={lots} />
      </main>
    </>
  );
}
