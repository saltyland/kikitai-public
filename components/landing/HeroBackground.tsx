'use client';

import { useEffect, useRef } from 'react';

/** 1個の知識パーティクルの状態。中心からの距離を `phase` で循環させる */
type Particle = {
  angle: number;
  baseRadius: number;
  phase: number;
  speed: number;
  size: number;
  hue: number;
  x: number;
  y: number;
};

const PARTICLE_COUNT = 64;
const ATTRACT_RADIUS = 90;

/**
 * ヒーロー背景の軽量パーティクルアニメーション（Canvas 2D、WebGL不使用）。
 * 中心から外側へ放射状に広がりゆっくり戻ってくる循環運動を青〜紫のグラデーションで描く。
 * マウスホバーで近くのパーティクルを引き寄せ、`prefers-reduced-motion` では静止画にする。
 */
export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const mouse = { x: -9999, y: -9999, active: false };

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3,
      baseRadius: 60 + Math.random() * 220,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.25,
      size: 1.5 + Math.random() * 2.5,
      hue: 220 + Math.random() * 60, // 青(220)〜紫(280)
      x: 0,
      y: 0,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onPointerLeave = () => {
      mouse.active = false;
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    let raf = 0;
    let t = 0;

    const draw = () => {
      const cx = width / 2;
      const cy = height / 2;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        // 循環運動：sinカーブで中心からの距離が広がる→戻るを繰り返す
        const cycle = (Math.sin(t * p.speed + p.phase) + 1) / 2; // 0〜1
        const radius = p.baseRadius * (0.3 + cycle * 0.7);
        let x = cx + Math.cos(p.angle + t * 0.05) * radius;
        let y = cy + Math.sin(p.angle + t * 0.05) * radius;

        if (mouse.active) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ATTRACT_RADIUS) {
            const pull = (1 - dist / ATTRACT_RADIUS) * 0.6;
            x -= dx * pull;
            y -= dy * pull;
          }
        }

        p.x = x;
        p.y = y;

        const glow = 0.4 + cycle * 0.6;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${glow})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, ${glow})`;
        ctx.shadowBlur = p.size * 3;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      t += 0.016;
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    if (reduceMotion) {
      // 静止表示：1フレームだけ描いてループは起動しない
      draw();
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-auto absolute inset-0 -z-0 h-full w-full"
    />
  );
}
