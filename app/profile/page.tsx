import Link from 'next/link';
import { ChevronRight, Settings } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import { FollowService } from '@/lib/services/followService';
import { TopicService } from '@/lib/services/topicService';
import Header from '@/components/Header';
import TrustBadge from '@/components/TrustBadge';
import ProfileTabs from '@/components/ProfileTabs';
import FollowingUsersTab from '@/components/FollowingUsersTab';
import FollowingTopicsTab from '@/components/FollowingTopicsTab';
import { PointsCard, LogoutButton, DeleteAccountSection } from '@/components/ProfileSummary';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const service = new ProfileService(supabase);
  const [points, followedUsers, followedTopics] = await Promise.all([
    service.getPointsSummary(profile.id),
    new FollowService(supabase).getFollowedUserProfiles(profile.id),
    new TopicService(supabase).getFollowedTopics(profile.id),
  ]);

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-slate-800">マイページ</h1>

        <div className="space-y-6">
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

          <PointsCard profile={profile} points={points} />

          <Link
            href="/profile/settings"
            className="card-3d flex items-center justify-between gap-3 rounded-2xl bg-white p-5 hover:bg-brand-50/50"
          >
            <span className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-slate-400" aria-hidden />
              <span className="text-sm font-bold text-slate-800">プロフィール・通知・プランの設定</span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />
          </Link>

          <section>
            <h2 className="mb-3 text-sm font-bold text-slate-800">その他</h2>
            <ProfileTabs
              followingUsersTab={<FollowingUsersTab profiles={followedUsers} />}
              followingTopicsTab={<FollowingTopicsTab topics={followedTopics} />}
            />

            <div className="mt-6 space-y-4">
              <LogoutButton />
              <div className="border-t border-slate-200 pt-4">
                <DeleteAccountSection />
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
