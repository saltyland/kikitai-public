import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * サーバー（サーバーコンポーネント / サーバーアクション）用のSupabaseクライアントを生成する。
 * Next.js 16では cookies() が非同期のため await する。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // サーバーコンポーネントからの呼び出しではsetが失敗する場合がある。
            // セッション更新はproxy(ミドルウェア)側で行うため無視してよい。
          }
        },
      },
    }
  );
}
