import Link from 'next/link';
import Logo, { LogoMark } from '@/components/Logo';

/* 装飾用の小さなアイコン（絵文字は使わない方針のため、すべてSVG） */

function IconEditor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 9h7M7 13h10M7 17h6" />
    </svg>
  );
}
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

/** ヒーロー右側：実際の回答画面を模したモックカード */
function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* 後ろに重なるカード */}
      <div className="absolute -left-4 top-6 h-full w-full rotate-[-4deg] rounded-3xl bg-brand-200/50" aria-hidden />
      <div className="card-3d relative rotate-[2deg] p-6 sm:p-7">
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
      <div className="card-3d absolute -right-3 -top-5 rotate-[6deg] px-4 py-2 text-sm font-extrabold text-brand-600 sm:-right-8">
        +15pt 獲得
      </div>
      <div className="card-3d absolute -bottom-5 -left-3 flex rotate-[-5deg] items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 sm:-left-8">
        <IconSparkle className="h-4 w-4 text-brand-500" />
        AI品質スコア 92点
      </div>
    </div>
  );
}

/** 未ログイン時のトップページ（ランディング） */
export default function LandingPage() {
  return (
    <>
      {/* ヘッダー：左ロゴ／右ナビ＋ログイン・新規登録 */}
      <header className="glass sticky top-0 z-30 border-b border-brand-100/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="キキタイ トップ">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <a href="#how" className="hidden text-sm font-medium text-slate-600 hover:text-brand-600 sm:inline">
              使い方
            </a>
            <a href="#features" className="hidden text-sm font-medium text-slate-600 hover:text-brand-600 sm:inline">
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
        {/* ヒーロー */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-bold text-brand-700">
              <LogoMark className="h-4" />
              学生・研究者のためのアンケート交換プラットフォーム
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              こたえて、
              <br className="sm:hidden" />
              あつめる。
              <br />
              <span className="text-brand-600">研究の輪。</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              「アンケートの回答者が集まらない」を、お互いさまで解決。
              他の人のアンケートに答えてポイントを貯め、そのポイントで
              あなたの研究に回答者を集めましょう。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register" className="btn-3d btn-3d-primary px-7 py-3 text-base">
                無料ではじめる
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-3d btn-3d-secondary px-7 py-3 text-base">
                ログイン
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              {['登録は無料', 'スマホで1問ずつサクサク回答', 'AIが回答の質をチェック'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconCheckCircle className="h-4 w-4 text-brand-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroMock />
        </section>

        {/* 使い方：3ステップ */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            はじめての人が、回答を集めるまで
          </h2>
          <p className="mt-3 text-center text-slate-600">
            回答し合う経済圏だから、回答者が「いない」を「集まる」に変えられます。
          </p>
          <div className="mx-auto mt-10 max-w-2xl space-y-6">
            {[
              {
                step: '1',
                title: 'アンケートに答える',
                body: '気になるアンケートに回答してポイントを獲得。1問ずつ進むスマホ最適化の回答画面で、すきま時間にサクサク答えられます。',
              },
              {
                step: '2',
                title: 'ポイントで集める',
                body: '貯めたポイントを使って自分のアンケートを公開。回答し合うコミュニティだから、待っているだけでは集まらなかった回答が届きます。',
              },
              {
                step: '3',
                title: 'AIが質を守る',
                body: '提出された回答はAIが自動で品質評価。雑な回答は報酬ゼロ、丁寧な回答にはボーナス。研究に使えるデータの質を担保します。',
              },
            ].map(({ step, title, body }, i, arr) => (
              <div key={step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-white">
                    {step}
                  </span>
                  {i < arr.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-brand-200" aria-hidden />}
                </div>
                <div className="card-3d card-3d-hover flex-1 p-5">
                  <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 機能 */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            研究に必要な機能を、ぜんぶ
          </h2>
          <p className="mt-3 text-center text-slate-600">
            作る・集める・分析するまで、キキタイひとつで完結します。
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: IconEditor,
                title: '本格的なフォームエディタ',
                body: '単一・複数選択、スケール、グリッドなど多彩な設問タイプ。ドラッグ&ドロップ並べ替えと即時プレビューで直感的に作成できます。',
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
              {
                icon: IconSparkle,
                title: 'AIによる品質評価',
                body: '回答の丁寧さをAIが採点し、報酬に反映。「とりあえず埋めただけ」の回答からあなたのデータを守ります。',
              },
              {
                icon: IconShield,
                title: 'プライバシーに配慮',
                body: 'プロフィール属性は項目ごとに公開・非公開を選択可能。非公開にするとポイントボーナスがもらえる設計です。',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="card-3d card-3d-hover p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-extrabold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 最後のCTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="card-3d relative overflow-hidden p-10 text-center sm:p-14">
            <LogoMark className="mx-auto h-14 text-brand-500" />
            <h2 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              あなたの研究にも、回答を。
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              登録はかんたん。今日からアンケートに答えて、回答し合う輪に参加しましょう。
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/register" className="btn-3d btn-3d-primary px-8 py-3 text-base">
                無料ではじめる
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
