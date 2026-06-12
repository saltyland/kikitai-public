/**
 * 信頼スコアのバッジ表示。スコア帯ごとにラベルと配色を変える。
 * 閾値は TRUST_TIERS で一元管理（変更はこの配列だけでよい）。
 */
const TRUST_TIERS = [
  { min: 90, label: '高信頼', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  { min: 70, label: '信頼', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  { min: 50, label: '標準', className: 'bg-brand-50 text-brand-700 border-brand-100' },
  { min: 0, label: '要注意', className: 'bg-red-50 text-red-600 border-red-100' },
] as const;

export function trustTier(score: number) {
  return TRUST_TIERS.find((t) => score >= t.min) ?? TRUST_TIERS[TRUST_TIERS.length - 1];
}

export default function TrustBadge({ score }: { score: number }) {
  const tier = trustTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tier.className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"
        />
      </svg>
      {tier.label}（{score}）
    </span>
  );
}
