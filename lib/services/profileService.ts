import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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
   * 退会：アカウントを削除する。
   * サービスロールキーが設定されていれば auth.users ごと削除する
   * （profilesはON DELETE CASCADEで連動削除される）。これにより、退会後に
   * 同じメールアドレスで再登録できない問題（Authユーザー残存）を防ぐ。
   * 未設定の場合はprofilesのみ削除するフォールバックに留める。
   */
  async deleteAccount(userId: string): Promise<void> {
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    } else {
      // サービスロール未設定時のフォールバック（Authユーザーは残る）
      await this.profileRepo.delete(userId);
    }
    await this.supabase.auth.signOut();
  }
}
