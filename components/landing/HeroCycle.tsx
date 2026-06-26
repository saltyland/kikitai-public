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

/** 循環の各ステージ（時計回り：答える→ポイント→公開→集まる→…） */
const STAGES = [
  { label: 'こたえる', sub: '他の調査に回答', Icon: IconPen },
  { label: 'ポイント獲得', sub: '+15pt たまる', Icon: IconCoin },
  { label: '自分の調査を公開', sub: 'ポイントで募集', Icon: IconSend },
  { label: 'データが集まる', sub: '回答が返ってくる', Icon: IconChart },
] as const;

const AUTO_SPEED = 14; // 自動回転スピード（度/秒）

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
    <div className="relative mx-auto w-full max-w-md select-none">
      <div
        ref={wrapRef}
        role="img"
        aria-label="アンケートに答えるとポイントが貯まり、自分の調査を公開して回答データが集まる——という循環を表したイラスト。ドラッグで回せます。"
        className={`relative aspect-square w-full touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* 軌道リング＋流れの矢印（回転角に追従） */}
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
          {/* 下地の点線リング（チップの軌道に合わせた半径） */}
          <circle cx="100" cy="100" r="64" fill="none" stroke="var(--color-brand-200)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
          {/* 流れを示す回転アーク（4本、各ステージ間をつなぐ） */}
          <g transform={`rotate(${angle} 100 100)`}>
            {[0, 90, 180, 270].map((base) => (
              <g key={base} transform={`rotate(${base} 100 100)`}>
                <path
                  d="M100 36 A64 64 0 0 1 145.25 54.75"
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

        {/* 軌道上のステージチップ：中心からの距離(半径)と角度を直接計算して配置する
           （親要素を回転させて子を打ち消す方式は、ネストした transform の基準点がずれて
           4枚が正しい円周上に乗らない不具合があったため、三角関数で直接座標を出す方式に変更）。 */}
        {STAGES.map((s, i) => {
          const baseDeg = [270, 0, 90, 180][i]; // 上・右・下・左
          const theta = ((baseDeg + angle) * Math.PI) / 180;
          const radius = 32; // 中心からの距離（%）
          const left = 50 + radius * Math.cos(theta);
          const top = 50 + radius * Math.sin(theta);
          return (
            <div
              key={s.label}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="card-3d flex w-28 items-center gap-2 px-2.5 py-2 sm:w-32 sm:px-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 sm:h-8 sm:w-8">
                  <s.Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[11px] font-extrabold text-slate-800 sm:text-xs">{s.label}</span>
                  <span className="block text-[9px] text-slate-400 sm:text-[10px]">{s.sub}</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* 中央：回答中のアンケートカード（束ねたカードの一番上にいる、循環の起点） */}
        <div className="absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2">
          {/* 背後に重ねた2枚のカード（「いくつものアンケートが束ねられている」感を出す） */}
          <div
            className="card-3d absolute inset-x-3 top-3 -z-20 h-full opacity-50"
            style={{ transform: 'rotate(-6deg)' }}
            aria-hidden
          />
          <div
            className="card-3d absolute inset-x-1.5 top-1.5 -z-10 h-full opacity-75"
            style={{ transform: 'rotate(3deg)' }}
            aria-hidden
          />
          <div className="card-3d relative p-3.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold text-brand-600">質問 2 / 5</span>
              <span>コーヒー文化調査</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-brand-100">
              <div className="h-full w-2/5 rounded-full bg-brand-500" />
            </div>
            <p className="mt-2.5 text-xs font-bold text-slate-800">作業中によく飲むものは？</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 rounded-lg border-2 border-brand-500 bg-brand-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-700">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-brand-500 bg-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                </span>
                コーヒー
              </div>
              {['紅茶・お茶', '水・その他'].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500"
                >
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 浮かぶAI品質チップ＋ドラッグ操作のヒント */}
      <div className="card-3d absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700">
        <IconSparkle className="h-3.5 w-3.5 text-brand-500" />
        AI品質スコア 92点
      </div>
      <p className="mt-7 text-center text-[11px] font-medium text-brand-500/80">
        ドラッグで循環を回せます
      </p>
    </div>
  );
}
