'use client';

import { useEffect, useRef, useState } from 'react';

/* ───────── 装飾アイコン（絵文字は使わない方針のためすべてSVG） ───────── */

function IconPen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function IconCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M9.5 10.2a2.4 2.4 0 012.5-1.6c1.3 0 2.2.7 2.2 1.7s-.8 1.4-2.4 1.7-2.4.8-2.4 1.8.9 1.7 2.3 1.7a2.4 2.4 0 002.5-1.6" />
    </svg>
  );
}
function IconSend({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 3L10.5 13.5" />
      <path d="M21 3l-6.5 18-4-8-8-4L21 3z" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 4v16h16" />
      <rect x="7.5" y="11" width="2.6" height="6" rx="0.8" />
      <rect x="12" y="7.5" width="2.6" height="9.5" rx="0.8" />
      <rect x="16.5" y="13.5" width="2.6" height="3.5" rx="0.8" />
    </svg>
  );
}
function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
    </svg>
  );
}
function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** 循環の各ステージ（時計回り：答える→ポイント→公開→集まる→…） */
const STAGES = [
  { label: 'こたえる', sub: '他の調査に回答', Icon: IconPen },
  { label: 'ポイント獲得', sub: '+15pt たまる', Icon: IconCoin },
  { label: '自分の調査を公開', sub: 'ポイントで募集', Icon: IconSend },
  { label: 'データが集まる', sub: '回答が返ってくる', Icon: IconChart },
] as const;

const AUTO_SPEED = 14; // 自動回転スピード（度/秒）
const SCENE_INTERVAL = 3600; // 中央カードの設問が切り替わる間隔（ms）
const SCENE_TOTAL = 6; // 表示する設問の総数（1/6〜6/6で進む）

/** 中央カードに表示する設問のサンプル（実際にキキタイで出せる代表的な3形式を時間でローテーション） */
type Scene =
  | { type: 'choice'; survey: string; question: string; selected: string; others: string[] }
  | { type: 'scale'; survey: string; question: string; min: string; max: string; selected: number; steps: number }
  | { type: 'text'; survey: string; question: string; answer: string };

const SCENES: Scene[] = [
  {
    type: 'choice',
    survey: '研究室のコーヒー文化調査',
    question: '作業中によく飲むものは？',
    selected: 'コーヒー',
    others: ['紅茶・お茶', 'エナジードリンク', '水・その他'],
  },
  {
    type: 'scale',
    survey: '夏休みの満足度調査',
    question: '今学期の満足度を5段階で教えてください',
    min: '不満そう',
    max: '楽しみ',
    selected: 4,
    steps: 5,
  },
  {
    type: 'text',
    survey: '一言フィードバック調査',
    question: 'このサービスの良いところを一言で',
    answer: '回答するだけでポイントが貯まるのが嬉しい',
  },
  {
    type: 'choice',
    survey: '授業の課題量アンケート',
    question: '今学期の課題量はどう感じる？',
    selected: 'やや多い',
    others: ['ちょうどいい', '少ない', '非常に多い'],
  },
  {
    type: 'scale',
    survey: 'サークル満足度調査',
    question: '所属サークルへの満足度は？',
    min: '不満',
    max: '満足',
    selected: 5,
    steps: 5,
  },
  {
    type: 'text',
    survey: 'キャンパス生活アンケート',
    question: '最近一番頑張っていることは？',
    answer: '研究テーマのデータ収集と分析',
  },
];

/**
 * ヒーロー右側のインタラクティブな「循環」イラスト。
 * 中央のアンケートカードを回答すると、ポイントが貯まり、調査を公開し、
 * データが集まって再び回答へ——という“お互いさま”のループを表す。
 * リングは自動でゆっくり回転し、ユーザーがドラッグして手動で回すこともできる。
 * （prefers-reduced-motion では自動回転を止め、ドラッグのみ有効にする）
 */
