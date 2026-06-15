import Link from 'next/link';
import TopicFollowButton from '@/components/TopicFollowButton';
import type { Topic } from '@/lib/types/database';

/** フォロー中トピック一覧タブ */
export default function FollowingTopicsTab({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="card-3d px-4 py-10 text-center">
        <p className="text-sm text-slate-500">
          まだフォロー中のトピックがありません。トピックページからフォローできます。
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {topics.map((t) => (
        <li key={t.id} className="card-3d flex items-center justify-between gap-3 p-4">
          <Link href={`/topics/${t.id}`} className="min-w-0">
            <p className="text-xs text-slate-400">{t.category}</p>
            <p className="truncate font-bold text-slate-800">{t.name}</p>
          </Link>
          <TopicFollowButton topicId={t.id} initialFollowing={true} />
        </li>
      ))}
    </ul>
  );
}
