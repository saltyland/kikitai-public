'use client';

import { useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import SurveyCard, { type SurveyCardData } from './SurveyCard';

export type SwipeAction = 'answer' | 'skip' | 'later';

const SWIPE_THRESHOLD = 100;
const SKIP_COST = 5;

/** ドラッグ中に表示する「回答する/スキップ」のラベル */
function SwipeLabel({ x }: { x: ReturnType<typeof useMotionValue<number>> }) {
  const answerOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);

  return (
    <>
      <motion.div
        style={{ opacity: answerOpacity }}
        className="pointer-events-none absolute right-6 top-6 rotate-[-12deg] rounded-lg border-2 border-green-500 px-3 py-1 text-lg font-bold text-green-500"
      >
        回答する
      </motion.div>
      <motion.div
        style={{ opacity: skipOpacity }}
        className="pointer-events-none absolute left-6 top-6 rotate-[12deg] rounded-lg border-2 border-red-500 px-3 py-1 text-lg font-bold text-red-500"
      >
        スキップ
      </motion.div>
    </>
  );
}

const exitVariants = {
  answer: { x: 400, opacity: 0, rotate: 20 },
  skip: { x: -400, opacity: 0, rotate: -20 },
  later: { y: -400, opacity: 0 },
};

function SwipeableCard({
  survey,
  onSwipe,
  isTop,
  index,
  exitAction,
}: {
  survey: SurveyCardData;
  onSwipe: (action: SwipeAction) => void;
  isTop: boolean;
  index: number;
  exitAction: SwipeAction;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - index,
      }}
      initial={false}
      animate={{
        scale: 1 - index * 0.05,
        y: index * 10,
        opacity: index === 0 ? 1 : 1 - index * 0.25,
      }}
      exit={exitVariants[exitAction]}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragEnd={(_: unknown, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
          onSwipe('answer');
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
          onSwipe('skip');
        } else if (info.offset.y < -SWIPE_THRESHOLD) {
          onSwipe('later');
        }
      }}
    >
      <SurveyCard survey={survey} />
      {isTop && <SwipeLabel x={x} />}
    </motion.div>
  );
}

export default function SurveyCardDeck({
  surveys,
  onAction,
}: {
  surveys: SurveyCardData[];
  onAction?: (surveyId: string, action: SwipeAction) => void;
}) {
  const [exiting, setExiting] = useState<{ id: string; action: SwipeAction } | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = surveys.filter((s) => !removed.has(s.id)).slice(0, 3);

  function handleSwipe(survey: SurveyCardData, action: SwipeAction) {
    setExiting({ id: survey.id, action });
    onAction?.(survey.id, action);
    if (action === 'skip') {
      setSkipped((prev) => [...prev, survey.id]);
    }
    setTimeout(() => {
      setRemoved((prev) => new Set(prev).add(survey.id));
      setExiting(null);
    }, 300);
  }

  if (visible.length === 0) {
    return (
      <div className="flex h-[420px] w-full max-w-sm flex-col items-center justify-center rounded-3xl bg-slate-50 text-slate-400">
        <p>今日のアンケートは以上です</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[420px] w-full max-w-sm">
        <AnimatePresence>
          {visible.map((survey, index) => (
            <SwipeableCard
              key={survey.id}
              survey={survey}
              index={index}
              isTop={index === 0}
              exitAction={exiting?.id === survey.id ? exiting.action : 'skip'}
              onSwipe={(action) => handleSwipe(survey, action)}
            />
          ))}
        </AnimatePresence>
      </div>

      {skipped.length > 0 && (
        <p className="text-xs text-slate-400">
          スキップで {skipped.length * SKIP_COST}pt 消費しました
        </p>
      )}

      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => handleSwipe(visible[0], 'skip')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-red-500 shadow-md ring-1 ring-slate-100 transition hover:scale-105"
          aria-label="スキップ"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => handleSwipe(visible[0], 'later')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-amber-500 shadow-md ring-1 ring-slate-100 transition hover:scale-105"
          aria-label="後で回答"
        >
          ★
        </button>
        <button
          type="button"
          onClick={() => handleSwipe(visible[0], 'answer')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition hover:scale-105"
          aria-label="回答する"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
