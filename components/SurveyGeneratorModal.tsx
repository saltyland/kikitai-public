'use client';

import { useState } from 'react';
import { generateSurveyDraftAction } from '@/app/actions/generate';
import type { GeneratedSurveyDraft } from '@/lib/domain/generation';

interface SurveyGeneratorModalProps {
  onClose: () => void;
  /** 生成された下書きをEditorに流し込むコールバック */
  onGenerated: (draft: GeneratedSurveyDraft) => void;
  /** アンケートタイトルから初期値として設定するテーマ */
  defaultTheme?: string;
  /** アンケート説明文から初期値として設定する調査目的 */
  defaultPurpose?: string;
  /** 配信設定の職業条件から初期値として設定する想定回答者 */
  defaultTargetAudience?: string;
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1';

export default function SurveyGeneratorModal({
  onClose,
  onGenerated,
  defaultTheme = '',
  defaultPurpose = '',
  defaultTargetAudience = '',
}: SurveyGeneratorModalProps) {
  const [theme, setTheme] = useState(defaultTheme);
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [targetAudience, setTargetAudience] = useState(defaultTargetAudience);
  const [questionCount, setQuestionCount] = useState(10);
  const [includeAttentionCheck, setIncludeAttentionCheck] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) {
      setError('テーマを入力してください');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await generateSurveyDraftAction({
        theme: theme.trim(),
        purpose: purpose.trim() || undefined,
        targetAudience: targetAudience.trim() || undefined,
        questionCount,
        includeAttentionCheck,
      });
      if ('error' in result) {
        setError(result.error);
      } else {
        onGenerated(result.draft);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">AIでアンケートを自動生成</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              アンケートのテーマ <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="例：大学生の睡眠習慣に関する研究"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={loading}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              調査の目的 <span className="text-xs text-slate-400">（任意）</span>
            </label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="例：睡眠不足が学業成績に与える影響を定量的に把握する"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={loading}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              想定回答者 <span className="text-xs text-slate-400">（任意）</span>
            </label>
            <input
              className={inputClass}
              placeholder="例：大学1〜4年生"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={loading}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              生成する設問数：{questionCount}問
            </label>
            <input
              type="range"
              min={5}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              disabled={loading}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>5問</span>
              <span>15問</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                不正回答検知問題を含める
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">推奨</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">不正回答の検出精度が上がります</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeAttentionCheck}
              onClick={() => setIncludeAttentionCheck((v) => !v)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                includeAttentionCheck ? 'bg-brand-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  includeAttentionCheck ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !theme.trim()}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  生成中…（最大45秒）
                </>
              ) : (
                '✨ 生成する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
