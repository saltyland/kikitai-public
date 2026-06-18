import Link from 'next/link';
import Avatar from '@/components/Avatar';
import FollowButton from '@/components/FollowButton';
import type { PublicProfile } from '@/lib/types/database';

/** フォロー中ユーザー一覧タブ */
export default function FollowingUsersTab({ profiles }: { profiles: PublicProfile[] }) {
  if (profiles.length === 0) {
    return (
      <div className="card-3d px-4 py-10 text-center">
        <p className="text-sm text-slate-500">
          まだ誰もフォローしていません。アンケートの投稿者ページからフォローできます。
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {profiles.map((p) => (
        <li key={p.id} className="card-3d flex items-center justify-between gap-3 p-4">
          <Link href={`/users/${p.id}`} className="flex min-w-0 items-center gap-3">
            <Avatar name={p.nickname} src={p.avatar_url} className="h-10 w-10 text-base" />
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-800">{p.nickname}</p>
              {p.affiliation && <p className="truncate text-xs text-slate-500">{p.affiliation}</p>}
            </div>
          </Link>
          <FollowButton followeeId={p.id} initialFollowing={true} />
        </li>
      ))}
    </ul>
  );
}
