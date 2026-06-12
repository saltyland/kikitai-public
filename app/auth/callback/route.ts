import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // cookieをredirectレスポンスに明示的に乗せるため、
    // createSupabaseServerClient()（next/headersベース）は使わず直接生成する
    const cookiesToSet: Array<{
      name: string;
      value: string;
      options: Parameters<NextResponse['cookies']['set']>[2];
    }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookies.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.push(...cookies);
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // created_at が60秒以内 = Google OAuth で今まさに作成された新規ユーザー
      const createdAt = new Date(data.user.created_at).getTime();
      const isNewUser = Date.now() - createdAt < 60_000;

      const redirectPath = isNewUser
        ? '/onboarding'
        : next.startsWith('/') && !next.startsWith('//')
          ? next
          : '/';

      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      // セッションcookieをredirectレスポンスに付与
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      );
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
