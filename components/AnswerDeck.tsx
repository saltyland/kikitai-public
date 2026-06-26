'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import Avatar from '@/components/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import { MiniQuestion } from '@/components/SurveyCard';
import { calcProgress } from '@/lib/ui/surveyStats';
import type { SurveyWithStats } from '@/lib/types/database';

type Action = 'answer' | 'skip';

const SWIPE_THRESHOLD = 110;

const exitVariants = {
  answer: { x: 380, opacity: 0, rotate: 16, transition: { duration: 0.28 } },
  skip: { x: -380, opacity: 0, rotate: -16, transition: { duration: 0.28 } },
};

/** カード中身（投稿者・タイトル・説明・設問プレビュー・回答状況） */
function DeckCardBody({ survey }: { survey: SurveyWithStats }) {
  const author = survey.author_nickname ?? '不明';
  const remaining = Math.max(0, survey.required_count - survey.response_count);
  const progress = calcProgress(survey.response_count, survey.required_count);
  const preview = (survey.preview ?? []).slice(0, 3);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px]">
      {/* ヘッダー帯（やわらかいブランドグラデで奥行きを出す） */}
      <div className="relative bg-gradient-to-br from-brand-50 via-white to-brand-100/50 px-6 pt-6 pb-4">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-200/40 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <Avatar name={author} src={survey.author_avatar_url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">{author}</p>
            <p className="truncate text-xs text-slate-500">
              残り {remaining}枠
              {survey.deadline && ` ・期限 ${survey.deadline}`}
            </p>
          </div>
          {survey.avg_reward_points != null && (
            <span className="ml-auto shrink-0 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold text-white shadow-sm">
              +{survey.avg_reward_points}pt
            </span>
          )}
        </div>
        <h3 className="relative mt-4 line-clamp-2 select-none text-lg font-bold leading-snug text-slate-900">
          {survey.title}
        </h3>
        {survey.description && (
          <p className="relative mt-1 line-clamp-2 select-none text-sm text-slate-500">
            {survey.description}
          </p>
        )}
      </div>

      {/* 設問プレビュー（下を見切れさせて「もっとある」感） */}
      <div className="relative flex-1 px-6 pt-4">
        {preview.length > 0 ? (
          <>
            <div className="space-y-3">
              {preview.map((q, i) => (
                <MiniQuestion key={i} q={q} index={i} />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            設問プレビューはありません
          </div>
        )}
      </div>

      {/* 回答状況 */}
      <div className="px-6 pb-5 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            回答 {survey.response_count} / {survey.required_count}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar progress={progress} />
        </div>
      </div>
    </div>
  );
}

/** 一番上の操作可能なカード（ドラッグ＋スワイプラベル付き） */
function TopCard({
  survey,
  onAction,
  exitAction,
}: {
  survey: SurveyWithStats;
  onAction: (action: Action) => void;
  exitAction: Action;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const answerOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex: 30 }}
      initial={false}
      animate={{ scale: 1, y: 0 }}
      exit={exitVariants[exitAction]}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_: unknown, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) onAction('answer');
        else if (info.offset.x < -SWIPE_THRESHOLD) onAction('skip');
      }}
    >
      <div className="h-full w-full rounded-[28px] bg-white ring-1 ring-slate-900/5 shadow-[0_30px_60px_-18px_rgba(15,23,42,0.35)]">
        <DeckCardBody survey={survey} />
      </div>
      {/* スワイプ中のラベル */}
      <motion.div
        style={{ opacity: answerOpacity }}
        className="pointer-events-none absolute left-6 top-6 rotate-[-10deg] rounded-xl border-[3px] border-brand-500 bg-white/80 px-3 py-1 text-lg font-extrabold text-brand-600 backdrop-blur"
      >
        回答する
      </motion.div>
      <motion.div
        style={{ opacity: skipOpacity }}
        className="pointer-events-none absolute right-6 top-6 rotate-[10deg] rounded-xl border-[3px] border-slate-400 bg-white/80 px-3 py-1 text-lg font-extrabold text-slate-500 backdrop-blur"
      >
        スキップ
      </motion.div>
    </motion.div>
  );
}

/** 背後に重ねる装飾用カード（立体的な束に見せる） */
function StackCard({ depth }: { depth: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-[28px] bg-white ring-1 ring-slate-900/5 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.3)]"
      style={{
        transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.045})`,
        zIndex: 30 - depth,
        opacity: 1 - depth * 0.15,
      }}
    />
  );
}

export default function AnswerDeck({ surveys }: { surveys: SurveyWithStats[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState<Action | null>(null);

  const total = surveys.length;
  const current = surveys[index];
  // 背後に見せる束の枚数（最大2枚）
  const behind = useMemo(
    () => Math.min(2, Math.max(0, total - index - 1)),
    [total, index],
  );

  function handleAction(action: Action) {
    if (!current) return;
    if (action === 'answer') {
      router.push(`/surveys/${current.id}`);
      return;
    }
    // スキップ：退場アニメ後に次のカードへ
    setExiting('skip');
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExiting(null);
    }, 280);
  }

  if (total === 0) {
    return (
      <div className="card-3d flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">
          いま回答できるアンケートはありません
        </p>
        <p className="text-xs text-slate-400">
          新しいアンケートが届くまでお待ちください
        </p>
      </div>
    );
  }

  if (!current) {
    // 全部見終わった
    return (
      <div className="card-3d flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-700">
          今日のアンケートは以上です 🎉
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIndex(0)}
            className="btn-3d px-5 py-2 text-sm"
          >
            もう一度見る
          </button>
          <Link href="/surveys" className="btn-3d btn-3d-primary px-5 py-2 text-sm">
            一覧で探す
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* 残り枚数 */}
      <div className="flex w-full max-w-sm items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-400">
          残り {total - index} 件
        </span>
        <Link href="/surveys" className="text-xs font-medium text-brand-600 hover:underline">
          一覧で見る
        </Link>
      </div>

      {/* カードの束 */}
      <div className="relative h-[460px] w-full max-w-sm">
        {Array.from({ length: behind }).map((_, i) => (
          <StackCard key={`stack-${index}-${i}`} depth={i + 1} />
        ))}
        <AnimatePresence>
          <TopCard
            key={current.id}
            survey={current}
            exitAction={exiting ?? 'skip'}
            onAction={handleAction}
          />
        </AnimatePresence>
      </div>

      {/* 操作ボタン */}
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => handleAction('skip')}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_10px_25px_-8px_rgba(15,23,42,0.4)] ring-1 ring-slate-100 transition hover:scale-110 hover:text-slate-600"
          aria-label="スキップ"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleAction('answer')}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_12px_30px_-8px_rgba(13,148,136,0.7)] transition hover:scale-110 hover:bg-brand-700"
          aria-label="回答する"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 6" />
          </svg>
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        ← スキップ ・ 回答する → ／ ドラッグでも操作できます
      </p>
    </div>
  );
}
