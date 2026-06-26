'use client';

import { motion } from 'framer-motion';
import { LogoMark } from '@/components/Logo';

export type StepVisualKind = 'welcome' | 'swipe' | 'coin' | 'stars';

/** 各オンボーディングステップに対応するSVGミニアニメーション */
export default function StepVisual({ kind }: { kind: StepVisualKind }) {
  switch (kind) {
    case 'welcome':
      return <WelcomeVisual />;
    case 'swipe':
      return <SwipeVisual />;
    case 'coin':
      return <CoinVisual />;
    case 'stars':
      return <StarsVisual />;
  }
}

/** Step1: ロゴが拡大しながらフェードインする */
function WelcomeVisual() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      className="flex h-40 items-center justify-center"
    >
      <LogoMark className="h-20 w-20 text-brand-600" />
    </motion.div>
  );
}

/** Step2: ミニカードが右にスワイプして消え、次のカードが現れるデモ */
function SwipeVisual() {
  return (
    <div className="relative flex h-40 items-center justify-center overflow-hidden">
      <div className="absolute h-24 w-32 rounded-xl border border-slate-200 bg-white shadow-sm" />
      <motion.div
        className="absolute h-24 w-32 rounded-xl border border-brand-200 bg-brand-50 shadow-md"
        animate={{ x: [0, 0, 140], opacity: [1, 1, 0], rotate: [0, 0, 12] }}
        transition={{ duration: 1.6, repeat: Infinity, times: [0, 0.5, 1], ease: 'easeIn' }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <div className="h-2 w-16 rounded-full bg-brand-200" />
          <div className="h-2 w-10 rounded-full bg-brand-200" />
        </div>
      </motion.div>
    </div>
  );
}

/** Step3: コインがポイント残高に向かって飛んでいくアニメーション */
function CoinVisual() {
  return (
    <div className="relative flex h-40 items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-6 w-6 rounded-full bg-yellow-400 shadow"
          initial={{ x: -60, y: 30, opacity: 0 }}
          animate={{ x: 50, y: -30, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="h-12 w-12 rounded-full border-2 border-brand-300 bg-brand-50" />
    </div>
  );
}

/** Step4: 星が1つずつ点灯してAIスコアリングを表現する */
function StarsVisual() {
  return (
    <div className="flex h-40 items-center justify-center gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className="h-8 w-8"
          initial={{ opacity: 0.2, scale: 0.8 }}
          animate={{ opacity: [0.2, 1, 1], scale: [0.8, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
        >
          <path
            fill="#fbbf24"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
          />
        </motion.svg>
      ))}
    </div>
  );
}
