import { NextResponse } from 'next/server';

/**
 * Cronルート共通の認可チェック。
 * Vercel Cron は CRON_SECRET 環境変数を設定すると
 * `Authorization: Bearer ${CRON_SECRET}` を付けて呼び出す。
 * 未設定時は誰でも叩けてしまうため、安全側に倒して拒否する。
 * 認可OKなら null、NGなら 401/500 レスポンスを返す。
 */
export function assertCronAuthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET が未設定です' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
