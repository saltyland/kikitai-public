'use client';

import { useState } from 'react';
import type { QuestionChartData } from '@/lib/domain/resultCharts';
import { Donut, Legend, HBar, VBar, Histogram } from '@/components/charts/primitives';

type ChartKind = 'donut' | 'hbar' | 'vbar';

const KIND_LABEL: Record<ChartKind, string> = {
  donut: '円グラフ',
  hbar: '横棒グラフ',
  vbar: '縦棒グラフ',
};

/**
 * Proの集計グラフ（拡張版）。
 * 円／横棒／縦棒をワンクリックで切り替えられ、スケール設問は度数分布
 * ヒストグラム（平均線つき）も表示する。フリープランの静的グラフの上位版。
 */
export default function ProCharts({ charts }: { charts: QuestionChartData[] }) {
  const [kind, setKind] = useState<ChartKind>('donut');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          拡張グラフモード（Proプラン）— グラフの種類を切り替えて分析できます。
        </p>
        <div className="flex gap-1 rounded-md border border-amber-300 bg-white p-0.5">
          {(Object.keys(KIND_LABEL) as ChartKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                kind === k
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {charts.map((c) => (
        <section
          key={c.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="mb-3 font-medium text-slate-800">
            <span className="mr-1 text-brand-600">Q{c.index + 1}.</span>
            {c.text}
          </p>
          <ChartBody chart={c} kind={kind} />
        </section>
      ))}
    </div>
  );
}

function ChartBody({ chart, kind }: { chart: QuestionChartData; kind: ChartKind }) {
  // グリッド設問：クロス集計表
  if (chart.gridCounts) {
    return <GridTable gridCounts={chart.gridCounts} />;
  }

  // 選択肢なし（自由記述・日付）：回答一覧
  if (chart.items.length === 0) {
    return chart.textAnswers.length === 0 ? (
      <p className="text-sm text-slate-400">回答なし</p>
    ) : (
      <ul className="space-y-2">
        {chart.textAnswers.map((t, i) => (
          <li key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {t}
          </li>
        ))}
      </ul>
    );
  }

  // スケール設問：選んだグラフに加えてヒストグラム＋統計量も表示
  const isScale = chart.type === 'scale';

  return (
    <div className="space-y-4">
      <SelectedChart chart={chart} kind={kind} />
      {isScale && chart.stats && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-medium text-slate-500">度数分布（平均線つき）</p>
          <Histogram items={chart.items} mean={chart.stats.mean} />
          <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-6">
            <Stat label="n" value={String(chart.stats.n)} />
            <Stat label="平均" value={chart.stats.mean.toFixed(2)} />
            <Stat label="中央値" value={chart.stats.median.toFixed(2)} />
            <Stat label="標準偏差" value={chart.stats.sd.toFixed(2)} />
            <Stat label="最小" value={String(chart.stats.min)} />
            <Stat label="最大" value={String(chart.stats.max)} />
          </dl>
        </div>
      )}
    </div>
  );
}

function SelectedChart({ chart, kind }: { chart: QuestionChartData; kind: ChartKind }) {
  // 複数選択は割合の合計が100%にならないため円グラフは出さず横棒にフォールバック
  const effectiveKind = chart.multiple && kind === 'donut' ? 'hbar' : kind;

  if (effectiveKind === 'donut') {
    return (
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Donut items={chart.items} total={chart.total} />
          <Legend items={chart.items} total={chart.total} />
        </div>
        <HBar items={chart.items} total={chart.total} />
      </div>
    );
  }
  if (effectiveKind === 'vbar') {
    return <VBar items={chart.items} total={chart.total} />;
  }
  return <HBar items={chart.items} total={chart.total} />;
}

function GridTable({ gridCounts }: { gridCounts: Record<string, Record<string, number>> }) {
  const cols = Object.keys(Object.values(gridCounts)[0] ?? {});
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="p-2" />
            {cols.map((c) => (
              <th key={c} className="p-2 text-center text-xs font-medium text-slate-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(gridCounts).map(([row, c]) => (
            <tr key={row} className="border-t border-slate-100">
              <th className="p-2 text-left font-medium text-slate-700">{row}</th>
              {Object.entries(c).map(([k, n]) => (
                <td key={k} className="p-2 text-center text-slate-700">
                  {n}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-bold text-slate-700">{value}</dd>
    </div>
  );
}
