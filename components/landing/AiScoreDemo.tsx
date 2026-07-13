'use client';

import { useEffect, useState } from 'react';

const SAMPLE_PLACEHOLDER =
  '例：「大学生の朝食習慣について」\nQ1. 平日の朝食を食べる頻度を教えてください\nQ2. 朝食を食べない理由を教えてください';

/** モックの評価結果（実際のAI呼び出しは行わない） */
const MOCK_RESULT = {
  clarity: 4,
  specificity: 3,
  estimatedMinutes: 3,
  points: 30,
};

/** 星評価をひとつずつ順番に表示するコンポーネント */
function StarRating({ score, max = 5, show }: { score: number; max?: number; show: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`text-lg transition-all duration-300 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          } ${i < score ? 'text-amber-400' : 'text-slate-200'}`}
          style={{ transitionDelay: `${i * 120}ms` }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * AIスコアリングのライブデモ。
 * テキストを入力して「AI評価する」を押すと、ローディング演出のあと
 * モックの評価結果（星評価・想定回答時間・推奨ポイント）が表示される。
 */
export default function AiScoreDemo() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [points, setPoints] = useState(0);

  const handleEvaluate = () => {
    setShowResult(false);
    setPoints(0);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowResult(true);
    }, 1500);
  };

  useEffect(() => {
    if (!showResult) return;
    const target = MOCK_RESULT.points;
    const duration = 800;
    const startTime = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setPoints(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [showResult]);

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">AIスコアリングを体験する</h2>
      <p className="mt-4 max-w-[48ch] text-base leading-7 text-slate-700">
        アンケートの設問を入力すると、AIが質を評価してポイントコストを自動で算出します。
      </p>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="card-3d flex flex-col p-6">
          <label htmlFor="ai-score-demo-input" className="text-sm font-bold text-slate-700">
            アンケートの設問
          </label>
          <textarea
            id="ai-score-demo-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={SAMPLE_PLACEHOLDER}
            rows={8}
            className="mt-3 w-full flex-1 resize-none rounded-xl border border-slate-200 p-3.5 text-sm leading-relaxed text-slate-700 outline-none focus:border-brand-400"
          />
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={loading}
            className="btn-3d mt-4 bg-brand-500 px-5 py-3 text-sm text-white disabled:opacity-60"
          >
            {loading ? 'AI評価中…' : 'AI評価する'}
          </button>
        </div>

        <div className="card-3d relative flex min-h-[280px] flex-col p-6">
          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
              <p className="text-sm font-bold text-brand-600">AI評価中…</p>
            </div>
          )}

          {!loading && !showResult && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              評価結果がここに表示されます
            </div>
          )}

          {!loading && showResult && (
            <div className="animate-fade-in-up space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">設問の明確さ</span>
                <StarRating score={MOCK_RESULT.clarity} show={showResult} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">対象者の具体性</span>
                <StarRating score={MOCK_RESULT.specificity} show={showResult} />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-700">想定回答時間</span>
                <span className="text-sm font-bold text-slate-900">約{MOCK_RESULT.estimatedMinutes}分</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                <span className="text-sm font-bold text-brand-700">推奨ポイントコスト</span>
                <span className="text-2xl font-black text-brand-600">{points}pt</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
