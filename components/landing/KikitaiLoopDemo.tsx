import {
  BarChart3,
  Check,
  Coins,
  MessageSquareText,
  Send,
  Sparkles,
} from 'lucide-react';

const steps = [
  {
    no: '01',
    label: 'ANSWER',
    title: '気になる調査に答える',
    body: '研究テーマを選び、スマホから数分で回答。送信後はAIが内容を確認します。',
    Icon: MessageSquareText,
  },
  {
    no: '02',
    label: 'EARN',
    title: '質に応じてポイント獲得',
    body: '具体性や一貫性をAIが評価。丁寧な回答ほど、受け取れるポイントが増えます。',
    Icon: Coins,
  },
  {
    no: '03',
    label: 'ASK',
    title: '自分の調査を公開する',
    body: '貯めたポイントで回答を募集。進捗と回答データはリアルタイムで確認できます。',
    Icon: Send,
  },
];

export default function KikitaiLoopDemo() {
  return (
    <div className="k2-loop-layout">
      <div className="k2-loop-copy" data-k2-reveal>
        <p className="k2-kicker">HOW KIKITAI WORKS</p>
        <h2><span>答えることが、</span><span>次の問いを動かす。</span></h2>
        <p className="k2-loop-copy__lead">
          回答から募集まで、迷わない3ステップ。右のデモで実際の流れを追体験できます。
        </p>
        <ol className="k2-loop-steps">
          {steps.map(({ no, label, title, body, Icon }) => (
            <li key={no} data-k2-step>
              <span className="k2-loop-steps__no">{no}</span>
              <span className="k2-loop-steps__icon"><Icon aria-hidden size={20} strokeWidth={1.6} /></span>
              <span className="k2-loop-steps__body">
                <small>{label}</small>
                <strong>{title}</strong>
                <span>{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="k2-product-demo" data-k2-demo data-k2-reveal aria-label="キキタイの操作デモ">
        <div className="k2-product-demo__halo" aria-hidden />
        <div className="k2-product-demo__frame">
          <div className="k2-product-demo__topbar">
            <span className="k2-product-demo__dots"><i /><i /><i /></span>
            <span><i /> LIVE PRODUCT DEMO</span>
            <b>KIKITAI</b>
          </div>

          <div className="k2-product-demo__stage">
            <article className="k2-demo-scene k2-demo-scene--answer">
              <div className="k2-demo-scene__meta"><span>ANSWER / 02</span><b>あと2問</b></div>
              <div className="k2-demo-progress"><i /></div>
              <p className="k2-demo-kicker">QUESTION 02 / 04</p>
              <h3>あなたの研究分野は？</h3>
              <div className="k2-demo-options">
                <span>人文・社会科学</span>
                <span className="is-picked"><i />理工学<Check aria-hidden size={16} /></span>
                <span>医療・生命科学</span>
              </div>
              <button type="button" tabIndex={-1}>回答を送信 <Send aria-hidden size={16} /></button>
              <span className="k2-demo-cursor" aria-hidden />
            </article>

            <article className="k2-demo-scene k2-demo-scene--score">
              <div className="k2-demo-ai"><Sparkles aria-hidden size={17} /> KIKITAI AI <span>ANALYSIS COMPLETE</span></div>
              <div className="k2-demo-score-main">
                <div className="k2-demo-score-ring"><strong>94</strong><small>QUALITY<br />SCORE</small></div>
                <div>
                  <p>丁寧な回答です</p>
                  <strong>+15 <small>pt</small></strong>
                  <span>高品質ボーナスを獲得</span>
                </div>
              </div>
              <div className="k2-demo-metrics">
                <span><b>設問への適合度</b><i><em style={{ width: '98%' }} /></i><strong>98</strong></span>
                <span><b>回答の具体性</b><i><em style={{ width: '92%' }} /></i><strong>92</strong></span>
                <span><b>回答の一貫性</b><i><em style={{ width: '93%' }} /></i><strong>93</strong></span>
              </div>
              <div className="k2-demo-earned"><Coins aria-hidden size={16} />ポイント残高 <b>280 pt</b></div>
            </article>

            <article className="k2-demo-scene k2-demo-scene--publish">
              <div className="k2-demo-published"><Check aria-hidden size={15} /> アンケートを公開しました</div>
              <div className="k2-demo-dashboard-head">
                <span><small>MY SURVEY</small><strong>大学生の生成AI利用調査</strong></span>
                <b>回答受付中</b>
              </div>
              <div className="k2-demo-stat-grid">
                <div><span>回答数</span><strong>24<small> / 40</small></strong><i><em /></i></div>
                <div><span>回答率</span><strong>60<small>%</small></strong><BarChart3 aria-hidden size={21} /></div>
              </div>
              <div className="k2-demo-responses">
                <div><i>HN</i><span><b>回答が届きました</b><small>理工学部・学部3年</small></span><em>たった今</em></div>
                <div><i>AK</i><span><b>回答が届きました</b><small>人文学部・修士1年</small></span><em>12秒前</em></div>
              </div>
            </article>
          </div>

          <div className="k2-product-demo__timeline" aria-hidden>
            <i className="k2-product-demo__runner" />
            <span><b>01</b> 回答</span>
            <span><b>02</b> AI評価</span>
            <span><b>03</b> 公開</span>
          </div>
        </div>
        <p className="k2-product-demo__caption"><i /> 12秒でキキタイの循環を体験</p>
      </div>
    </div>
  );
}
