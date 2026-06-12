'use client';

import type { QuestionType, SectionMeta } from '@/lib/types/database';

/** 分岐フロー描画に必要な最小の設問情報。 */
export interface FlowQuestion {
  key: string;
  type: QuestionType;
  text: string;
  section_index: number;
  condition: { sourceKey: string; optionText: string } | null;
}

/**
 * 分岐（条件付き表示）のフローチャート可視化。
 *
 * 設問をノード、表示条件をエッジとして描画する。React Flow を使わず軽量な SVG で
 * 自己完結させている（依存追加なし）。
 * - 縦方向の細い線：通常の出題順（上から下）。
 * - 右側の曲線矢印：条件付き表示（「この選択肢を選んだ人だけ次の設問へ」）。
 */
const NODE_H = 56;
const GAP = 30;
const NODE_W = 280;
const NODE_X = 16;
const GUTTER = 150; // 条件アークを描く右側の余白

const LABEL: Record<QuestionType, string> = {
  single: '1つ選択',
  multiple: '複数選択',
  dropdown: 'プルダウン',
  text: '短文',
  paragraph: '長文',
  date: '日付',
  scale: '段階評価',
  grid: 'グリッド',
  attention: '注意チェック',
};

export default function BranchFlow({
  questions,
  sections,
}: {
  questions: FlowQuestion[];
  sections: SectionMeta[];
}) {
  // セクション順に並べる（出題順）
  const ordered = [...questions].sort((a, b) => a.section_index - b.section_index);
  const yOf = (i: number) => 12 + i * (NODE_H + GAP);
  const indexByKey = new Map(ordered.map((q, i) => [q.key, i]));
  const height = 12 + ordered.length * (NODE_H + GAP) + 12;
  const width = NODE_X + NODE_W + GUTTER;

  const conditionEdges = ordered
    .map((q, i) => {
      if (!q.condition) return null;
      const from = indexByKey.get(q.condition.sourceKey);
      if (from === undefined) return null;
      return { fromIndex: from, toIndex: i, label: q.condition.optionText };
    })
    .filter((e): e is { fromIndex: number; toIndex: number; label: string } => e !== null);

  if (ordered.length === 0) {
    return <p className="p-6 text-center text-sm text-zinc-400">設問がありません。</p>;
  }

  const hasConditions = conditionEdges.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-zinc-300" /> 出題順
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-amber-500" /> 条件付き表示
        </span>
        {!hasConditions && <span className="text-zinc-400">（条件付き表示はまだ設定されていません）</span>}
      </div>
      <div className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-50/60 p-2">
        <svg width={width} height={height} className="min-w-full">
          {/* 通常の出題順（縦の連結線） */}
          {ordered.slice(0, -1).map((q, i) => (
            <line
              key={`seq-${q.key}`}
              x1={NODE_X + NODE_W / 2}
              y1={yOf(i) + NODE_H}
              x2={NODE_X + NODE_W / 2}
              y2={yOf(i + 1)}
              stroke="#d4d4d8"
              strokeWidth={2}
            />
          ))}

          {/* 条件付き表示（右側に膨らむ曲線矢印） */}
          {conditionEdges.map((e, idx) => {
            const y1 = yOf(e.fromIndex) + NODE_H / 2;
            const y2 = yOf(e.toIndex) + NODE_H / 2;
            const startX = NODE_X + NODE_W;
            const bulge = NODE_X + NODE_W + 40 + (idx % 3) * 32;
            const midY = (y1 + y2) / 2;
            return (
              <g key={`cond-${idx}`}>
                <path
                  d={`M ${startX} ${y1} C ${bulge} ${y1}, ${bulge} ${y2}, ${startX} ${y2}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
                <text x={bulge + 4} y={midY} fontSize={10} fill="#b45309" dominantBaseline="middle">
                  {e.label.length > 12 ? e.label.slice(0, 12) + '…' : e.label}
                </text>
              </g>
            );
          })}

          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* ノード */}
          {ordered.map((q, i) => {
            const isTarget = !!q.condition;
            return (
              <foreignObject key={q.key} x={NODE_X} y={yOf(i)} width={NODE_W} height={NODE_H}>
                <div
                  className={`flex h-full flex-col justify-center rounded-lg border px-3 py-1 text-xs ${
                    isTarget ? 'border-amber-300 bg-amber-50' : 'border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium text-zinc-800">
                      {q.text.trim() || '（無題の設問）'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 pl-6 text-[10px] text-zinc-400">
                    <span>{LABEL[q.type]}</span>
                    <span>セクション{q.section_index + 1}</span>
                    {isTarget && <span className="text-amber-600">条件付き</span>}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>
      {sections.length > 1 && (
        <p className="text-[11px] text-zinc-400">
          ※ セクションは {sections.length} 個あります。番号順に出題されます。
        </p>
      )}
    </div>
  );
}
