import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import Header from '@/components/Header';
import ProfileForm from '@/components/ProfileForm';
import TrustBadge from '@/components/TrustBadge';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const service = new ProfileService(supabase);
  const points = await service.getPointsSummary(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-slate-800">プロフィール</h1>

        <div className="mb-6 space-y-4">
          <section className="card-3d rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500">信頼スコア</h2>
              <TrustBadge score={profile.trust_score} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              信頼スコアは回答の品質に応じて変動します。雑な回答（アテンションチェック誤答や極端に短い回答）で減点され、
              丁寧な回答を続けることで信頼される回答者として扱われます。
              一部のアンケートは一定以上の信頼スコアがないと配信されません。
            </p>
          </section>
        </div>

        <ProfileForm profile={profile} points={points} />
      </main>
    </>
  );
}
