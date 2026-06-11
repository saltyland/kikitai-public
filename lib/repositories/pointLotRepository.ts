import type { SupabaseClient } from '@supabase/supabase-js';
import type { PointLot } from '@/lib/types/database';
import { throwDbError, throwRpcError } from './dbError';

/** ポイントの束（有効期限つき）のDBアクセスを抽象化するインターフェース */
export interface IPointLotRepository {
  /** 期限内（available）の束だけを granted 昇順で取得する */
  listActive(userId: string): Promise<PointLot[]>;
  /** 束を1つ付与する。expiresInDays 日後に失効する。 */
  grant(userId: string, amount: number, reason: string, expiresInDays: number): Promise<void>;
  /**
   * ポイントを消費する。RPC（consume_points）が granted_at 昇順のFIFOで
   * 行ロックしながら束を分割／削除し、残高不足時は BusinessRuleError
   * （INSUFFICIENT_POINTS）で全体をロールバックする。
   */
  consume(userId: string, amount: number): Promise<void>;
  /** 指定理由の束をすべて削除する（ボーナス再計算で使う） */
  deleteByReason(userId: string, reason: string): Promise<void>;
  /** profiles.points キャッシュを期限内合計に同期する（DB側で1文・アトミック） */
  syncBalance(userId: string): Promise<void>;
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

  async consume(userId: string, amount: number): Promise<void> {
    const { error } = await this.supabase.rpc('consume_points', {
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) throwRpcError(error, 'consume_points');
  }

  async syncBalance(userId: string): Promise<void> {
    const { error } = await this.supabase.rpc('sync_points_balance', {
      p_user_id: userId,
    });
    if (error) throwRpcError(error, 'sync_points_balance');
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
