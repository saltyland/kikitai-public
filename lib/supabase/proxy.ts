import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** 認証不要でアクセスできるパス（/api/cron は CRON_SECRET で独自認可する） */
const PUBLIC_PATHS = ['/login', '/register', '/api/cron', '/s'];

/** 完全一致のみ公開（トップはランディングページとして未ログインでも表示） */
const PUBLIC_EXACT_PATHS = ['/'];

/**
 * proxy(旧middleware)から呼ばれるセッション更新＋認証ガード。
 * - Supabaseのセッションをリフレッシュし、Cookieを書き戻す
 * - 未ログインで保護ページにアクセスした場合は /login へリダイレクト
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_EXACT_PATHS.includes(path) ||
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
