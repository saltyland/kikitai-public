import type { SupabaseClient } from '@supabase/supabase-js';
import type { PointLot } from '@/lib/types/database';
import { throwDbError } from './dbError';

/** ポイントの束（有効期限つき）のDBアクセスを抽象化するインターフェース */
export interface IPointLotRepository {
  /** 期限内（available）の束だけを granted 昇順で取得する */
  listActive(userId: string): Promise<PointLot[]>;
  /** 束を1つ付与する。expiresInDays 日後に失効する。 */
  grant(userId: string, amount: number, reason: string, expiresInDays: number): Promise<void>;
  /** 指定理由の束をすべて削除する（ボーナス再計算で使う） */
  deleteByReason(userId: string, reason: string): Promise<void>;
}

export class PointLotRepository implements IPointLotRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listActive(userId: string): Promise<PointLot[]> {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('point_lots')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', nowIso)
      .order('granted_at', { ascending: true });
    if (error) throwDbError(error, 'point_lots');
    return (data ?? []) as PointLot[];
  }

  async grant(
    userId: string,
    amount: number,
    reason: string,
    expiresInDays: number
  ): Promise<void> {
    const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const { error } = await this.supabase.from('point_lots').insert({
      user_id: userId,
      amount,
      reason,
      expires_at: expires.toISOString(),
    });
    if (error) throwDbError(error, 'point_lots.insert');
  }

  async deleteByReason(userId: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from('point_lots')
      .delete()
      .eq('user_id', userId)
      .eq('reason', reason);
    if (error) throwDbError(error, 'point_lots.delete');
  }
}
