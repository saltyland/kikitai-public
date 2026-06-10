'use client';

import { useEffect, useState } from 'react';
import {
  MY_TEMPLATES_KEY,
  TEMPLATE_GROUPS,
  type QuestionSeed,
  type QuestionTemplate,
} from '@/lib/domain/questionTemplates';

/**
 * 設問テンプレートライブラリのモーダル。
 * - 組み込みテンプレート（デモグラフィック・心理尺度・リッカート等）をワンクリック挿入。
 * - 現在編集中の設問群を「マイテンプレート」として localStorage に保存／再利用／削除。
 */
export default function QuestionTemplates({
  onInsert,
  onClose,
  currentQuestions,
}: {
  onInsert: (seeds: QuestionSeed[]) => void;
  onClose: () => void;
  currentQuestions: QuestionSeed[];
}) {
  const [myTemplates, setMyTemplates] = useState<QuestionTemplate[]>([]);
  const [saveName, setSaveName] = useState('');
  const [loaded, setLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_TEMPLATES_KEY);
      if (raw) setMyTemplates(JSON.parse(raw) as QuestionTemplate[]);
    } catch {
      /* 壊れた保存は無視 */
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = (next: QuestionTemplate[]) => {
    setMyTemplates(next);
    try {
      localStorage.setItem(MY_TEMPLATES_KEY, JSON.stringify(next));
    } catch {
      /* 保存失敗は無視 */
    }
  };

  const saveCurrent = () => {
    const usable = currentQuestions.filter((q) => q.text.trim());
    if (usable.length === 0 || !saveName.trim()) return;
    const tpl: QuestionTemplate = {
      id: `my-${Date.now()}`,
      name: saveName.trim(),
      hint: `${usable.length}問のマイテンプレート`,
      questions: usable,
    };
    persist([tpl, ...myTemplates]);
    setSaveName('');
  };

  const removeMy = (id: string) => persist(myTemplates.filter((t) => t.id !== id));

  const insert = (tpl: QuestionTemplate) => {
    onInsert(tpl.questions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-800">📚 設問テンプレートライブラリ</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 cursor-pointer">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          テンプレートを選ぶと、現在開いているセクションの末尾に設問が追加されます。
        </p>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {/* マイテンプレート */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-indigo-700">⭐ マイテンプレート</h3>
            {loaded && myTemplates.length === 0 && (
              <p className="text-xs text-zinc-400">まだありません。下のフォームから現在の設問群を保存できます。</p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {myTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-2">
                  <button
                    type="button"
                    onClick={() => insert(t)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="block truncate text-sm font-medium text-zinc-800">{t.name}</span>
                    <span className="block truncate text-[11px] text-zinc-400">{t.hint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMy(t.id)}
                    className="ml-2 shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 cursor-pointer"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="現在の設問群をマイテンプレートとして保存（名前）"
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={saveCurrent}
                disabled={!saveName.trim() || currentQuestions.filter((q) => q.text.trim()).length === 0}
                className="shrink-0 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
              >
                保存
              </button>
            </div>
          </section>

          {/* 組み込みテンプレート */}
          {TEMPLATE_GROUPS.map((group) => (
            <section key={group.id}>
              <h3 className="mb-2 text-sm font-bold text-zinc-700">{group.label}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => insert(t)}
                    className="rounded-lg border border-zinc-200 p-2.5 text-left hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer"
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-800">{t.name}</span>
                      <span className="text-[10px] text-indigo-500">＋挿入</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-zinc-400">{t.hint}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
