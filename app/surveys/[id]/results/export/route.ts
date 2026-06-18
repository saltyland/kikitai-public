import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';

/**
 * 結果ダウンロード（CSV / Excel）。作成者のみアクセス可。
 * GET /surveys/[id]/results/export          → CSV
 * GET /surveys/[id]/results/export?format=xlsx → Excel
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) {
    return new NextResponse('ログインが必要です', { status: 401 });
  }

  const svc = new ResponseService(supabase);

  try {
    if (format === 'xlsx') {
      const { filename, buffer } = await svc.getResultXlsx(user.id, id);
      const encoded = encodeURIComponent(filename);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="results.xlsx"; filename*=UTF-8''${encoded}`,
        },
      });
    }

    const { filename, csv } = await svc.getResultCsv(user.id, id);
    const encoded = encodeURIComponent(filename);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="results.csv"; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ダウンロードできませんでした';
    return new NextResponse(message, { status: 403 });
  }
}
