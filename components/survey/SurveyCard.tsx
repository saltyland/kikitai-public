'use client';

/** スワイプデッキで使う1枚分のアンケートカード（見た目のみ・操作は親が制御） */
export interface SurveyCardData {
  id: string;
  title: string;
  author: string;
  university: string;
  estimatedMinutes: number;
  pointReward: number;
  aiScore: number; // 0〜5
  tags: string[];
  deadline: Date;
}

function StarRating({ score }: { score: number }) {
  const full = Math.round(score);
  return (
    <div className="flex items-center gap-0.5" aria-label={`AI評価 ${score} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? 'text-amber-400' : 'text-slate-200'}>
          ★
        </span>
      ))}
    </div>
  );
}

function formatDeadline(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}まで`;
}

export default function SurveyCard({ survey }: { survey: SurveyCardData }) {
  return (
    <div className="flex h-full w-full select-none flex-col rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
      {/* 上部：タイトル + 大学名 */}
      <div>
        <p className="line-clamp-2 text-lg font-bold text-slate-800">{survey.title}</p>
        <p className="mt-1 text-sm text-slate-400">{survey.university}・{survey.author}</p>
      </div>

      {/* 中部：タグ */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {survey.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex-1" />

      {/* 下部：ポイント・時間・AIスコア */}
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">獲得ポイント</span>
          <span className="text-xl font-bold text-amber-500">+{survey.pointReward}pt</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>想定時間 {survey.estimatedMinutes}分</span>
          <StarRating score={survey.aiScore} />
        </div>
        <p className="text-right text-xs text-slate-400">{formatDeadline(survey.deadline)}</p>
      </div>
    </div>
  );
}
