import Link from 'next/link';
import Logo, { LogoMark } from '@/components/Logo';
import { Reveal, ScrollProgressBar, AuroraBackground, SceneNav } from '@/components/ScrollReveal';

/** 右端の章インデックスに表示するシーン一覧（順序＝スクロール順） */
const SCENES = [
  { id: 'top', label: 'キキタイ' },
  { id: 'story', label: '課題' },
  { id: 'how', label: '仕組み' },
  { id: 'features', label: '機能' },
  { id: 'intelligence', label: 'AI評価', dark: true },
  { id: 'free', label: '無料' },
  { id: 'cta', label: 'はじめる' },
];

/* 装飾用の小さなアイコン（絵文字は使わない方針のため、すべてSVG） */

function IconBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="6" cy="5" r="2.5" />
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M6 7.5v9M8 6.5l7.5 4M8 17.5l7.5-4" />
    </svg>
  );
}
function IconStep({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M19 9l3 3-3 3M8 12h5" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 20V8M10 20V4M16 20v-7M21 20H3" />
    </svg>
  );
}
function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" />
    </svg>
  );
}
function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}
function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
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
function IconArrowDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}
function IconCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h3.2a1.8 1.8 0 010 3.6H9.8M9.5 13.1h3.4a1.8 1.8 0 010 3.6H10" />
    </svg>
  );
}
function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 15l6-6" />
      <path d="M11 6.5l1-1a3.5 3.5 0 015 5l-1 1" />
      <path d="M13 17.5l-1 1a3.5 3.5 0 01-5-5l1-1" />
    </svg>
  );
}
function IconTable({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M9 4v16" />
    </svg>
  );
}
function IconWand({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 20L15 9" />
      <path d="M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
      <path d="M18 13l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7.7-1.4z" />
    </svg>
  );
}
function IconBan({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M6.5 6.5l11 11" />
    </svg>
  );
}
function IconBrain({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 4.5a2.5 2.5 0 00-2.5 2.5v.2A2.8 2.8 0 004 9.8v.4a2.8 2.8 0 001 2.1 2.6 2.6 0 00-.4 1.4 2.8 2.8 0 002.8 2.8h.1V19a2.5 2.5 0 005 0V7a2.5 2.5 0 00-2.5-2.5z" />
      <path d="M15 4.5A2.5 2.5 0 0117.5 7v.2a2.8 2.8 0 012.5 2.6v.4a2.8 2.8 0 01-1 2.1 2.6 2.6 0 01.4 1.4 2.8 2.8 0 01-2.8 2.8h-.1V19a2.5 2.5 0 01-5 0V7" />
    </svg>
  );
}

/** ヒーロー右側：実際の回答画面を模したモックカード */
function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* 後ろに重なるカード */}
      <div className="absolute -left-4 top-6 h-full w-full rotate-[-4deg] rounded-3xl bg-brand-200/50" aria-hidden />
      <div className="card-3d kk-float relative rotate-[2deg] p-6 sm:p-7" style={{ ['--kk-rot' as string]: '2deg' }}>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold text-brand-600">質問 2 / 5</span>
          <span>研究室のコーヒー文化調査</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
          <div className="h-full w-2/5 rounded-full bg-brand-500" />
        </div>
        <p className="mt-5 text-base font-bold text-slate-800">
          作業中によく飲むものは？
        </p>
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-500 bg-white">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
            </span>
            コーヒー
          </div>
          {['紅茶・お茶', 'エナジードリンク', '水・その他'].map((label) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600"
            >
              <span className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
              {label}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <span className="btn-3d btn-3d-primary px-5 py-2 text-sm">次へ</span>
        </div>
      </div>
      {/* 浮かぶポイントチップ */}
      <div className="card-3d kk-float kk-float-delay absolute -right-3 -top-5 px-4 py-2 text-sm font-extrabold text-brand-600 sm:-right-8" style={{ ['--kk-rot' as string]: '6deg' }}>
        +15pt 獲得
      </div>
      <div className="card-3d kk-float-slow absolute -bottom-5 -left-3 flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 sm:-left-8" style={{ ['--kk-rot' as string]: '-5deg' }}>
        <IconSparkle className="h-4 w-4 text-brand-500" />
        AI品質スコア 92点
      </div>
    </div>
  );
}

