import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResponseService } from '@/lib/services/responseService';
import AnswerForm from '@/components/AnswerForm';
import Logo from '@/components/Logo';

/**
 * 共有リンクの公開回答ページ（/s/<token>）。
 * リンクを知っていれば未ログインでも「ゲスト」として回答できる（ポイント付与なし）。
 */
export default async function SharedSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; closed?: string }>;
}) {
  const { token } = await params;
  const { done, closed } = await searchParams;
  const supabase = await createSupabaseServerClient();

  // 送信完了画面（アンケート取得失敗時も表示できるよう先に処理する）
  if (done) {
    return (
      <GuestShell>
        <div className="card-3d p-8 text-center">
          <p className="text-lg font-bold text-slate-800">回答を送信しました</p>
          <p className="mt-2 text-sm text-slate-600">
            ご協力ありがとうございました。
            {closed && '（このアンケートは必要回答数に到達したため締め切られました）'}
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-brand-600 hover:underline">
            キキタイについて見る
          </Link>
        </div>
      </GuestShell>
    );
  }

  let survey;
  let errorMsg: string | null = null;
  try {
    survey = await new ResponseService(supabase).getSurveyForGuest(token);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'アンケートを取得できませんでした';
  }

  return (
    <GuestShell>
      {errorMsg || !survey ? (
        <div className="card-3d p-8 text-center">
          <p className="text-sm text-slate-600">{errorMsg ?? 'アンケートが見つかりません'}</p>
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-bold text-slate-800">{survey.title}</h1>
          {survey.description && (
            <p className="mb-4 text-sm text-slate-600">{survey.description}</p>
          )}
          <p className="mb-6 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500">
            共有リンクからのゲスト回答です。ログインは不要ですが、ポイントは付与されません。
          </p>
          <AnswerForm survey={survey} guestToken={token} />
        </>
      )}
    </GuestShell>
  );
}

/** ゲスト用の簡易シェル（ログイン前提のHeaderは使わない） */
function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="キキタイ">
            <Logo className="h-7" />
          </Link>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            ゲスト回答
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
