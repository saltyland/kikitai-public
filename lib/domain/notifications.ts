import type { NotificationSettings, NotificationType } from '@/lib/types/database';

/**
 * 通知種別が有効かどうかを判定する。
 * notification_settings にキーが存在しない場合は「ON（通知する）」が
 * デフォルト挙動（DBの初期値 '{}' は全種別ONを意味する）。
 */
export function isNotificationEnabled(
  settings: NotificationSettings | null | undefined,
  type: NotificationType
): boolean {
  const value = settings?.[type];
  return value !== false;
}

/** /profile の通知設定タブでON/OFFを切り替え可能な通知種別とラベル */
export const TOGGLEABLE_NOTIFICATION_TYPES: { type: NotificationType; label: string }[] = [
  { type: 'followed_user_survey_published', label: 'フォロー中のユーザーがアンケートを公開したとき' },
  { type: 'followed_topic_digest', label: 'フォロー中のトピックに新着アンケートがあるとき（1日1回）' },
];
