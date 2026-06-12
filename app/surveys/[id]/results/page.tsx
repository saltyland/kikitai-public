import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import Header from '@/components/Header';
import ResultChart from '@/components/ResultChart';
import ResultStats from '@/components/ResultStats';
import RefreshButton from '@/components/ui/RefreshButton';

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  let data;
  try {
    data = await new ResponseService(supabase).getResults(profile.id, id);
  } catch {
    redirect('/');
  }

  const { survey, responseCount, aggregates } = data;
  const isPro = profile.plan === 'pro';
  const statsMode = mode === 'stats';

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← ホームに戻る</Link>
        <h1 className="mt-2 mb-1 text-xl font-bold text-zinc-800">{survey.title}</h1>
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">回答数：{responseCount}件</p>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <Link
              href={`/surveys/${survey.id}/results/summary`}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              倫理審査用サマリー
            </Link>
            {responseCount > 0 && (
              <a
                href={`/surveys/${survey.id}/results/export`}
                className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
              >
                CSVダウンロード
              </a>
            )}
          </div>
        </div>

        {/* 表示モード切替タブ：集計グラフ / 統計解析（Pro） */}
        <div className="mb-5 flex gap-2 border-b border-zinc-200">
          <Link
            href={`/surveys/${survey.id}/results`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              !statsMode
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            集計グラフ
          </Link>
          <Link
            href={`/surveys/${survey.id}/results?mode=stats`}
            className={`-mb-px flex items-center gap-1 border-b-2 px-3 py-2 text-sm font-medium ${
              statsMode
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            統計解析
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">PRO</span>
          </Link>
        </div>

        {statsMode && !isPro ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
            <p className="mt-2 font-bold text-amber-800">統計解析モードはProプラン限定です</p>
            <p className="mt-1 text-sm text-amber-700">
              平均・中央値・標準偏差などの基礎統計量を確認できます。
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-block rounded-md bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Proプランに加入する
            </Link>
          </div>
        ) : responseCount === 0 ? (
          <div className="rounded-lg bg-white border border-zinc-200 px-4 py-10 text-center">
            <p className="text-4xl" aria-hidden="true">📊</p>
            <p className="mt-2 text-sm font-medium text-zinc-800">まだ回答がありません</p>
            <p className="mt-1 text-sm text-zinc-600">
              回答が集まると、ここに集計グラフが表示されます。
            </p>
          </div>
        ) : statsMode ? (
          <ResultStats aggregates={aggregates} />
        ) : (
          <div className="space-y-5">
            {aggregates.map((agg, i) => {
              const total = Object.values(agg.optionCounts).reduce((a, b) => a + b, 0);
              return (
                <section key={agg.question.id} className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm">
                  <p className="mb-3 font-medium text-zinc-800">
                    <span className="text-indigo-600 mr-1">Q{i + 1}.</span>
                    {agg.question.text}
                  </p>

                  {agg.gridCounts ? (
                    <>
                      {/* sm以上：行×列のクロス集計表 */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <caption className="sr-only">{agg.question.text}の行×列クロス集計</caption>
                          <thead>
                            <tr>
                              <th scope="col" className="p-2"><span className="sr-only">行ラベル</span></th>
                              {Object.keys(Object.values(agg.gridCounts)[0] ?? {}).map((c) => (
                                <th key={c} scope="col" className="p-2 text-center text-xs font-medium text-zinc-700">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(agg.gridCounts).map(([row, cols]) => (
                              <tr key={row} className="border-t border-zinc-100">
                                <th scope="row" className="p-2 text-left font-medium text-zinc-700">{row}</th>
                                {Object.entries(cols).map(([c, n]) => (
                                  <td key={c} className="p-2 text-center text-zinc-700">{n}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* sm未満：行ごとのカード（横スクロール回避） */}
                      <div className="space-y-3 sm:hidden">
                        {Object.entries(agg.gridCounts).map(([row, cols]) => (
                          <div key={row} className="rounded-lg border border-zinc-200 p-3">
                            <p className="mb-2 text-sm font-medium text-zinc-700">{row}</p>
                            <dl className="space-y-1">
                              {Object.entries(cols).map(([c, n]) => (
                                <div key={c} className="flex justify-between text-sm text-zinc-700">
                                  <dt className="text-zinc-600">{c}</dt>
                                  <dd className="font-medium">{n}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : agg.question.options.length > 0 ? (
                    // 選択式（single/multiple/dropdown/scale）：円グラフ＋棒グラフ
                    <ResultChart
                      items={agg.question.options.map((o) => ({
                        label: o.text,
                        count: agg.optionCounts[o.id] ?? 0,
                      }))}
                      total={agg.question.type === 'multiple' ? responseCount : total}
                      multiple={agg.question.type === 'multiple'}
                    />
                  ) : (
                    // テキスト系（text/paragraph/date）：回答一覧
                    <ul className="space-y-2">
                      {agg.textAnswers.length === 0 ? (
                        <li className="text-sm text-zinc-500">回答なし</li>
                      ) : (
                        agg.textAnswers.map((t, idx) => (
                          <li key={idx} className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                            {t}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
