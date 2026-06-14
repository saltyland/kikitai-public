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
