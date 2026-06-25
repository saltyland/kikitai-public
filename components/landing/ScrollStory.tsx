'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollStory } from '@/hooks/useScrollStory';

/** ポイントがカウントアップしながら表示されるコイン表示。画面に入ったタイミングで発火する */
function CoinCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          let raf = 0;
          const start = performance.now();
          const target = 150;
          const duration = 1200;
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            setValue(Math.round(target * p));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return () => cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="card-3d mx-auto w-fit px-8 py-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-500">獲得ポイント</p>
      <p className="mt-2 text-6xl font-black text-brand-600">{value}pt</p>
    </div>
  );
}

/** ステップ1：回答UIのモックがフェードイン */
function StepAnswer() {
  return (
    <div className="card-3d mx-auto w-full max-w-sm p-6">
      <p className="text-xs font-bold text-brand-600">質問 1 / 4</p>
      <p className="mt-2 text-base font-bold text-slate-800">あなたの研究分野は？</p>
      <div className="mt-4 space-y-2.5">
        {['理工学', '人文・社会科学', '医学・生命科学'].map((label, i) => (
          <div
            key={label}
            className={`rounded-xl border px-4 py-2.5 text-sm ${
              i === 0
                ? 'border-brand-500 bg-brand-50 font-bold text-brand-700'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** ステップ3：アンケート作成UIがスライドイン */
function StepCreate() {
  return (
    <div className="card-3d mx-auto w-full max-w-sm p-6">
      <p className="text-sm font-bold text-slate-700">新しいアンケート</p>
      <div className="mt-4 space-y-2">
        <div className="h-9 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 text-xs text-brand-400">
          タイトルを入力...
        </div>
        <div className="h-2 w-3/4 rounded-full bg-slate-200" />
        <div className="h-2 w-full rounded-full bg-slate-200" />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
        <span className="text-xs font-bold text-brand-700">必要なポイント</span>
        <span className="text-lg font-extrabold text-brand-600">120pt</span>
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'アンケートに答える', body: '気になるアンケートに回答してポイントを獲得。' },
  { title: 'ポイントが貯まる', body: '回答した分だけ、使えるポイントが積み上がっていく。' },
  { title: '自分のアンケートを依頼する', body: '貯めたポイントで自分の調査を公開し、回答者を集める。' },
];

/**
 * スクロールに連動してキキタイの仕組みを順番に見せるストーリーセクション。
 * GSAP ScrollTrigger でセクション全体をピン留めし、スクロール位置に応じて
 * ステップを切り替える。`prefers-reduced-motion` 環境ではピン留みせず
 * 通常のフェード表示に切り替わる（[useScrollStory](../../hooks/useScrollStory.ts) 側で分岐）。
 */
export default function ScrollStory() {
  const { containerRef, stepRefs } = useScrollStory(STEPS.length);

  return (
    <div ref={containerRef} className="kk-story relative min-h-screen overflow-hidden py-24 sm:py-0">
      {STEPS.map((step, i) => (
        <div
          key={step.title}
          ref={(el) => {
            stepRefs.current[i] = el;
          }}
          className="kk-story-step grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-0"
        >
          <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
            <span className="text-5xl font-black leading-none text-brand-200 sm:text-6xl">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{step.title}</h3>
            <p className="mt-3 max-w-[40ch] text-base leading-7 text-slate-700">{step.body}</p>
          </div>
          <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
            {i === 0 && <StepAnswer />}
            {i === 1 && <CoinCounter />}
            {i === 2 && <StepCreate />}
          </div>
        </div>
      ))}
    </div>
  );
}
