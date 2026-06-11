import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import { SurveyStatusBadge } from '@/components/SurveyStatusBadge';
import { changeStatusAction } from '@/app/actions/survey';
import DeleteSurveyButton from '@/components/DeleteSurveyButton';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ answered?: string }>;
}) {
  const { answered } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  const profile = await auth.getCurrentProfile();
  if (!profile) redirect('/login');

  const surveys = await new SurveyService(supabase).listMySurveys(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {answered && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            回答を送信しました。ご協力ありがとうございました。
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
            <p className="text-lg font-extrabold text-sky-600">＋ アンケートを作成する</p>
            <p className="mt-1 text-sm text-slate-500">設問を作って回答を集めましょう</p>
          </Link>
          <Link
            href="/surveys"
            className="card-3d card-3d-hover block p-6"
          >
            <p className="text-lg font-extrabold text-slate-800">✎ アンケートに回答する</p>
            <p className="mt-1 text-sm text-slate-500">公開中のアンケートに回答します</p>
          </Link>
        </div>

        <h2 className="mb-3 text-lg font-bold text-slate-800">作成したアンケート</h2>
        {surveys.length === 0 ? (
          <p className="card-3d px-4 py-8 text-center text-sm text-slate-500">
            まだアンケートがありません。「アンケートを作成する」から始めましょう。
          </p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => (
              <li
                key={s.id}
                className="card-3d p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-bold text-slate-800">{s.title}</h3>
                      <SurveyStatusBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      回答数 {s.response_count} / {s.required_count}
                      {s.deadline && ` ・期限 ${s.deadline}`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={`/surveys/${s.id}/results`}
                    className="btn-3d btn-3d-secondary px-3 py-1"
                  >
                    結果を見る
                  </Link>
                  {s.status === 'draft' && (
                    <Link
                      href={`/surveys/${s.id}/edit`}
                      className="btn-3d btn-3d-secondary px-3 py-1"
                    >
                      編集
                    </Link>
                  )}
                  {s.status === 'draft' && (
                    <form action={changeStatusAction}>
                      <input type="hidden" name="surveyId" value={s.id} />
                      <input type="hidden" name="status" value="open" />
                      <button className="btn-3d btn-3d-primary px-3 py-1">
                        公開する
                      </button>
                    </form>
                  )}
                  {s.status === 'open' && (
                    <form action={changeStatusAction}>
                      <input type="hidden" name="surveyId" value={s.id} />
                      <input type="hidden" name="status" value="closed" />
                      <button className="btn-3d btn-3d-danger px-3 py-1">
                        終了する
                      </button>
                    </form>
                  )}
                  <DeleteSurveyButton surveyId={s.id} title={s.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
