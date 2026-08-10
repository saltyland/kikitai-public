'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ランディングページの体験レイヤー。PKSHA級の「格」を生む要素をまとめて司る:
 *  - Lenis による慣性スムーススクロール（GSAP ScrollTrigger と同期）
 *  - 見出しの行/要素マスクめくり（キネティック・タイポグラフィ）
 *  - スクロール進捗バー
 *  - 追従カスタムカーソル + マグネティックボタン（[data-magnetic]）
 *  - スクラブ連動のパララックス（[data-parallax]）
 *
 * `prefers-reduced-motion` では一切のモーションを無効化し、静的表示にフォールバックする。
 * DOMの装飾要素（カーソル・進捗・グレイン）自体はこのコンポーネントが描画する。
 */
export default function LandingExperience() {
  const progressRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);

    // --- 進捗バー ---
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    };

    if (reduce) {
      updateProgress();
      window.addEventListener('scroll', updateProgress, { passive: true });
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      return () => window.removeEventListener('scroll', updateProgress);
    }

    // --- Lenis 慣性スクロール ---
    const lenis = new Lenis({
      duration: 1.15,
      easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)),
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    lenis.on('scroll', () => {
      ScrollTrigger.update();
      updateProgress();
    });
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    // アンカーリンクを Lenis 経由で滑らかに
    const onAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!target) return;
      const id = target.getAttribute('href');
      if (!id || id === '#') return;
      const dest = document.querySelector(id);
      if (!dest) return;
      e.preventDefault();
      lenis.scrollTo(dest as HTMLElement, { offset: -40, duration: 1.4 });
    };
    document.addEventListener('click', onAnchorClick);

    const ctx = gsap.context(() => {
      // --- ヒーロー導入シーケンス ---
      const hero = document.querySelector('.kx-hero');
      if (hero) {
        const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
        intro
          .from('.kx-topbar', { yPercent: -120, opacity: 0, duration: 0.9 })
          .from('.kx-hero__eyebrow', { y: 24, opacity: 0, duration: 0.8 }, '-=0.4')
          .from('.kx-hero__title .kx-line > span', {
            yPercent: 115,
            duration: 1.15,
            stagger: 0.1,
            ease: 'power4.out',
          }, '-=0.5')
          .from('.kx-hero__lead > *, .kx-hero__actions, .kx-hero__proof li', {
            y: 26,
            opacity: 0,
            duration: 0.8,
            stagger: 0.08,
          }, '-=0.7')
          .from('.kx-hero__scroll', { y: 18, opacity: 0, duration: 0.7 }, '-=0.3')
          .from('.kx-flowfield', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0.1);

        // ヒーローのパララックス退場
        gsap.to('.kx-hero__inner', {
          yPercent: -12,
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: '.kx-hero', start: '30% top', end: 'bottom top', scrub: 1 },
        });
        gsap.to('.kx-flowfield', {
          yPercent: 16,
          ease: 'none',
          scrollTrigger: { trigger: '.kx-hero', start: 'top top', end: 'bottom top', scrub: 1.4 },
        });
      }

      // --- 見出しの行マスクめくり ---
      gsap.utils.toArray<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
        const lines = el.querySelectorAll('.kx-line > span');
        gsap.from(lines, {
          yPercent: 115,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });

      // --- 汎用フェード＋上昇リビール ---
      gsap.utils.toArray<HTMLElement>('[data-reveal="rise"]').forEach((el) => {
        gsap.from(el, {
          y: 48,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });

      // --- 子要素をstaggerで順次リビール ---
      gsap.utils.toArray<HTMLElement>('[data-reveal="stagger"]').forEach((el) => {
        gsap.from(el.children, {
          y: 52,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });

      // --- パララックス（data-parallax="速度"） ---
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '0.1');
        gsap.to(el, {
          yPercent: -speed * 100,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.1 },
        });
      });

      // --- 横流れするマーキー文字（scrub） ---
      gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((el) => {
        const dir = parseFloat(el.dataset.drift || '-14');
        gsap.fromTo(el, { xPercent: dir < 0 ? 4 : -4 }, {
          xPercent: dir,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
        });
      });

      // --- 数値カウントアップ ---
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const end = parseFloat(el.dataset.count || '0');
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
          onUpdate: () => {
            el.textContent = Math.round(obj.v).toString();
          },
        });
      });

      // --- スコアバーの伸長 ---
      gsap.from('.kx-score__bar > i', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '.kx-score', start: 'top 78%' },
      });

      ScrollTrigger.refresh();
    });

    updateProgress();

    // --- カスタムカーソル + マグネティック ---
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const cursor = cursorRef.current;
    const magneticCleanups: Array<() => void> = [];

    // ポインタへ即時追従（遅延円は廃止）。初回移動まで隠しておく
    const moveCursor = (e: MouseEvent) => {
      if (!cursor) return;
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      if (!cursor.classList.contains('is-live')) cursor.classList.add('is-live');
    };

    if (finePointer && cursor) {
      document.body.classList.add('kx-has-cursor');
      window.addEventListener('mousemove', moveCursor);

      const hoverables = document.querySelectorAll('a, button, [data-magnetic], details summary');
      hoverables.forEach((el) => {
        const enter = () => cursor.classList.add('is-hover');
        const leave = () => cursor.classList.remove('is-hover');
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);
        magneticCleanups.push(() => {
          el.removeEventListener('mouseenter', enter);
          el.removeEventListener('mouseleave', leave);
        });
      });

      // マグネティックボタン
      gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((el) => {
        const strength = parseFloat(el.dataset.magnetic || '0.35');
        const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
        const onEnter = () => cursor.classList.add('is-lock');
        const onMove = (e: Event) => {
          const ev = e as MouseEvent;
          const rect = el.getBoundingClientRect();
          const relX = ev.clientX - (rect.left + rect.width / 2);
          const relY = ev.clientY - (rect.top + rect.height / 2);
          xTo(relX * strength);
          yTo(relY * strength);
        };
        const onLeave = () => {
          xTo(0);
          yTo(0);
          cursor.classList.remove('is-lock');
        };
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        magneticCleanups.push(() => {
          el.removeEventListener('mouseenter', onEnter);
          el.removeEventListener('mousemove', onMove);
          el.removeEventListener('mouseleave', onLeave);
        });
      });
    }

    return () => {
      document.removeEventListener('click', onAnchorClick);
      gsap.ticker.remove(ticker);
      lenis.destroy();
      ctx.revert();
      window.removeEventListener('mousemove', moveCursor);
      magneticCleanups.forEach((fn) => fn());
      document.body.classList.remove('kx-has-cursor');
    };
  }, []);

  return (
    <>
      <div ref={progressRef} className="kx-progress" aria-hidden />
      <div ref={cursorRef} className="kx-cursor" aria-hidden><i /></div>
      <div className="kx-grain" aria-hidden />
    </>
  );
}
