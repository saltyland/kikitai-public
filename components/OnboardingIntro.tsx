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
            <h2 className="mt-3 text-3xl font-extrabold leading-snug text-slate-900 sm:text-4xl">
              答えるほど、集まる。
              <br />
              <span className="text-brand-600">“回答し合う”輪。</span>
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
