'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { getNextRank, getPointsToNextRank, getRankByPoints, getRankProgress } from '@/constants/ranks';

export interface PointGaugeProps {
  /** 現在の所持ポイント数 */
  points: number;
}

/**
 * ユーザーの現在ポイントと次ランクまでの進捗を表示するゲージ。
 * ランクが上がったときはバーが一瞬オーバーシュートしてから収まる演出を入れる。
 */
export default function PointGauge({ points }: PointGaugeProps) {
  const rank = getRankByPoints(points);
  const nextRank = getNextRank(points);
  const remaining = getPointsToNextRank(points);
  const progress = getRankProgress(points);

  const prevRankId = useRef(rank.id);

  const progressValue = useMotionValue(0);
  const progressSpring = useSpring(progressValue, { stiffness: 120, damping: 16 });
  const width = useTransform(progressSpring, (v) => `${v}%`);

  useEffect(() => {
    const rankedUp = prevRankId.current !== rank.id;
    prevRankId.current = rank.id;

    if (rankedUp) {
      // ランクアップ時はオーバーシュートさせてから正しい値に収める
      progressValue.set(100);
      const t = setTimeout(() => progressValue.set(progress), 250);
      return () => clearTimeout(t);
    }
    progressValue.set(progress);
  }, [progress, rank.id, progressValue]);

  return (
    <div className="card-3d rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{rank.icon}</span>
          <div>
            <p className="text-xs font-medium text-slate-500">{rank.label}</p>
            <p className="text-2xl font-extrabold text-slate-800">{points}pt</p>
          </div>
        </div>
        {nextRank && remaining !== null && (
          <p className="text-xs font-medium text-slate-500">
            {nextRank.label}まであと{remaining}pt
          </p>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div className="h-full rounded-full bg-brand-500" style={{ width }} />
      </div>
    </div>
  );
}
