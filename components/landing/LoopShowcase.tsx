'use client';

import { useEffect, useState } from 'react';

/* ───────── 章の3ステップ（答える → ポイント → 作る） ───────── */
const STEPS = [
  {
    no: '01',
    title: 'アンケートに答える',
    body: '気になるアンケートに回答すると、その場でポイントを獲得。1問ずつ進むスマホ最適化の画面で、すきま時間にサクサク答えられます。',
  },
  {
    no: '02',
    title: 'ポイントが貯まる',
    body: '回答した分だけポイントが積み上がっていく。丁寧な回答にはAIがボーナスを付けるから、がんばりがそのまま返ってきます。',
  },
  {
    no: '03',
    title: '自分のアンケートを作る',
    body: '貯めたポイントで自分の調査を公開し、回答者を集める。一方通行だった調査が、ぐるぐる回る輪に変わります。',
  },
];

const PHASE_MS = 2400;

/* ───────── 擬似カーソル（SVGの矢印ポインタ） ───────── */
function Cursor({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      width="26"
      height="26"
      aria-hidden
    >
      <path
        d="M5 3l14 7-6 1.6L9.5 18 5 3z"
        fill="#fff"
        stroke="#0f2826"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ───────── フェーズ1：回答画面（カーソルが選択肢をタップ） ───────── */
function ScreenAnswer() {
  const options = ['理工学', '人文・社会科学', '医学・生命科学'];
  return (
    <div className="kk-demo-screen flex h-full flex-col">
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-bold text-brand-600">質問 2 / 4</span>
        <span>研究のスタイル調査</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
        <div className="kk-demo-bar h-full rounded-full bg-brand-500" />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-800">あなたの研究分野は？</p>
      <div className="relative mt-3 space-y-2">
        {options.map((label, i) => {
          const isTarget = i === 0;
          return (
            <div
              key={label}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] ${
                isTarget
                  ? 'kk-demo-pick border-slate-200 font-bold'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  isTarget ? 'border-brand-500' : 'border-slate-300'
                }`}
              >
                {isTarget && <span className="kk-demo-pick-dot h-2 w-2 rounded-full bg-brand-500" />}
              </span>
              {label}
            </div>
          );
        })}

        {/* タップ対象（先頭の選択肢）に重ねた擬似カーソルと獲得ポイント */}
        <div className="pointer-events-none absolute left-[58%] top-[10px]">
          <span className="kk-demo-pt absolute -top-3 left-6 whitespace-nowrap rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
            +15pt
          </span>
          <Cursor className="kk-demo-cursor drop-shadow" />
        </div>
      </div>
    </div>
  );
}

/* ───────── フェーズ2：ポイント加算（カウントアップ） ───────── */
function ScreenPoints() {
  const [value, setValue] = useState(120);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 120;
    const to = 135;
    const duration = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="kk-demo-screen flex h-full flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M9.5 9.5h3.2a1.8 1.8 0 010 3.6H9.8M9.5 13.1h3.4a1.8 1.8 0 010 3.6H10" />
        </svg>
      </span>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-brand-500">
        保有ポイント
      </p>
      <p className="mt-1 text-5xl font-black leading-none text-brand-600">{value}</p>
      <p className="mt-1 text-xs text-slate-400">pt</p>
      <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-600">
        高品質ボーナス ＋15pt
      </span>
    </div>
  );
}

/* ───────── フェーズ3：アンケート作成（公開ボタンをタップ） ───────── */
function ScreenCreate() {
  return (
    <div className="kk-demo-screen flex h-full flex-col">
      <p className="text-[13px] font-bold text-slate-700">新しいアンケート</p>
      <div
        className="kk-demo-rise mt-3 rounded-lg border border-brand-300 bg-brand-50/60 px-3 py-2 text-[13px] font-bold text-brand-700"
        style={{ animationDelay: '0.15s' }}
      >
        研究のスタイル調査
      </div>
      <div
        className="kk-demo-rise mt-2 flex items-center gap-1.5 text-[11px] font-bold text-brand-500"
        style={{ animationDelay: '0.45s' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
          <path d="M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
          <path d="M4 20L15 9" />
        </svg>
        AIが設問を自動生成
      </div>
      <div className="mt-2 space-y-1.5">
        {['Q1. 1日の研究時間は？', 'Q2. よく使うツールは？'].map((q, i) => (
          <div
            key={q}
            className="kk-demo-rise rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600"
            style={{ animationDelay: `${0.75 + i * 0.25}s` }}
          >
            {q}
          </div>
        ))}
      </div>
      <div className="relative mt-auto pt-3">
        <div className="rounded-xl bg-brand-500 px-4 py-2 text-center text-sm font-bold text-white shadow-lg shadow-brand-500/30">
          公開する
        </div>
        <div className="pointer-events-none absolute right-6 top-[14px]">
          <Cursor className="kk-demo-cursor drop-shadow" />
        </div>
      </div>
    </div>
  );
}

/* ───────── 端末モック（中で各フェーズ画面を切り替える） ───────── */
function PhoneDemo({ phase }: { phase: number }) {
  return (
    <div className="card-3d relative h-[440px] w-[256px] shrink-0 rounded-[2.2rem] p-3.5">
      {/* ノッチ */}
      <div className="absolute left-1/2 top-2.5 h-2 w-14 -translate-x-1/2 rounded-full bg-slate-200" aria-hidden />
      <div className="mt-5 h-[392px] overflow-hidden rounded-[1.6rem] bg-white p-5">
        {/* key で再マウントし、入場アニメをフェーズごとに再生 */}
        <div key={phase} className="h-full">
          {phase === 0 && <ScreenAnswer />}
          {phase === 1 && <ScreenPoints />}
          {phase === 2 && <ScreenCreate />}
        </div>
      </div>
    </div>
  );
}

/* ───────── 人物イラスト（フラットSVG・回答し合う2人） ───────── */
function PeopleIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 240" className={className} aria-hidden fill="none">
      {/* 背後のやわらかいブロブ */}
      <ellipse cx="130" cy="150" rx="120" ry="78" fill="var(--color-brand-100)" opacity="0.7" />

      {/* 右の人物（スマホで回答する学生・座り姿） */}
      <g>
        {/* 椅子・座面の影 */}
        <ellipse cx="188" cy="210" rx="46" ry="10" fill="var(--color-brand-200)" opacity="0.6" />
        {/* 脚 */}
        <path d="M168 196 q-4 12 -2 20 l10 0 q-1 -10 2 -18z" fill="var(--color-brand-700)" />
        <path d="M196 198 q6 10 12 16 l8 -6 q-8 -8 -12 -16z" fill="var(--color-brand-700)" />
        {/* 胴 */}
        <path d="M162 140 q24 -16 50 0 q8 30 2 58 q-28 10 -56 0 q-6 -30 4 -58z" fill="var(--color-brand-500)" />
        {/* 腕（スマホを持つ） */}
        <path d="M170 156 q-10 16 0 30 q8 6 18 4 l-2 -12 q-8 0 -10 -8 q-2 -8 6 -16z" fill="var(--color-brand-600)" />
        {/* 頭 */}
        <circle cx="187" cy="118" r="20" fill="#fcd9b8" />
        {/* 髪 */}
        <path d="M167 116 q0 -22 20 -22 q20 0 20 22 q-6 -10 -20 -10 q-14 0 -20 10z" fill="#3f2d23" />
        {/* スマホ */}
        <rect x="178" y="150" width="20" height="34" rx="4" fill="#0f2826" />
        <rect x="180.5" y="153" width="15" height="28" rx="2" fill="var(--color-brand-200)" />
      </g>

      {/* 左の人物（つながる相手・半身） */}
      <g opacity="0.92">
        <ellipse cx="74" cy="206" rx="40" ry="9" fill="var(--color-brand-200)" opacity="0.6" />
        <path d="M54 150 q20 -14 42 0 q7 26 2 50 q-23 8 -47 0 q-5 -26 3 -50z" fill="var(--color-brand-400)" />
        <circle cx="75" cy="130" r="18" fill="#fcd9b8" />
        <path d="M57 130 q0 -20 18 -20 q18 0 18 20 q-6 -9 -18 -9 q-12 0 -18 9z" fill="#243b39" />
      </g>

      {/* 2人をつなぐ点線の輪（“回答し合う”） */}
      <path
        d="M96 132 q34 -30 70 0"
        stroke="var(--color-brand-500)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="2 8"
      />
      <circle cx="131" cy="116" r="4" fill="var(--color-brand-600)" />
    </svg>
  );
}

/**
 * 「答える → ポイント → 作る」の輪を、端末の擬似操作アニメと人物イラストで見せる単一セクション。
 * 自動で3フェーズをループし、左のステップリストと同期してアクティブ行をハイライトする。
 * （スクロールでのピン留めは行わず、表示されている間ずっとループ再生する。）
 * `prefers-reduced-motion` 環境ではフェーズ送りを止め、回答済みの状態で静止表示する。
 */
export default function LoopShowcase() {
  const [phase, setPhase] = useState(0);

  // フェーズ送り（常時ループ）
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const id = setInterval(() => setPhase((p) => (p + 1) % STEPS.length), PHASE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      {/* 左：3ステップのテキスト（アクティブ行を同期ハイライト） */}
      <ul className="mx-auto max-w-lg space-y-7">
        {STEPS.map((s, i) => (
          <li
            key={s.no}
            className={`kk-loop-step flex gap-5 ${i === phase ? 'is-active' : ''}`}
            aria-current={i === phase ? 'step' : undefined}
          >
            <span className="kk-loop-num flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-extrabold text-brand-600">
              {s.no}
            </span>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-slate-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* 右：人物イラスト＋擬似操作アニメの端末 */}
      <div className="relative mx-auto flex w-full max-w-xl items-center justify-center py-4">
        <PeopleIllustration className="absolute -left-2 bottom-0 w-[88%] opacity-90 sm:-left-8" />
        <div className="relative z-10 kk-float" style={{ ['--kk-rot' as string]: '2deg' }}>
          <PhoneDemo phase={phase} />
        </div>
        {/* 浮かぶポイントチップ */}
        <div
          className="card-3d kk-float-slow absolute -right-1 top-6 z-20 px-4 py-2 text-sm font-extrabold text-brand-600 sm:-right-6"
          style={{ ['--kk-rot' as string]: '6deg' }}
        >
          +15pt 獲得
        </div>
      </div>
    </div>
  );
}
