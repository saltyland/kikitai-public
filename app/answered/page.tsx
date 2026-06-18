import Link from 'next/link';
import Header from '@/components/Header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';

/**
 * アンケート回答後の結果画面。
 * 品質スコア・獲得ポイント・AIからのアドバイスを表示し、
 * 「ホームに戻る」でホーム画面へ遷移する。
 * 回答送信アクション（submitResponseAction / submitSharedLinkResponseAction）から
 * クエリパラメータ（score, pts, feedback, closed）付きでリダイレクトされる。
 */
export default async function AnsweredPage({
  searchParams,
}: {
  searchParams: Promise<{
    score?: string;
    pts?: string;
    feedback?: string;
    closed?: string;
  }>;
}) {
  const { score, pts, feedback, closed } = await searchParams;
  const qScore = score ? Number(score) : null;
  const earnedPts = pts ? Number(pts) : null;

  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();

  // スコアに応じた評価ラベル・色・絵文字
  const evalLabel = (s: number) =>
    s >= 80
      ? { text: 'とても良い回答です！', emoji: '🌟', color: 'text-emerald-600' }
      : s >= 60
      ? { text: '良い回答です', emoji: '😊', color: 'text-brand-600' }
      : s >= 40
      ? { text: 'ふつうの回答です', emoji: '🙂', color: 'text-amber-600' }
      : { text: 'もう少しくわしく答えてみよう', emoji: '💪', color: 'text-slate-500' };

  const ev = qScore !== null ? evalLabel(qScore) : null;

  return (
    <>
      {profile && <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 py-10">
        <div className="w-full space-y-5 text-center">
          <div>
            <p className="text-5xl">{ev?.emoji ?? '✅'}</p>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-800">回答を送信しました</h1>
            <p className="mt-1 text-sm text-slate-500">ご協力ありがとうございました！</p>
          </div>

          {/* 品質評価 */}
          {qScore !== null && ev && (
            <section className="card-3d rounded-2xl bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-500">回答の質</h2>
              <p className={`mt-2 text-3xl font-bold ${ev.color}`}>
                {qScore}
                <span className="ml-1 text-base font-semibold text-slate-400">点</span>
              </p>
              <p className={`mt-1 font-bold ${ev.color}`}>{ev.text}</p>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, qScore))}%` }}
                />
              </div>
            </section>
          )}

          {/* 獲得ポイント */}
          {earnedPts !== null && (
            <section className="card-3d rounded-2xl bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-500">獲得ポイント</h2>
              {earnedPts > 0 ? (
                <p className="mt-2 text-3xl font-bold text-brand-600">
                  +{earnedPts}
                  <span className="ml-1 text-base font-semibold text-slate-400">pt</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  今回はポイントがもらえませんでした。<br />
                  次はもう少しくわしく答えてみよう。
                </p>
              )}
            </section>
          )}

          {/* AIからのアドバイス */}
          {feedback && (
            <section className="card-3d rounded-2xl bg-brand-50 p-6 text-left">
              <h2 className="text-sm font-semibold text-brand-700">AIからのアドバイス</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{feedback}</p>
            </section>
          )}

          {closed && (
            <p className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              このアンケートは必要な回答数が集まったので、自動的に締め切られました。
            </p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
            <Link href="/" className="btn-3d btn-3d-primary px-6 py-2.5 text-sm">
              ホームに戻る
            </Link>
            <Link href="/surveys" className="btn-3d btn-3d-secondary px-6 py-2.5 text-sm">
              ほかのアンケートに答える
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
