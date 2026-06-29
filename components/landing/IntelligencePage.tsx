'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { Reveal } from '@/components/ScrollReveal';

/* ───────── 装飾アイコン（絵文字は使わない方針のためすべてSVG） ───────── */

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/* ───────── 各セクション専用の説明図（シンプルな線画ダイアグラム／白背景トーン） ───────── */

/** 01: 回答品質の評価AI ── カードに採点メーターと根拠タグが重なる図 */
function FigureScoring({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" className={className} aria-hidden>
      {/* 背後の回答カード（束） */}
      <rect x="50" y="46" width="190" height="150" rx="12" fill="none" stroke="#b0eae2" strokeWidth="1.4" opacity="0.7" transform="rotate(-4 145 121)" />
      <rect x="58" y="40" width="190" height="150" rx="12" fill="#ffffff" stroke="#26a69a" strokeWidth="1.4" />
      <line x1="78" y1="68" x2="200" y2="68" stroke="#26a69a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="86" x2="220" y2="86" stroke="#dbe7e5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="100" x2="210" y2="100" stroke="#dbe7e5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="118" x2="170" y2="118" stroke="#dbe7e5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="150" x2="226" y2="150" stroke="#dbe7e5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="164" x2="190" y2="164" stroke="#dbe7e5" strokeWidth="2.5" strokeLinecap="round" />
      {/* 採点メーター（円弧ゲージ） */}
      <g transform="translate(258 96)">
        <circle cx="0" cy="0" r="46" fill="#ffffff" stroke="#d6f5f0" strokeWidth="1.5" />
        <path d="M -32 23 A 46 46 0 1 1 32 23" fill="none" stroke="#e6f6f3" strokeWidth="8" strokeLinecap="round" />
        <path d="M -32 23 A 46 46 0 1 1 24 33" fill="none" stroke="#26a69a" strokeWidth="8" strokeLinecap="round" />
        <text x="0" y="6" textAnchor="middle" fontSize="22" fontWeight="800" fill="#165653">92</text>
        <text x="0" y="24" textAnchor="middle" fontSize="9" fill="#19857d">/ 100</text>
      </g>
      {/* 根拠タグ */}
      <g fontSize="10" fontWeight="700" fill="#0f2c2a">
        <rect x="40" y="210" width="92" height="26" rx="13" fill="#b0eae2" />
        <text x="86" y="227" textAnchor="middle">設問への適合</text>
        <rect x="140" y="210" width="92" height="26" rx="13" fill="#7cd8cd" />
        <text x="186" y="227" textAnchor="middle">具体性</text>
        <rect x="240" y="210" width="78" height="26" rx="13" fill="#26a69a" />
        <text x="279" y="227" textAnchor="middle" fill="#ffffff">誠実さ</text>
      </g>
    </svg>
  );
}

