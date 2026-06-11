import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppNotification } from '@/lib/types/database';
import { throwDbError } from './dbError';

/** アプリ内通知のDBアクセスを抽象化するインターフェース */
export interface INotificationRepository {
  /** 自分宛の通知を新しい順に取得する */
  listByUser(userId: string, limit?: number): Promise<AppNotification[]>;
  /** 未読件数 */
  countUnread(userId: string): Promise<number>;
  /** すべて既読にする */
  markAllRead(userId: string): Promise<void>;
  /**
   * 自分宛の通知を作成する（RLS：user_id = auth.uid() のみ許可）。
   * 他人宛の通知はDB関数 notify_user（SECURITY DEFINER）経由でのみ発行される。
   */
  createForSelf(
    userId: string,
    n: Pick<AppNotification, 'type' | 'title' | 'body' | 'link'>
  ): Promise<void>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByUser(userId: string, limit = 20): Promise<AppNotification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throwDbError(error, 'notifications');
    return (data ?? []) as AppNotification[];
  }

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throwDbError(error, 'notifications');
    return count ?? 0;
  }

  async markAllRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throwDbError(error, 'notifications.markAllRead');
  }

  async createForSelf(
    userId: string,
    n: Pick<AppNotification, 'type' | 'title' | 'body' | 'link'>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .insert({ user_id: userId, ...n });
    if (error) throwDbError(error, 'notifications.insert');
  }
}
