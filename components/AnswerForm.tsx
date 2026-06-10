'use client';

import { useMemo, useState } from 'react';
import { submitResponseAction } from '@/app/actions/response';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import type {
  AnswerInput,
  GridConfig,
  QuestionWithOptions,
  ScaleConfig,
  SurveyWithQuestions,
} from '@/lib/types/database';

/** question_id -> 回答状態 */
type QState = { optionIds: string[]; text: string; grid: Record<string, string[]> };
type AnswerState = Record<string, QState>;

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

/** 1設問分の状態を AnswerInput に変換する */
function buildAnswer(q: QuestionWithOptions, s: QState): AnswerInput {
  if (q.type === 'text' || q.type === 'paragraph' || q.type === 'date') {
    return { question_id: q.id, text_answer: s.text };
  }
  if (q.type === 'grid') {
    const grid_answers = Object.entries(s.grid)
      .filter(([, cols]) => cols.length > 0)
      .map(([row, columns]) => ({ row, columns }));
    return { question_id: q.id, grid_answers };
  }
  return { question_id: q.id, option_ids: s.optionIds };
}

export default function AnswerForm({ survey }: { survey: SurveyWithQuestions }) {
  const pages = Math.max(1, survey.sections.length);
  const [consented, setConsented] = useState(false);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>(() => {
    const init: AnswerState = {};
    survey.questions.forEach((q) => (init[q.id] = { optionIds: [], text: '', grid: {} }));
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pageQuestions = useMemo(
    () => survey.questions.filter((q) => Math.min(q.section_index, pages - 1) === page),
    [survey.questions, page, pages]
  );

  // ---- 状態更新 ----
  const setSingle = (qid: string, optionId: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], optionIds: [optionId] } }));
  const toggleMultiple = (qid: string, optionId: string) =>
    setAnswers((a) => {
      const cur = a[qid].optionIds;
      const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
      return { ...a, [qid]: { ...a[qid], optionIds: next } };
    });
  const setText = (qid: string, text: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], text } }));
  const setGridCell = (qid: string, row: string, col: string, multiple: boolean) =>
    setAnswers((a) => {
      const cur = a[qid].grid[row] ?? [];
      let next: string[];
      if (multiple) {
        next = cur.includes(col) ? cur.filter((c) => c !== col) : [...cur, col];
      } else {
        next = [col];
      }
      return { ...a, [qid]: { ...a[qid], grid: { ...a[qid].grid, [row]: next } } };
    });

  // ---- ページ内必須バリデーション（設問タイプ定義に委譲） ----
  const validatePage = (): boolean => {
    for (const q of pageQuestions) {
      try {
        QuestionTypeRegistry.get(q.type).validateAnswer(buildAnswer(q, answers[q.id]), q);
      } catch (e) {
        setError(e instanceof Error ? e.message : '入力内容を確認してください');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const goNext = () => {
    if (!validatePage()) return;
    setPage((p) => Math.min(pages - 1, p + 1));
  };
  const goPrev = () => {
    setError(null);
    setPage((p) => Math.max(0, p - 1));
  };

  const submit = async () => {
    if (!validatePage()) return;
    const payload: AnswerInput[] = survey.questions.map((q) => buildAnswer(q, answers[q.id]));
    const formData = new FormData();
    formData.set('surveyId', survey.id);
    formData.set('payload', JSON.stringify(payload));

    setPending(true);
    const result = await submitResponseAction({ error: null }, formData);
    setPending(false);
    if (result?.error) setError(result.error);
  };

  // インフォームドコンセント同意画面
  if (!consented) {
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-zinc-800">回答にあたってのご説明</h2>
        <div className="space-y-2 text-sm text-zinc-600">
          <p>本アンケートは学術目的で実施されます。</p>
          <p>・回答は任意であり、いつでも中断できます。</p>
          <p>・回答内容はアンケート作成者が研究目的で集計・利用します。</p>
          <p>・個人を特定する情報は収集しません。</p>
          <p>上記に同意のうえ、回答を開始してください。</p>
        </div>
        <button
          onClick={() => setConsented(true)}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
        >
          同意して回答を始める
        </button>
      </div>
    );
  }

  const section = survey.sections[page];

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      {pages > 1 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>セクション {page + 1} / {pages}</span>
            <span>{Math.round(((page + 1) / pages) * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${((page + 1) / pages) * 100}%` }}
            />
          </div>
        </div>
      )}

      {section && (section.title || section.description) && (
        <section className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
          {section.title && <h2 className="font-bold text-indigo-800">{section.title}</h2>}
          {section.description && (
            <p className="mt-1 text-sm text-indigo-700 whitespace-pre-wrap">{section.description}</p>
          )}
        </section>
      )}

      {pageQuestions.map((q, i) => {
        return (
          <section key={q.id} className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3">
            <p className="font-medium text-zinc-800">
              <span className="text-indigo-600 mr-1">Q{i + 1}.</span>
              {q.text}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            {q.description && <p className="text-xs text-zinc-500 whitespace-pre-wrap">{q.description}</p>}
            <QuestionInputView
              q={q}
              state={answers[q.id]}
              setSingle={setSingle}
              toggleMultiple={toggleMultiple}
              setText={setText}
              setGridCell={setGridCell}
            />
          </section>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        {page > 0 && (
          <button
            onClick={goPrev}
            className="rounded-md bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 cursor-pointer"
          >
            戻る
          </button>
        )}
        {page < pages - 1 ? (
          <button
            onClick={goNext}
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            次へ
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {pending ? '送信中…' : '回答を送信する'}
          </button>
        )}
      </div>
    </div>
  );
}

/** 設問タイプ別の入力UI */
function QuestionInputView({
  q,
  state,
  setSingle,
  toggleMultiple,
  setText,
  setGridCell,
}: {
  q: QuestionWithOptions;
  state: QState;
  setSingle: (qid: string, optionId: string) => void;
  toggleMultiple: (qid: string, optionId: string) => void;
  setText: (qid: string, text: string) => void;
  setGridCell: (qid: string, row: string, col: string, multiple: boolean) => void;
}) {
  if (q.type === 'single') {
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="radio" name={q.id} checked={state.optionIds[0] === o.id} onChange={() => setSingle(q.id, o.id)} />
            {o.text}
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'dropdown') {
    return (
      <select
        className={inputClass}
        value={state.optionIds[0] ?? ''}
        onChange={(e) => setSingle(q.id, e.target.value)}
      >
        <option value="">選択してください</option>
        {q.options.map((o) => (
          <option key={o.id} value={o.id}>{o.text}</option>
        ))}
      </select>
    );
  }

  if (q.type === 'multiple') {
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={state.optionIds.includes(o.id)} onChange={() => toggleMultiple(q.id, o.id)} />
            {o.text}
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'scale') {
    const cfg = (q.config ?? {}) as ScaleConfig;
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {cfg.minLabel && <span className="text-xs text-zinc-400">{cfg.minLabel}</span>}
        {q.options.map((o) => (
          <label key={o.id} className="flex flex-col items-center text-sm text-zinc-700 cursor-pointer">
            <span className="mb-1 text-xs">{o.text}</span>
            <input type="radio" name={q.id} checked={state.optionIds[0] === o.id} onChange={() => setSingle(q.id, o.id)} />
          </label>
        ))}
        {cfg.maxLabel && <span className="text-xs text-zinc-400">{cfg.maxLabel}</span>}
      </div>
    );
  }

  if (q.type === 'text') {
    return (
      <input
        className={inputClass}
        value={state.text}
        onChange={(e) => setText(q.id, e.target.value)}
      />
    );
  }

  if (q.type === 'paragraph') {
    return (
      <textarea
        rows={4}
        className={inputClass}
        value={state.text}
        onChange={(e) => setText(q.id, e.target.value)}
      />
    );
  }

  if (q.type === 'date') {
    return (
      <input
        type="date"
        className={inputClass}
        value={state.text}
        onChange={(e) => setText(q.id, e.target.value)}
      />
    );
  }

  if (q.type === 'grid') {
    const cfg = (q.config ?? { rows: [], columns: [], multiple: false }) as GridConfig;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2"></th>
              {cfg.columns.map((c) => (
                <th key={c} className="p-2 text-center text-xs font-medium text-zinc-600">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cfg.rows.map((r) => (
              <tr key={r} className="border-t border-zinc-100">
                <td className="p-2 text-zinc-700">{r}</td>
                {cfg.columns.map((c) => (
                  <td key={c} className="p-2 text-center">
                    <input
                      type={cfg.multiple ? 'checkbox' : 'radio'}
                      name={`${q.id}__${r}`}
                      checked={(state.grid[r] ?? []).includes(c)}
                      onChange={() => setGridCell(q.id, r, c, cfg.multiple)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}
