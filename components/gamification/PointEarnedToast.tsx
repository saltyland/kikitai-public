'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';

/** コンフェッティを表示する獲得ポイントのしきい値 */
const CONFETTI_THRESHOLD = 20;
/** 表示してから自動で消えるまでの時間（ms） */
const DISPLAY_DURATION = 3000;

export interface PointEarnedToastProps {
  /** 獲得ポイント数 */
  points: number;
  /** 答えたアンケートのタイトル */
  surveyTitle: string;
  onClose: () => void;
}

/** カウントアップ表示する数値テキスト */
function CountUpNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 0.8, bounce: 0 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  return <span>{display}</span>;
}

/**
 * アンケート回答完了時に画面右上へ表示するポイント獲得トースト。
 * 獲得ポイントが多いとき（20pt以上）は紙吹雪エフェクトを追加する。
 */
export default function PointEarnedToast({ points, surveyTitle, onClose }: PointEarnedToastProps) {
  useEffect(() => {
    if (points >= CONFETTI_THRESHOLD) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.9, y: 0.1 },
        colors: ['#f59e0b', '#fbbf24', '#fde047', '#26a69a'],
      });
    }

    const timer = setTimeout(onClose, DISPLAY_DURATION);
    return () => clearTimeout(timer);
  }, [points, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        initial={{ opacity: 0, y: -60, x: 40 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        className="fixed right-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #fde047 100%)',
        }}
      >
        <motion.span
          className="text-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          🪙
        </motion.span>
        <div>
          <p className="text-lg font-extrabold text-amber-900">
            +<CountUpNumber value={points} /> ポイント
          </p>
          <p className="text-xs font-medium text-amber-800/80">{surveyTitle}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
