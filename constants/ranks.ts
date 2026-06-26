/** ポイントランクの定義（PointGauge で使用） */
export type RankId = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface RankDefinition {
  id: RankId;
  label: string;
  icon: string;
  /** このランクに入るのに必要な最小ポイント */
  min: number;
  /** 次のランクへの境界（最高ランクは null） */
  max: number | null;
}

export const RANKS: RankDefinition[] = [
  { id: 'bronze', label: 'ブロンズ', icon: '🥉', min: 0, max: 100 },
  { id: 'silver', label: 'シルバー', icon: '🥈', min: 100, max: 300 },
  { id: 'gold', label: 'ゴールド', icon: '🥇', min: 300, max: 700 },
  { id: 'platinum', label: 'プラチナ', icon: '💎', min: 700, max: null },
];

/** ポイント数から現在のランク定義を取得する */
export function getRankByPoints(points: number): RankDefinition {
  return RANKS.find((rank) => rank.max === null || points < rank.max) ?? RANKS[RANKS.length - 1];
}

/** 次のランクへの進捗率（0〜100）。最高ランクの場合は100を返す */
export function getRankProgress(points: number): number {
  const current = getRankByPoints(points);
  if (current.max === null) return 100;
  const span = current.max - current.min;
  return Math.min(100, Math.max(0, ((points - current.min) / span) * 100));
}

/** 次のランクまでの残りポイント。最高ランクの場合は null */
export function getPointsToNextRank(points: number): number | null {
  const current = getRankByPoints(points);
  if (current.max === null) return null;
  return Math.max(0, current.max - points);
}

/** 現在のランクの次のランク定義（最高ランクの場合は null） */
export function getNextRank(points: number): RankDefinition | null {
  const current = getRankByPoints(points);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  return RANKS[idx + 1] ?? null;
}