export default function HeroCycle() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);

  // アニメーション／ドラッグ状態は ref に保持（再レンダリングを起こさず rAF で更新）
  const angleRef = useRef(0);
  const draggingRef = useRef(false);
  const reduceRef = useRef(false);
  // ドラッグ開始時のポインタ角度とリング角度
  const grab = useRef({ pointerAngle: 0, startAngle: 0 });

  useEffect(() => {
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!draggingRef.current && !reduceRef.current) {
        angleRef.current = (angleRef.current + AUTO_SPEED * dt) % 360;
        setAngle(angleRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 中央カードの設問を時間でローテーション（差し替え時に spawn アニメーションが再生される）
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = setInterval(() => {
      setSceneIndex((i) => (i + 1) % SCENES.length);
    }, SCENE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const scene = SCENES[sceneIndex];

  /** コンテナ中心から見たポインタの角度（度） */
  const pointerAngleOf = (clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    grab.current = {
      pointerAngle: pointerAngleOf(e.clientX, e.clientY),
      startAngle: angleRef.current,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = pointerAngleOf(e.clientX, e.clientY) - grab.current.pointerAngle;
    angleRef.current = grab.current.startAngle + delta;
    setAngle(angleRef.current);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* capture が無い場合は無視 */
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl select-none sm:max-w-3xl" style={{ perspective: '1400px' }}>
      <div
        ref={wrapRef}
        role="img"
        aria-label="アンケートに答えるとポイントが貯まり、自分の調査を公開して回答データが集まる——という循環を表したイラスト。ドラッグで回せます。"
        className={`relative aspect-square w-full touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ transformStyle: 'preserve-3d' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* 軌道リング＋流れの矢印（回転角に追従。奥行きを出すため縦方向を圧縮した楕円） */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="kk-cycle-flow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-300)" />
              <stop offset="100%" stopColor="var(--color-brand-600)" />
            </linearGradient>
            <marker id="kk-cycle-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M1 1L9 5L1 9z" fill="var(--color-brand-500)" />
            </marker>
          </defs>
          {/* 下地の点線リング（奥行き感のため縦長を縮めた楕円） */}
          <ellipse cx="100" cy="100" rx="76" ry="50" fill="none" stroke="var(--color-brand-200)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
          {/* 流れを示す回転アーク（4本、各ステージ間をつなぐ） */}
          <g transform={`rotate(${angle} 100 100)`}>
            {[0, 90, 180, 270].map((base) => (
              <g key={base} transform={`rotate(${base} 100 100)`}>
                <path
                  d="M100 24 A76 50 0 0 1 153.8 50.5"
                  fill="none"
                  stroke="url(#kk-cycle-flow)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  markerEnd="url(#kk-cycle-arrow)"
                  opacity="0.85"
                />
              </g>
            ))}
          </g>
        </svg>

        {/* 軌道上のステージチップ：中心からの距離(半径)と角度を直接計算して配置する。
           縦方向を圧縮した楕円軌道＋手前/奥でスケールと不透明度を変えることで
           三次元的にぐるぐる回って見えるようにしている（手前=大きく濃く・奥=小さく薄く）。 */}
        {STAGES.map((s, i) => {
          const baseDeg = [270, 0, 90, 180][i]; // 上・右・下・左
          const theta = ((baseDeg + angle) * Math.PI) / 180;
          const radiusX = 44; // 横方向の半径（%）
          const radiusY = 30; // 縦方向の半径（%）。横より小さくして奥行きの圧縮を表現
          const left = 50 + radiusX * Math.cos(theta);
          const top = 50 + radiusY * Math.sin(theta);
          // depth: -1(最奥) 〜 1(最前面)。手前に来るほど大きく・濃く・上に重なる
          const depth = Math.sin(theta);
          const scale = 0.74 + ((depth + 1) / 2) * 0.46; // 0.74〜1.20
          const opacity = 0.55 + ((depth + 1) / 2) * 0.45; // 0.55〜1.0
          const z = Math.round(depth * 60); // translateZ（px）
          return (
            <div
              key={s.label}
              className="absolute transition-[opacity] duration-150"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                opacity,
                zIndex: Math.round(depth * 10) + 10,
                transform: `translate(-50%, -50%) translateZ(${z}px) scale(${scale})`,
              }}
            >
              <div className="card-3d flex w-36 items-center gap-2.5 px-3 py-2.5 sm:w-44 sm:px-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 sm:h-10 sm:w-10">
                  <s.Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-extrabold text-slate-800 sm:text-base">{s.label}</span>
                  <span className="block text-[11px] text-slate-400 sm:text-xs">{s.sub}</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* 中央：回答中のアンケートカード（束ねたカードの一番上にいる、循環の起点）。
           設問は SCENES を数秒ごとにローテーションし、実際にキキタイで出せる
           形式（選択・5段階評価・短文記述）が入れ替わって見えるようにしている。 */}
        <div className="absolute left-1/2 top-1/2 z-20 w-[60%] -translate-x-1/2 -translate-y-1/2">
          {/* 背後に重ねた2枚のカード（「いくつものアンケートが束ねられている」感を出す） */}
          <div
            className="card-3d absolute inset-x-3 top-3 -z-20 h-full rounded-[1.75rem] opacity-50"
            style={{ transform: 'rotate(-6deg)' }}
            aria-hidden
          />
          <div
            className="card-3d absolute inset-x-1.5 top-1.5 -z-10 h-full rounded-[1.75rem] opacity-75"
            style={{ transform: 'rotate(3deg)' }}
            aria-hidden
          />
          {/* key=sceneIndex で毎回マウントし直し、kk-scene-spawn（小さい→ちょっと大きい→元の大きさ）を再生する */}
          <div key={sceneIndex} className="card-3d kk-scene-spawn relative rounded-[1.75rem] p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800">
                質問 {sceneIndex + 1} / {SCENE_TOTAL}
              </span>
              <span className="truncate text-slate-400">{scene.survey}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
                style={{ width: `${((sceneIndex + 1) / SCENE_TOTAL) * 100}%` }}
              />
            </div>

            <p className="mt-3.5 text-sm font-bold leading-snug text-slate-800 sm:text-base">{scene.question}</p>

            {scene.type === 'choice' && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                  </span>
                  {scene.selected}
                </div>
                {scene.others.map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500"
                  >
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white" />
                    {label}
                  </div>
                ))}
              </div>
            )}

            {scene.type === 'scale' && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-3">
                  {Array.from({ length: scene.steps }, (_, i) => i + 1).map((n) => (
                    <span
                      key={n}
                      className={
                        n === scene.selected
                          ? 'flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold text-white shadow-sm'
                          : 'flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 text-sm font-bold text-slate-400'
                      }
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{scene.min}</span>
                  <span>{scene.max}</span>
                </div>
              </div>
            )}

            {scene.type === 'text' && (
              <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
                {scene.answer}
                <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-brand-400 align-middle" aria-hidden />
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <span className="btn-3d inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
                次へ
                <IconArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>

        {/* 浮かぶ「ポイント獲得」チップ（写真のように軌道の外へ少しはみ出して固定） */}
        <div className="card-3d absolute -top-2 right-0 flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-brand-600 sm:-right-3 sm:text-sm">
          <IconCoin className="h-4 w-4" />
          +15pt 獲得
        </div>
      </div>

      {/* 浮かぶAI品質チップ＋ドラッグ操作のヒント */}
      <div className="card-3d absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-slate-700">
        <IconSparkle className="h-4 w-4 text-brand-500" />
        AI品質スコア 92点
      </div>
      <p className="mt-7 text-center text-[11px] font-medium text-brand-500/80">
        ドラッグで循環を回せます
      </p>
    </div>
  );
}
