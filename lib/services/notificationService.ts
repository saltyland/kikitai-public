import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationRepository } from '@/lib/repositories/notificationRepository';
import type { AppNotification } from '@/lib/types/database';

/**
 * アプリ内通知のビジネスロジック。
 *
 * 発火点：
 *  - 目標回答数到達 → DB側 submit_survey_response 内の notify_user（トランザクション内）
 *  - ポイント失効14日前 → Cron（run_points_maintenance）内の notify_user
 *  - 残高不足での公開失敗 → notifyPointsLow（自分宛のためRLS insertで発行）
 */
export class NotificationService {
  private readonly repo: NotificationRepository;

  constructor(supabase: SupabaseClient) {
    this.repo = new NotificationRepository(supabase);
  }

  /** ヘッダーのベル表示用：最新の通知と未読数をまとめて返す */
  async getBellData(
    userId: string
  ): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      this.repo.listByUser(userId),
      this.repo.countUnread(userId),
    ]);
    return { notifications, unreadCount };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.markAllRead(userId);
  }

  /** 残高不足でアンケートを公開できなかったことを本人へ通知する */
  async notifyPointsLow(userId: string, requiredPoints?: string): Promise<void> {
    try {
      await this.repo.createForSelf(userId, {
        type: 'points_low',
        title: 'ポイントが不足しています',
        body:
          (requiredPoints ? `公開には ${requiredPoints}pt が必要です。` : '') +
          '他のアンケートに回答してポイントを貯めましょう。',
        link: '/surveys',
      });
    } catch (e) {
      // 通知は補助機能のため、失敗しても本処理（エラー表示）は妨げない
      console.error('[notification] points_low の発行に失敗:', e);
    }
  }
}