/** 02: アンケートのAI自動作成 ── 一行の入力が枝分かれして設問群に変換される図 */
function FigureGeneration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" className={className} aria-hidden>
      {/* 入力：テーマ＋目的の1行 */}
      <rect x="28" y="120" width="120" height="40" rx="10" fill="#ffffff" stroke="#26a69a" strokeWidth="1.6" />
      <text x="88" y="135" textAnchor="middle" fontSize="9" fill="#176b66" fontWeight="700">テーマ・目的</text>
      <text x="88" y="150" textAnchor="middle" fontSize="8" fill="#5f8784">「コーヒー文化調査」</text>

      {/* 変換ノード */}
      <circle cx="190" cy="140" r="24" fill="#effbf9" stroke="#26a69a" strokeWidth="1.8" />
      <path d="M190 128l2.6 7.6 7.6 2.6-7.6 2.6-2.6 7.6-2.6-7.6-7.6-2.6 7.6-2.6z" fill="#19857d" />
      <path d="M28 140h130" stroke="#7cd8cd" strokeWidth="2" strokeDasharray="3 4" />

      {/* 出力：分岐する設問群（うち2問は品質シグナル＝色を変える） */}
      {[
        { y: 60, w: 96, signal: false },
        { y: 104, w: 84, signal: true },
        { y: 148, w: 92, signal: false },
        { y: 192, w: 80, signal: true },
      ].map((q, i) => (
        <g key={i}>
          <path d={`M214 140 C232 140, 232 ${q.y + 12}, 252 ${q.y + 12}`} fill="none" stroke="#7cd8cd" strokeWidth="1.6" opacity="0.9" />
          <rect x="252" y={q.y} width={q.w} height="24" rx="8" fill="#ffffff" stroke={q.signal ? '#26a69a' : '#dbe7e5'} strokeWidth={q.signal ? 1.6 : 1.2} />
          <circle cx="264" cy={q.y + 12} r="3" fill={q.signal ? '#19857d' : '#7cd8cd'} />
          <line x1="274" y1={q.y + 12} x2={252 + q.w - 14} y2={q.y + 12} stroke="#cdd9d7" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {/* 凡例：品質シグナル設問 */}
      <circle cx="260" cy="244" r="3" fill="#19857d" />
      <text x="268" y="248" fontSize="8" fill="#176b66">＝ 不正検知シグナル設問</text>
    </svg>
  );
}

/** 03: 信頼性モニタリング ── 回答の流れにスキャンラインが走り、不審な回答だけ捉える図 */
function FigureMonitoring({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" className={className} aria-hidden>
      {/* 回答が流れ込んでくるレーン */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 44 + i * 38;
        const flagged = i === 2;
        return (
          <g key={i}>
            <rect x="32" y={y} width="170" height="22" rx="6" fill={flagged ? '#fdf1f1' : '#ffffff'} stroke={flagged ? '#e76f6f' : '#e1ebe9'} strokeWidth="1.4" />
            <circle cx="46" cy={y + 11} r="3" fill={flagged ? '#e76f6f' : '#19857d'} />
            <line x1="58" y1={y + 11} x2={flagged ? 130 : 178} y2={y + 11} stroke={flagged ? '#e9a3a3' : '#cdd9d7'} strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      })}
      {/* 監視ゲート（盾型） */}
      <g transform="translate(252 36)">
        <path d="M40 0 L78 14 V58 C78 88 56 104 40 112 C24 104 2 88 2 58 V14 Z" fill="#effbf9" stroke="#26a69a" strokeWidth="1.8" />
        <path d="M22 58 L36 72 L60 42" fill="none" stroke="#19857d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* 検知して止める矢印（赤いレーンからゲートへ） */}
      <path d="M205 99 C228 99, 232 90, 252 78" fill="none" stroke="#e76f6f" strokeWidth="1.8" strokeDasharray="3 4" markerEnd="url(#kk-intel-stop)" />
      <defs>
        <marker id="kk-intel-stop" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M1 1L9 5L1 9z" fill="#e76f6f" />
        </marker>
      </defs>
      <text x="180" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill="#176b66">公開中ずっと自動稼働</text>
    </svg>
  );
}

type Feature = {
  no: string;
  tag: string;
  title: string;
  /** 手法を一行で示す学術的なサブラベル（Method 行） */
  method: string;
  lead: string;
  points: string[];
  /** 図のキャプション（「図1 ── …」の本文部分） */
  caption: string;
  Figure: (props: { className?: string }) => React.ReactElement;
};

