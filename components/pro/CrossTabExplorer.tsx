'use client';

import { useMemo, useState } from 'react';
import { cramersV, crossTabFromSelections, type CrossTab } from '@/lib/domain/crosstab';
import { color } from '@/components/charts/primitives';

/** クロス集計に使える設問のメタ（シリアライズ可能） */
export interface CrossQuestion {
  id: string;
  index: number;
  text: string;
  options: { id: string; text: string }[];
}

/** 1回答者の選択（設問id → 選んだoption_id配列） */
export type RespondentSelections = Record<string, string[]>;

/**
 * 設問間クロス集計エクスプローラ（Proプラン）。
 * 行設問・列設問を選ぶと、回答者ごとの選択を突き合わせた同時度数表を
 * ヒートマップで描画し、行内割合の100%積み上げ棒・Cramér's V も表示する。
 */
export default function CrossTabExplorer({
  questions,
  respondents,
}: {
  questions: CrossQuestion[];
  respondents: RespondentSelections[];
}) {
  const [rowId, setRowId] = useState(questions[0]?.id ?? '');
  const [colId, setColId] = useState(questions[1]?.id ?? questions[0]?.id ?? '');
  const [showPercent, setShowPercent] = useState(false);

  const rowQ = questions.find((q) => q.id === rowId);
  const colQ = questions.find((q) => q.id === colId);

  const ct = useMemo<CrossTab | null>(() => {
    if (!rowQ || !colQ) return null;
    return computeCrossTab(rowQ, colQ, respondents);
  }, [rowQ, colQ, respondents]);

  if (questions.length < 2) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        クロス集計には選択式の設問が2つ以上必要です。
      </div>
    );
  }

  const v = ct ? cramersV(ct) : null;
  const maxCell = ct ? Math.max(1, ...ct.matrix.flat()) : 1;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        クロス集計モード（Proプラン）— 2つの設問の回答の関係を分析できます。
        回答者ごとに選択を突き合わせ、同時に選ばれた件数を表示します。
      </div>

      {/* 設問セレクタ */}
      <div className="grid gap-3 sm:grid-cols-2">
        <QuestionSelect label="行（縦）の設問" value={rowId} onChange={setRowId} questions={questions} />
        <QuestionSelect label="列（横）の設問" value={colId} onChange={setColId} questions={questions} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showPercent}
            onChange={(e) => setShowPercent(e.target.checked)}
            className="accent-amber-500"
          />
          行内の割合（%）で表示
        </label>
        {v != null && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            連関の強さ Cramér&apos;s V = <strong>{v.toFixed(3)}</strong>
            <span className="ml-1 text-slate-400">（0=無関連 / 1=完全連関）</span>
          </span>
        )}
      </div>

      {rowId === colId && (
        <p className="text-xs text-amber-600">
          ※ 同じ設問どうしを選んでいます。異なる設問を選ぶと関係が分析できます。
        </p>
      )}

      {!ct || ct.rowLabels.length === 0 || ct.colLabels.length === 0 ? (
        <p className="text-sm text-slate-500">表示できるデータがありません。</p>
      ) : (
        <>
          {/* ヒートマップ表 */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-50 p-2 text-left text-xs font-medium text-slate-500">
                    {rowQ?.text.slice(0, 12)} ＼ {colQ?.text.slice(0, 12)}
                  </th>
                  {ct.colLabels.map((c) => (
                    <th key={c} className="p-2 text-center text-xs font-medium text-slate-700">
                      {c}
                    </th>
                  ))}
                  <th className="p-2 text-center text-xs font-medium text-slate-400">計</th>
                </tr>
              </thead>
              <tbody>
                {ct.matrix.map((cells, ri) => (
                  <tr key={ri} className="border-t border-slate-100">
                    <th className="sticky left-0 bg-white p-2 text-left font-medium text-slate-700">
                      {ct.rowLabels[ri]}
                    </th>
                    {cells.map((n, ci) => {
                      const denom = ct.rowTotals[ri] || 1;
                      const pct = Math.round((n / denom) * 100);
                      const intensity = n / maxCell;
                      return (
                        <td
                          key={ci}
                          className="p-2 text-center tabular-nums"
                          style={{
                            background:
                              n === 0
                                ? undefined
                                : `rgba(38, 166, 154, ${0.08 + intensity * 0.55})`,
                            color: intensity > 0.6 ? '#fff' : '#334155',
                          }}
                        >
                          {showPercent ? `${pct}%` : n}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center text-xs text-slate-400">{ct.rowTotals[ri]}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50">
                  <th className="sticky left-0 bg-slate-50 p-2 text-left text-xs font-medium text-slate-400">
                    計
                  </th>
                  {ct.colTotals.map((t, ci) => (
                    <td key={ci} className="p-2 text-center text-xs text-slate-400">
                      {t}
                    </td>
                  ))}
                  <td className="p-2 text-center text-xs text-slate-400">{ct.grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 行ごとの100%積み上げ棒（列の構成比） */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-medium text-slate-500">
              行ごとの構成比（各行内で列がどう分かれるか）
            </p>
            <div className="space-y-2">
              {ct.matrix.map((cells, ri) => {
                const denom = ct.rowTotals[ri] || 1;
                return (
                  <div key={ri}>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{ct.rowLabels[ri]}</span>
                      <span>{ct.rowTotals[ri]}件</span>
                    </div>
                    <div className="flex h-5 w-full overflow-hidden rounded bg-slate-100">
                      {cells.map((n, ci) =>
                        n === 0 ? null : (
                          <div
                            key={ci}
                            className="flex items-center justify-center text-[10px] text-white"
                            style={{ width: `${(n / denom) * 100}%`, background: color(ci) }}
                            title={`${ct.colLabels[ci]}: ${n}`}
                          >
                            {n / denom > 0.12 ? ct.colLabels[ci] : ''}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 凡例 */}
            <ul className="mt-3 flex flex-wrap gap-3 text-xs">
              {ct.colLabels.map((c, ci) => (
                <li key={c} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(ci) }} />
                  <span className="text-slate-600">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {ct.excludedCount > 0 && (
            <p className="text-xs text-slate-400">
              ※ どちらかの設問に未回答だった {ct.excludedCount} 名は集計から除外しています。
            </p>
          )}
        </>
      )}
    </div>
  );
}

function QuestionSelect({
  label,
  value,
  onChange,
  questions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  questions: CrossQuestion[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
      >
        {questions.map((q) => (
          <option key={q.id} value={q.id}>
            Q{q.index + 1}. {q.text.slice(0, 30)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** クライアント側でクロス集計表を組み立てる（集計ロジック本体は crosstab.ts と共有） */
function computeCrossTab(
  rowQ: CrossQuestion,
  colQ: CrossQuestion,
  respondents: RespondentSelections[]
): CrossTab {
  const selections = respondents.map((r) => ({
    row: r[rowQ.id] ?? [],
    col: r[colQ.id] ?? [],
  }));
  return crossTabFromSelections(rowQ.options, colQ.options, selections);
}
