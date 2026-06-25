'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * スクロールストーリーセクションのピン留め＋ステップ切り替えロジック。
 * `prefers-reduced-motion` が有効な環境ではピン留め・アニメーションを行わず、
 * 各ステップをそのまま並べて表示する（IntersectionObserver fallback）。
 */
export function useScrollStory(stepCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndexRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = stepRefs.current.filter((el): el is HTMLDivElement => el !== null);

    if (reduceMotion || typeof ScrollTrigger === 'undefined') {
      // 低速設定環境：IntersectionObserver で素朴にフェード切り替えのみ行う
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-active');
            }
          }
        },
        { threshold: 0.4 }
      );
      steps.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: () => `+=${steps.length * 100}%`,
        pin: true,
        scrub: true,
        snap: steps.length > 1 ? 1 / (steps.length - 1) : undefined,
        onUpdate: (self) => {
          const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
          if (idx !== activeIndexRef.current) {
            steps[activeIndexRef.current]?.classList.remove('is-active');
            steps[idx]?.classList.add('is-active');
            activeIndexRef.current = idx;
          }
        },
      });
      steps[0]?.classList.add('is-active');
      return () => st.kill();
    }, container);

    return () => ctx.revert();
  }, [stepCount]);

  return { containerRef, stepRefs };
}
