'use client';

import { useEffect, useRef } from 'react';

/**
 * ヒーローの署名ビジュアル「共鳴フィールド」。
 *
 * キキタイの本質＝「問い（パルス）がネットワークを伝わり、届いた先で共鳴し、答えが返る」を
 * Canvas 2D で描く生成的アニメーション。ノード網の上をパルスが流れ、到達点で共鳴リングが
 * 広がる。ポインタは近傍ノードを穏やかに引き寄せ、波紋を生む。WebGL不使用・軽量。
 * `prefers-reduced-motion` では静止した1枚絵を描く。
 */

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hub: boolean;
};

type Pulse = {
  from: number;
  to: number;
  t: number; // 0→1 進行度
  speed: number;
};

type Ripple = {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number; // 1→0
};

const INK = '12, 33, 31'; // #0c211f 系
const GREEN = '20, 138, 128';
const MINT = '92, 200, 176';

export default function HeroFlowField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let t = 0;

    const pointer = { x: -9999, y: -9999, active: false };
    const nodes: Node[] = [];
    const pulses: Pulse[] = [];
    const ripples: Ripple[] = [];

    const CONNECT = () => Math.min(width, height) * 0.26;

    const seed = () => {
      nodes.length = 0;
      const area = width * height;
      const count = Math.round(Math.min(78, Math.max(34, area / 15000)));
      for (let i = 0; i < count; i++) {
        const hub = Math.random() < 0.16;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          r: hub ? 2.6 + Math.random() * 1.6 : 1.1 + Math.random() * 1.2,
          hub,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // 寸法が実質同じなら再配置しない（ResizeObserverの連続発火対策）
      if (Math.abs(rect.width - width) < 2 && Math.abs(rect.height - height) < 2) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    // 接続済みの隣接ノードを返す（パルス経路生成用）
    const neighbors = (index: number, radius: number) => {
      const out: number[] = [];
      const a = nodes[index];
      for (let j = 0; j < nodes.length; j++) {
        if (j === index) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < radius * radius) out.push(j);
      }
      return out;
    };

    const spawnPulse = () => {
      if (nodes.length < 2) return;
      const radius = CONNECT();
      // ハブを優先して発信源に
      const hubs = nodes.map((n, i) => (n.hub ? i : -1)).filter((i) => i >= 0);
      const from = hubs.length && Math.random() < 0.7
        ? hubs[(Math.random() * hubs.length) | 0]
        : (Math.random() * nodes.length) | 0;
      const near = neighbors(from, radius);
      if (!near.length) return;
      const to = near[(Math.random() * near.length) | 0];
      pulses.push({ from, to, t: 0, speed: 0.006 + Math.random() * 0.01 });
    };

    const spawnRipple = (x: number, y: number, max: number) => {
      ripples.push({ x, y, r: 0, max, life: 1 });
    };

    const draw = () => {
      const radius = CONNECT();
      ctx.clearRect(0, 0, width, height);

      // --- ノードの緩やかなドリフト＋ポインタ引力 ---
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));

        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          const R = 150;
          if (d < R && d > 0.01) {
            const pull = (1 - d / R) * 0.5;
            n.x += (dx / d) * pull;
            n.y += (dy / d) * pull;
          }
        }
      }

      // --- エッジ（近傍を結ぶ細い線） ---
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < radius * radius) {
            const dist = Math.sqrt(dist2);
            const alpha = (1 - dist / radius) * 0.16;
            ctx.strokeStyle = `rgba(${INK}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // --- 共鳴リング ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (rp.max - rp.r) * 0.045;
        rp.life -= 0.012;
        if (rp.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(${GREEN}, ${rp.life * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- パルス（問い/答えがエッジを流れる） ---
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const a = nodes[p.from];
        const b = nodes[p.to];
        if (!a || !b) {
          pulses.splice(i, 1);
          continue;
        }
        p.t += p.speed;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;

        // 尾を引く光点
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, `rgba(${MINT}, 0.95)`);
        g.addColorStop(1, `rgba(${MINT}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,0.95)`;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();

        if (p.t >= 1) {
          spawnRipple(b.x, b.y, 34 + Math.random() * 26);
          pulses.splice(i, 1);
          // 連鎖：一定確率で次のエッジへ伝播
          if (Math.random() < 0.55) {
            const near = neighbors(p.to, radius).filter((n) => n !== p.from);
            if (near.length) {
              const next = near[(Math.random() * near.length) | 0];
              pulses.push({ from: p.to, to: next, t: 0, speed: p.speed });
            }
          }
        }
      }

      // --- ノード本体 ---
      for (const n of nodes) {
        if (n.hub) {
          ctx.fillStyle = `rgba(${GREEN}, 0.9)`;
          ctx.shadowColor = `rgba(${GREEN}, 0.5)`;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(${INK}, 0.55)`;
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      t += 1;
      if (!reduce) {
        if (t % 42 === 0 && pulses.length < 10) spawnPulse();
        raf = requestAnimationFrame(draw);
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      spawnRipple(e.clientX - rect.left, e.clientY - rect.top, 120);
    };

    resize();
    window.addEventListener('resize', resize);
    // 初期レイアウトが未確定（rect=0）でも確実に採寸できるよう監視する
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);

    if (reduce) {
      // 静止絵：数フレーム進めて構図を作ってから1枚描く
      for (let i = 0; i < 3; i++) spawnPulse();
      draw();
    } else {
      for (let i = 0; i < 4; i++) spawnPulse();
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="kx-flowfield" />;
}
