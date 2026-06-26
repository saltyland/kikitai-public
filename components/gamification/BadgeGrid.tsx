'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { BADGES, type EarnedBadge } from '@/constants/badges';

export interface BadgeGridProps {
  /** ユーザーが獲得済みのバッジ一覧 */
  earnedBadges: EarnedBadge[];
}

/** プロフィール画面に表示するバッジ一覧。未獲得バッジはグレーアウト＋ロックアイコン表示する */
export default function BadgeGrid({ earnedBadges }: BadgeGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const earnedMap = new Map(earnedBadges.map((b) => [b.id, b.earnedAt]));

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {BADGES.map((badge) => {
        const earnedAt = earnedMap.get(badge.id);
        const isEarned = earnedAt !== undefined;

        return (
          <div
            key={badge.id}
            className="relative flex flex-col items-center gap-1"
            onMouseEnter={() => setHoveredId(badge.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                isEarned ? 'bg-amber-100' : 'bg-slate-100 opacity-50'
              }`}
            >
              {badge.icon}
              {!isEarned && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-white">
                  <Lock size={12} />
                </span>
              )}
            </div>
            <p className="text-center text-[11px] font-medium text-slate-600">{badge.label}</p>

            {hoveredId === badge.id && (
              <div className="absolute bottom-full z-10 mb-2 w-40 rounded-lg bg-slate-800 px-3 py-2 text-center text-xs text-white shadow-lg">
                <p className="font-bold">{badge.label}</p>
                <p className="mt-1 text-slate-300">{badge.description}</p>
                {isEarned && (
                  <p className="mt-1 text-slate-400">
                    {new Date(earnedAt).toLocaleDateString('ja-JP')} 獲得
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
