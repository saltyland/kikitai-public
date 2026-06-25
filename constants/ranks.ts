import { Award, Crown, Gem, Medal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** ポイント保有量に応じたランク定義（昇順）。 */
export interface RankDefinition {
  key: 'bronze' | 'silver' | 'gold' | 'platinum';
  label: string;
  min: number;
  /** このランクの上限（次ランクの開始点）。プラチナは上限なし（null）。 */
  max: number | null;
  icon: LucideIcon;
  /** プログレスバー・アイコンに使う色クラス（Tailwind）。 */
  colorClass: string;
}

export const RANKS: RankDefinition[] = [
  { key: 'bronze', label: 'ブロンズ', min: 0, max: 100, icon: Medal, colorClass: 'text-amber-700' },
  { key: 'silver', label: 'シルバー', min: 100, max: 300, icon: Award, colorClass: 'text-slate-400' },
  { key: 'gold', label: 'ゴールド', min: 300, max: 700, icon: Crown, colorClass: 'text-yellow-500' },
  { key: 'platinum', label: 'プラチナ', min: 700, max: null, icon: Gem, colorClass: 'text-cyan-500' },
];

/** 保有ポイントから現在のランクを返す。 */
export function getRankForPoints(points: number): RankDefinition {
  return RANKS.find((r) => points >= r.min && (r.max === null || points < r.max)) ?? RANKS[0];
}

/** 次のランクを返す（プラチナの場合は null）。 */
export function getNextRank(points: number): RankDefinition | null {
  const current = getRankForPoints(points);
  const idx = RANKS.findIndex((r) => r.key === current.key);
  return RANKS[idx + 1] ?? null;
}

/** 現在ランク内での進捗率（0〜1）。プラチナは常に1。 */
export function getRankProgress(points: number): number {
  const current = getRankForPoints(points);
  if (current.max === null) return 1;
  return Math.min(1, Math.max(0, (points - current.min) / (current.max - current.min)));
}
