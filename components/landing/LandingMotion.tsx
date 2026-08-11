'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function LandingMotion() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.pk-header', { y: -22, opacity: 0, duration: 0.9 })
        .from('.pk-premium-hero__eyebrow', { y: 20, opacity: 0, duration: 0.7 }, '-=.45')
        .from('.pk-premium-hero__title > span', { yPercent: 58, opacity: 0, duration: 1.05, stagger: 0.12 }, '-=.45')
        .from('.pk-premium-hero__lead, .pk-premium-hero__actions, .pk-premium-hero__proof', { y: 25, opacity: 0, duration: 0.7, stagger: 0.09 }, '-=.5')
        .from('.pk-scroll-prompt', { y: 18, opacity: 0, duration: 0.7 }, '-=.35');

      gsap.to('.pk-premium-hero__title', {
        yPercent: -8,
        opacity: 0.28,
        ease: 'none',
        scrollTrigger: { trigger: '.pk-premium-hero', start: '48% top', end: 'bottom top', scrub: 1 },
      });

      gsap.utils.toArray<HTMLElement>('[data-k2-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 55,
          opacity: 0,
          duration: 1.05,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 88%', toggleActions: 'play none none reverse' },
        });
      });

      gsap.to('.k2-concept__statement', {
        xPercent: -13,
        ease: 'none',
        scrollTrigger: { trigger: '.k2-concept', start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      });

      gsap.utils.toArray<HTMLElement>('[data-k2-step]').forEach((card, index) => {
        gsap.from(card, {
          x: -28,
          opacity: 0,
          duration: 0.8,
          delay: index * 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none reverse' },
        });
      });

      gsap.to('[data-k2-demo]', {
        yPercent: -4,
        ease: 'none',
        scrollTrigger: { trigger: '.k2-flow', start: 'top bottom', end: 'bottom top', scrub: 1.1 },
      });

      gsap.to('.k2-quality__visual', {
        yPercent: -7,
        ease: 'none',
        scrollTrigger: { trigger: '.k2-quality', start: 'top bottom', end: 'bottom top', scrub: 1.1 },
      });
      gsap.from('.k2-score-card ul b', {
        scaleX: 0,
        duration: 1.25,
        stagger: 0.12,
        ease: 'power3.out',
        transformOrigin: 'left center',
        scrollTrigger: { trigger: '.k2-score-card', start: 'top 77%' },
      });
      gsap.from('[data-k2-score]', {
        textContent: 72,
        duration: 1.4,
        snap: { textContent: 1 },
        ease: 'power2.out',
        scrollTrigger: { trigger: '.k2-score-card', start: 'top 77%' },
      });
    });

    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateProgress);
      context.revert();
    };
  }, []);

  return <div ref={progressRef} className="pk-page-progress" aria-hidden />;
}
