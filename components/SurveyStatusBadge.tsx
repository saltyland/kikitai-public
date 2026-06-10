import type { SurveyStatus } from '@/lib/types/database';

const MAP: Record<SurveyStatus, { label: string; className: string }> = {
  draft: { label: '下書き', className: 'bg-zinc-100 text-zinc-600' },
  open: { label: '公開中', className: 'bg-green-100 text-green-700' },
  closed: { label: '終了', className: 'bg-amber-100 text-amber-700' },
};

export function SurveyStatusBadge({ status }: { status: SurveyStatus }) {
  const { label, className } = MAP[status];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
