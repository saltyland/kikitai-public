'use client';

import { Reveal, ScrollProgressBar, AuroraBackground } from '@/components/ScrollReveal';
import { LogoMark } from '@/components/Logo';

/* オンボーディング導入専用の小さなSVGアイコン（絵文字は使わない方針） */
function IconCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h3.2a1.8 1.8 0 010 3.6H9.8M9.5 13.1h3.4a1.8 1.8 0 010 3.6H10" />
    </svg>
  );
}
function IconExchange({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
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
function IconArrowDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 5v14M6 13l6 6 6-6" />
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
function IconWand({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18.5 3.5l-1 1M18.5 8.5l-1-1M4 20l9-9M14 7l3 3" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4.5" y="11" width="15" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 018 0V11" />
      <circle cx="12" cy="15.5" r="1.2" />
    </svg>
  );
}
function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M10 13a4 4 0 005.66 0l2.83-2.83a4 4 0 10-5.66-5.66L11.5 6" />
      <path d="M14 11a4 4 0 00-5.66 0l-2.83 2.83a4 4 0 105.66 5.66L12.5 18" />
    </svg>
  );
}

interface Props {
  nickname: string;
  /** 「プロフィール登録へ進む」を押したとき */
  onStart: () => void;
}

/**
 * 初回サインイン直後の“紹介”体験。ゲームフリーク公式サイトのように、
 * スクロールするほどキキタイの良さが動画的に立ち上がってくる縦スクロール演出。
 * 読み終えた最後に、プロフィール登録（＝最初のアンケート）へ進む。
 */
