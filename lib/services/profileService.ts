import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import type { Profile } from '@/lib/types/database';

/** プロフィール編集・退会のビジネスロジック */
export class ProfileService {
  private readonly profileRepo: ProfileRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.profileRepo = new ProfileRepository(supabase);
  }

  async getProfile(userId: string): Promise<Profile | null> {
    return this.profileRepo.findById(userId);
  }

  async updateProfile(
    userId: string,
    data: { nickname: string; affiliation: string | null; field: string | null }
  ): Promise<Profile> {
    if (!data.nickname.trim()) {
      throw new Error('ニックネームは必須です');
    }
    return this.profileRepo.update(userId, data);
  }

  /**
   * 退会：プロフィールを削除する。
   * profilesはauth.usersをON DELETE CASCADEで参照しているが、逆方向の
   * Authユーザー削除はサービスロールが必要なため、Phase 1ではprofiles削除
   * とサインアウトに留める。
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.profileRepo.delete(userId);
    await this.supabase.auth.signOut();
  }
}
