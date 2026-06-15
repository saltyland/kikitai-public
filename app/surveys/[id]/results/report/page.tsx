import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import PrintButton from '@/components/PrintButton';
import { Donut, VBar, Histogram, Legend } from '@/components/charts/primitives';
import { toChartData, type QuestionChartData } from '@/lib/domain/resultCharts';

/**
 * 学術レポート（Proプラン）。
 * 各設問の集計を「図（グラフ）＋表（度数分布）＋基礎統計量」で構成し、
 * 学術論文・報告書にそのまま貼れる体裁でまとめる。ブラウザの
 * 「PDFとして保存」で日本語フォント埋め込み不要のPDFになる
 * （倫理審査サマリーと同じく印刷CSS方式）。
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Proプラン限定
  if (profile.plan !== 'pro') {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
        <p className="font-bold text-amber-800">学術レポート出力はProプラン限定です</p>
        <p className="mt-2 text-sm text-amber-700">
          集計図表・度数分布表・基礎統計量をまとめた学術用PDFを出力できます。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/surveys/${survey.id}/results`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← 結果に戻る
          </Link>
          <Link
            href="/profile"
            className="rounded-md bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Proプランに加入する
          </Link>
        </div>
      </main>
    );
  }

  const charts = toChartData(aggregates, responseCount);
  const today = new Date().toLocaleDateString('ja-JP');

  // 図・表番号を採番（選択式/スケールは図、グリッドは表）。
  // レンダリング中の変数再代入を避け、事前に各設問の番号を確定させる。
  const numbering = (() => {
    let fig = 0;
    let tbl = 0;
    return charts.map((c) => {
      const hasGrid = !!c.gridCounts;
      const hasChart = c.items.length > 0;
      if (hasGrid) return { figureNo: null as number | null, tableNo: ++tbl as number | null };
      if (hasChart) return { figureNo: ++fig as number | null, tableNo: null as number | null };
      return { figureNo: null as number | null, tableNo: null as number | null };
    });
  })();

  return (
    <main className="report mx-auto w-full max-w-3xl bg-white px-8 py-10 text-slate-800 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/surveys/${survey.id}/results`} className="text-sm text-brand-600 hover:underline">
          ← 結果に戻る
        </Link>
        <PrintButton />
      </div>

      {/* タイトル */}
      <header className="border-b-2 border-slate-800 pb-3">
        <h1 className="text-2xl font-bold leading-snug">{survey.title}</h1>
        {survey.description && (
          <p className="mt-1 text-sm text-slate-600">{survey.description}</p>
        )}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <Meta label="実施者" value={profile.nickname} />
          <Meta label="有効回答数" value={`${responseCount}`} />
          <Meta label="設問数" value={`${survey.questions.length}`} />
          <Meta label="出力日" value={today} />
        </dl>
      </header>

      {/* 概要 */}
      <Section heading="1. 調査の概要">
        <p className="text-sm leading-relaxed">
          本レポートは、アンケート「{survey.title}」に寄せられた有効回答 {responseCount} 件の
          集計結果である。各設問について度数分布および基礎統計量を以下に示す。
        </p>
      </Section>

      {/* 各設問 */}
      <Section heading="2. 設問別の集計結果">
        <div className="space-y-8">
          {charts.map((c, i) => (
            <QuestionReport
              key={c.id}
              chart={c}
              responseCount={responseCount}
              figureNo={numbering[i].figureNo}
              tableNo={numbering[i].tableNo}
            />
          ))}
        </div>
      </Section>

      <footer className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-400">
        本レポートは学術アンケートプラットフォーム「キキタイ」により {today} に自動生成されました。
        集計は提出時点の有効回答に基づきます。
      </footer>
    </main>
  );
}

