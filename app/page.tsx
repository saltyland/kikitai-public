import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import { SurveyStatusBadge } from '@/components/SurveyStatusBadge';
import { changeStatusAction, deleteSurveyAction } from '@/app/actions/survey';

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
          <div className="mb-6 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            回答を送信しました。ご協力ありがとうございました。
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/surveys/new"
            className="rounded-xl bg-indigo-600 p-6 text-white shadow-sm hover:bg-indigo-700"
          >
            <p className="text-lg font-bold">＋ アンケートを作成する</p>
            <p className="mt-1 text-sm text-indigo-100">設問を作って回答を集めましょう</p>
          </Link>
          <Link
            href="/surveys"
            className="rounded-xl bg-white p-6 shadow-sm border border-zinc-200 hover:border-indigo-300"
          >
            <p className="text-lg font-bold text-zinc-800">✎ アンケートに回答する</p>
            <p className="mt-1 text-sm text-zinc-500">公開中のアンケートに回答します</p>
          </Link>
        </div>

        <h2 className="mb-3 text-lg font-bold text-zinc-800">作成したアンケート</h2>
        {surveys.length === 0 ? (
          <p className="rounded-lg bg-white border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
            まだアンケートがありません。「アンケートを作成する」から始めましょう。
          </p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => (
              <li
                key={s.id}
                className="rounded-lg bg-white border border-zinc-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-zinc-800">{s.title}</h3>
                      <SurveyStatusBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      回答数 {s.response_count} / {s.required_count}
                      {s.deadline && ` ・期限 ${s.deadline}`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {s.status === 'open' && (
                    <Link
                      href={`/surveys/${s.id}/results`}
                      className="rounded-md bg-zinc-100 px-3 py-1 text-zinc-700 hover:bg-zinc-200"
                    >
                      結果を見る
                    </Link>
                  )}
                  {s.status === 'closed' && (
                    <Link
                      href={`/surveys/${s.id}/results`}
                      className="rounded-md bg-zinc-100 px-3 py-1 text-zinc-700 hover:bg-zinc-200"
                    >
                      結果を見る
                    </Link>
                  )}
                  <Link
                    href={`/surveys/${s.id}/edit`}
                    className="rounded-md bg-zinc-100 px-3 py-1 text-zinc-700 hover:bg-zinc-200"
                  >
                    編集
                  </Link>
                  {s.status === 'draft' && (
                    <form action={changeStatusAction}>
                      <input type="hidden" name="surveyId" value={s.id} />
                      <input type="hidden" name="status" value="open" />
                      <button className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700 cursor-pointer">
                        公開する
                      </button>
                    </form>
                  )}
                  {s.status === 'open' && (
                    <form action={changeStatusAction}>
                      <input type="hidden" name="surveyId" value={s.id} />
                      <input type="hidden" name="status" value="closed" />
                      <button className="rounded-md bg-amber-600 px-3 py-1 text-white hover:bg-amber-700 cursor-pointer">
                        終了する
                      </button>
                    </form>
                  )}
                  <form action={deleteSurveyAction}>
                    <input type="hidden" name="surveyId" value={s.id} />
                    <button className="rounded-md px-3 py-1 text-red-600 hover:bg-red-50 cursor-pointer">
                      削除
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
