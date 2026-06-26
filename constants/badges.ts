/** バッジの定義（BadgeGrid で使用） */
export type BadgeId =
  | 'first_answer'
  | 'answer_10'
  | 'answer_50'
  | 'answer_100'
  | 'first_survey'
  | 'ai_high_score_survey'
  | 'streak_7'
  | 'streak_30';

export interface BadgeDefinition {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_answer', label: '初回回答', description: 'はじめてアンケートに回答した', icon: '🎯' },
  { id: 'answer_10', label: '10回回答', description: 'アンケートに10回回答した', icon: '🔟' },
  { id: 'answer_50', label: '50回回答', description: 'アンケートに50回回答した', icon: '🏅' },
  { id: 'answer_100', label: '100回回答', description: 'アンケートに100回回答した', icon: '🏆' },
  { id: 'first_survey', label: '初めてのアンケート投稿', description: 'はじめて自分のアンケートを投稿した', icon: '📝' },
  {
    id: 'ai_high_score_survey',
    label: 'AI高評価アンケート',
    description: 'AI評価スコア4.5以上のアンケートを投稿した',
    icon: '✨',
  },
  { id: 'streak_7', label: '7日連続ログイン', description: '7日連続でログインした', icon: '🔥' },
  { id: 'streak_30', label: '30日連続ログイン', description: '30日連続でログインした', icon: '🌟' },
];

/** ユーザーが獲得済みのバッジ（id と獲得日時） */
export interface EarnedBadge {
  id: BadgeId;
  earnedAt: string;
}