export default function OnboardingIntro({ nickname, onStart }: Props) {
  const POINTS = [
    {
      icon: IconCoin,
      kicker: 'EARN',
      title: '答えると、ポイントが貯まる',
      body: '他の人のアンケートに回答するだけでポイントを獲得。スマホで1問ずつ、すきま時間にサクサク答えられます。',
    },
    {
      icon: IconExchange,
      kicker: 'EXCHANGE',
      title: 'ポイントで、回答者を集める',
      body: '貯めたポイントを使って自分のアンケートを公開。回答し合うコミュニティだから、待つだけでは集まらなかった回答が届きます。',
    },
    {
      icon: IconSparkle,
      kicker: 'QUALITY',
      title: 'AIが、データの質を守る',
      body: '提出された回答はAIが自動採点。雑な回答は報酬ゼロ、丁寧な回答にはボーナス。研究に使えるデータだけが集まります。',
    },
  ];

  return (
    <div className="relative min-h-screen">
      <ScrollProgressBar />

      {/* ── ファーストビュー：ようこそ ── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-4">
        <AuroraBackground />
        <div className="relative mx-auto max-w-2xl text-center">
          <Reveal direction="scale">
            <LogoMark className="kk-breathe mx-auto h-16 text-brand-500" />
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-6 text-sm font-bold tracking-widest text-brand-500">WELCOME</p>
          </Reveal>
          <Reveal delay={200}>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              ようこそ、
              <br className="sm:hidden" />
              <span className="text-brand-600">{nickname}</span> さん。
            </h1>
          </Reveal>
          <Reveal delay={360}>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              キキタイは、アンケートで繋がる学生・研究者のためのプラットフォーム。
              はじめに、どんなサービスか少しだけご紹介させてください。
            </p>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-10 flex flex-col items-center gap-1 text-xs font-bold tracking-widest text-brand-500">
              SCROLL
              <IconArrowDown className="kk-scroll-cue h-5 w-5" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── コンセプト：回答し合う経済圏 ── */}
      <section className="relative overflow-hidden py-24 sm:py-28">
        <div className="mx-auto max-w-2xl px-2 text-center">
          <Reveal>
            <p className="text-sm font-bold tracking-widest text-brand-500">CONCEPT</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-3 text-3xl font-extrabold leading-snug text-slate-900 [text-wrap:balance] sm:text-4xl">
              答えるほど、集まる。
              <br />
              <span className="inline-block text-brand-600">“回答し合う”輪。</span>
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-600">
              「回答者が集まらない」を、お互いさまで解決。
              あなたの回答が誰かの研究を助け、誰かの回答があなたの研究を前に進めます。
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 3つの良いポイント（スクロールで順に出現） ── */}
      <section className="relative overflow-hidden bg-white/40 py-24 sm:py-28">
        <AuroraBackground className="opacity-50" />
        <div className="relative mx-auto max-w-xl space-y-6 px-4">
          {POINTS.map(({ icon: Icon, kicker, title, body }, i) => (
            <Reveal key={kicker} direction="left" delay={i * 120}>
              <div className="card-3d card-3d-hover flex items-start gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] text-brand-400">{kicker}</p>
                  <h3 className="mt-0.5 text-lg font-extrabold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 作成画面：一目でわかりやすいUI ── */}
      <section className="relative overflow-hidden py-24 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <Reveal>
            <p className="text-sm font-bold tracking-widest text-brand-500">CREATE</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-3 text-3xl font-extrabold leading-snug text-slate-900 [text-wrap:balance] sm:text-4xl">
              迷わず作れる、
              <br className="sm:hidden" />
              <span className="text-brand-600">一目でわかる作成画面。</span>
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-600">
              質問を追加して、選択肢を書くだけ。AIにテーマを伝えれば、
              質問のたたき台も自動で用意します。
            </p>
          </Reveal>

          {/* 実際の作成画面を模したモックアップ */}
          <Reveal direction="scale" delay={360}>
            <div className="card-3d mx-auto mt-10 max-w-md overflow-hidden p-0 text-left">
              {/* ウィンドウバー */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="ml-2 text-[11px] font-bold text-slate-400">アンケートを作成</span>
              </div>

              <div className="space-y-4 p-5">
                {/* タイトル入力 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400">タイトル</p>
                  <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700">
                    新生活の家計に関する調査
                  </div>
                </div>

                {/* AIで質問を生成 ボタン */}
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-bold text-brand-600"
                >
                  <IconWand className="h-4 w-4" />
                  AIで質問を生成
                </button>

                {/* 質問カード */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">Q1 ・ 単一選択</span>
                    <span className="text-[11px] font-bold text-slate-300">必須</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-700">毎月の食費はどのくらいですか？</p>
                  <div className="mt-2.5 space-y-1.5">
                    {['1万円未満', '1〜3万円', '3〜5万円', '5万円以上'].map((o) => (
                      <div key={o} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                        <span className="h-3 w-3 rounded-full border border-slate-300" />
                        {o}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 質問を追加 */}
                <div className="rounded-xl border border-dashed border-slate-300 py-2.5 text-center text-sm font-bold text-slate-400">
                  ＋ 質問を追加
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 非公開（リンク限定）公開 ── */}
      <section className="relative overflow-hidden bg-white/40 py-24 sm:py-28">
        <AuroraBackground className="opacity-50" />
        <div className="relative mx-auto max-w-xl px-4 text-center">
          <Reveal>
            <p className="text-sm font-bold tracking-widest text-brand-500">PRIVATE</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-3 text-3xl font-extrabold leading-snug text-slate-900 [text-wrap:balance] sm:text-4xl">
              <span className="text-brand-600">非公開</span>で、
              <br className="sm:hidden" />
              リンクを知っている人だけに。
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-600">
              一覧や検索には表示せず、共有したリンクを知っている人だけが回答できる「非公開」公開も選べます。
              ゼミ・サークル・研究室など、特定の相手にだけ届けたいときに。
            </p>
          </Reveal>

          <Reveal direction="scale" delay={360}>
            <div className="card-3d mx-auto mt-9 max-w-sm p-6 text-left">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <IconLock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">非公開（リンク限定）</p>
                  <p className="text-xs text-slate-500">一覧・検索には出ません</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <IconLink className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate text-xs font-medium text-slate-500">kikitai.app/s/aXbZ29…</span>
                <span className="ml-auto rounded-md bg-brand-500 px-2 py-1 text-[11px] font-bold text-white">コピー</span>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                ※ リンクを知っている人なら誰でも回答できます。共有範囲にご注意ください。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── まずはポイントゲット → プロフィール登録へ ── */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <Reveal>
            <p className="text-sm font-bold tracking-widest text-amber-500">FIRST STEP</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-3 text-3xl font-extrabold leading-snug text-slate-900 sm:text-4xl">
              まずは、ポイントをゲット。
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-slate-600">
              あなたのことを教えてもらう「最初のアンケート」に答えると、
              さっそくポイントを獲得できます。
            </p>
          </Reveal>
          <Reveal direction="scale" delay={360}>
            <div className="mt-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
              <p className="text-sm text-slate-500">この最初のアンケートを完了すると</p>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-3xl font-extrabold text-slate-700">20pt</span>
                <span className="text-slate-400">×</span>
                <span className="rounded-full bg-amber-200 px-3 py-0.5 text-sm font-bold text-amber-700">1.5倍</span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-amber-600">= 30ポイント獲得</p>
            </div>
          </Reveal>
          <Reveal delay={460}>
            <button
              onClick={onStart}
              className="btn-3d btn-3d-primary mt-9 w-full py-3.5 text-base font-bold"
            >
              プロフィール登録に進む
              <IconArrowRight className="h-4 w-4" />
            </button>
          </Reveal>
          <Reveal delay={540}>
            <p className="mt-3 text-xs text-slate-400">所要時間は1〜2分。各項目は「非公開」も選べます。</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
