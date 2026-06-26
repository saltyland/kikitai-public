'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins } from 'lucide-react';

/** コンフェッティを出す閾値（この値以上の獲得で紙吹雪を発射） */
const CONFETTI_THRESHOLD = 20;
/** 表示してから自動で消えるまでの時間（ms） */
const AUTO_DISMISS_MS = 3000;

export interface PointEarnedToastProps {
  /** 獲得ポイント数 */
  points: number;
  /** 答えたアンケートのタイトル */
  surveyTitle: string;
  onClose: () => void;
}

/** アンケート回答完了時に右上へ表示する、ポイント獲得アニメーション付きトースト。 */
export default function PointEarnedToast({ points, surveyTitle, onClose }: PointEarnedToastProps) {
  const [visible, setVisible] = useState(true);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [displayCount, setDisplayCount] = useState(0);
  const firedConfetti = useRef(false);

  useEffect(() => {
    const controls = animate(count, points, { duration: 0.8, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', (v) => setDisplayCount(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [count, points, rounded]);

  useEffect(() => {
    if (points >= CONFETTI_THRESHOLD && !firedConfetti.current) {
      firedConfetti.current = true;
      confetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 35,
        origin: { x: 0.9, y: 0.1 },
        colors: ['#f59e0b', '#fde047', '#26a69a', '#ffffff'],
      });
    }
  }, [points]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-400 to-yellow-300 px-4 py-3 shadow-lg"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70"
          >
            <Coins className="h-6 w-6 text-amber-700" aria-hidden />
          </motion.div>
          <div>
            <p className="text-lg font-bold text-amber-900">+{displayCount} ポイント</p>
            <p className="max-w-[16rem] truncate text-xs text-amber-800/80">{surveyTitle}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