/** 大きな章番号ラベル（ゲームフリーク風のスクロール章立て） */
function SectionKicker({ no, label }: { no: string; label: string }) {
  return (
    <Reveal direction="left" className="mb-4 flex items-center gap-3">
      <span className="text-5xl font-black leading-none text-brand-200 sm:text-6xl">{no}</span>
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-500">{label}</span>
    </Reveal>
  );
}

/** 未ログイン時のトップページ（ランディング） */
export default function LandingPage() {
  return (
    <>
      <ScrollProgressBar />
      <SceneNav scenes={SCENES} />

      {/* ヘッダー：左ロゴ／右ナビ＋ログイン・新規登録 */}
      <header className="glass sticky top-0 z-30 border-b border-brand-100/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="キキタイ トップ">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <a href="#story" className="relative hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-500 after:transition-all after:duration-300 hover:after:w-full sm:inline">
              キキタイとは
            </a>
            <a href="#how" className="relative hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-500 after:transition-all after:duration-300 hover:after:w-full sm:inline">
              使い方
            </a>
            <a href="#features" className="relative hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-500 after:transition-all after:duration-300 hover:after:w-full sm:inline">
              機能
            </a>
            <Link
              href="/login"
              className="px-2 py-1.5 text-sm font-bold text-slate-600 hover:text-brand-600"
            >
              ログイン
            </Link>
            <Link href="/register" className="btn-3d btn-3d-primary px-4 py-2 text-sm">
              無料ではじめる
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ───────── ヒーロー ───────── */}
        <section id="top" className="kk-scene relative flex min-h-screen items-center overflow-hidden">
          <AuroraBackground />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-bold text-brand-700">
                  <LogoMark className="h-4" />
                  学生・研究者のためのアンケート交換プラットフォーム
                </p>
              </Reveal>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl">
                <Reveal direction="up" delay={80} className="overflow-hidden">こたえて、</Reveal>
                <Reveal direction="up" delay={220} className="overflow-hidden">あつめる。</Reveal>
                <Reveal direction="up" delay={360} className="overflow-hidden">
                  <span className="text-brand-600">研究の輪。</span>
                </Reveal>
              </h1>
              <Reveal delay={520}>
                <p className="mt-6 max-w-[46ch] text-base leading-7 text-slate-700 [text-wrap:pretty] sm:text-lg sm:leading-8">
                  「アンケートの回答者が集まらない」を、お互いさまで解決。
                  他の人のアンケートに答えてポイントを貯め、そのポイントで
                  あなたの研究に回答者を集めましょう。
                </p>
              </Reveal>
              <Reveal delay={640}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/register" className="btn-3d btn-3d-primary px-7 py-3 text-base">
                    無料ではじめる
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/login" className="btn-3d btn-3d-secondary px-7 py-3 text-base">
                    ログイン
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={760}>
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                  {['登録は無料', '非公開ならGoogleフォーム感覚でずっと無料', 'AIが質問を自動作成', '独自AI評価で悪質回答を自動ブロック'].map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <IconCheckCircle className="h-4 w-4 text-brand-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <Reveal direction="scale" delay={300}>
              <HeroMock />
            </Reveal>
          </div>

          {/* スクロール誘導 */}
          <a
            href="#story"
            className="absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-xs font-bold tracking-widest text-brand-500"
            aria-label="下へスクロール"
          >
            SCROLL
            <IconArrowDown className="kk-scroll-cue h-5 w-5" />
          </a>
        </section>

        {/* ───────── 01 課題（ストーリー導入） ───────── */}
        <section id="story" className="kk-scene relative flex min-h-screen scroll-mt-16 items-center overflow-hidden py-24 sm:py-32">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <SectionKicker no="01" label="The Problem" />
              <Reveal>
                <h2 className="text-3xl font-extrabold leading-snug text-slate-900 [text-wrap:balance] sm:text-4xl">
                  作ったのに、
                  <br />
                  <span className="inline-block text-slate-400">だれも答えてくれない。</span>
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-5 max-w-[44ch] text-base leading-7 text-slate-700 [text-wrap:pretty]">
                  研究や授業課題でアンケートを作っても、回答者が集まらない。
                  かといって、誰かのアンケートに答えても自分には何のメリットもない——。
                  この“片道通行”が、データ集めをいつも難しくしていました。
                </p>
              </Reveal>
            </div>
            <Reveal direction="right" delay={120}>
              <div className="relative mx-auto max-w-sm">
                <div className="card-3d kk-float-slow p-6" style={{ ['--kk-rot' as string]: '-2deg' }}>
                  <p className="text-sm font-bold text-slate-700">あなたのアンケート</p>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-slate-200" />
                    <div className="h-2 w-full rounded-full bg-slate-200" />
                    <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-xs text-slate-400">回答数</span>
                    <span className="text-2xl font-extrabold text-slate-300">0</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────── 02 解決＝回答し合う経済圏（3ステップ） ───────── */}
        <section id="how" className="kk-scene relative flex min-h-screen scroll-mt-16 items-center overflow-hidden bg-white/40 py-24 sm:py-32">
          <AuroraBackground className="opacity-60" />
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionKicker no="02" label="The Loop" />
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-extrabold leading-snug text-slate-900 [text-wrap:balance] sm:text-4xl">
                答えるほど、集まる。
                <br />
                <span className="inline-block text-brand-600">“回答し合う”経済圏。</span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-4 max-w-[48ch] text-base leading-7 text-slate-700 [text-wrap:pretty]">
                回答するとポイントが貯まり、そのポイントで自分のアンケートに回答者を集められる。
                一方通行だった調査が、ぐるぐる回る輪に変わります。
              </p>
            </Reveal>

            <div className="mx-auto mt-14 max-w-2xl space-y-6">
              {[
                {
                  icon: IconCoin,
                  step: '1',
                  title: 'アンケートに答える',
                  body: '気になるアンケートに回答してポイントを獲得。1問ずつ進むスマホ最適化の回答画面で、すきま時間にサクサク答えられます。',
                },
                {
                  icon: IconArrowRight,
                  step: '2',
                  title: 'ポイントで集める',
                  body: '貯めたポイントを使って自分のアンケートを公開。回答し合うコミュニティだから、待っているだけでは集まらなかった回答が届きます。',
                },
                {
                  icon: IconShield,
                  step: '3',
                  title: 'AIが質を守る',
                  body: '提出された回答はAIが自動で品質評価。雑な回答は報酬ゼロ、丁寧な回答にはボーナス。研究に使えるデータの質を担保します。',
                },
              ].map(({ icon: Icon, step, title, body }, i, arr) => (
                <Reveal key={step} direction="left" delay={i * 120}>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-white shadow-lg shadow-brand-500/30">
                        {step}
                      </span>
                      {i < arr.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-brand-200" aria-hidden />}
                    </div>
                    <div className="card-3d card-3d-hover flex-1 p-5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── 03 機能（スタッガー出現） ───────── */}
        <section id="features" className="kk-scene relative flex min-h-screen scroll-mt-16 items-center overflow-hidden py-20 sm:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionKicker no="03" label="Everything you need" />
            <Reveal>
              <h2 className="text-3xl font-extrabold text-slate-900 [text-wrap:balance] sm:text-4xl">
                研究に必要な機能を、ぜんぶ。
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-4 max-w-[48ch] text-base leading-7 text-slate-700 [text-wrap:pretty]">
                作る・集める・分析するまで、キキタイひとつで完結します。
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: IconLink,
                  title: '非公開なら、ずっと無料',
                  body: '非公開アンケートはポイント不要・無期限無料。発行したリンクを共有するだけで、Googleフォームと同じ感覚で誰でもすぐに使えます。',
                  badge: '完全無料',
                },
                {
                  icon: IconTable,
                  title: 'Excelで結果をすぐ確認',
                  body: '回答結果はワンクリックでExcel（xlsx）形式にダウンロード。Googleフォームより直感的で見やすい、おしゃれな集計画面もそのまま使えます。',
                  badge: 'Excel出力',
                },
                {
                  icon: IconWand,
                  title: 'AIがアンケートを自動作成',
                  body: 'テーマと調査目的を入力するだけで、AIが設問を自動生成。さらに悪質な回答を自動検知してブロックする、キキタイ独自の防御機能つき。',
                  badge: 'AI作成',
                },
                {
                  icon: IconBranch,
                  title: '分岐とセクション',
                  body: '回答内容に応じて設問を出し分ける表示条件や、ページ分割に対応。複雑な調査設計もそのまま再現できます。',
                },
                {
                  icon: IconStep,
                  title: '答えやすい回答体験',
                  body: '1問ずつ集中できるステッパー形式。進捗表示・途中保存・オフライン再送に対応し、回答の離脱を防ぎます。',
                },
                {
                  icon: IconChart,
                  title: 'リアルタイム集計',
                  body: '円グラフ・棒グラフ・クロス集計を自動生成。CSVダウンロードや統計量（平均・標準偏差など）の算出にも対応します。',
                },
              ].map(({ icon: Icon, title, body, badge }, i) => (
                <Reveal key={title} direction="up" delay={(i % 3) * 100 + Math.floor(i / 3) * 60}>
                  <div className="card-3d card-3d-hover h-full p-6">
                    <div className="flex items-start justify-between">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-brand-600 ring-1 ring-slate-100">
                        <Icon className="h-6 w-6" />
                      </span>
                      {badge && (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">
                          {badge}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-extrabold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── キキタイ・インテリジェンス（最大の差別化要素・暗転クライマックス） ───────── */}
        <section
          id="intelligence"
          className="kk-scene relative flex min-h-screen scroll-mt-16 items-center overflow-hidden py-28 text-white sm:py-36"
          style={{ background: 'linear-gradient(160deg, var(--color-brand-950) 0%, var(--color-brand-900) 55%, #0a3b38 100%)' }}
        >
          {/* 上端を直前の明るいシーンから滑らかに繋ぐ */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 kk-scene-fade-from-dark opacity-90" aria-hidden />
          {/* ブランドティールのオーロラ光（slate/indigoではなく世界観に統一） */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(69,190,178,0.30),transparent_55%),radial-gradient(circle_at_85%_5%,rgba(124,216,205,0.20),transparent_48%),radial-gradient(circle_at_70%_95%,rgba(38,166,154,0.22),transparent_50%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Reveal className="mb-6 flex flex-col items-center gap-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-300">
                <IconBrain className="h-4 w-4" />
                Kikitai Intelligence
              </span>
              <h2 className="max-w-3xl text-[1.75rem] font-extrabold leading-tight tracking-tight text-white [text-wrap:balance] sm:text-5xl sm:leading-snug">
                <span className="inline-block">これまでにない、</span>
                <br />
                <span className="inline-block bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
                  独自AI評価インテリジェンス。
                </span>
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300 [text-wrap:pretty] sm:text-base">
                <span className="inline-block">キキタイが自社開発した評価AIが、すべての回答を24時間自動でレビュー。</span>
                <span className="inline-block">単なる「機能」のひとつではなく、サービス全体の信頼性を支える中核エンジンです。</span>
              </p>
            </Reveal>

            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { value: '100点', label: '満点で自動採点' },
                { value: '0円', label: '回答者への追加負担なし' },
                { value: '業界初', label: '独自開発の評価モデル' },
              ].map((s) => (
                <Reveal key={s.label} direction="up" delay={80}>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-center backdrop-blur">
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
              <Reveal direction="left">
                <ul className="space-y-5">
                  {[
                    {
                      icon: IconSparkle,
                      title: '回答の質を100点満点で自動採点',
                      body: '設問への適合度・具体性・誠実さをAIが多角的に評価。雑な回答は報酬が下がり、丁寧な回答にはボーナスが付きます。',
                    },
                    {
                      icon: IconBan,
                      title: '悪質・不正な回答をリアルタイム検知',
                      body: 'コピペや無関係な入力、ボットのような連続回答などをAIが自動で見抜き、ブロック。研究データを汚すノイズを未然に防ぎます。',
                    },
                    {
                      icon: IconBrain,
                      title: '他社にはないキキタイ独自モデル',
                      body: '既存のアンケートサービスには存在しない、キキタイが独自に設計・開発した評価アルゴリズム。回答の経済圏そのものを守るために生まれました。',
                    },
                  ].map(({ icon: Icon, title, body }) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-extrabold text-white">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-300">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal direction="right" delay={120}>
                <div className="relative mx-auto max-w-sm">
                  <div className="card-3d p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">AI品質スコア</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                        <IconSparkle className="h-3.5 w-3.5" /> 自動採点
                      </span>
                    </div>
                    <div className="mt-5 flex items-end gap-2">
                      <span className="text-6xl font-black leading-none text-brand-600">92</span>
                      <span className="mb-2 text-lg font-bold text-slate-400">/ 100</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: '設問への適合', v: 'w-[92%]' },
                        { label: '回答の具体性', v: 'w-[88%]' },
                        { label: '誠実さ', v: 'w-[95%]' },
                      ].map((b) => (
                        <div key={b.label}>
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>{b.label}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
                            <div className={`h-full ${b.v} rounded-full bg-gradient-to-r from-brand-400 to-brand-600`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
                      <span className="text-xs font-bold text-amber-700">高品質ボーナス</span>
                      <span className="text-lg font-extrabold text-amber-600">×1.5</span>
                    </div>
                  </div>
                  <div className="card-3d kk-float absolute -right-4 -top-5 px-4 py-2 text-xs font-extrabold text-brand-600" style={{ ['--kk-rot' as string]: '5deg' }}>
                    +30pt 確定
                  </div>
                  <div className="card-3d kk-float-slow absolute -bottom-5 -left-3 flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 sm:-left-8" style={{ ['--kk-rot' as string]: '-4deg' }}>
                    <IconBan className="h-3.5 w-3.5" />
                    不正回答を自動ブロック
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────── 05 非公開アンケート＝無料のGoogleフォーム代替 ───────── */}
        <section id="free" className="kk-scene relative flex min-h-screen scroll-mt-16 items-center overflow-hidden py-24 sm:py-32">
          {/* 暗転シーンから明るいシーンへ滑らかに復帰（上端に余韻を残す） */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 kk-scene-fade-from-dark opacity-60" aria-hidden />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <SectionKicker no="04" label="Free & Beautiful" />
              <Reveal>
                <h2 className="text-3xl font-extrabold leading-snug text-slate-900 [text-wrap:balance] sm:text-4xl">
                  非公開なら、
                  <br />
                  <span className="inline-block text-brand-600">ずっと無料のフォームツール。</span>
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-5 max-w-[44ch] text-base leading-7 text-slate-700 [text-wrap:pretty]">
                  アンケートを「非公開」にすれば、ポイントは一切不要。発行されたリンクを
                  LINEやSlackで共有するだけで、Googleフォームと同じように誰でもすぐ回答を集められます。
                  しかも見た目はキキタイならではの、おしゃれで直感的なデザイン。
                </p>
              </Reveal>
              <Reveal delay={200}>
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {[
                    { icon: IconCoin, text: 'ポイント不要・回数制限なしでずっと無料' },
                    { icon: IconLink, text: 'URLを発行してリンク共有するだけで回答を収集' },
                    { icon: IconTable, text: '集まった結果はExcel（xlsx）で即ダウンロード' },
                    { icon: IconSparkle, text: 'Googleフォームより見やすく、おしゃれな入力・集計画面' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <Reveal direction="right" delay={120}>
              <div className="relative mx-auto max-w-sm">
                <div className="card-3d p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">非公開アンケート</span>
                    <span className="rounded-full bg-slate-700 px-3 py-0.5 text-xs font-bold text-white">非公開</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <IconLink className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate text-xs text-slate-500">kikitai.app/s/3f9a2c...</span>
                    <span className="ml-auto shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">コピー</span>
                  </div>
                  <div className="mt-5 space-y-2.5">
                    <div className="h-2 w-3/4 rounded-full bg-brand-200" />
                    <div className="h-2 w-full rounded-full bg-brand-100" />
                    <div className="h-2 w-2/3 rounded-full bg-brand-100" />
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                    <span className="text-xs font-bold text-brand-700">必要なポイント</span>
                    <span className="text-lg font-extrabold text-brand-600">0pt</span>
                  </div>
                </div>
                <div className="card-3d kk-float absolute -right-4 -top-5 px-4 py-2 text-xs font-extrabold text-brand-600" style={{ ['--kk-rot' as string]: '5deg' }}>
                  <span className="inline-flex items-center gap-1">
                    <IconTable className="h-3.5 w-3.5" />
                    Excelで出力
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────── 最後のCTA ───────── */}
        <section id="cta" className="kk-scene flex min-h-screen scroll-mt-16 items-center border-b border-brand-100/70">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Reveal direction="scale">
            <div className="card-3d relative overflow-hidden p-10 text-center sm:p-16">
              <AuroraBackground className="opacity-70" />
              <div className="relative">
                <LogoMark className="kk-breathe mx-auto h-16 text-brand-500" />
                <h2 className="mt-5 text-3xl font-extrabold text-slate-900 [text-wrap:balance] sm:text-4xl">
                  あなたの研究にも、回答を。
                </h2>
                <p className="mx-auto mt-3 max-w-[42ch] text-base leading-7 text-slate-700 [text-wrap:pretty]">
                  登録はかんたん。今日からアンケートに答えて、回答し合う輪に参加しましょう。
                </p>
                <div className="mt-8 flex justify-center">
                  <Link href="/register" className="btn-3d btn-3d-primary px-8 py-3.5 text-base">
                    無料ではじめる
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
