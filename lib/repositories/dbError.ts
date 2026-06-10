import type { PostgrestError } from '@supabase/supabase-js';

/**
 * DBエラーの共通処理。
 * Supabaseの生のエラーメッセージ（スキーマ名・SQL断片・制約名など）をそのまま
 * クライアントへ返すと内部情報の漏えいになるため、詳細はサーバーログにのみ出力し、
 * ユーザーへは一般化したメッセージを投げる。
 */
export function throwDbError(
  error: Pick<PostgrestError, 'message'> & { code?: string },
  context: string
): never {
  console.error(`[DB:${context}]`, error.code ?? '', error.message);
  throw new Error('データベースの操作に失敗しました');
}

/** PostgreSQL の一意制約違反（23505）かどうか。重複回答の判定などに使う。 */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}
