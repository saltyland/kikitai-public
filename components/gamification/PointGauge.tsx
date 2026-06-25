'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { getNextRank, getRankForPoints, getRankProgress } from '@/constants/ranks';

export interface PointGaugeProps {
  /** 現在の保有ポイント */
  points: number;
}

/** ヘッダー/サイドバーに常時表示する、ランク進捗付きのポイントゲージ。 */
export default function PointGauge({ points }: PointGaugeProps) {
  const rank = getRankForPoints(points);
  const nextRank = getNextRank(points);
  const targetProgress = getRankProgress(points) * 100;
  const RankIcon = rank.icon;

  const [prevRankKey, setPrevRankKey] = useState(rank.key);
  const justRankedUp = prevRankKey !== rank.key && targetProgress < 50;
  if (prevRankKey !== rank.key) {
    setPrevRankKey(rank.key);
  }

  const progress = useMotionValue(0);
  const width = useTransform(progress, (v) => `${v}%`);

  useEffect(() => {
    const overshoot = justRankedUp ? Math.min(100, targetProgress + 12) : targetProgress;
    const controls = animate(progress, overshoot, {
      duration: 0.6,
      ease: 'easeOut',
      onComplete: () => {
        if (justRankedUp) {
          animate(progress, targetProgress, { duration: 0.35, ease: 'easeInOut' });
        }
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress]);

  const [displayPoints, setDisplayPoints] = useState(points);
  const pointsValue = useMotionValue(points);
  useEffect(() => {
    const controls = animate(pointsValue, points, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayPoints(Math.round(v)),
    });
    return () => controls.stop();
  }, [points, pointsValue]);

  return (
    <div className="card-3d rounded-2xl bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100">
          <RankIcon className={`h-6 w-6 ${rank.colorClass}`} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-800">
            {displayPoints}
            <span className="ml-1 text-sm font-semibold text-slate-400">pt</span>
          </p>
          <p className="text-xs font-medium text-slate-500">{rank.label}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
            style={{ width }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {nextRank ? `${nextRank.label}まであと${nextRank.min - points}pt` : '最高ランクに到達済み'}
        </p>
      </div>
    </div>
  );
}
