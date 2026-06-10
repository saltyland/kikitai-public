import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plan, Profile } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';
import { throwDbError } from './dbError';

/** プロフィールのDBアクセスを抽象化するインターフェース */
export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>;
  /** 複数idのプロフィールを1クエリでまとめて取得する（一覧表示のN+1対策） */
  findByIds(ids: string[]): Promise<Map<string, Profile>>;
  update(id: string, data: Partial<Pick<Profile, 'nickname' | 'affiliation' | 'field'>>): Promise<Profile>;
  updatePlan(id: string, plan: Plan): Promise<Profile>;
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

  async update(
    id: string,
    data: Partial<Pick<Profile, 'nickname' | 'affiliation' | 'field'>>
  ): Promise<Profile> {
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

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }
}
