/**
 * 集計結果のグラフ表示。選択式の設問に対して、円グラフ（ドーナツ）と棒グラフを描く。
 * サーバーコンポーネントから使えるよう、SVGのみで状態を持たない。
 */

const PALETTE = [
  '#6366f1', // indigo-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
];

export interface ChartItem {
  label: string;
  count: number;
}

/** 円グラフ（ドーナツ）。複数選択で合計が回答数とずれる場合に備え total を別指定可。 */
function Donut({ items, total }: { items: ChartItem[]; total: number }) {
  const size = 132;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const sum = total > 0 ? total : 1;

  // 各セグメントの開始位置（累積割合）を事前計算し、描画中の再代入を避ける
  const fracs = items.map((it) => it.count / sum);
  const segments = fracs.map((frac, i) => ({
    frac,
    start: fracs.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32 shrink-0 -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f4f5" strokeWidth="18" />
      {segments.map((s, i) =>
        s.frac <= 0 ? null : (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth="18"
            strokeDasharray={`${s.frac * c} ${c - s.frac * c}`}
            strokeDashoffset={-s.start * c}
          />
        )
      )}
    </svg>
  );
}

export default function ResultChart({
  items,
  total,
  multiple = false,
}: {
  items: ChartItem[];
  total: number;
  multiple?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {/* 円グラフ＋凡例（単一選択系のみ。複数選択は割合の合計が100%にならないため棒グラフのみ） */}
      {!multiple && (
        <div className="flex items-center gap-3">
          <Donut items={items} total={total} />
          <ul className="space-y-1 text-xs">
            {items.map((it, i) => {
              const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="text-zinc-600">{it.label}</span>
                  <span className="text-zinc-600">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 棒グラフ */}
      <div className="flex-1 space-y-2">
        {items.map((it, i) => {
          const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
          const w = Math.round((it.count / max) * 100);
          return (
            <div key={i}>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>{it.label}</span>
                <span>
                  {it.count}件（{pct}%）
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded bg-zinc-100">
                <div
                  className="h-full rounded"
                  style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
