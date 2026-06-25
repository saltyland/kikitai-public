'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Skeleton from '@/components/ui/Skeleton';

export interface DailyResponse {
  date: string; // 'MM/DD'
  count: number;
}

export function ResponseChartSkeleton() {
  return <Skeleton className="h-72 w-full" />;
}

export default function ResponseChart({ data }: { data: DailyResponse[] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">
        過去30日間の日次回答数
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="responseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26a69a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#26a69a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#26a69a"
            strokeWidth={2}
            fill="url(#responseFill)"
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
