import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    answered?: string;
    score?: string;
    pts?: string;
    closed?: string;
    statusError?: string;
  }>;
}) {
  const { answered, score, pts, closed, statusError } = await searchParams;
  const earnedPts = pts ? Number(pts) : null;
  const qScore = score ? Number(score) : null;
  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  const profile = await auth.getCurrentProfile();
  // 未ログインはサービス紹介のランディングページを表示
  if (!profile) return <LandingPage />;

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {answered && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            回答を送信しました。ご協力ありがとうございました。
            {earnedPts !== null && qScore !== null && (
              <span className="mt-1 block text-green-800">
                {earnedPts > 0
                  ? `品質スコア ${qScore} 点 → ${earnedPts}pt を獲得しました。`
                  : `品質スコア ${qScore} 点でした。今回はポイント付与の基準に届きませんでした。`}
              </span>
            )}
            {closed && (
              <span className="mt-1 block text-green-800">
                このアンケートは必要回答数に到達したため締め切られました。
              </span>
            )}
          </div>
        )}

        {statusError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {statusError}
          </div>
        )}

        {/* ヒーローコピー（DESIGN_SPEC 準拠） */}
        <section className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
            こたえて、あつめる。研究の輪。
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            アンケートに答えてポイントを貯め、自分の研究に回答者を集めよう。<br className="hidden sm:inline" />
            学生・研究者のための、P2P型アンケート交換プラットフォーム。
          </p>
        </section>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/surveys/new"
            className="card-3d card-3d-hover block p-6"
          >
            <p className="text-lg font-extrabold text-brand-600">＋ アンケートを作成する</p>
            <p className="mt-1 text-sm text-slate-500">設問を作って回答を集めましょう</p>
          </Link>
          <Link
            href="/surveys"
            className="card-3d card-3d-hover block p-6"
          >
            <p className="text-lg font-extrabold text-slate-800">アンケートに回答する</p>
            <p className="mt-1 text-sm text-slate-500">公開中のアンケートに回答します</p>
          </Link>
        </div>

        <Link href="/manage" className="card-3d card-3d-hover block p-6">
          <p className="text-lg font-extrabold text-slate-800">作成したアンケートを管理する</p>
          <p className="mt-1 text-sm text-slate-500">下書き・公開中・終了済みのアンケートを確認・編集します</p>
        </Link>
      </main>
    </>
  );
}
