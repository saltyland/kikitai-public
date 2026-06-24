'use client';

import { useEffect, useRef, useState } from 'react';

type RevealDirection = 'up' | 'left' | 'right' | 'scale' | 'blur';

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 出現方向の演出 */
  direction?: RevealDirection;
  /** 出現の遅延（ms）。連続要素のスタッガーに使う */
  delay?: number;
  /** 画面にどれだけ入ったら発火するか（0〜1） */
  threshold?: number;
  children: React.ReactNode;
}

const DIRECTION_CLASS: Record<RevealDirection, string> = {
  up: '',
  left: 'kk-from-left',
  right: 'kk-from-right',
  scale: 'kk-scale',
  blur: 'kk-blur',
};

/**
 * スクロールで画面に入ったときフェード＋スライドインする汎用ラッパー。
 * IntersectionObserver で一度だけ発火し、その後は監視を解除する。
 * SSR や Observer 非対応環境では最初から表示される（コンテンツは必ず読める）。
 */
export function Reveal({
  direction = 'up',
  delay = 0,
  threshold = 0.15,
  className = '',
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`kk-reveal ${DIRECTION_CLASS[direction]} ${shown ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * ページ最上部に貼り付くスクロール進捗バー。
 * スクロール量に応じて 0→1 でスケールさせ、読み進めた割合を可視化する。
 */
export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty('--kk-progress', String(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden>
      <div
        ref={barRef}
        className="kk-progress-bar h-full w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600"
      />
    </div>
  );
}

/**
 * 動くオーロラ背景。巨大なぼかしブロブが複数ゆっくり漂い、
 * “動画的”な奥行きと生命感を与える。装飾なので aria-hidden。
 */
export function AuroraBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <span
        className="kk-aurora-blob"
        style={{ left: '-8%', top: '-10%', width: '42vw', height: '42vw', background: 'var(--color-brand-300)' }}
      />
      <span
        className="kk-aurora-blob"
        style={{ right: '-6%', top: '8%', width: '36vw', height: '36vw', background: 'var(--color-brand-200)', animationDelay: '-7s' }}
      />
      <span
        className="kk-aurora-blob"
        style={{ left: '20%', bottom: '-12%', width: '46vw', height: '46vw', background: '#bfe8ff', animationDelay: '-13s', opacity: 0.4 }}
      />
    </div>
  );
}
