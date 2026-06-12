import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // 初回ログイン（アカウント作成直後）はオンボーディングへ
      const isNewUser = data.user.created_at === data.user.last_sign_in_at;
      const redirectTo = isNewUser
        ? '/onboarding'
        : next.startsWith('/') && !next.startsWith('//')
          ? next
          : '/';
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
