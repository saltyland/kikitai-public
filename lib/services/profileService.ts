import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Plan, Profile } from '@/lib/types/database';

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
   * 料金プランを変更する（Pro加入／解約）。
   * 本デモでは決済を介さず、ユーザー管理画面のトグルから直接切り替える。
   */
  async changePlan(userId: string, plan: Plan): Promise<Profile> {
    return this.profileRepo.updatePlan(userId, plan);
  }

  /**
   * 退会：アカウントを削除する。
   * auth.users ごと削除する（profilesはON DELETE CASCADEで連動削除される）。
   * これにより、退会後に同じメールアドレスで再登録できない問題（Authユーザー残存）を防ぐ。
   * サービスロールキー未設定時は、profilesだけ消してAuthユーザーが残る中途半端な
   * 状態を作らないよう、削除せずエラーにする。
   */
  async deleteAccount(userId: string): Promise<void> {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      throw new Error(
        '現在、退会機能は利用できません（サーバー設定が未完了です）。管理者にお問い合わせください。'
      );
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('[deleteAccount]', error.message);
      throw new Error('退会処理に失敗しました。時間をおいて再度お試しください。');
    }
    await this.supabase.auth.signOut();
  }
}