const FEATURES: Feature[] = [
  {
    no: '01',
    tag: 'Response Quality Assessment',
    title: '回答品質の評価AI',
    method: '機械フィルタ層 × 自社品質モデル × 大規模言語モデルの三層構成',
    lead:
      '届いた回答ひとつひとつを、設問への適合度・回答の具体性・誠実性といった複数の観点から、多層構成の評価エンジンがスコア化します。汎用AIに丸投げするのではなく、品質判定に特化した自社システムを評価の軸に据えているのが核心です。',
    points: [
      '三層パイプライン：流し読み・連続投稿・定型コピペなど物理的・論理的に確実に弾ける回答は、軽量な機械フィルタ層が即時に処理する。意味の理解を要するグレーな回答だけを上位の評価層へ送り、判定コストと精度を両立させる責務分離設計。',
      'アテンション機構：アンケート内に「正解が一意に定まる確認設問」を組み込み、設問文を読まずに惰性で回答する人間・ボットを検出する。回答が“設問を読んだ上でのものか”という注意（attention）そのものを検査し、明確な誤答はその場で無効化する。',
      '自社開発の品質特化モデル：回答を自前のローカルエンコーダで意味ベクトルへ変換し、古典的な機械学習分類器が品質を判定する独自経路を構築。実際の回答を人手でラベリングして較正しており、外部にデータを送らずに動作する非送信ルートを持つ。',
      '意味的関連性の照合：アンケート設計時に一度だけ「望ましい回答が占める意味的な領域」を生成しておき、各回答との意味的な近さを測る。これにより、設問と噛み合わない・はぐらかし・中身の薄い回答を、表層の単語一致ではなく意味で捉える。',
      '二重評価と非対称コスト設計：ルールベース判定とAI判定を常に突き合わせ、両者が大きく食い違うときは保守的に扱う。「真面目な回答を誤って弾く損失」を最も重く見積もり、疑わしい回答も即破棄せず段階的に降格・救済する。',
      '操作耐性：回答テキストに紛れ込んだ「満点をつけろ」等の指示を検出し、加点ではなく誠実性の減点材料として扱う。AIスコア単独では破棄を確定させない多重防御。',
    ],
    caption: '機械フィルタ・自社品質モデル・LLMを束ねる多層評価パイプライン。各回答にスコアと根拠が併記される。',
    Figure: FigureScoring,
  },
  {
    no: '02',
    tag: 'AI Survey Generation',
    title: 'アンケートのAI自動生成',
    method: '他社LLM × キキタイ専用スキーマ × 不正検知設問の自動設計',
    lead:
      '調査テーマと目的を入力するだけで、他社の大規模言語モデル（LLM）を基盤に、キキタイの品質評価パイプラインへ最適化されたアンケートを設計します。単なる設問の下書きではなく、雑な回答・不正を構造から防ぐ「品質シグナル」を織り込んで生成するのが特徴です。',
    points: [
      'キキタイ専用への最適化：汎用LLMの出力をそのまま使うのではなく、評価エンジンが解釈できる構造化スキーマ（各設問の役割タグ）に沿って生成する。生成されたアンケートは、そのまま回答品質AIの評価対象として接続できる。',
      'アテンションチェックの自動埋め込み：正解が一意に定まる確認設問を中盤〜後半へ自動配置し、設問を読み飛ばす流し読み・ボットを構造的に検出できるようにする。',
      '矛盾検出ペアの自動設計：同一の概念を異なる表現で二度尋ねる設問ペアを自動で組み込み、回答の前後の食い違いから、いい加減な回答を炙り出す。',
      '自由記述シグナルの戦略的配置：評価尺度の設問直後に自由記述を置くなど、回答品質AIが意味を評価しやすい構造を設計に織り込む。導入→本題→詳細の3段構成や設問タイプの配分といった、学術調査の作法にも沿う。',
      '構造とAI監視の「両輪」：自動生成されたアンケート構造そのものと、公開中ずっと働くAIの不正監視（次節）。この二つが噛み合うことで、雑・手抜き・不正な回答を入口（設計）と出口（監視）の両方で止める。',
      '生成後はすべて手動編集が可能。AIは設計の土台を引き受けるだけで、最終的な意思決定は研究者の手に残る。',
    ],
    caption: '1行の入力が、品質シグナル（不正検知設問）を内包したアンケートへ展開される。',
    Figure: FigureGeneration,
  },
  {
    no: '03',
    tag: 'Reliability Monitoring',
    title: '信頼性を守るアンケート監視',
    method: '機械シグナル × ハニーポット × 近傍重複検出の常時稼働',
    lead:
      'アンケート作成時に有効化すると、公開期間中ずっと自動で回答を監視し続けます。②で設計に織り込んだ品質シグナルを、収集の現場で実際に発火させる「もう一方の車輪」です。',
    points: [
      'コピペ・無関係な入力・短時間の連続回答などの異常パターンを検知。回答間の近傍重複や、人間には見えない隠し項目（ハニーポット）への入力も手がかりにする。',
      '怪しい回答は集計前に自動でフィルタリングし、研究データを汚さない。確実なものだけを破棄し、グレーは保持して上位の意味評価へ申し送る。',
      '監視ログは作成者側の管理画面でいつでも確認でき、なぜその判定になったかの根拠も追える。',
    ],
    caption: '流れ込む回答を常時スキャンし、異常パターンの回答だけを集計前に捕捉する。',
    Figure: FigureMonitoring,
  },
];

