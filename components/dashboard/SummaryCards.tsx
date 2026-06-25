'use client';

import { useEffect, useState } from 'react';
import Skeleton from '@/components/ui/Skeleton';

export interface SummaryData {
  totalResponses: number;
  avgMinutes: number;
  spentPoints: number;
  remainingPoints: number;
  pointsCapacity: number; // 残ポイントゲージの上限
}

/** 数値が0から目標値までカウントアップするだけの簡易フック */
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <p className="text-sm text-slate-400 dark:text-slate-500">{label}</p>
      <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{children}</div>
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export default function SummaryCards({ data }: { data: SummaryData }) {
  const responses = useCountUp(data.totalResponses);
  const gaugePct = data.pointsCapacity > 0
    ? Math.min(100, Math.round((data.remainingPoints / data.pointsCapacity) * 100))
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="総回答数">{responses.toLocaleString()}</Card>
      <Card label="平均回答時間">{data.avgMinutes.toFixed(1)}分</Card>
      <Card label="消費ポイント合計">{data.spentPoints.toLocaleString()}pt</Card>
      <Card label="残ポイント">
        {data.remainingPoints.toLocaleString()}pt
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${gaugePct}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
