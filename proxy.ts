import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Next.js 16のProxy(旧Middleware)。
 * Supabaseのセッション更新と未ログイン時のリダイレクトを行う。
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 静的ファイル・画像最適化・faviconに加えてメタデータ系ルートを除く全パスで実行
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|txt|xml|ico)$).*)',
  ],
};
