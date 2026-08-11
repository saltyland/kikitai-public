import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { NotificationService } from '@/lib/services/notificationService';
import Header from '@/components/Header';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions/notification';
import AppPageHeader from '@/components/ui/AppPageHeader';

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const notifications = await new NotificationService(supabase).listAll(profile.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="app-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <AppPageHeader
          eyebrow="Activity"
          title="通知"
          description={unreadCount > 0 ? `未読の通知が${unreadCount}件あります。調査の進捗や新しいつながりを確認しましょう。` : '新しい回答やフォロー、調査に関する更新をここで確認できます。'}
          actions={unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="btn-3d btn-3d-secondary cursor-pointer px-5 py-2 text-sm">
                すべて既読にする
              </button>
            </form>
          ) : undefined}
        />

        {notifications.length === 0 ? (
          <div className="card-3d px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">通知はありません</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const body = (
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="未読" />
                  )}
                  <div className={n.read ? 'min-w-0 opacity-60' : 'min-w-0'}>
                    <p className="text-sm font-medium text-slate-700">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(n.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className={`card-3d flex items-center gap-2 p-4 transition ${n.read ? '' : 'border-brand-200 bg-brand-50/35'}`}>
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link href={n.link} className="block hover:opacity-80">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </div>
                  {!n.read && (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <button
                        type="submit"
                        className="shrink-0 text-xs text-slate-400 hover:text-brand-600 cursor-pointer"
                      >
                        既読にする
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
