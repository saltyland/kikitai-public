import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import type { Profile } from '@/lib/types/database';

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  affiliation?: string;
  field?: string;
}

/**
 * 認証・登録に関するビジネスロジック。
 * Supabase Authの操作とprofilesテーブルの初期化を一括で扱う。
 */
export class AuthService {
  private readonly profileRepo: ProfileRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.profileRepo = new ProfileRepository(supabase);
  }

  /** 現在ログイン中のユーザーを取得（未ログインならnull） */
  async getCurrentUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user ?? null;
  }

  /** ログイン中ユーザーのプロフィールを取得 */
  async getCurrentProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;
    return this.profileRepo.findById(user.id);
  }

  /**
   * 新規登録。
   * プロフィール行は auth.users への INSERT トリガー（handle_new_user / SECURITY DEFINER）
   * が user metadata をもとに自動生成する。アプリ側から profiles に直接 INSERT すると
   * セッション未確立時に RLS で弾かれるため、metadata 経由でDB側に生成させる。
   */
  async register(input: RegisterInput): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          nickname: input.nickname,
          affiliation: input.affiliation ?? '',
          field: input.field ?? '',
        },
      },
    });
    if (error) throw new Error(error.message);
  }

  /** ログイン */
  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
  }

  /** ログアウト */
  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
