'use client';

import Skeleton from '@/components/ui/Skeleton';
import { color } from '@/components/charts/primitives';

export interface TagCount {
  label: string; // 大学名・専攻名など
  count: number;
}

export function TagCloudSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

/** countに応じてフォントサイズ(px)を決める。最小14px〜最大36px。 */
function fontSizeFor(count: number, min: number, max: number): number {
  if (max === min) return 22;
  const ratio = (count - min) / (max - min);
  return Math.round(14 + ratio * 22);
}

export default function TagCloud({ tags }: { tags: TagCount[] }) {
  const counts = tags.map((t) => t.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">
        回答者属性（所属大学・専攻）
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {tags.map((tag, i) => (
          <span
            key={tag.label}
            style={{ fontSize: fontSizeFor(tag.count, min, max), color: color(i) }}
            className="font-bold leading-none"
            title={`${tag.count}件`}
          >
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  );
}
