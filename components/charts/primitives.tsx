/**
 * グラフ描画プリミティブ（SVG・状態なし）。
 * サーバーコンポーネント（学術レポート）からもクライアントの
 * チャート切替（Proの集計グラフ）からも同じ部品を使えるよう、
 * フックを持たない純粋な描画関数だけを置く。
 */

/** 設問集計の共通カラーパレット（円・棒・ヒートマップで統一） */
export const PALETTE = [
  '#26a69a', // brand-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
  '#3b82f6', // blue-500
  '#f97316', // orange-500
];

export function color(i: number): string {
  return PALETTE[i % PALETTE.length];
}

export interface ChartItem {
  label: string;
  count: number;
}

/** 円グラフ（ドーナツ）。multiple では合計が回答数とずれるため total を別指定可。 */
export function Donut({ items, total }: { items: ChartItem[]; total: number }) {
  const size = 132;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const sum = total > 0 ? total : 1;

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
            stroke={color(i)}
            strokeWidth="18"
            strokeDasharray={`${s.frac * c} ${c - s.frac * c}`}
            strokeDashoffset={-s.start * c}
          />
        )
      )}
    </svg>
  );
}

/** 円グラフの色凡例（割合つき） */
export function Legend({ items, total }: { items: ChartItem[]; total: number }) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map((it, i) => {
        const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
        return (
          <li key={i} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color(i) }} />
            <span className="text-slate-600">{it.label}</span>
            <span className="text-slate-400">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

/** 横棒グラフ（ラベル＋件数＋割合）。既存の集計グラフと同じ見た目。 */
export function HBar({
  items,
  total,
}: {
  items: ChartItem[];
  total: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="flex-1 space-y-2">
      {items.map((it, i) => {
        const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
        const w = Math.round((it.count / max) * 100);
        return (
          <div key={i}>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{it.label}</span>
              <span>
                {it.count}件（{pct}%）
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded"
                style={{ width: `${w}%`, background: color(i) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 縦棒グラフ（カテゴリ別の件数を縦棒で）。SVGで描画。 */
export function VBar({ items, total }: { items: ChartItem[]; total: number }) {
  const n = items.length;
  if (n === 0) return null;
  const W = Math.max(280, n * 64);
  const H = 200;
  const padBottom = 44;
  const padTop = 16;
  const max = Math.max(1, ...items.map((i) => i.count));
  const bandW = W / n;
  const barW = Math.min(48, bandW * 0.6);
  const plotH = H - padBottom - padTop;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      {/* 横の目盛り線 */}
      {[0, 0.5, 1].map((t) => {
        const y = padTop + plotH * (1 - t);
        return (
          <line key={t} x1={0} y1={y} x2={W} y2={y} stroke="#e5e7eb" strokeWidth={1} />
        );
      })}
      {items.map((it, i) => {
        const h = Math.round((it.count / max) * plotH);
        const x = i * bandW + (bandW - barW) / 2;
        const y = padTop + plotH - h;
        const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={3} fill={color(i)} />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={10}
            >
              {it.count}
            </text>
            <text
              x={x + barW / 2}
              y={H - padBottom + 14}
              textAnchor="middle"
              className="fill-slate-600"
              fontSize={10}
            >
              {truncate(it.label, 6)}
            </text>
            <text
              x={x + barW / 2}
              y={H - padBottom + 28}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={9}
            >
              {pct}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 度数分布ヒストグラム（スケール設問向け）。
 * items はスケール値（昇順）の度数。平均値に縦線を引く。
 */
export function Histogram({
  items,
  mean,
}: {
  items: ChartItem[];
  mean?: number | null;
}) {
  const n = items.length;
  if (n === 0) return null;
  const W = Math.max(280, n * 56);
  const H = 200;
  const padBottom = 28;
  const padTop = 16;
  const padLeft = 4;
  const max = Math.max(1, ...items.map((i) => i.count));
  const bandW = (W - padLeft) / n;
  const barW = bandW * 0.8;
  const plotH = H - padBottom - padTop;

  // 平均値のX位置（ラベルが数値である前提。非数値なら線は描かない）
  const numericLabels = items.map((it) => Number(it.label));
  const allNumeric = numericLabels.every((v) => !Number.isNaN(v));
  let meanX: number | null = null;
  if (allNumeric && mean != null && n > 1) {
    const lo = numericLabels[0];
    const hi = numericLabels[n - 1];
    if (hi > lo) {
      const t = (mean - lo) / (hi - lo);
      meanX = padLeft + bandW / 2 + t * (W - padLeft - bandW);
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      {items.map((it, i) => {
        const h = Math.round((it.count / max) * plotH);
        const x = padLeft + i * bandW + (bandW - barW) / 2;
        const y = padTop + plotH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill="#26a69a" opacity={0.85} />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={10}
            >
              {it.count}
            </text>
            <text
              x={x + barW / 2}
              y={H - padBottom + 16}
              textAnchor="middle"
              className="fill-slate-600"
              fontSize={11}
            >
              {it.label}
            </text>
          </g>
        );
      })}
      {meanX != null && (
        <g>
          <line
            x1={meanX}
            y1={padTop}
            x2={meanX}
            y2={padTop + plotH}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x={meanX} y={padTop - 4} textAnchor="middle" className="fill-red-500" fontSize={10}>
            平均 {mean?.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
