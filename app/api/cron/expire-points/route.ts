import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertCronAuthorized } from '../cronAuth';

/**
 * ポイント保守バッチ（Vercel Cron から毎日実行）。
 *  - 全ユーザーの profiles.points キャッシュを point_lots の有効残高に再同期
 *  - 失効14日前のロットを検出して 'points_expiring' 通知を発行（重複通知なし）
 * 本体ロジックはDB関数 run_points_maintenance（SECURITY DEFINER）に集約している。
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

  const { data, error } = await admin.rpc('run_points_maintenance');
  if (error) {
    console.error('[cron:expire-points]', error.message);
    return NextResponse.json({ error: 'ポイント保守バッチに失敗しました' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...data });
}
