'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins } from 'lucide-react';

/** コンフェッティを出す閾値（この獲得ポイント以上で紙吹雪を発射） */
const CONFETTI_THRESHOLD = 10;

export interface PointRevealCardProps {
  /** 平均品質（×1.0）でもらえる基礎ポイント。演出の起点。 */
  baseCost: number;
  /** 品質スコアから決まったポイント付与倍率（0 / 0.5 / 1.0 / 1.5 等） */
  multiplier: number;
  /** 実際に付与された最終ポイント（= baseCost × multiplier の四捨五入） */
  earnedPoints: number;
  /** AIからのアドバイス（最後に表示） */
  feedback?: string | null;
  /** 品質評価の絵文字・ラベル・文字色（最後に表示） */
  evaluation?: { emoji: string; text: string; color: string } | null;
}

/** 段階：0=平均ポイント表示 → 1=倍率 → 2=最終ポイント → 3=アドバイス/絵文字 */
type Stage = 0 | 1 | 2 | 3;

/** 倍率の表示（×1.0 のように小数1桁で揃える） */
function formatMultiplier(m: number): string {
  return `×${m.toFixed(1)}`;
}

/**
 * アンケート回答後の獲得ポイント演出。
 * まず平均（基礎）ポイントをカウントアップで表示し、続いて「×倍率」を見せ、
 * 最後に最終ポイントへカウントアップしてから、アドバイス・絵文字を出す。
 */
export default function PointRevealCard({
  baseCost,
  multiplier,
  earnedPoints,
  feedback,
  evaluation,
}: PointRevealCardProps) {
  const [stage, setStage] = useState<Stage>(0);
  const firedConfetti = useRef(false);

  // 平均ポイントのカウントアップ
  const baseCount = useMotionValue(0);
  const baseRounded = useTransform(baseCount, (v) => Math.round(v));
  const [baseDisplay, setBaseDisplay] = useState(0);

  // 最終ポイントのカウントアップ
  const finalCount = useMotionValue(0);
  const finalRounded = useTransform(finalCount, (v) => Math.round(v));
  const [finalDisplay, setFinalDisplay] = useState(0);

  // ステージ進行のタイマー
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 1100)); // 倍率を出す
    timers.push(setTimeout(() => setStage(2), 2000)); // 最終ポイントへ
    timers.push(setTimeout(() => setStage(3), 3100)); // アドバイス・絵文字
    return () => timers.forEach(clearTimeout);
  }, []);

  // 平均ポイントのカウントアップ（マウント直後）
  useEffect(() => {
    const controls = animate(baseCount, baseCost, { duration: 0.7, ease: 'easeOut' });
    const unsub = baseRounded.on('change', (v) => setBaseDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [baseCount, baseRounded, baseCost]);

  // 最終ポイントのカウントアップ（stage 2 で baseCost → earnedPoints）
  useEffect(() => {
    if (stage < 2) return;
    finalCount.set(baseCost);
    const controls = animate(finalCount, earnedPoints, { duration: 0.9, ease: 'easeOut' });
    const unsub = finalRounded.on('change', (v) => setFinalDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [stage, finalCount, finalRounded, baseCost, earnedPoints]);

  // 最終ポイント表示時にコンフェッティ
  useEffect(() => {
    if (stage >= 2 && earnedPoints >= CONFETTI_THRESHOLD && !firedConfetti.current) {
      firedConfetti.current = true;
      confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#f59e0b', '#fde047', '#26a69a', '#ffffff'],
      });
    }
  }, [stage, earnedPoints]);

  const noReward = earnedPoints <= 0;

  return (
    <section className="card-3d rounded-2xl bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-500">獲得ポイント</h2>

      {/* 平均ポイント → ×倍率 → 最終ポイント の段階演出 */}
      <div className="mt-4 flex flex-col items-center gap-2">
        {/* 平均ポイント */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: stage >= 2 ? 0.5 : 1,
            y: 0,
            scale: stage >= 2 ? 0.9 : 1,
          }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <span className="text-xs font-medium text-slate-400">平均ポイント</span>
          <span className="text-2xl font-bold text-slate-600 tabular-nums">
            {baseDisplay}
            <span className="ml-0.5 text-sm font-semibold text-slate-400">pt</span>
          </span>
        </motion.div>

        {/* ×倍率 */}
        <AnimatePresence>
          {stage >= 1 && (
            <motion.div
              key="mult"
              initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              className={`rounded-full px-3 py-0.5 text-lg font-extrabold ${
                multiplier >= 1.5
                  ? 'bg-amber-100 text-amber-700'
                  : multiplier >= 1
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {formatMultiplier(multiplier)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 最終ポイント */}
        <AnimatePresence>
          {stage >= 2 && (
            <motion.div
              key="final"
              initial={{ opacity: 0, y: 14, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
              className="mt-1 flex flex-col items-center"
            >
              <div className="h-px w-16 bg-slate-200" />
              {noReward ? (
                <p className="mt-3 text-center text-sm text-slate-500">
                  今回はポイントがもらえませんでした。
                  <br />
                  次はもう少しくわしく答えてみよう。
                </p>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <motion.span
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100"
                  >
                    <Coins className="h-5 w-5 text-amber-600" aria-hidden />
                  </motion.span>
                  <span className="text-4xl font-extrabold text-brand-600 tabular-nums">
                    +{finalDisplay}
                    <span className="ml-1 text-base font-semibold text-slate-400">pt</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* アドバイス・絵文字（最後に表示） */}
      <AnimatePresence>
        {stage >= 3 && (evaluation || feedback) && (
          <motion.div
            key="advice"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-5 space-y-3"
          >
            {evaluation && (
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.1 }}
                  className="text-3xl"
                >
                  {evaluation.emoji}
                </motion.span>
                <span className={`font-bold ${evaluation.color}`}>{evaluation.text}</span>
              </div>
            )}
            {feedback && (
              <div className="rounded-xl bg-brand-50 p-4 text-left">
                <h3 className="text-sm font-semibold text-brand-700">AIからのアドバイス</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{feedback}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
