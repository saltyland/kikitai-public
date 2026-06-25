'use client';

import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  /** カウントアップの目標値 */
  end: number;
  /** アニメーションにかける時間（ms） */
  duration?: number;
  /** ビューポートに入ったと判定するしきい値（0〜1） */
  threshold?: number;
}

/** easeOutCubic イージング関数：序盤速く・終盤ゆっくり収束する */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 要素がビューポートに入った瞬間に0から目標値までカウントアップするフック。
 * IntersectionObserverで一度だけ発火し、その後は監視を解除する。
 * SSRやObserver非対応環境では最初から目標値を表示する。
 */
export function useCountUp({ end, duration = 1500, threshold = 0.3 }: UseCountUpOptions) {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setValue(end));
      return () => cancelAnimationFrame(id);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const startTime = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1);
              setValue(end * easeOutCubic(progress));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration, threshold]);

  return { ref, value };
}
