'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import OnboardingStep, { type OnboardingStepData } from './OnboardingStep';

const STEPS: OnboardingStepData[] = [
  {
    visual: 'welcome',
    title: 'キキタイへようこそ',
    description: '学生・研究者のためのアンケート交換プラットフォームです。',
  },
  {
    visual: 'swipe',
    title: 'アンケートに答えてポイントを稼ごう',
    description: '他の人のアンケートに回答すると、ポイントが貯まります。',
  },
  {
    visual: 'coin',
    title: 'ポイントを使ってリサーチしよう',
    description: '貯めたポイントを使って、自分のアンケートを依頼できます。',
  },
  {
    visual: 'stars',
    title: 'AIがアンケートの質を評価します',
    description: '設問の明確さやバイアスをAIが採点し、適正なポイントコストを決めます。',
  },
];

interface Props {
  /** 完了（最終ステップの「次へ」 or 「スキップ」）時に呼ばれる */
  onFinish: () => void;
}

/** 初回登録後に1回だけ表示するフルスクリーンのチュートリアルモーダル */
export default function OnboardingFlow({ onFinish }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const isLast = stepIndex === STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={onFinish}
        className="absolute right-5 top-5 text-sm text-white/80 underline-offset-2 hover:underline cursor-pointer"
      >
        スキップ
      </button>

      <div className="relative flex w-full max-w-sm flex-col gap-8 rounded-2xl bg-white px-6 py-10 shadow-xl">
        <div className="min-h-[260px] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <OnboardingStep step={STEPS[stepIndex]} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === stepIndex ? 'bg-brand-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="w-full rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 cursor-pointer"
          >
            {isLast ? 'はじめる' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
}
