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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <svg className="h-9 w-9 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p className="text-lg font-bold text-slate-800">回答を送信しました</p>
          <p className="mt-2 text-sm text-slate-600">
            ご協力ありがとうございました。
            {closed && '（このアンケートは必要回答数に到達したため締め切られました）'}
          </p>

          {/* ゲスト回答者を会員登録／ログインへ誘導する（#21） */}
          <div className="mt-6 rounded-xl bg-brand-50/60 p-5 text-left">
            <p className="text-sm font-bold text-slate-800">キキタイをはじめてみませんか？</p>
            <p className="mt-1 text-xs text-slate-600">
              会員登録すると、こんなアンケートを自分でも作って回答を集められます。回答するとポイントも貯まります。
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href="/register" className="btn-3d btn-3d-primary px-6 py-3 text-sm">
                無料ではじめる
              </Link>
              <Link href="/login" className="btn-3d btn-3d-secondary px-6 py-3 text-sm">
                ログイン
              </Link>
            </div>
          </div>

          <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
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
            <Link href="/login" className="ml-1 font-medium text-brand-600 hover:underline">
              ログインして回答する
            </Link>
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
