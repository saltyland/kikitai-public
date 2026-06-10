import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import Header from '@/components/Header';

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <>
      <Header nickname={profile.nickname} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← ホームに戻る</Link>
        <h1 className="mt-2 mb-1 text-xl font-bold text-zinc-800">{survey.title}</h1>
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">回答数：{responseCount}件</p>
          {responseCount > 0 && (
            <a
              href={`/surveys/${survey.id}/results/export`}
              className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              CSVダウンロード
            </a>
          )}
        </div>

        {responseCount === 0 ? (
          <p className="rounded-lg bg-white border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
            まだ回答がありません。
          </p>
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
                    // グリッド：行×列のクロス集計表
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="p-2"></th>
                            {Object.keys(Object.values(agg.gridCounts)[0] ?? {}).map((c) => (
                              <th key={c} className="p-2 text-center text-xs font-medium text-zinc-600">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(agg.gridCounts).map(([row, cols]) => (
                            <tr key={row} className="border-t border-zinc-100">
                              <td className="p-2 text-zinc-700">{row}</td>
                              {Object.entries(cols).map(([c, n]) => (
                                <td key={c} className="p-2 text-center text-zinc-700">{n}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : agg.question.options.length > 0 ? (
                    // 選択式（single/multiple/dropdown/scale）：割合バー
                    <div className="space-y-2">
                      {agg.question.options.map((o) => {
                        const count = agg.optionCounts[o.id] ?? 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={o.id}>
                            <div className="flex justify-between text-xs text-zinc-500 mb-1">
                              <span>{o.text}</span>
                              <span>{count}件（{pct}%）</span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // テキスト系（text/paragraph/date）：回答一覧
                    <ul className="space-y-2">
                      {agg.textAnswers.length === 0 ? (
                        <li className="text-sm text-zinc-400">回答なし</li>
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
