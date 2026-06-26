'use client';

import StepVisual, { type StepVisualKind } from './StepVisual';

export interface OnboardingStepData {
  visual: StepVisualKind;
  title: string;
  description: string;
}

/** オンボーディング1ステップ分の中身（イラスト＋見出し＋説明文） */
export default function OnboardingStep({ step }: { step: OnboardingStepData }) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <StepVisual kind={step.visual} />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-slate-800">{step.title}</h2>
        <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
      </div>
    </div>
  );
}
