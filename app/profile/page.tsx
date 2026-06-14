import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import { FollowService } from '@/lib/services/followService';
import { TopicService } from '@/lib/services/topicService';
import Header from '@/components/Header';
import ProfileForm from '@/components/ProfileForm';
import TrustBadge from '@/components/TrustBadge';
import ProfileTabs from '@/components/ProfileTabs';
import FollowingUsersTab from '@/components/FollowingUsersTab';
import FollowingTopicsTab from '@/components/FollowingTopicsTab';
import NotificationSettingsTab from '@/components/NotificationSettingsTab';

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

        <ProfileTabs
          profileTab={
            <>
              <section className="card-3d mb-6 rounded-2xl bg-white p-5">
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

              <ProfileForm profile={profile} points={points} />
            </>
          }
          followingUsersTab={<FollowingUsersTab profiles={followedUsers} />}
          followingTopicsTab={<FollowingTopicsTab topics={followedTopics} />}
          notificationsTab={<NotificationSettingsTab settings={profile.notification_settings} />}
        />
      </main>
    </>
  );
}
