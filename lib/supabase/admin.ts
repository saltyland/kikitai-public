import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * サービスロールキーを使う管理者用Supabaseクライアント。
 * RLSをバイパスし、auth.usersの削除など管理操作に使う。
 *
 * SUPABASE_SERVICE_ROLE_KEY はサーバー専用の機密値（.env.local / 本番の環境変数）。
 * 必ずサーバー側（Server Action / Route Handler）からのみ呼び出すこと。
 * 未設定の場合は null を返し、呼び出し側でフォールバックする。
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
