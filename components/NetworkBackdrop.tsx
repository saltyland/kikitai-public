/**
 * 画面に固定される“動かない”抽象ネットワーク背景。
 *
 * GameFreak のビジョンページのように、コンテンツだけがスクロールし
 * 背景はビューポートに貼り付いたまま（fixed）になることで、奥行きのある
 * 「世界の上を歩いている」体験をつくる。モチーフは “アンケートで人と人が
 * つながる輪”。ノード（人・調査）をエッジ（回答のやり取り）が結ぶ、
 * IT的で美しい抽象グラフを brand（ティール）系で描く。
 *
 * 装飾なので aria-hidden。pointer-events も無効化し操作を一切妨げない。
 * 低速設定（prefers-reduced-motion）では globals.css 側でアニメを止める。
 */

/** ノード定義（viewBox 1440x900 上の座標） */
type Node = { x: number; y: number; r: number; /** 大きな“調査”ノードか */ hub?: boolean; delay?: number };

const NODES: Node[] = [
  { x: 210, y: 180, r: 7, hub: true, delay: 0 },
  { x: 470, y: 110, r: 4, delay: 1.2 },
  { x: 620, y: 300, r: 9, hub: true, delay: 0.6 },
  { x: 360, y: 380, r: 4, delay: 2.1 },
  { x: 150, y: 480, r: 5, delay: 1.6 },
  { x: 540, y: 560, r: 4, delay: 0.3 },
  { x: 820, y: 170, r: 5, delay: 2.4 },
  { x: 980, y: 360, r: 10, hub: true, delay: 0.9 },
  { x: 760, y: 470, r: 4, delay: 1.9 },
  { x: 1130, y: 200, r: 4, delay: 0.4 },
  { x: 1250, y: 420, r: 6, hub: true, delay: 1.4 },
  { x: 1080, y: 600, r: 4, delay: 2.7 },
  { x: 880, y: 690, r: 5, delay: 0.8 },
  { x: 1300, y: 720, r: 4, delay: 2.0 },
  { x: 320, y: 700, r: 5, hub: true, delay: 1.1 },
  { x: 600, y: 800, r: 4, delay: 2.3 },
  { x: 100, y: 760, r: 4, delay: 0.5 },
];

/** つながり（ノードindexのペア）。回答のやり取り＝双方向の輪を表現 */
const EDGES: [number, number][] = [
  [0, 1], [0, 3], [0, 4], [1, 2], [2, 3], [2, 5], [2, 6],
  [3, 4], [4, 16], [5, 14], [6, 7], [7, 8], [7, 9], [7, 10],
  [8, 5], [8, 12], [9, 10], [10, 11], [10, 13], [11, 12],
  [12, 13], [12, 15], [14, 4], [14, 15], [14, 16], [15, 12],
  [2, 8], [6, 9],
];

export default function NetworkBackdrop() {
  return (
    <div
      aria-hidden
      className="kk-netbg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 奥のやわらかな発光（ティールのオーロラ）。fixed なので背景が動かない */}
      <div className="kk-netbg-glow" />

      <svg
        className="kk-netbg-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* エッジ用：中央が明るく、両端へフェードする線グラデーション */}
          <linearGradient id="kkEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-300)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--color-brand-400)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-brand-300)" stopOpacity="0.05" />
          </linearGradient>
          {/* ノードの放射グラデーション */}
          <radialGradient id="kkNode" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-brand-300)" />
            <stop offset="100%" stopColor="var(--color-brand-500)" />
          </radialGradient>
          <radialGradient id="kkHub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="var(--color-brand-300)" />
            <stop offset="100%" stopColor="var(--color-brand-600)" />
          </radialGradient>
          {/* ノードのにじみ（glow） */}
          <filter id="kkSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* エッジ（つながり）。淡く描いて読みやすさを保つ */}
        <g className="kk-netbg-edges">
          {EDGES.map(([a, b], i) => {
            const n1 = NODES[a];
            const n2 = NODES[b];
            const mid = (n1.r + n2.r) / 2;
            return (
              <line
                key={i}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke="url(#kkEdge)"
                strokeWidth={mid > 6 ? 1.6 : 1}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* エッジ上を流れる光の粒（“回答が行き交う”様子）。一部のエッジだけ */}
        <g className="kk-netbg-pulses">
          {[ [0, 1], [3, 4], [6, 7], [9, 10], [11, 12], [14, 15], [2, 8], [6, 9] ].map(([a, b], i) => {
            const n1 = NODES[a];
            const n2 = NODES[b];
            return (
              <circle key={i} r="2.4" fill="var(--color-brand-200)">
                <animateMotion
                  dur={`${5 + (i % 4)}s`}
                  begin={`${i * 0.7}s`}
                  repeatCount="indefinite"
                  path={`M${n1.x},${n1.y} L${n2.x},${n2.y}`}
                  keyPoints="0;1"
                  keyTimes="0;1"
                  calcMode="linear"
                />
                <animate attributeName="opacity" values="0;0.9;0" dur={`${5 + (i % 4)}s`} begin={`${i * 0.7}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
        </g>

        {/* ノード（人・調査）。hub は大きく白く光らせ“調査”を強調 */}
        <g className="kk-netbg-nodes">
          {NODES.map((n, i) => (
            <g key={i} style={{ ['--kk-pulse-delay' as string]: `${n.delay ?? 0}s` }}>
              {/* にじみ */}
              <circle cx={n.x} cy={n.y} r={n.r * 2.4} fill="var(--color-brand-300)" opacity={n.hub ? 0.28 : 0.16} filter="url(#kkSoft)" />
              {/* 拍動するリング（hubのみ） */}
              {n.hub && (
                <circle
                  className="kk-netbg-ring"
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill="none"
                  stroke="var(--color-brand-400)"
                  strokeWidth="1.2"
                />
              )}
              {/* 本体 */}
              <circle cx={n.x} cy={n.y} r={n.r} fill={`url(#${n.hub ? 'kkHub' : 'kkNode'})`} />
            </g>
          ))}
        </g>
      </svg>

      {/* 上からの淡いベール：本文の可読性を確保しつつ世界観を残す */}
      <div className="kk-netbg-veil" />
    </div>
  );
}
