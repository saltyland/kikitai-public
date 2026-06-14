'use client';

import { useState, useTransition } from 'react';
import type { Topic } from '@/lib/types/database';
import {
  completeTopicSelectionAction,
  type TopicSelectionActionState,
} from '@/app/actions/topic';
import { Spinner } from '@/components/ui/Spinner';

const MIN_TOPICS = 3;
const MAX_TOPICS = 5;

const initial: TopicSelectionActionState = { error: null };

/**
 * 興味のあるトピックを3〜5個選択するステップ。
 * オンボーディングウィザードのステップ、および既存ユーザー向け再訪促進バナーの両方から使う。
 * 選択完了・スキップのいずれでも completeTopicSelectionAction を呼び、
 * topics_selected_at を記録する（再表示されないようにする）。
 */
export default function TopicSelectionStep({
  topics,
  onComplete,
  title = '興味のあるトピックを選んでください',
  description = `${MIN_TOPICS}〜${MAX_TOPICS}個選択すると、関連するアンケートやおすすめをお知らせできます。`,
}: {
  topics: Topic[];
  onComplete: () => void;
  title?: string;
  description?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grouped = new Map<string, Topic[]>();
  for (const t of topics) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_TOPICS
          ? [...prev, id]
          : prev
    );
  };

  const submit = (ids: string[]) => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      ids.forEach((id) => fd.append('topic_ids', id));
      const result = await completeTopicSelectionAction(initial, fd);
      if (result.error) {
        setError(result.error);
      } else {
        onComplete();
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <p className="mt-2 text-xs text-slate-400">
        選択中: {selectedIds.length} / {MAX_TOPICS}（最低{MIN_TOPICS}個）
      </p>

      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-md border border-zinc-200 p-3">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <p className="mb-1 text-xs font-semibold text-zinc-500">{category}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((topic) => {
                const selected = selectedIds.includes(topic.id);
                const disabled = !selected && selectedIds.length >= MAX_TOPICS;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggle(topic.id)}
                    disabled={disabled}
                    aria-pressed={selected}
                    className={
                      selected
                        ? 'rounded-full border border-brand-500 bg-brand-500 px-3 py-1 text-xs font-medium text-white cursor-pointer'
                        : disabled
                          ? 'rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-400 cursor-not-allowed'
                          : 'rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-brand-400 hover:text-brand-700 cursor-pointer'
                    }
                  >
                    {topic.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => submit([])}
          disabled={isPending}
          className="btn-3d btn-3d-secondary flex-1 py-2 text-sm"
        >
          スキップ
        </button>
        <button
          type="button"
          onClick={() => submit(selectedIds)}
          disabled={isPending || selectedIds.length < MIN_TOPICS}
          className="btn-3d btn-3d-primary flex-1 flex items-center justify-center gap-2 py-3 font-bold"
        >
          {isPending && <Spinner className="h-4 w-4" />}
          {isPending ? '保存中…' : '選択を完了する'}
        </button>
      </div>
    </div>
  );
}
