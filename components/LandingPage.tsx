import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  FileDown,
  Link2,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Logo from '@/components/Logo';
import KikitaiLoopDemo from '@/components/landing/KikitaiLoopDemo';
import HeroFlowField from '@/components/landing/HeroFlowField';
import LandingExperience from '@/components/landing/LandingExperience';

const essentials = [
  { title: '限定公開はずっと無料', body: '共有URLを送るだけ。ポイントを使わず、回数制限なく回答を集められます。', Icon: Link2 },
  { title: '集計をリアルタイム表示', body: '回答状況と傾向を、見やすいグラフですぐに確認できます。', Icon: BarChart3 },
  { title: 'Excelへそのまま出力', body: '集まった回答は.xlsx形式で書き出し、そのまま研究データに使えます。', Icon: FileDown },
];

const faqs: [string, string][] = [
  ['ポイントはどうやって貯まりますか？', '他の人のアンケートに回答すると貯まります。AIが回答の丁寧さを評価し、質の高い回答にはボーナスポイントが加わります。'],
  ['アンケートの公開に費用はかかりますか？', '一般公開では回答者へ渡すポイントが必要です。共有リンクによる限定公開はポイント不要・無料で利用できます。'],
  ['AIは何を評価しますか？', '設問への適合度、具体性、一貫性などを確認します。丁寧な回答へのボーナス付与と、無関係・不正な回答の検知に利用します。'],
];

/** 行マスクめくり用の見出し1行。overflow:hidden の中で子spanを持ち上げる */
function Line({ children }: { children: React.ReactNode }) {
  return (
    <span className="kx-line">
      <span>{children}</span>
    </span>
  );
}

