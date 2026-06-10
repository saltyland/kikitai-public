import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';

/**
 * 結果CSVのダウンロード。作成者のみアクセス可。
 * GET /surveys/[id]/results/export
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) {
    return new NextResponse('ログインが必要です', { status: 401 });
  }

  try {
    const { filename, csv } = await new ResponseService(supabase).getResultCsv(user.id, id);
    // ファイル名は非ASCIIを含みうるため RFC 5987 形式でエンコードする
    const encoded = encodeURIComponent(filename);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="results.csv"; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'CSVを生成できませんでした';
    return new NextResponse(message, { status: 403 });
  }
}
