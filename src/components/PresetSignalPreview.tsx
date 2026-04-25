'use client';

import { useEffect, useRef } from 'react';

function readCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type Sample = { re: number; im: number };

export default function PresetSignalPreview({ data }: { data: Record<string, Sample> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samples: Sample[] = Array.from({ length: 16 }, (_, i) => data[`src${i}`] ?? { re: 0, im: 0 });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const accent = readCssVar('--accent', '#3b82f6');
    const warn = readCssVar('--warn', '#f59e0b');
    const axis = readCssVar('--border', '#e2e8f0');

    const maxAbs = Math.max(
      1,
      ...samples.map((s) => Math.max(Math.abs(s.re), Math.abs(s.im))),
    );

    // zero axis
    ctx.strokeStyle = axis;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const stepX = w / (samples.length - 1);
    const toY = (v: number) => h / 2 - (v / maxAbs) * (h / 2 - 4);

    // Re line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = i * stepX;
      const y = toY(s.re);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Re dots
    ctx.fillStyle = accent;
    samples.forEach((s, i) => {
      ctx.beginPath();
      ctx.arc(i * stepX, toY(s.re), 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Im line
    ctx.strokeStyle = warn;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = i * stepX;
      const y = toY(s.im);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }, [samples]);

  return <canvas ref={canvasRef} />;
}