export default function LandingPage() {
  return (
    <main className="kx">
      <LandingExperience />

      {/* ── ヘッダー ── */}
      <header className="kx-topbar">
        <Link href="/" aria-label="キキタイ ホーム" className="kx-topbar__logo" data-magnetic="0.2">
          <Logo className="!text-[#0c211f]" />
          <span>RESEARCH NETWORK</span>
        </Link>
        <nav aria-label="メインナビゲーション" className="kx-topbar__nav">
          <a href="#concept">CONCEPT</a>
          <a href="#flow">HOW IT WORKS</a>
          <a href="#quality">AI QUALITY</a>
          <a href="#features">FEATURES</a>
        </nav>
        <Link href="/register" className="kx-topbar__cta" data-magnetic="0.4">
          はじめる <ArrowRight aria-hidden size={16} strokeWidth={1.8} />
        </Link>
      </header>

      {/* ── ヒーロー ── */}
      <section className="kx-hero" id="top">
        <HeroFlowField />
        <div className="kx-hero__grid" aria-hidden />
        <div className="kx-hero__inner">
          <p className="kx-hero__eyebrow">
            <span>FOR STUDENTS &amp; RESEARCHERS</span>
            アンケート交換プラットフォーム
          </p>
          <h1 className="kx-hero__title" aria-label="ASK ANSWER EVOLVE">
            <Line>ASK</Line>
            <Line>ANSWER</Line>
            <Line>EVOLVE</Line>
          </h1>
          <div className="kx-hero__lead">
            <strong>
              「アンケートの回答者が集まらない」を、
              <br />
              お互いさまで解決する。
            </strong>
            <p>他の人のアンケートに答えてポイントを貯め、そのポイントであなたの研究に回答者を集めましょう。</p>
          </div>
          <div className="kx-hero__actions">
            <Link href="/register" className="kx-btn kx-btn--solid" data-magnetic="0.4">
              <span>無料ではじめる</span>
              <ArrowRight aria-hidden size={17} strokeWidth={1.7} />
            </Link>
            <a href="#flow" className="kx-btn kx-btn--ghost" data-magnetic="0.3">
              <span>仕組みを見る</span>
              <ArrowDown aria-hidden size={16} strokeWidth={1.6} />
            </a>
          </div>
          <ul className="kx-hero__proof">
            <li><i />登録は無料</li>
            <li><i />限定公開ならずっと無料</li>
            <li><i />AIが回答品質を評価</li>
          </ul>
        </div>
        <a className="kx-hero__scroll" href="#concept" aria-label="下にスクロール">
          <span>SCROLL</span>
          <i />
        </a>
      </section>

      {/* ── マニフェスト帯（横流れ） ── */}
      <section className="kx-band" aria-hidden>
        <div className="kx-band__row" data-drift="-16">
          <span>ANSWER</span><i />
          <span className="is-out">EARNS</span><i />
          <span>ANSWERS</span><i />
          <span>ANSWER</span><i />
          <span className="is-out">EARNS</span><i />
          <span>ANSWERS</span><i />
        </div>
      </section>

      {/* ── コンセプト ── */}
      <section className="kx-concept" id="concept">
        <p className="kx-kicker" data-reveal="rise">THE IDEA / 01</p>
        <div className="kx-concept__head">
          <h2 data-reveal="lines">
            <Line>回答する時間を、</Line>
            <Line>次の問いの力に。</Line>
          </h2>
          <div className="kx-concept__body" data-reveal="stagger">
            <p>回答者が集まらない。お願いする相手も尽きてしまう。研究の入り口にあるこの問題を、キキタイは「お互いに答える仕組み」で変えます。</p>
            <p>お金ではなく、協力した時間が次の調査を動かす。学生と研究者のための、持続するリサーチネットワークです。</p>
            <Link href="/register" className="kx-textlink" data-magnetic="0.25">
              今日から輪に加わる <ArrowUpRight aria-hidden size={17} strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <div className="kx-metrics" data-reveal="stagger">
          <div>
            <strong><span data-count="3">0</span><em>ステップ</em></strong>
            <span>回答 → 獲得 → 募集の循環</span>
          </div>
          <div>
            <strong><span data-count="98">0</span><em>点</em></strong>
            <span>AIが測る回答品質スコア</span>
          </div>
          <div>
            <strong>¥<span data-count="0">0</span></strong>
            <span>限定公開はずっと無料</span>
          </div>
        </div>
      </section>

      {/* ── 仕組み（既存デモを活用） ── */}
      <section className="kx-flow" id="flow">
        <div className="kx-flow__aura" aria-hidden />
        <KikitaiLoopDemo />
      </section>

      {/* ── AI品質 ── */}
      <section className="kx-quality" id="quality">
        <div className="kx-quality__copy">
          <p className="kx-kicker" data-reveal="rise">AI QUALITY CONTROL / 03</p>
          <h2 data-reveal="lines">
            <Line>集めるだけでなく、</Line>
            <Line>回答の質まで守る。</Line>
          </h2>
          <p className="kx-quality__lead" data-reveal="rise">
            ポイント制で回答数を増やしながら、評価AIが一件ずつ品質を確認します。丁寧な回答ほど報われ、雑な水増し回答は混ざりにくくなります。
          </p>
          <ol className="kx-pipeline" data-reveal="stagger">
            <li><span className="kx-pipeline__icon"><MessageSquareText aria-hidden /></span><span><small>01 / RECEIVE</small><b>回答を受け取る</b></span></li>
            <li><span className="kx-pipeline__icon"><ScanSearch aria-hidden /></span><span><small>02 / ANALYZE</small><b>AIが内容を評価</b></span></li>
            <li><span className="kx-pipeline__icon"><ShieldCheck aria-hidden /></span><span><small>03 / PROTECT</small><b>良質なデータだけ残す</b></span></li>
          </ol>
          <Link href="/intelligence" className="kx-textlink" data-magnetic="0.25">
            評価AIの仕組みを見る <ArrowUpRight aria-hidden size={18} strokeWidth={1.5} />
          </Link>
        </div>

        <div className="kx-quality__visual" data-parallax="0.08" data-reveal="rise">
          <div className="kx-score">
            <div className="kx-score__head">
              <span><Sparkles aria-hidden size={15} /> KIKITAI AI</span>
              <b><i /> ANALYSIS COMPLETE</b>
            </div>
            <div className="kx-score__main">
              <div className="kx-score__ring">
                <strong><span data-count="94">0</span></strong>
                <small>QUALITY<br />SCORE</small>
              </div>
              <p>
                <b>丁寧な回答です</b>
                <span>高品質ボーナス</span>
                <strong>+15 pt</strong>
              </p>
            </div>
            <ul className="kx-score__bars">
              <li className="kx-score__bar"><span>設問への適合度</span><i style={{ '--w': '98%' } as React.CSSProperties} /><strong>98</strong></li>
              <li className="kx-score__bar"><span>回答の具体性</span><i style={{ '--w': '92%' } as React.CSSProperties} /><strong>92</strong></li>
              <li className="kx-score__bar"><span>回答の一貫性</span><i style={{ '--w': '93%' } as React.CSSProperties} /><strong>93</strong></li>
            </ul>
            <div className="kx-score__note"><ShieldCheck aria-hidden size={16} strokeWidth={1.5} /> 無関係・コピペ・不正回答を検知</div>
          </div>
          <div className="kx-quality__orbit" aria-hidden><i /><i /><i /></div>
        </div>
      </section>

      {/* ── 機能 ── */}
      <section className="kx-features" id="features">
        <div className="kx-features__head">
          <p className="kx-kicker" data-reveal="rise">TOOLS FOR RESEARCH / 04</p>
          <h2 data-reveal="lines">
            <Line>研究に必要なものは、</Line>
            <Line>全部そろっている。</Line>
          </h2>
        </div>
        <div className="kx-features__list" data-reveal="stagger">
          {essentials.map(({ title, body, Icon }, index) => (
            <article key={title} className="kx-feature" data-magnetic="0.12">
              <span className="kx-feature__no">0{index + 1}</span>
              <Icon aria-hidden size={28} strokeWidth={1.25} />
              <h3>{title}</h3>
              <p>{body}</p>
              <ArrowUpRight aria-hidden size={20} strokeWidth={1.2} className="kx-feature__arrow" />
            </article>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="kx-faq">
        <div className="kx-faq__head">
          <p className="kx-kicker" data-reveal="rise">FAQ / 05</p>
          <h2 data-reveal="lines"><Line>よくある質問</Line></h2>
        </div>
        <div className="kx-faq__list" data-reveal="stagger">
          {faqs.map(([q, a], index) => (
            <details key={q}>
              <summary><span className="kx-faq__no">0{index + 1}</span>{q}<i aria-hidden /></summary>
              <p>{a}</p>
            </details>
          ))}
          <Link href="/help" className="kx-textlink" data-magnetic="0.25">
            ヘルプを見る <ArrowUpRight aria-hidden size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="kx-cta">
        <div className="kx-cta__glow" aria-hidden />
        <p data-reveal="rise">YOUR QUESTION CAN MOVE RESEARCH FORWARD.</p>
        <h2 data-reveal="lines">
          <Line>聞きたいことから、</Line>
          <Line>研究ははじまる。</Line>
        </h2>
        <div className="kx-cta__actions" data-reveal="rise">
          <Link href="/register" className="kx-btn kx-btn--solid" data-magnetic="0.4">
            <span>無料ではじめる</span>
            <ArrowRight aria-hidden size={17} strokeWidth={1.7} />
          </Link>
          <Link href="/login" className="kx-btn kx-btn--ghost" data-magnetic="0.3">
            <span>ログイン</span>
          </Link>
        </div>
      </section>

      {/* ── フッター ── */}
      <footer className="kx-footer">
        <div className="kx-footer__brand">
          <Logo className="!text-[#f4f8f6]" />
          <p>回答し合う、研究のための<br />アンケートプラットフォーム。</p>
        </div>
        <nav className="kx-footer__nav">
          <a href="#concept">CONCEPT</a>
          <a href="#flow">HOW IT WORKS</a>
          <a href="#quality">AI QUALITY</a>
          <Link href="/terms">TERMS</Link>
          <Link href="/privacy">PRIVACY</Link>
        </nav>
        <p className="kx-footer__copy">© KIKITAI. ALL RIGHTS RESERVED.</p>
        <a href="#top" className="kx-footer__top" data-magnetic="0.3">PAGE TOP ↑</a>
      </footer>
    </main>
  );
}
