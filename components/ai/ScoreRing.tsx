'use client';

import { motion, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** 総合スコア（0〜100） */
  score: number;
  size?: number;
}

/** スコア帯ごとの色とメッセージ */
function getTone(score: number) {
  if (score >= 80) {
    return { ring: '#16a34a', track: '#dcfce7', text: 'text-green-600', message: '高品質なアンケートです！' };
  }
  if (score >= 60) {
    return { ring: '#ca8a04', track: '#fef9c3', text: 'text-yellow-700', message: '良好です。改善提案もご確認ください' };
  }
  return { ring: '#dc2626', track: '#fee2e2', text: 'text-red-600', message: 'いくつか改善が必要です' };
}

/** 総合スコアを円形プログレスリングで表示するコンポーネント */
export default function ScoreRing({ score, size = 160 }: Props) {
  const tone = getTone(score);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.track}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUpScore score={score} />
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <p className={`text-sm font-medium ${tone.text}`}>{tone.message}</p>
    </div>
  );
}

/** スコア数値を0から目標値までカウントアップ表示する（easeOutQuint） */
function CountUpScore({ score }: { score: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1.1,
      ease: [0.23, 1, 0.32, 1], // easeOutQuint
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [score]);

  return (
    <span ref={ref} className="text-3xl font-bold text-slate-800">
      {displayValue}
    </span>
  );
}
