'use client';

import { useEffect, useMemo, useState } from 'react';
import { submitResponseAction } from '@/app/actions/response';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import { computeVisibleQuestionIds } from '@/lib/domain/questions/visibility';
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

/** 1設問あたりの推定回答秒数（所要時間の目安に使う） */
const SECONDS_PER_TYPE: Record<string, number> = {
  single: 8,
  multiple: 12,
  dropdown: 8,
  scale: 8,
  grid: 20,
  text: 25,
  paragraph: 60,
  date: 10,
};

function draftKey(surveyId: string) {
  return `kikitai-draft-${surveyId}`;
}

export default function AnswerForm({ survey }: { survey: SurveyWithQuestions }) {
  const [consented, setConsented] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>(() => {
    const init: AnswerState = {};
    survey.questions.forEach((q) => (init[q.id] = { optionIds: [], text: '', grid: {} }));
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);

  // ---- 途中保存：マウント時に下書き（localStorage）を復元 ----
  // localStorage は外部ストアであり、SSRとのハイドレーション不整合を避けるため
  // 初期値ではなくマウント後の effect で読み込む（set-state-in-effect は意図的）。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(survey.id));
      if (raw) {
        const data = JSON.parse(raw) as { answers?: AnswerState; step?: number; consented?: boolean };
        if (data.answers) {
          setAnswers((prev) => {
            const merged = { ...prev };
            for (const id of Object.keys(merged)) {
              if (data.answers![id]) merged[id] = data.answers![id];
            }
            return merged;
          });
          setStep(data.step ?? 0);
          setConsented(!!data.consented);
          setRestored(true);
        }
      }
    } catch {
      /* 壊れた下書きは無視 */
    }
    setLoaded(true);
  }, [survey.id]);

  // ---- 途中保存：回答・進捗の変化を自動保存 ----
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(draftKey(survey.id), JSON.stringify({ answers, step, consented }));
    } catch {
      /* 保存失敗は無視 */
    }
  }, [answers, step, consented, loaded, survey.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey(survey.id));
    } catch {
      /* 無視 */
    }
  };

  // 条件付き表示：現在の回答に応じて「実際に表示される設問」を順番に並べる
  const visibleQuestions = useMemo(() => {
    const optionTextById = new Map<string, string>();
    survey.questions.forEach((q) => q.options.forEach((o) => optionTextById.set(o.id, o.text)));
    const selectedTexts = (qid: string) =>
      (answers[qid]?.optionIds ?? []).map((id) => optionTextById.get(id) ?? '');
    const visibleIds = computeVisibleQuestionIds(survey.questions, selectedTexts);
    return [...survey.questions]
      .sort((a, b) => a.section_index - b.section_index || a.order_index - b.order_index)
      .filter((q) => visibleIds.has(q.id));
  }, [survey.questions, answers]);

  const total = visibleQuestions.length;
  // 回答により表示設問が増減しても範囲内に収める
  const safeStep = Math.min(step, Math.max(0, total - 1));
  const current = visibleQuestions[safeStep];

  // 残り設問の推定所要時間（秒）
  const remainingSeconds = visibleQuestions
    .slice(safeStep)
    .reduce((s, q) => s + (SECONDS_PER_TYPE[q.type] ?? 15), 0);
  const remainingMin = Math.max(1, Math.round(remainingSeconds / 60));

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

  // ---- 現在の設問のみバリデーション（設問タイプ定義に委譲） ----
  const validateCurrent = (): boolean => {
    if (!current) return true;
    try {
      QuestionTypeRegistry.get(current.type).validateAnswer(buildAnswer(current, answers[current.id]), current);
    } catch (e) {
      setError(e instanceof Error ? e.message : '入力内容を確認してください');
      return false;
    }
    setError(null);
    return true;
  };

  const goNext = () => {
    if (!validateCurrent()) return;
    setStep(Math.min(total - 1, safeStep + 1));
  };
  const goPrev = () => {
    setError(null);
    setStep(Math.max(0, safeStep - 1));
  };

  const restart = () => {
    clearDraft();
    const init: AnswerState = {};
    survey.questions.forEach((q) => (init[q.id] = { optionIds: [], text: '', grid: {} }));
    setAnswers(init);
    setStep(0);
    setRestored(false);
    setError(null);
  };

  const submit = async () => {
    if (!validateCurrent()) return;
    // 表示されている設問の回答のみ送信する（非表示の条件設問は送らない）
    const payload: AnswerInput[] = visibleQuestions.map((q) => buildAnswer(q, answers[q.id]));
    const formData = new FormData();
    formData.set('surveyId', survey.id);
    formData.set('payload', JSON.stringify(payload));

    setPending(true);
    const result = await submitResponseAction({ error: null }, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      clearDraft(); // 送信成功で下書き削除
    }
  };

  // インフォームドコンセント同意画面
  if (!consented) {
    const estMin = Math.max(
      1,
      Math.round(
        survey.questions.reduce((s, q) => s + (SECONDS_PER_TYPE[q.type] ?? 15), 0) / 60
      )
    );
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-zinc-800">回答にあたってのご説明</h2>
        <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          全{survey.questions.length}問・所要時間 約{estMin}分
        </p>
        <div className="space-y-2 text-sm text-zinc-600">
          <p>本アンケートは学術目的で実施されます。</p>
          <p>・回答は任意であり、いつでも中断できます（入力内容は自動保存されます）。</p>
          <p>・回答内容はアンケート作成者が研究目的で集計・利用します。</p>
          <p>・個人を特定する情報は収集しません。</p>
          <p>上記に同意のうえ、回答を開始してください。</p>
        </div>
        {restored && (
          <p className="text-sm text-amber-700">前回の入力内容が残っています。続きから再開できます。</p>
        )}
        <button
          onClick={() => setConsented(true)}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
        >
          同意して回答を始める
        </button>
      </div>
    );
  }

  // 現在の設問が属するセクションの見出し（最初の設問のときだけ表示）
  const section = current ? survey.sections[Math.min(current.section_index, survey.sections.length - 1)] : null;
  const isSectionStart =
    current && (safeStep === 0 || visibleQuestions[safeStep - 1].section_index !== current.section_index);

  return (
    <div className="space-y-4">
      {/* 進捗インジケーター（1問ずつ） */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>問 {safeStep + 1} / {total}</span>
          <span>残り約{remainingMin}分</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${total > 0 ? ((safeStep + 1) / total) * 100 : 0}%` }}
          />
        </div>
        {/* ドット式ステップ表示 */}
        {total <= 30 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {visibleQuestions.map((q, i) => (
              <span
                key={q.id}
                className={`h-1.5 w-1.5 rounded-full ${
                  i < safeStep ? 'bg-indigo-500' : i === safeStep ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {restored && (
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <span>📌 前回の続きから再開しました。</span>
          <button onClick={restart} className="font-medium underline hover:text-amber-900 cursor-pointer">
            最初からやり直す
          </button>
        </div>
      )}

      {isSectionStart && section && (section.title || section.description) && (
        <section className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
          {section.title && <h2 className="font-bold text-indigo-800">{section.title}</h2>}
          {section.description && (
            <p className="mt-1 text-sm text-indigo-700 whitespace-pre-wrap">{section.description}</p>
          )}
        </section>
      )}

      {current && (
        <section className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3">
          <p className="font-medium text-zinc-800">
            <span className="text-indigo-600 mr-1">Q{safeStep + 1}.</span>
            {current.text}
            {current.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {current.description && (
            <p className="text-xs text-zinc-500 whitespace-pre-wrap">{current.description}</p>
          )}
          <QuestionInputView
            q={current}
            state={answers[current.id]}
            setSingle={setSingle}
            toggleMultiple={toggleMultiple}
            setText={setText}
            setGridCell={setGridCell}
          />
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        {safeStep > 0 && (
          <button
            onClick={goPrev}
            className="rounded-md bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 cursor-pointer"
          >
            戻る
          </button>
        )}
        {safeStep < total - 1 ? (
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
        <span className="ml-auto text-xs text-zinc-400">✓ 入力は自動保存されます</span>
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
