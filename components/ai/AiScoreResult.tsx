'use client';

import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { AlertTriangle, Star, Clock, Target, FileText } from 'lucide-react';
import ScoreRing from './ScoreRing';
import SuggestionAccordion from './SuggestionAccordion';

export interface AiScoreData {
  /** 総合スコア（0〜100） */
  totalScore: number;
  /** 設問の明確さ（0〜5） */
  clarity: number;
  /** 対象者の具体性（0〜5） */
  targetSpecificity: number;
  /** 想定回答時間（分） */
  estimatedMinutes: number;
  /** バイアスリスク */
  biasRisk: 'low' | 'medium' | 'high';
  /** 必要ポイントコスト */
  pointCost: number;
  /** AIからの改善提案 */
  suggestions: string[];
}

interface Props {
  data: AiScoreData;
  /** 評価中表示の最低表示時間（ms）。本物の評価が速く終わっても演出として待つ */
  minLoadingMs?: number;
  onApplySuggestion?: (suggestion: string, index: number) => void;
}

const LOADING_MESSAGES = ['AIが評価中…', '設問の明確さを確認中…', 'バイアスをチェック中…'];

/** アンケート投稿直後に表示するAI評価結果。評価中→staggered表示の2フェーズ構成 */
export default function AiScoreResult({ data, minLoadingMs = 1800, onApplySuggestion }: Props) {
  const [phase, setPhase] = useState<'loading' | 'result'>('loading');
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setPhase('result'), minLoadingMs);
    const blink = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 700);
    return () => {
      clearTimeout(timer);
      clearInterval(blink);
    };
  }, [minLoadingMs]);

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-slate-500"
        >
          {LOADING_MESSAGES[messageIndex]}
        </motion.p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      className="flex flex-col gap-5 rounded-3xl border border-brand-200/70 bg-gradient-to-br from-white via-white to-brand-50/70 p-5 shadow-[0_26px_70px_-48px_rgba(7,27,43,.7)] sm:p-7"
    >
      <Section>
        <ScoreRing score={data.totalScore} />
      </Section>

      {data.biasRisk === 'high' && (
        <Section>
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={18} className="shrink-0" />
            <span>バイアスリスクが高いと判定されました。設問の言い回しを見直すことをおすすめします。</span>
          </div>
        </Section>
      )}

      <Section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<FileText size={16} />} label="設問の明確さ">
            <StarRating value={data.clarity} />
          </Metric>
          <Metric icon={<Target size={16} />} label="対象者の具体性">
            <StarRating value={data.targetSpecificity} />
          </Metric>
          <Metric icon={<Clock size={16} />} label="想定回答時間">
            <span className="text-sm font-semibold text-slate-700">{data.estimatedMinutes}分</span>
          </Metric>
          <Metric icon={<AlertTriangle size={16} />} label="バイアスリスク">
            <BiasBadge risk={data.biasRisk} />
          </Metric>
        </div>
      </Section>

      <Section>
        <div className="flex items-center justify-between rounded-2xl bg-[#071b2b] px-5 py-4 text-white shadow-lg">
          <span className="text-sm text-white/60">必要ポイントコスト</span>
          <span className="text-xl font-extrabold text-[#d9ff72]">
            <PointCostCountUp value={data.pointCost} />pt
          </span>
        </div>
      </Section>

      {data.suggestions.length > 0 && (
        <Section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">改善提案</h3>
          <SuggestionAccordion suggestions={data.suggestions} onApply={onApplySuggestion} />
        </Section>
      )}
    </motion.div>
  );
}

/** stagger対象の1セクション。下からスライドインしつつフェードする */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function Metric({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <span className="flex items-center gap-1 text-xs text-slate-400">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

/** 星をひとつずつ順番に点灯させる評価表示（0.08秒間隔） */
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08, duration: 0.2 }}
        >
          <Star
            size={14}
            className={i < value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}
          />
        </motion.span>
      ))}
    </div>
  );
}

function BiasBadge({ risk }: { risk: AiScoreData['biasRisk'] }) {
  const styles: Record<AiScoreData['biasRisk'], string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };
  const labels: Record<AiScoreData['biasRisk'], string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return (
    <span className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium ${styles[risk]}`}>
      {labels[risk]}
    </span>
  );
}

/** ポイントコストのカウントアップ表示（easeOutQuint） */
function PointCostCountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  return <>{display}</>;
}
