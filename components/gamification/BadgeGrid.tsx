'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { BADGES, type BadgeStats } from '@/constants/badges';

export interface BadgeGridProps {
  stats: BadgeStats;
  /** バッジkey → 獲得日時（ISO文字列）。未獲得のバッジはここに含まれない。 */
  earnedAt?: Record<string, string>;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ja-JP');

/** プロフィール画面に表示するバッジ一覧。未獲得はグレーアウト＋ロック表示。 */
export default function BadgeGrid({ stats, earnedAt }: BadgeGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BADGES.map((badge) => {
        const earned = badge.isEarned(stats);
        const Icon = badge.icon;
        const date = earnedAt?.[badge.key];

        return (
          <div
            key={badge.key}
            className="relative"
            onMouseEnter={() => setHovered(badge.key)}
            onMouseLeave={() => setHovered((k) => (k === badge.key ? null : k))}
          >
            <div
              className={
                earned
                  ? 'card-3d flex flex-col items-center gap-2 rounded-xl bg-white p-3 text-center'
                  : 'flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center opacity-60'
              }
            >
              <div
                className={
                  earned
                    ? 'flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600'
                    : 'flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400'
                }
              >
                {earned ? <Icon className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
              </div>
              <p className="text-xs font-semibold text-slate-700">{badge.label}</p>
            </div>

            {earned && hovered === badge.key && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-center text-xs text-white shadow-lg">
                <p>{badge.description}</p>
                {date && <p className="mt-1 text-slate-300">{fmtDate(date)}獲得</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
