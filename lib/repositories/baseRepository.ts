import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 全リポジトリ共通の抽象親クラス。
 * Supabaseクライアントとテーブル名を保持し、id基準の汎用CRUDを提供する。
 * 各テーブル固有のクエリはサブクラスで追加する。
 *
 * これにより、新しいエンティティ（将来のポイント履歴・信頼スコア・通知など）の
 * リポジトリを、この親クラスを継承するだけで最小限のコードで追加できる。
 */
export abstract class BaseRepository<T> {
  protected constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly table: string
  ) {}

  /** id で1件取得（なければ null） */
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as T) ?? null;
  }

  /** id で削除 */
  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
