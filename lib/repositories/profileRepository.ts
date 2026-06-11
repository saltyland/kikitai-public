import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plan, Profile } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';
import { throwDbError } from './dbError';

/** プロフィール編集で更新できる属性のみ（id/points/trust_score 等は対象外） */
export type ProfileEditable = Partial<
  Pick<
    Profile,
    | 'nickname'
    | 'affiliation'
    | 'field'
    | 'age'
    | 'gender'
    | 'occupation'
    | 'grade'
    | 'major'
    | 'private_fields'
    | 'avatar_url'
  >
>;

/** プロフィールのDBアクセスを抽象化するインターフェース */
export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>;
  /** 複数idのプロフィールを1クエリでまとめて取得する（一覧表示のN+1対策） */
  findByIds(ids: string[]): Promise<Map<string, Profile>>;
  update(id: string, data: ProfileEditable): Promise<Profile>;
  updatePlan(id: string, plan: Plan): Promise<Profile>;
  /** ポイント残高キャッシュを上書きする（point_lots の合計と同期する用） */
  setPoints(id: string, points: number): Promise<void>;
  /** 信頼スコアを上書きする（0〜100にクランプ済みの値を渡すこと） */
  setTrustScore(id: string, trustScore: number): Promise<void>;
  delete(id: string): Promise<void>;
}

export class ProfileRepository extends BaseRepository<Profile> implements IProfileRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  // findById は BaseRepository から継承

  async findByIds(ids: string[]): Promise<Map<string, Profile>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .in('id', Array.from(new Set(ids)));
    if (error) throwDbError(error, 'profiles');
    return new Map(((data ?? []) as Profile[]).map((p) => [p.id, p]));
  }

  async update(id: string, data: ProfileEditable): Promise<Profile> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throwDbError(error, 'profiles');
    return updated as Profile;
  }

  async setPoints(id: string, points: number): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .update({ points })
      .eq('id', id);
    if (error) throwDbError(error, 'profiles.setPoints');
  }

  async setTrustScore(id: string, trustScore: number): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .update({ trust_score: trustScore })
      .eq('id', id);
    if (error) throwDbError(error, 'profiles.setTrustScore');
  }

  async updatePlan(id: string, plan: Plan): Promise<Profile> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update({ plan })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throwDbError(error, 'profiles');
    return updated as Profile;
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }
}
