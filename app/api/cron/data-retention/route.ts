import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertCronAuthorized } from '../cronAuth';

/**
 * データ保持期間バッチ（Vercel Cron から毎日実行）。
 * surveys.retention_until を超過したアンケートの回答データを自動削除する
 * （個人情報保護法/GDPR 対応。answers は responses から cascade 削除）。
 * 本体ロジックはDB関数 run_data_retention（SECURITY DEFINER）に集約している。
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

  const { data, error } = await admin.rpc('run_data_retention');
  if (error) {
    console.error('[cron:data-retention]', error.message);
    return NextResponse.json({ error: 'データ保持バッチに失敗しました' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...data });
}
