import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationSettings, Plan, Profile, PublicProfile } from '@/lib/types/database';
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
    | 'sns_links'
  >
>;

/** プロフィールのDBアクセスを抽象化するインターフェース */
export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>;
  /** 単一ユーザーの公開プロフィールを取得する（他人閲覧用）。 */
  findPublicById(id: string): Promise<PublicProfile | null>;
  /**
   * 複数idの「公開プロフィール」を1クエリでまとめて取得する（一覧表示のN+1対策）。
   * RLSにより profiles 本体は本人しか読めないため、他人の情報は
   * public_profiles ビュー（非公開属性マスク済み）から取得する。
   */
  findByIds(ids: string[]): Promise<Map<string, PublicProfile>>;
  update(id: string, data: ProfileEditable): Promise<Profile>;
  updatePlan(id: string, plan: Plan): Promise<Profile>;
  updateNotificationSettings(id: string, settings: NotificationSettings): Promise<Profile>;
  delete(id: string): Promise<void>;
}

export class ProfileRepository extends BaseRepository<Profile> implements IProfileRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  // findById は BaseRepository から継承

  async findPublicById(id: string): Promise<PublicProfile | null> {
    const { data, error } = await this.supabase
      .from('public_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throwDbError(error, 'public_profiles');
    return (data as PublicProfile | null);
  }

  async findByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.supabase
      .from('public_profiles')
      .select('*')
      .in('id', Array.from(new Set(ids)));
    if (error) throwDbError(error, 'public_profiles');
    return new Map(((data ?? []) as PublicProfile[]).map((p) => [p.id, p]));
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

  async updateNotificationSettings(id: string, settings: NotificationSettings): Promise<Profile> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update({ notification_settings: settings })
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
