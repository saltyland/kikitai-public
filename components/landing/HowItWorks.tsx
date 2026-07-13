'use client';

import { useEffect, useState } from 'react';

/** 3ステップの説明文（左リスト用） */
const STEPS = [
  {
    title: 'アンケートに答える',
    body: '気になるアンケートに回答して、ポイントを獲得しましょう。',
  },
  {
    title: 'ポイントを獲得',
    body: '回答するたびにポイントが貯まり、自分のアンケートに使えます。',
  },
  {
    title: 'アンケートを作成・依頼する',
    body: '貯めたポイントで、自分のアンケートに回答者を集められます。',
  },
];

/** Step1：回答カードのモックアップ（選択肢UI） */
function AnswerCardMock() {
  return (
    <div className="card-3d w-full max-w-sm p-6">
      <p className="text-xs font-bold text-brand-600">Q. 普段、調査にはどのくらい協力しますか？</p>
      <div className="mt-4 space-y-2.5">
        {['月に1回以上', '月に数回', 'ほとんどしない'].map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
              i === 0 ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                i === 0 ? 'border-brand-500 bg-brand-500' : 'border-slate-300'
              }`}
            >
              {i === 0 && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step2：ポイントゲージが0→50まで増加するモックアップ */
function PointsGaugeMock({ active }: { active: boolean }) {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!active) {
      const id = requestAnimationFrame(() => setPoints(0));
      return () => cancelAnimationFrame(id);
    }
    const target = 50;
    const duration = 1200;
    const startTime = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setPoints(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div className="card-3d w-full max-w-sm p-6">
      <p className="text-xs font-bold text-brand-600">獲得ポイント</p>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-black leading-none text-brand-600">{points}</span>
        <span className="mb-1.5 text-base font-bold text-slate-400">pt</span>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-200 ease-out"
          style={{ width: `${(points / 50) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Step3：フォーム作成画面のモックアップ */
function FormCreateMock() {
  return (
    <div className="card-3d w-full max-w-sm p-6">
      <p className="text-xs font-bold text-brand-600">新しいアンケートを作成</p>
      <div className="mt-4 space-y-2.5">
        <div className="rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-400">
          タイトルを入力…
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-400">
          + 設問を追加
        </div>
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white"
        tabIndex={-1}
      >
        ポイントで依頼する
      </button>
    </div>
  );
}

const MOCKUPS = [AnswerCardMock, PointsGaugeMock, FormCreateMock];

/**
 * インタラクティブ「How it works」セクション。
 * 左の3ステップリストをクリック/ホバーで切り替え、右のモックアップが連動する。
 * 5秒ごとに自動再生し、手動操作でも任意ステップへ移動できる。
 */
export default function HowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % STEPS.length);
    }, 5000);
    return () => clearInterval(id);
  }, [active]);

  const Mockup = MOCKUPS[active];

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">How it works</h2>
      <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-1">
          {STEPS.map((step, i) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className="block w-full border-l-2 px-5 py-4 text-left transition-colors"
              style={{
                borderColor: i === active ? 'var(--color-brand-500)' : 'transparent',
              }}
            >
              <span
                className={`text-sm font-bold transition-colors ${
                  i === active ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                Step {i + 1}
              </span>
              <h3
                className={`mt-1 text-lg font-extrabold transition-colors ${
                  i === active ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {step.title}
              </h3>
              {i === active && (
                <p className="mt-2 animate-fade-in-up text-sm leading-relaxed text-slate-600">{step.body}</p>
              )}
            </button>
          ))}
        </div>
        <div key={active} className="flex animate-fade-in-up items-center justify-center">
          <Mockup active={active === 1} />
        </div>
      </div>
    </section>
  );
}
