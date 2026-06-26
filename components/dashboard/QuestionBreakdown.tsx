'use client';

import { useState } from 'react';
import Skeleton from '@/components/ui/Skeleton';
import { color } from '@/components/charts/primitives';

export interface QuestionOption {
  label: string;
  count: number;
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  options: QuestionOption[];
}

export interface SurveyQuestionStats {
  surveyId: string;
  surveyTitle: string;
  questions: QuestionStat[];
}

export function QuestionBreakdownSkeleton() {
  return <Skeleton className="h-80 w-full" />;
}

function OptionBar({ option, total, index }: { option: QuestionOption; total: number; index: number }) {
  const pct = total > 0 ? Math.round((option.count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="line-clamp-1">{option.label}</span>
        <span>{option.count}件・{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color(index) }}
        />
      </div>
    </div>
  );
}

export default function QuestionBreakdown({ surveys }: { surveys: SurveyQuestionStats[] }) {
  const [surveyId, setSurveyId] = useState(surveys[0]?.surveyId);
  const selected = surveys.find((s) => s.surveyId === surveyId) ?? surveys[0];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">設問別回答分布</p>
        <select
          value={selected?.surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          {surveys.map((s) => (
            <option key={s.surveyId} value={s.surveyId}>
              {s.surveyTitle}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {selected?.questions.map((q) => {
          const total = q.options.reduce((sum, o) => sum + o.count, 0);
          return (
            <div key={q.questionId}>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {q.questionText}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <OptionBar key={opt.label} option={opt} total={total} index={i} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
