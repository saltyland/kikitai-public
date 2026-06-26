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

/* ───────── 各セクション専用の説明図（絵文字ではなく線画ダイアグラム） ───────── */

/** 01: 回答品質の評価AI ── カードに採点メーターと根拠タグが重なる図 */
function FigureScoring({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="359" height="279" rx="18" fill="none" stroke="#1f3a3a" strokeOpacity="0.12" />
      {/* 背後の回答カード（束） */}
      <rect x="50" y="46" width="190" height="150" rx="12" fill="none" stroke="#7cd8cd" strokeWidth="1.4" opacity="0.45" transform="rotate(-4 145 121)" />
      <rect x="58" y="40" width="190" height="150" rx="12" fill="#0f2c2a" stroke="#26a69a" strokeWidth="1.4" />
      <line x1="78" y1="68" x2="200" y2="68" stroke="#7cd8cd" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="86" x2="220" y2="86" stroke="#3a5654" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="100" x2="210" y2="100" stroke="#3a5654" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="118" x2="170" y2="118" stroke="#3a5654" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="150" x2="226" y2="150" stroke="#3a5654" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="164" x2="190" y2="164" stroke="#3a5654" strokeWidth="2.5" strokeLinecap="round" />
      {/* 採点メーター（円弧ゲージ） */}
      <g transform="translate(258 96)">
        <circle cx="0" cy="0" r="46" fill="#0a2120" stroke="#1f3a3a" strokeWidth="1.5" />
        <path d="M -32 23 A 46 46 0 1 1 32 23" fill="none" stroke="#234846" strokeWidth="8" strokeLinecap="round" />
        <path d="M -32 23 A 46 46 0 1 1 24 33" fill="none" stroke="#45beb2" strokeWidth="8" strokeLinecap="round" />
        <text x="0" y="6" textAnchor="middle" fontSize="22" fontWeight="800" fill="#e9fbf8">92</text>
        <text x="0" y="24" textAnchor="middle" fontSize="9" fill="#7cd8cd">/ 100</text>
      </g>
      {/* 根拠タグ */}
      <g fontSize="10" fontWeight="700" fill="#0f2c2a">
        <rect x="40" y="210" width="92" height="26" rx="13" fill="#7cd8cd" />
        <text x="86" y="227" textAnchor="middle">設問への適合</text>
        <rect x="140" y="210" width="92" height="26" rx="13" fill="#45beb2" />
        <text x="186" y="227" textAnchor="middle">具体性</text>
        <rect x="240" y="210" width="78" height="26" rx="13" fill="#26a69a" />
        <text x="279" y="227" textAnchor="middle" fill="#eafdfa">誠実さ</text>
      </g>
    </svg>
  );
}

