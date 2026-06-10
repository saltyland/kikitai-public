import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plan, Profile } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';

/** プロフィールのDBアクセスを抽象化するインターフェース */
export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>;
  update(id: string, data: Partial<Pick<Profile, 'nickname' | 'affiliation' | 'field'>>): Promise<Profile>;
  updatePlan(id: string, plan: Plan): Promise<Profile>;
  delete(id: string): Promise<void>;
}

export class ProfileRepository extends BaseRepository<Profile> implements IProfileRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  // findById は BaseRepository から継承

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
    if (error) throw new Error(error.message);
    return updated as Profile;
  }

  async updatePlan(id: string, plan: Plan): Promise<Profile> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update({ plan })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return updated as Profile;
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }
}
