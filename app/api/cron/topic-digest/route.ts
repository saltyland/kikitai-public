import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertCronAuthorized } from '../cronAuth';

/**
 * トピックダイジェスト通知バッチ（Vercel Cronから毎日実行）。
 *  - フォロー中トピックに新着の公開アンケートがあるユーザーに
 *    'followed_topic_digest' 通知を発行する（重複通知なし）。
 * 本体ロジックはDB関数 run_topic_digest（SECURITY DEFINER）に集約している。
 */
export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です' },
      { status: 500 }
    );
  }

  const { data, error } = await admin.rpc('run_topic_digest');
  if (error) {
    console.error('[cron:topic-digest]', error.message);
    return NextResponse.json({ error: 'トピックダイジェストバッチに失敗しました' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...data });
}