function QuestionReport({
  chart,
  responseCount,
  figureNo,
  tableNo,
}: {
  chart: QuestionChartData;
  responseCount: number;
  figureNo: number | null;
  tableNo: number | null;
}) {
  const sum = chart.items.reduce((a, b) => a + b.count, 0);
  const respondedText =
    chart.type === 'multiple'
      ? `回答者 ${responseCount} 名（複数選択・延べ ${sum} 件）`
      : `有効回答 ${sum} 件`;

  return (
    <article className="break-inside-avoid">
      <h3 className="mb-1 text-sm font-bold text-slate-800">
        Q{chart.index + 1}. {chart.text}
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        形式：{typeLabel(chart.type)} ／ {respondedText}
      </p>

      {/* グリッド設問：度数表 */}
      {chart.gridCounts ? (
        <figure>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-400 text-xs text-slate-500">
                  <th className="p-2 text-left" />
                  {Object.keys(Object.values(chart.gridCounts)[0] ?? {}).map((c) => (
                    <th key={c} className="p-2 text-center">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(chart.gridCounts).map(([row, cols]) => (
                  <tr key={row} className="border-b border-slate-200">
                    <th className="p-2 text-left font-medium text-slate-700">{row}</th>
                    {Object.entries(cols).map(([c, n]) => (
                      <td key={c} className="p-2 text-center tabular-nums">{n}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tableNo != null && (
            <figcaption className="mt-2 text-center text-xs text-slate-500">
              表{tableNo}　{chart.text}の行×列集計
            </figcaption>
          )}
        </figure>
      ) : chart.items.length > 0 ? (
        <>
          {/* 図：グラフ */}
          <figure>
            {chart.type === 'scale' && chart.stats ? (
              <Histogram items={chart.items} mean={chart.stats.mean} />
            ) : chart.multiple ? (
              <VBar items={chart.items} total={chart.total} />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <div className="flex items-center gap-3">
                  <Donut items={chart.items} total={chart.total} />
                  <Legend items={chart.items} total={chart.total} />
                </div>
              </div>
            )}
            {figureNo != null && (
              <figcaption className="mt-1 text-center text-xs text-slate-500">
                図{figureNo}　{chart.text}の回答分布
              </figcaption>
            )}
          </figure>

          {/* 表：度数分布 */}
          <FrequencyTable chart={chart} />

          {/* 基礎統計量（スケールのみ） */}
          {chart.stats && (
            <dl className="mt-2 grid grid-cols-3 gap-x-6 gap-y-1 text-xs sm:grid-cols-6">
              <Stat label="n" value={String(chart.stats.n)} />
              <Stat label="M" value={chart.stats.mean.toFixed(2)} />
              <Stat label="Mdn" value={chart.stats.median.toFixed(2)} />
              <Stat label="SD" value={chart.stats.sd.toFixed(2)} />
              <Stat label="Min" value={String(chart.stats.min)} />
              <Stat label="Max" value={String(chart.stats.max)} />
            </dl>
          )}
        </>
      ) : (
        /* テキスト系：代表回答（先頭最大10件） */
        <ul className="space-y-1 text-sm">
          {chart.textAnswers.length === 0 ? (
            <li className="text-slate-400">自由記述の回答なし</li>
          ) : (
            chart.textAnswers.slice(0, 10).map((t, i) => (
              <li key={i} className="border-l-2 border-slate-200 pl-2 text-slate-700">
                {t}
              </li>
            ))
          )}
          {chart.textAnswers.length > 10 && (
            <li className="text-xs text-slate-400">ほか {chart.textAnswers.length - 10} 件</li>
          )}
        </ul>
      )}
    </article>
  );
}

function FrequencyTable({ chart }: { chart: QuestionChartData }) {
  const denom = chart.total > 0 ? chart.total : 1;
  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-400 text-left text-xs text-slate-500">
          <th className="py-1 pr-2">選択肢</th>
          <th className="py-1 pr-2 w-20 text-right">度数</th>
          <th className="py-1 w-20 text-right">割合</th>
        </tr>
      </thead>
      <tbody>
        {chart.items.map((it, i) => (
          <tr key={i} className="border-b border-slate-200">
            <td className="py-1 pr-2">{it.label}</td>
            <td className="py-1 pr-2 text-right tabular-nums">{it.count}</td>
            <td className="py-1 text-right tabular-nums">
              {Math.round((it.count / denom) * 100)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid-page">
      <h2 className="mb-3 border-l-4 border-slate-700 pl-2 text-base font-bold">{heading}</h2>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline text-slate-400">{label}：</dt>
      <dd className="inline font-medium text-slate-600">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-slate-50 px-2 py-1">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-bold text-slate-700">{value}</dd>
    </div>
  );
}

function typeLabel(type: QuestionChartData['type']): string {
  const map: Record<string, string> = {
    single: '単一選択',
    multiple: '複数選択',
    dropdown: 'プルダウン',
    scale: '尺度（スケール）',
    text: '自由記述（短文）',
    paragraph: '自由記述（段落）',
    date: '日付',
    grid: 'グリッド',
    attention: 'アテンションチェック',
  };
  return map[type] ?? type;
}
