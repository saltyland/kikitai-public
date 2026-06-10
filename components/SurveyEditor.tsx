'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSurveyAction } from '@/app/actions/survey';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import type {
  QuestionType,
  SurveyInput,
  SurveyStatus,
  SurveyWithQuestions,
} from '@/lib/types/database';

interface EditorQuestion {
  type: QuestionType;
  text: string;
  options: string[];
}

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// 設問タイプの一覧・ラベル・選択肢入力要否はすべてレジストリから取得する。
// 新しい設問タイプを追加してもこのコンポーネントは変更不要。
const TYPE_OPTIONS = QuestionTypeRegistry.all().map((d) => ({
  value: d.type,
  label: d.label,
}));

function needsOptions(type: QuestionType) {
  return QuestionTypeRegistry.get(type).requiresOptionInput;
}

function fromSurvey(survey: SurveyWithQuestions | null): {
  title: string;
  description: string;
  requiredCount: number;
  deadline: string;
  questions: EditorQuestion[];
} {
  if (!survey) {
    return {
      title: '',
      description: '',
      requiredCount: 10,
      deadline: '',
      questions: [{ type: 'single', text: '', options: ['', ''] }],
    };
  }
  return {
    title: survey.title,
    description: survey.description ?? '',
    requiredCount: survey.required_count,
    deadline: survey.deadline ?? '',
    questions: survey.questions.map((q) => ({
      type: q.type,
      text: q.text,
      options: needsOptions(q.type)
        ? q.options.map((o) => o.text)
        : [],
    })),
  };
}

export default function SurveyEditor({
  survey,
}: {
  survey: SurveyWithQuestions | null;
}) {
  const router = useRouter();
  const initial = fromSurvey(survey);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [requiredCount, setRequiredCount] = useState(initial.requiredCount);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [questions, setQuestions] = useState<EditorQuestion[]>(initial.questions);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const updateQuestion = (i: number, patch: Partial<EditorQuestion>) => {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };

  const changeType = (i: number, type: QuestionType) => {
    const q = questions[i];
    const options = needsOptions(type) && q.options.length === 0 ? ['', ''] : q.options;
    updateQuestion(i, { type, options });
  };

  const addQuestion = () =>
    setQuestions((qs) => [...qs, { type: 'single', text: '', options: ['', ''] }]);

  const removeQuestion = (i: number) =>
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));

  const moveQuestion = (i: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const j = i + dir;
      if (j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const addOption = (qi: number) =>
    updateQuestion(qi, { options: [...questions[qi].options, ''] });

  const updateOption = (qi: number, oi: number, value: string) =>
    updateQuestion(qi, {
      options: questions[qi].options.map((o, idx) => (idx === oi ? value : o)),
    });

  const removeOption = (qi: number, oi: number) =>
    updateQuestion(qi, {
      options: questions[qi].options.filter((_, idx) => idx !== oi),
    });

  const submit = async (status: SurveyStatus) => {
    setError(null);
    // クライアント側の簡易バリデーション
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    const payload: SurveyInput = {
      title,
      description: description || null,
      required_count: Number(requiredCount) || 0,
      deadline: deadline || null,
      status,
      questions: questions.map((q) => ({
        type: q.type,
        text: q.text,
        options: q.options,
      })),
    };

    const formData = new FormData();
    if (survey) formData.set('surveyId', survey.id);
    formData.set('payload', JSON.stringify(payload));

    setPending(true);
    const result = await saveSurveyAction({ error: null }, formData);
    setPending(false);
    // redirectが起きれば下は実行されない。errorがあれば表示
    if (result?.error) setError(result.error);
  };

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <section className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">説明文</label>
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">必要回答数</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={requiredCount}
              onChange={(e) => setRequiredCount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">回答期限</label>
            <input
              type="date"
              className={inputClass}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 設問 */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <section key={qi} className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-700">設問 {qi + 1}</span>
              <div className="flex items-center gap-1 text-xs">
                <button type="button" onClick={() => moveQuestion(qi, -1)} className="rounded px-2 py-1 hover:bg-zinc-100 cursor-pointer">↑</button>
                <button type="button" onClick={() => moveQuestion(qi, 1)} className="rounded px-2 py-1 hover:bg-zinc-100 cursor-pointer">↓</button>
                <button type="button" onClick={() => removeQuestion(qi)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50 cursor-pointer">削除</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                className={inputClass + ' sm:col-span-1'}
                value={q.type}
                onChange={(e) => changeType(qi, e.target.value as QuestionType)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                className={inputClass + ' sm:col-span-2'}
                placeholder="設問文を入力"
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
              />
            </div>

            {needsOptions(q.type) && (
              <div className="space-y-2 pl-1">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-5">{oi + 1}.</span>
                    <input
                      className={inputClass}
                      placeholder={`選択肢 ${oi + 1}`}
                      value={o}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(qi, oi)} className="text-red-500 text-sm px-1 cursor-pointer">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qi)} className="text-sm text-indigo-600 hover:underline cursor-pointer">
                  ＋ 選択肢を追加
                </button>
              </div>
            )}

            {q.type === 'scale' && (
              <p className="text-xs text-zinc-500 pl-1">回答者は1〜5の5段階で回答します。</p>
            )}
            {q.type === 'text' && (
              <p className="text-xs text-zinc-500 pl-1">回答者は自由記述で回答します。</p>
            )}
          </section>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="w-full rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer"
        >
          ＋ 設問を追加
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 操作ボタン */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('draft')}
          className="rounded-md bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50 cursor-pointer"
        >
          下書き保存
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('open')}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {survey ? '保存して公開' : '公開する'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-md px-5 py-2 text-sm text-zinc-500 hover:text-zinc-700 cursor-pointer"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
