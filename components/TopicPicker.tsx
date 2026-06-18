'use client';

import type { Topic } from '@/lib/types/database';

const MAX_TOPICS = 3;

/**
 * アンケート作成フォーム用のトピック選択UI。
 * カテゴリごとにグルーピングして表示し、1〜3件選択できる。
 * 上限到達時は未選択トピックをdisabled表示する。
 */
export default function TopicPicker({
  topics,
  selectedIds,
  onChange,
  suggestion,
  onSuggestionChange,
}: {
  topics: Topic[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  suggestion: string;
  onSuggestionChange: (value: string) => void;
}) {
  const grouped = new Map<string, Topic[]>();
  for (const t of topics) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < MAX_TOPICS) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">
        トピック（1〜3個選択） <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-zinc-500 mb-2">
        選択中: {selectedIds.length} / {MAX_TOPICS}
      </p>
      <div className="space-y-3 max-h-64 overflow-y-auto rounded-md border border-zinc-200 p-3">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-semibold text-zinc-500 mb-1">{category}</p>
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
      <div className="mt-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          当てはまるトピックがない場合（任意）
        </label>
        <input
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
          value={suggestion}
          onChange={(e) => onSuggestionChange(e.target.value)}
          maxLength={200}
          placeholder="新しいトピックの提案（運営が確認します）"
        />
      </div>
    </div>
  );
}
