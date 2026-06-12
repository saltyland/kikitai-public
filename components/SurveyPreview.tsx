'use client';

import { useMemo, useState } from 'react';
import type { GridConfig, QuestionType, ScaleConfig, SectionMeta } from '@/lib/types/database';

/** プレビュー用の設問（SurveyEditor の EditorQuestion と同形）。 */
export interface PreviewQuestion {
  key: string;
  type: QuestionType;
  text: string;
  description: string;
  required: boolean;
  options: string[];
  config: Partial<ScaleConfig & GridConfig>;
  section_index: number;
  condition: { sourceKey: string; optionText: string } | null;
}

export interface PreviewData {
  title: string;
  description: string;
  sections: SectionMeta[];
  questions: PreviewQuestion[];
}

type LocalAnswer = { options: string[]; text: string; grid: Record<string, string[]> };

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1';

/**
 * 回答者ビューのリアルタイムプレビュー。
 * 編集中の設問データをそのまま受け取り、回答者から見える実際の画面を描画する。
 * ローカルに選択状態を持つため、分岐（条件付き表示）の挙動もその場で試せる。
 * スマホ / PC のフレーム切替に対応。
 */
export default function SurveyPreview({ data }: { data: PreviewData }) {
  const [device, setDevice] = useState<'pc' | 'mobile'>('pc');
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});

  const get = (key: string): LocalAnswer => answers[key] ?? { options: [], text: '', grid: {} };
  const patch = (key: string, p: Partial<LocalAnswer>) =>
    setAnswers((a) => ({ ...a, [key]: { ...get(key), ...p } }));

  // セクション順→元順で並べ、条件付き表示を評価して「表示される設問」を決める
  const ordered = useMemo(
    () => [...data.questions].sort((a, b) => a.section_index - b.section_index),
    [data.questions]
  );

  const visibleKeys = useMemo(() => {
    const visible = new Set<string>();
    for (const q of ordered) {
      if (!q.condition) {
        visible.add(q.key);
        continue;
      }
      const srcVisible = visible.has(q.condition.sourceKey);
      const selectedTexts = get(q.condition.sourceKey).options;
      if (srcVisible && selectedTexts.includes(q.condition.optionText)) visible.add(q.key);
    }
    return visible;
    // answers が変わるたび再評価
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered, answers]);

  const visible = ordered.filter((q) => visibleKeys.has(q.key));

  const frame =
    device === 'mobile'
      ? 'mx-auto w-[390px] max-w-full rounded-[2rem] border-8 border-zinc-800 bg-white shadow-xl'
      : 'w-full rounded-xl border border-zinc-200 bg-white shadow-sm';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500">回答者プレビュー</span>
        <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 text-xs">
          <button
            type="button"
            onClick={() => setDevice('pc')}
            className={`px-3 py-1 ${device === 'pc' ? 'bg-brand-600 text-white' : 'bg-white text-zinc-600'}`}
          >
            PC
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 ${device === 'mobile' ? 'bg-brand-600 text-white' : 'bg-white text-zinc-600'}`}
          >
            スマホ
          </button>
        </div>
      </div>

      <div className={frame}>
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-800">{data.title || '（無題のアンケート）'}</h2>
            {data.description && <p className="mt-1 text-sm text-zinc-600 whitespace-pre-wrap">{data.description}</p>}
          </div>

          {visible.length === 0 && (
            <p className="rounded-md bg-zinc-50 p-4 text-center text-xs text-zinc-400">
              表示できる設問がありません。
            </p>
          )}

          {visible.map((q, i) => {
            const showSectionHead =
              i === 0 || visible[i - 1].section_index !== q.section_index;
            const section = data.sections[Math.min(q.section_index, data.sections.length - 1)];
            return (
              <div key={q.key} className="space-y-3">
                {showSectionHead && section && (section.title || section.description) && (
                  <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
                    {section.title && <p className="font-bold text-brand-800">{section.title}</p>}
                    {section.description && (
                      <p className="mt-0.5 text-xs text-brand-700 whitespace-pre-wrap">{section.description}</p>
                    )}
                  </div>
                )}
                <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
                  <p className="text-sm font-medium text-zinc-800">
                    <span className="text-brand-600 mr-1">Q{i + 1}.</span>
                    {q.text || '（設問文未入力）'}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {q.description && (
                    <p className="text-xs text-zinc-500 whitespace-pre-wrap">{q.description}</p>
                  )}
                  <PreviewInput q={q} answer={get(q.key)} patch={(p) => patch(q.key, p)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreviewInput({
  q,
  answer,
  patch,
}: {
  q: PreviewQuestion;
  answer: LocalAnswer;
  patch: (p: Partial<LocalAnswer>) => void;
}) {
  const opts = q.options.map((o) => o.trim()).filter(Boolean);

  if (q.type === 'single' || q.type === 'multiple' || q.type === 'attention') {
    const multiple = q.type === 'multiple';
    return (
      <div className="space-y-1.5">
        {opts.map((o) => {
          const checked = answer.options.includes(o);
          return (
            <label
              key={o}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={q.key}
                checked={checked}
                onChange={() =>
                  patch({
                    options: multiple
                      ? checked
                        ? answer.options.filter((x) => x !== o)
                        : [...answer.options, o]
                      : [o],
                  })
                }
              />
              {o}
            </label>
          );
        })}
        {opts.length === 0 && <p className="text-xs text-zinc-400">選択肢が未入力です</p>}
      </div>
    );
  }

  if (q.type === 'dropdown') {
    return (
      <select
        className={inputClass}
        value={answer.options[0] ?? ''}
        onChange={(e) => patch({ options: e.target.value ? [e.target.value] : [] })}
      >
        <option value="">選択してください</option>
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  if (q.type === 'scale') {
    const min = q.config.min ?? 1;
    const max = q.config.max ?? 5;
    const nums = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
    return (
      <div className="flex flex-col gap-1">
        {(q.config.minLabel || q.config.maxLabel) && (
          <div className="flex justify-between text-xs text-zinc-500 px-1">
            <span>{q.config.minLabel ?? ''}</span>
            <span>{q.config.maxLabel ?? ''}</span>
          </div>
        )}
        <div className="flex items-end justify-around gap-1">
          {nums.map((n) => {
            const checked = answer.options[0] === String(n);
            return (
              <label key={n} className="flex flex-col items-center gap-1 cursor-pointer select-none">
                <span className={`text-sm font-medium transition ${checked ? 'text-brand-600' : 'text-zinc-600'}`}>
                  {n}
                </span>
                <span
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${
                    checked ? 'border-brand-500 bg-brand-500' : 'border-zinc-400 bg-white hover:border-brand-400'
                  }`}
                >
                  {checked && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                </span>
                <input
                  type="radio"
                  name={q.key}
                  className="sr-only"
                  checked={checked}
                  onChange={() => patch({ options: [String(n)] })}
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === 'text') {
    return <input className={inputClass} value={answer.text} onChange={(e) => patch({ text: e.target.value })} />;
  }
  if (q.type === 'paragraph') {
    return <textarea rows={3} className={inputClass} value={answer.text} onChange={(e) => patch({ text: e.target.value })} />;
  }
  if (q.type === 'date') {
    return <input type="date" className={inputClass} value={answer.text} onChange={(e) => patch({ text: e.target.value })} />;
  }

  if (q.type === 'grid') {
    const rows = (q.config.rows ?? []).map((r) => r.trim()).filter(Boolean);
    const cols = (q.config.columns ?? []).map((c) => c.trim()).filter(Boolean);
    const multiple = !!q.config.multiple;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {cols.map((c) => (
                <th key={c} className="p-1 text-center font-medium text-zinc-600">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r} className="border-t border-zinc-100">
                <td className="p-1 text-zinc-700">{r}</td>
                {cols.map((c) => {
                  const cur = answer.grid[r] ?? [];
                  const checked = cur.includes(c);
                  return (
                    <td key={c} className="p-1 text-center">
                      <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name={`${q.key}__${r}`}
                        checked={checked}
                        onChange={() =>
                          patch({
                            grid: {
                              ...answer.grid,
                              [r]: multiple ? (checked ? cur.filter((x) => x !== c) : [...cur, c]) : [c],
                            },
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {(rows.length === 0 || cols.length === 0) && (
          <p className="text-xs text-zinc-400">行・列が未入力です</p>
        )}
      </div>
    );
  }

  return null;
}
