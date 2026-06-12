import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { PointLotRepository } from '@/lib/repositories/pointLotRepository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  Plan,
  PointsSummary,
  PrivateField,
  Profile,
  SnsLinks,
} from '@/lib/types/database';
import { PRIVATE_FIELDS } from '@/lib/types/database';

/** ポイント関連の定数（DESIGN_SPEC §3） */
const POINT_EXPIRY_DAYS = 180;
const PRIVACY_BONUS_PER_FIELD = 10;
const PRIVACY_BONUS_CAP = 50;
const EXPIRY_WARNING_DAYS = 14;

/**
 * アバター画像の検証（Stored XSS 防止）。
 *  - 許可MIME：jpeg / png / webp / gif のラスタ画像のみ（SVGは明示的に拒否）
 *  - 宣言MIMEと先頭バイトのシグネチャ（マジックバイト）の一致を必須にする
 *    （Content-Type偽装で HTML/SVG/スクリプトを画像として配信させない）
 */
class AvatarImageValidator {
  /** MIME → {拡張子, シグネチャ判定} のホワイトリスト */
  private static readonly ALLOWED: Record<
    string,
    { ext: string; matches: (b: Uint8Array) => boolean }
  > = {
    'image/jpeg': {
      ext: 'jpg',
      matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    },
    'image/png': {
      ext: 'png',
      matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
    },
    'image/gif': {
      ext: 'gif',
      matches: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
    },
    'image/webp': {
      ext: 'webp',
      // RIFF....WEBP
      matches: (b) =>
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
    },
  };

  static async validate(file: File): Promise<{ mime: string; ext: string }> {
    const spec = AvatarImageValidator.ALLOWED[file.type];
    if (!spec) {
      throw new Error('画像は JPEG / PNG / WebP / GIF のみアップロードできます');
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (head.length < 12 || !spec.matches(head)) {
      throw new Error('画像ファイルの内容が不正です（形式が一致しません）');
    }
    return { mime: file.type, ext: spec.ext };
  }
}

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
      sns_links?: SnsLinks;
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
    if (file.size > MAX_BYTES) {
      throw new Error('画像サイズは5MBまでです');
    }
    // SVGはスクリプトを内包できる（公開バケット配信でStored XSSになる）ため拒否し、
    // ラスタ画像のホワイトリスト＋マジックバイト検証で実体を確認する。
    const validated = await AvatarImageValidator.validate(file);
    // 拡張子はユーザーのファイル名を信用せず、検証済みMIMEから決定する
    const path = `${userId}/avatar.${validated.ext}`;
    const { error } = await this.supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: validated.mime });
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

  /**
   * profiles.points を point_lots（期限内）の合計に同期する。
   * 集計と更新をDB側の1文（RPC）で行うため、並行付与時の lost update が起きない。
   */
  private async syncPointsBalance(userId: string): Promise<void> {
    await this.pointLotRepo.syncBalance(userId);
  }

  /** 保有ポイントの内訳（有効な束の一覧。プロフィールの履歴表示用） */
  async getPointLots(userId: string) {
    return this.pointLotRepo.listActive(userId);
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
