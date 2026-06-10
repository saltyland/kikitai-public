'use client';

import { useState } from 'react';
import { submitResponseAction } from '@/app/actions/response';
import type { AnswerInput, SurveyWithQuestions } from '@/lib/types/database';

/** question_id -> 回答状態 */
type AnswerState = Record<
  string,
  { optionIds: string[]; text: string }
>;

export default function AnswerForm({ survey }: { survey: SurveyWithQuestions }) {
  const [consented, setConsented] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>(() => {
    const init: AnswerState = {};
    survey.questions.forEach((q) => (init[q.id] = { optionIds: [], text: '' }));
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setSingle = (qid: string, optionId: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], optionIds: [optionId] } }));

  const toggleMultiple = (qid: string, optionId: string) =>
    setAnswers((a) => {
      const cur = a[qid].optionIds;
      const next = cur.includes(optionId)
        ? cur.filter((x) => x !== optionId)
        : [...cur, optionId];
      return { ...a, [qid]: { ...a[qid], optionIds: next } };
    });

  const setText = (qid: string, text: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], text } }));

  const submit = async () => {
    setError(null);
    const payload: AnswerInput[] = survey.questions.map((q) => {
      const a = answers[q.id];
      if (q.type === 'text') {
        return { question_id: q.id, text_answer: a.text };
      }
      return { question_id: q.id, option_ids: a.optionIds };
    });

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

  return (
    <div className="space-y-4">
      {survey.questions.map((q, i) => (
        <section key={q.id} className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3">
          <p className="font-medium text-zinc-800">
            <span className="text-indigo-600 mr-1">Q{i + 1}.</span>
            {q.text}
          </p>

          {q.type === 'single' && (
            <div className="space-y-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id].optionIds[0] === o.id}
                    onChange={() => setSingle(q.id, o.id)}
                  />
                  {o.text}
                </label>
              ))}
            </div>
          )}

          {q.type === 'multiple' && (
            <div className="space-y-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={answers[q.id].optionIds.includes(o.id)}
                    onChange={() => toggleMultiple(q.id, o.id)}
                  />
                  {o.text}
                </label>
              ))}
            </div>
          )}

          {q.type === 'scale' && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-400">そう思わない</span>
              {q.options.map((o) => (
                <label key={o.id} className="flex flex-col items-center text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id].optionIds[0] === o.id}
                    onChange={() => setSingle(q.id, o.id)}
                  />
                  <span>{o.text}</span>
                </label>
              ))}
              <span className="text-xs text-zinc-400">そう思う</span>
            </div>
          )}

          {q.type === 'text' && (
            <textarea
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={answers[q.id].text}
              onChange={(e) => setText(q.id, e.target.value)}
            />
          )}
        </section>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
      >
        {pending ? '送信中…' : '回答を送信する'}
      </button>
    </div>
  );
}
