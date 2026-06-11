import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { PointLotRepository } from '@/lib/repositories/pointLotRepository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  Plan,
  PointsSummary,
  PrivateField,
  Profile,
} from '@/lib/types/database';
import { PRIVATE_FIELDS } from '@/lib/types/database';

/** ポイント関連の定数（DESIGN_SPEC §3） */
const POINT_EXPIRY_DAYS = 180;
const PRIVACY_BONUS_PER_FIELD = 10;
const PRIVACY_BONUS_CAP = 50;
const EXPIRY_WARNING_DAYS = 14;

/** プロフィール編集・退会・ポイント／信頼スコアのビジネスロジック */
export class ProfileService {
  private readonly profileRepo: ProfileRepository;
  private readonly pointLotRepo: PointLotRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.profileRepo = new ProfileRepository(supabase);
    this.pointLotRepo = new PointLotRepository(supabase);
  }

  async getProfile(userId: string): Promise<Profile | null> {
    return this.profileRepo.findById(userId);
  }

  /** プロフィール属性を更新する。非公開設定の変更に応じて充実ボーナスを再計算する。 */
  async updateProfile(
    userId: string,
    data: {
      nickname: string;
      affiliation: string | null;
      field: string | null;
      age: number | null;
      gender: string | null;
      occupation: string | null;
      grade: string | null;
      major: string | null;
      private_fields: PrivateField[];
      /** 渡された場合のみ更新する（未指定なら既存のまま） */
      avatar_url?: string | null;
    }
  ): Promise<Profile> {
    if (!data.nickname.trim()) {
      throw new Error('ニックネームは必須です');
    }
    // 非公開対象として認められた属性だけに正規化する
    const privateFields = data.private_fields.filter((f) => PRIVATE_FIELDS.includes(f));
    const profile = await this.profileRepo.update(userId, { ...data, private_fields: privateFields });
    await this.recomputePrivacyBonus(userId, privateFields.length);
    return (await this.profileRepo.findById(userId)) ?? profile;
  }

  /**
   * アバター画像を Storage（avatars バケット）にアップロードし、公開URLを返す。
   * パスは `${userId}/avatar.<ext>` 固定。upsert で毎回上書きし、URL末尾に
   * バージョンクエリを付けてキャッシュを更新する。
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (!file.type.startsWith('image/')) {
      throw new Error('画像ファイルを選択してください');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('画像サイズは5MBまでです');
    }
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/avatar.${ext || 'png'}`;
    const { error } = await this.supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      console.error('[uploadAvatar]', error.message);
      throw new Error('画像のアップロードに失敗しました');
    }
    const { data } = this.supabase.storage.from('avatars').getPublicUrl(path);
    // 同名パスを上書きするため、CDNキャッシュ対策にバージョンを付ける
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  /**
   * 非公開属性数に応じたプロフィール充実ボーナス（+10pt/項目, 上限50pt）を再計算する。
   * 'privacy_bonus' の束を一度すべて消して付け直すことで冪等に保つ。
   */
  private async recomputePrivacyBonus(userId: string, privateCount: number): Promise<void> {
    await this.pointLotRepo.deleteByReason(userId, 'privacy_bonus');
    const bonus = Math.min(PRIVACY_BONUS_CAP, privateCount * PRIVACY_BONUS_PER_FIELD);
    if (bonus > 0) {
      await this.pointLotRepo.grant(userId, bonus, 'privacy_bonus', POINT_EXPIRY_DAYS);
    }
    await this.syncPointsBalance(userId);
  }

  /** ポイントを付与する（有効期限180日）。残高キャッシュも更新する。 */
  async awardPoints(userId: string, amount: number, reason: string): Promise<void> {
    if (amount <= 0) return;
    await this.pointLotRepo.grant(userId, amount, reason, POINT_EXPIRY_DAYS);
    await this.syncPointsBalance(userId);
  }

  /** 信頼スコアを delta だけ増減する（0〜100にクランプ）。 */
  async adjustTrust(userId: string, delta: number): Promise<void> {
    const profile = await this.profileRepo.findById(userId);
    if (!profile) return;
    const next = Math.max(0, Math.min(100, profile.trust_score + delta));
    await this.profileRepo.setTrustScore(userId, next);
  }

  /** profiles.points を point_lots（期限内）の合計に同期する。 */
  private async syncPointsBalance(userId: string): Promise<number> {
    const lots = await this.pointLotRepo.listActive(userId);
    const total = lots.reduce((sum, lot) => sum + lot.amount, 0);
    await this.profileRepo.setPoints(userId, total);
    return total;
  }

  /** 表示用のポイントサマリ（有効残高＋まもなく失効する束）を返す。 */
  async getPointsSummary(userId: string): Promise<PointsSummary> {
    const lots = await this.pointLotRepo.listActive(userId);
    const available = lots.reduce((sum, lot) => sum + lot.amount, 0);
    const threshold = Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
    const expiringSoon = lots
      .filter((lot) => new Date(lot.expires_at).getTime() <= threshold)
      .map((lot) => ({ amount: lot.amount, expires_at: lot.expires_at }));
    return { available, expiringSoon };
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
