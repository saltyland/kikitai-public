'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const steps = [
  { no: '01', title: 'アンケートに答える', body: '気になるアンケートに回答。すきま時間の数分が、誰かの研究を前へ進めます。' },
  { no: '02', title: 'ポイントが貯まる', body: '回答の丁寧さをAIが評価。高品質な回答には、その場でボーナスが加わります。' },
  { no: '03', title: '自分の調査を公開する', body: '貯めたポイントで回答者を募集。届いた声がリアルタイムでデータに変わります。' },
];

function AnswerScene() {
  return (
    <div className="pk-journey-panel pk-journey-answer">
      <div className="pk-journey-windowbar"><span /><span /><span /><b>kikitai / answer</b><em>QUESTION 02 / 04</em></div>
      <div className="pk-journey-progress"><i /></div>
      <p>研究活動に関する調査</p>
      <h3>あなたの研究分野を<br />教えてください。</h3>
      <div className="pk-journey-options"><span className="active"><i />理工学 <b>✓</b></span><span><i />人文・社会科学</span><span><i />医学・生命科学</span></div>
      <div className="pk-journey-cursor" aria-hidden>↖</div>
    </div>
  );
}

function ScoreScene() {
  return (
    <div className="pk-journey-panel pk-journey-score">
      <div className="pk-journey-windowbar"><span /><span /><span /><b>kikitai / intelligence</b><em>ANALYZING COMPLETE</em></div>
      <div className="pk-score-orbit"><strong>94</strong><small>QUALITY<br />SCORE</small><i /><i /><i /></div>
      <div className="pk-score-copy"><p>丁寧な回答です</p><h3>高品質ボーナス<br /><span>+15 pt</span></h3><ul><li>設問への適合度 <b>98</b></li><li>回答の具体性 <b>92</b></li><li>一貫性 <b>93</b></li></ul></div>
      <div className="pk-point-packet" aria-hidden>+15</div>
    </div>
  );
}

function PublishScene() {
  return (
    <div className="pk-journey-panel pk-journey-publish">
      <div className="pk-journey-windowbar"><span /><span /><span /><b>kikitai / research</b><em>LIVE COLLECTION</em></div>
      <div className="pk-publish-copy"><p>あなたのアンケート</p><h3>研究室の働き方に<br />関する調査</h3><span><i /> 回答受付中</span></div>
      <div className="pk-publish-data"><strong>48</strong><small>RESPONSES</small><div><i style={{ height: '42%' }} /><i style={{ height: '67%' }} /><i style={{ height: '54%' }} /><i style={{ height: '88%' }} /><i style={{ height: '72%' }} /><i style={{ height: '100%' }} /></div></div>
      <div className="pk-publish-people" aria-label="回答者が集まっている様子">{['A','M','R','S','K'].map((x,i)=><i key={x} style={{ ['--i' as string]: i }}>{x}</i>)}</div>
    </div>
  );
}

export default function ResearchJourney() {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => setPhase(Math.min(2, Math.floor(self.progress * 3))),
    });
    return () => trigger.kill();
  }, []);

  return (
    <section ref={root} className="pk-journey" id="demo">
      <div className="pk-journey-sticky">
        <div className="pk-journey-head">
          <p>02 / LIVE PRODUCT DEMONSTRATION</p>
          <h2>答えるほど、<br />集まる。</h2>
          <p>スクロールして、回答が研究へ届くまでをご覧ください。</p>
        </div>
        <ol className="pk-journey-steps">
          {steps.map((step, index) => <li key={step.no} className={phase === index ? 'active' : ''}><span>{step.no}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
        <div className={`pk-journey-stage phase-${phase}`}>
          <div className="pk-journey-network" aria-hidden><i /><i /><i /><i /><i /><svg viewBox="0 0 700 540"><path d="M32 415C172 354 204 170 356 192s188 171 317 67"/><path d="M65 82c127 20 170 163 312 120s168-44 279 37"/></svg></div>
          <div className="pk-journey-scenes">
            <div className={phase === 0 ? 'active' : ''}><AnswerScene /></div>
            <div className={phase === 1 ? 'active' : ''}><ScoreScene /></div>
            <div className={phase === 2 ? 'active' : ''}><PublishScene /></div>
          </div>
          <div className="pk-journey-phase"><span>0{phase + 1}</span><i><b style={{ width: `${((phase + 1) / 3) * 100}%` }} /></i><em>03</em></div>
        </div>
      </div>
    </section>
  );
}
