import { createBrowserClient } from '@supabase/ssr';

/**
 * ブラウザ（クライアントコンポーネント）用のSupabaseクライアントを生成する。
 * 認証状態はCookieで管理される。
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
