'use client';

import { useState, useTransition } from 'react';
import type { Topic } from '@/lib/types/database';
import TopicSelectionStep from '@/components/TopicSelectionStep';
import {
  completeTopicSelectionAction,
  type TopicSelectionActionState,
} from '@/app/actions/topic';

const initial: TopicSelectionActionState = { error: null };

/**
 * 既存ユーザー向けの再訪促進バナー。`profile.topics_selected_at` が null のユーザーにのみ表示する。
 * オンボーディングウィザードとは独立しており、進捗バー・ステップ番号は表示しない。
 * 「選んでみる」で展開してトピック選択、「あとで」でも topics_selected_at を記録し
 * （再表示しない）非表示にする。
 */
export default function TopicsSelectedBanner({ topics }: { topics: Topic[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  if (!expanded) {
    return (
      <div className="card-3d mb-6 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-bold text-slate-800">興味のあるトピックを選んでみませんか？</p>
          <p className="mt-0.5 text-xs text-slate-500">
            関連するアンケートやおすすめをお知らせできるようになります。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await completeTopicSelectionAction(initial, new FormData());
                setDismissed(true);
              });
            }}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            あとで
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="btn-3d btn-3d-primary px-3 py-1.5 text-sm"
          >
            選んでみる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-3d mb-6 p-5">
      <TopicSelectionStep topics={topics} onComplete={() => setDismissed(true)} />
    </div>
  );
}
