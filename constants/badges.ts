import { Award, BookOpen, CalendarCheck2, Flame, Sparkles, Star, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** バッジ判定の対象となるユーザー統計。 */
export interface BadgeStats {
  responseCount: number;
  surveyCount: number;
  /** AI品質評価の最高スコア（5点満点）。 */
  bestQualityScore: number;
  /** 連続ログイン日数。 */
  loginStreakDays: number;
}

export interface BadgeDefinition {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** 統計から獲得済みかどうかを判定する。 */
  isEarned: (stats: BadgeStats) => boolean;
}

export const BADGES: BadgeDefinition[] = [
  {
    key: 'first_response',
    label: '初回回答',
    description: '初めてアンケートに回答した',
    icon: Star,
    isEarned: (s) => s.responseCount >= 1,
  },
  {
    key: 'response_10',
    label: '10回回答',
    description: 'アンケートに10回回答した',
    icon: Award,
    isEarned: (s) => s.responseCount >= 10,
  },
  {
    key: 'response_50',
    label: '50回回答',
    description: 'アンケートに50回回答した',
    icon: Trophy,
    isEarned: (s) => s.responseCount >= 50,
  },
  {
    key: 'response_100',
    label: '100回回答',
    description: 'アンケートに100回回答した',
    icon: Sparkles,
    isEarned: (s) => s.responseCount >= 100,
  },
  {
    key: 'first_survey',
    label: '初めてのアンケート投稿',
    description: '初めて自分のアンケートを投稿した',
    icon: BookOpen,
    isEarned: (s) => s.surveyCount >= 1,
  },
  {
    key: 'high_quality',
    label: 'AI高評価アンケート',
    description: 'AI品質評価でスコア4.5以上を獲得した',
    icon: Sparkles,
    isEarned: (s) => s.bestQualityScore >= 4.5,
  },
  {
    key: 'streak_7',
    label: '7日連続ログイン',
    description: '7日連続でログインした',
    icon: Flame,
    isEarned: (s) => s.loginStreakDays >= 7,
  },
  {
    key: 'streak_30',
    label: '30日連続ログイン',
    description: '30日連続でログインした',
    icon: CalendarCheck2,
    isEarned: (s) => s.loginStreakDays >= 30,
  },
];
