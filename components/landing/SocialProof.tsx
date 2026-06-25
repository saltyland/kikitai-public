'use client';

import { useCountUp } from '@/hooks/useCountUp';

/** 表示する実績統計（ダミーデータ） */
const STATS = [
  { end: 47, suffix: '大学', label: '参加大学数' },
  { end: 12840, suffix: '件', label: '累計回答数' },
  { end: 238, suffix: '件', label: '今週投稿されたアンケート' },
  { end: 4.2, suffix: '分', label: '平均回答時間', decimals: 1 },
];

function StatCard({
  end,
  suffix,
  label,
  decimals = 0,
}: {
  end: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  const { ref, value } = useCountUp({ end, duration: 1500 });
  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <p className="text-3xl font-black text-brand-600 sm:text-4xl">
        {display}
        <span className="ml-1 text-lg font-bold text-brand-500">{suffix}</span>
      </p>
      <p className="mt-1.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

/**
 * プラットフォームの実績数値をカウントアップで見せる社会的証明セクション。
 * ビューポートに入った瞬間にカウントアップが始まる。
 */
export default function SocialProof() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="card-3d grid grid-cols-2 gap-8 p-8 sm:grid-cols-4 sm:gap-6">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  );
}