/** 「キキタイ・インテリジェンス」専用ページ。トップのランディングとは別に、
 * 3つのAI機能を技術的な裏付けとして、論文の手法節のような落ち着いたトーンで紹介する。 */
export default function IntelligencePage() {
  return (
    <div className="min-h-screen bg-white text-slate-700">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="キキタイ トップ" className="text-brand-700">
            <Logo className="text-brand-700" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-600"
          >
            <IconArrowLeft className="h-4 w-4" />
            トップへ戻る
          </Link>
        </div>
      </header>

      <main>
        {/* ヒーロー */}
        <section className="px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="text-xs font-semibold tracking-[0.2em] text-brand-600">
                KIKITAI INTELLIGENCE
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-4 text-4xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-6xl">
                Intelligence
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <div className="mx-auto mt-6 h-px w-12 bg-brand-400" />
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 text-xl font-bold leading-snug text-slate-700 [text-wrap:balance] sm:text-2xl">
                データの「信頼できる量」を、AIで設計する。
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-slate-500 [text-wrap:pretty] sm:text-base">
                キキタイは「回答し合う」という性質上、回答の量だけでなく質が重要になります。
                作成・収集・評価のすべての工程に専用のAIを組み込み、
                研究にそのまま使えるデータを設計段階から守ります。
              </p>
            </Reveal>
          </div>
        </section>

        {/* 3機能セクション */}
        {FEATURES.map((f, i) => (
          <section
            key={f.no}
            className={`border-t border-slate-100 px-4 py-20 sm:px-6 sm:py-28 ${i % 2 === 1 ? 'bg-slate-50/70' : ''}`}
          >
            <div className="mx-auto max-w-5xl">
              <div className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <Reveal direction={i % 2 === 1 ? 'right' : 'left'}>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs font-semibold tracking-wide text-brand-600">{f.no}</span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <h3 className="mt-4 text-xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-2xl">
                    {f.tag}
                  </h3>
                  <h2 className="mt-1 text-base font-semibold leading-snug text-slate-500 [text-wrap:balance] sm:text-lg">
                    {f.title}
                  </h2>
                  <p className="mt-3 text-xs font-medium tracking-wide text-brand-600/80">{f.method}</p>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-500 [text-wrap:pretty] sm:text-base">
                    {f.lead}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {f.points.map((p) => (
                      <li key={p} className="flex gap-3 text-sm leading-relaxed text-slate-500">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal direction={i % 2 === 1 ? 'left' : 'right'} delay={120}>
                  <figure className="m-0">
                    <f.Figure className="w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-sm" />
                    <figcaption className="mt-3 max-w-md text-xs leading-relaxed text-slate-400">
                      {f.caption}
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="border-t border-slate-100 px-4 py-20 text-center sm:px-6 sm:py-28">
          <Reveal>
            <span className="text-xs font-semibold tracking-[0.2em] text-brand-600">GET STARTED</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 [text-wrap:balance] sm:text-3xl">
              質の高いデータで、研究を前に進める。
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500 [text-wrap:pretty]">
              キキタイ・インテリジェンスは、すべてのアンケートで自動的に有効です。
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/register" className="btn-3d btn-3d-primary px-7 py-3 text-base">
                無料ではじめる
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
