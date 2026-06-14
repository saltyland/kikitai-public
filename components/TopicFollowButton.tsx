'use client';

import { useState, useTransition } from 'react';
import { followTopicAction, unfollowTopicAction } from '@/app/actions/topic';

/** トピックフォロー・解除ボタン。楽観的にUIを切り替える。 */
export default function TopicFollowButton({
  topicId,
  initialFollowing,
}: {
  topicId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        if (next) {
          await followTopicAction(topicId);
        } else {
          await unfollowTopicAction(topicId);
        }
      } catch {
        // 失敗時は表示を戻す
        setFollowing(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={
        following
          ? 'btn-3d btn-3d-secondary px-4 py-1.5 text-sm'
          : 'btn-3d btn-3d-primary px-4 py-1.5 text-sm'
      }
    >
      {following ? 'フォロー中' : 'フォローする'}
    </button>
  );
}
