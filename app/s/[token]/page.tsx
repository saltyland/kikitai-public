import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResponseService } from '@/lib/services/responseService';
import AnswerForm from '@/components/AnswerForm';
import Logo from '@/components/Logo';

/**
 * 共有リンクの回答ページ（/s/<token>）。
 * - ログイン済み → 通常のポイント付与あり回答（share_link_no_reward=true なら0pt）
 * - 未ログイン  → ゲスト回答（ポイント付与なし）＋ログイン/新規登録リンク表示
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

  // ログイン状態を確認する
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 送信完了画面
  if (done) {
    return (
      <SharedShell token={token} user={user}>
        <div className="card-3d p-8 text-center">
          <p className="text-lg font-bold text-slate-800">回答を送信しました</p>
          <p className="mt-2 text-sm text-slate-600">
            ご協力ありがとうございました。
            {closed && '（このアンケートは必要回答数に到達したため締め切られました）'}
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-brand-600 hover:underline">
            {user ? 'ホームへ戻る' : 'キキタイについて見る'}
          </Link>
        </div>
      </SharedShell>
    );
  }

  const responseService = new ResponseService(supabase);
  let survey;
  let errorMsg: string | null = null;

  if (user) {
    // ログイン済み：通常の回答可能チェック（自作・回答済みなど）
    try {
      survey = await responseService.getSurveyForSharedLinkAuth(user.id, token);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'アンケートを取得できませんでした';
    }
  } else {
    // 未ログイン：ゲスト用取得（簡易チェックのみ）
    try {
      survey = await responseService.getSurveyForGuest(token);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'アンケートを取得できませんでした';
    }
  }

  return (
    <SharedShell token={token} user={user}>
      {errorMsg || !survey ? (
        <div className="card-3d p-8 text-center">
          <p className="text-sm text-slate-600">{errorMsg ?? 'アンケートが見つかりません'}</p>
          {!user && (
            <p className="mt-4 text-xs text-slate-500">
              ログイン済みの場合は{' '}
              <Link
                href={`/login?next=/s/${token}`}
                className="text-brand-600 underline hover:text-brand-700"
              >
                ログイン
              </Link>{' '}
              してから再アクセスしてください。
            </p>
          )}
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-bold text-slate-800">{survey.title}</h1>
          {survey.description && (
            <p className="mb-4 text-sm text-slate-600">{survey.description}</p>
          )}

          {user ? (
            /* ログイン済み：ポイント付与の説明 */
            survey.share_link_no_reward ? (
              <p className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                このアンケートは作成者の設定により、共有リンクからの回答はポイント付与なし（0pt）です。
              </p>
            ) : (
              <p className="mb-6 rounded-lg bg-brand-50 border border-brand-200 px-3 py-2 text-xs text-brand-700">
                ログイン済みで回答中です。回答品質に応じてポイントが付与されます。
              </p>
            )
          ) : (
            /* 未ログイン：ログイン/新規登録の案内 */
            <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 px-3 py-3 text-xs text-slate-600 space-y-2">
              <p>
                ゲストとして回答できます（ポイント付与なし）。
              </p>
              <p>
                ポイントを獲得するには{' '}
                <Link
                  href={`/login?next=/s/${token}`}
                  className="font-medium text-brand-600 underline hover:text-brand-700"
                >
                  ログイン
                </Link>
                {' '}または{' '}
                <Link
                  href={`/register?next=/s/${token}`}
                  className="font-medium text-brand-600 underline hover:text-brand-700"
                >
                  新規登録
                </Link>
                {' '}してください。
              </p>
            </div>
          )}

          {/* ログイン済みは shareToken、未ログインは guestToken を渡す */}
          {user ? (
            <AnswerForm survey={survey} shareToken={token} />
          ) : (
            <AnswerForm survey={survey} guestToken={token} />
          )}
        </>
      )}
    </SharedShell>
  );
}

/** 共有リンク用シェル（ログイン状態に応じてヘッダー右側を切り替え） */
function SharedShell({
  children,
  token,
  user,
}: {
  children: React.ReactNode;
  token: string;
  user: { email?: string } | null;
}) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="キキタイ">
            <Logo className="h-7" />
          </Link>
          {user ? (
            <Link
              href="/"
              className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-200"
            >
              ホームへ
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/login?next=/s/${token}`}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                ログイン
              </Link>
              <Link
                href={`/register?next=/s/${token}`}
                className="btn-3d rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
              >
                新規登録
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