/** 02: アンケートのAI自動作成 ── 一行の入力が枝分かれして設問群に変換される図 */
function FigureGeneration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="359" height="279" rx="18" fill="none" stroke="#1f3a3a" strokeOpacity="0.12" />
      {/* 入力：テーマ＋目的の1行 */}
      <rect x="28" y="120" width="120" height="40" rx="10" fill="#0f2c2a" stroke="#7cd8cd" strokeWidth="1.6" />
      <text x="88" y="135" textAnchor="middle" fontSize="9" fill="#7cd8cd" fontWeight="700">テーマ・目的</text>
      <text x="88" y="150" textAnchor="middle" fontSize="8" fill="#9fc9c5">「コーヒー文化調査」</text>

      {/* 変換ノード */}
      <circle cx="190" cy="140" r="24" fill="#0a2120" stroke="#45beb2" strokeWidth="1.8" />
      <path d="M182 132l2 2 2-3-2 9-2-3-2 2 2-7zM198 132l2 7-2-2-2 3-2-9 2 3 2-2z" fill="#45beb2" opacity="0" />
      <path d="M190 128l2.6 7.6 7.6 2.6-7.6 2.6-2.6 7.6-2.6-7.6-7.6-2.6 7.6-2.6z" fill="#7cd8cd" />
      <path d="M28 140h130" stroke="#26a69a" strokeWidth="2" strokeDasharray="3 4" />

      {/* 出力：分岐する設問群 */}
      {[
        { y: 60, w: 96 },
        { y: 104, w: 84 },
        { y: 148, w: 92 },
        { y: 192, w: 80 },
      ].map((q, i) => (
        <g key={i}>
          <path d={`M214 140 C232 140, 232 ${q.y + 12}, 252 ${q.y + 12}`} fill="none" stroke="#26a69a" strokeWidth="1.6" opacity="0.8" />
          <rect x="252" y={q.y} width={q.w} height="24" rx="8" fill="#0f2c2a" stroke="#3a5654" strokeWidth="1.2" />
          <circle cx="264" cy={q.y + 12} r="3" fill="#45beb2" />
          <line x1="274" y1={q.y + 12} x2={252 + q.w - 14} y2={q.y + 12} stroke="#5a7a78" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

/** 03: 信頼性モニタリング ── 回答の流れにスキャンラインが走り、不審な回答だけ捉える図 */
function FigureMonitoring({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="359" height="279" rx="18" fill="none" stroke="#1f3a3a" strokeOpacity="0.12" />
      {/* 回答が流れ込んでくるレーン */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 44 + i * 38;
        const flagged = i === 2;
        return (
          <g key={i}>
            <rect x="32" y={y} width="170" height="22" rx="6" fill={flagged ? '#3a1c1c' : '#0f2c2a'} stroke={flagged ? '#e76f6f' : '#2f4d4b'} strokeWidth="1.4" />
            <circle cx="46" cy={y + 11} r="3" fill={flagged ? '#e76f6f' : '#45beb2'} />
            <line x1="58" y1={y + 11} x2={flagged ? 130 : 178} y2={y + 11} stroke={flagged ? '#c97f7f' : '#4f6e6c'} strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      })}
      {/* 監視ゲート（盾型） */}
      <g transform="translate(252 36)">
        <path d="M40 0 L78 14 V58 C78 88 56 104 40 112 C24 104 2 88 2 58 V14 Z" fill="#0a2120" stroke="#45beb2" strokeWidth="1.8" />
        <path d="M22 58 L36 72 L60 42" fill="none" stroke="#7cd8cd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* 検知して止める矢印（赤いレーンからゲートへ） */}
      <path d="M205 99 C228 99, 232 90, 252 78" fill="none" stroke="#e76f6f" strokeWidth="1.8" strokeDasharray="3 4" markerEnd="url(#kk-intel-stop)" />
      <defs>
        <marker id="kk-intel-stop" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M1 1L9 5L1 9z" fill="#e76f6f" />
        </marker>
      </defs>
      <text x="180" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7cd8cd">公開中ずっと自動稼働</text>
    </svg>
  );
}

const FEATURES = [
  {
    no: '01',
    tag: 'Quality Scoring',
    title: '回答品質の評価AI',
    lead: '届いた回答ひとつひとつを、設問との適合度・具体性・誠実さの3軸でAIが採点します。',
    points: [
      '0〜100点のスコアと、何が評価されたかの根拠を併せて記録',
      '高品質な回答には付与ポイントをボーナス倍率で上乗せ',
      '研究者は集計後のデータをそのまま分析に使える状態で受け取れる',
    ],
    Figure: FigureScoring,
  },
  {
    no: '02',
    tag: 'AI Generation',
    title: 'アンケートのAI自動作成',
    lead: '調査テーマと目的を入力するだけで、設問の構成・選択肢・尋ね方をAIが下書きします。',
    points: [
      '単一回答・複数回答・自由記述など設問タイプを目的に応じて自動選択',
      '誘導的な聞き方やバイアスのかかった選択肢をAIが事前に検出',
      '生成後はすべて手動編集が可能。AIは“最初の一歩”を引き受けるだけ',
    ],
    Figure: FigureGeneration,
  },
  {
    no: '03',
    tag: 'Reliability Monitoring',
    title: '信頼性を守るアンケート監視',
    lead: 'アンケート作成時に有効化すると、公開期間中ずっと自動で回答を監視し続けます。',
    points: [
      'コピペ・無関係な入力・短時間の連続回答などの異常パターンを検知',
      '怪しい回答は集計前に自動でフィルタリングし、研究データを汚さない',
      '監視ログは作成者側の管理画面でいつでも確認できる',
    ],
    Figure: FigureMonitoring,
  },
];

/** 「キキタイ・インテリジェンス」専用ページ。トップのランディングとは別に、
 * 3つのAI機能を技術的な裏付けとして落ち着いたトーンで紹介する。 */
export default function IntelligencePage() {
  return (
    <div className="min-h-screen bg-[#0a1f1e] text-slate-100">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a1f1e]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="キキタイ トップ" className="text-white">
            <Logo className="text-white" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <IconArrowLeft className="h-4 w-4" />
            トップへ戻る
          </Link>
        </div>
      </header>

      <main>
        {/* ヒーロー */}
        <section className="relative overflow-hidden border-b border-white/10 px-4 py-24 sm:px-6 sm:py-32">
          {/* 背景：回路・ネットワークを思わせる静かな線画グリッド */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="kk-grid" width="64" height="64" patternUnits="userSpaceOnUse">
                <path d="M0 0H64M0 0V64" stroke="#45beb2" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#kk-grid)" />
          </svg>
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />

          <div className="relative mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-brand-300">
                Kikitai Intelligence
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white [text-wrap:balance] sm:text-5xl sm:leading-tight">
                データの「信頼できる量」を、
                <br />
                AIで設計する。
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-slate-300 [text-wrap:pretty] sm:text-base">
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
            className={`border-b border-white/10 px-4 py-20 sm:px-6 sm:py-28 ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
          >
            <div className="mx-auto max-w-5xl">
              <div className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <Reveal direction={i % 2 === 1 ? 'right' : 'left'}>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black leading-none text-white/15 sm:text-5xl">{f.no}</span>
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">{f.tag}</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold leading-snug text-white [text-wrap:balance] sm:text-3xl">
                    {f.title}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 [text-wrap:pretty] sm:text-base">
                    {f.lead}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {f.points.map((p) => (
                      <li key={p} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal direction={i % 2 === 1 ? 'left' : 'right'} delay={120}>
                  <f.Figure className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03]" />
                </Reveal>
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="px-4 py-20 text-center sm:px-6 sm:py-28">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-white [text-wrap:balance] sm:text-3xl">
              質の高いデータで、研究を前に進める。
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300 [text-wrap:pretty]">
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
