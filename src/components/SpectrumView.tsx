'use client';

// components/SpectrumView.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimStore } from '@/store/simStore';

function phaseOf(re: number, im: number) {
  return Math.atan2(im, re); // [-π, π]
}

export default function SpectrumView() {
  const N = useSimStore((s) => s.N);
  const sinks = useSimStore((s) => s.sinks);
  const scale = useSimStore((s) => s.spectrumScale);
  const setHover = useSimStore((s) => s.setSpectrumHover);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // зібрати комплексні X[k] із sinks
  const X = useMemo(() => {
    const arr: { re: number; im: number }[] = [];
    for (let k = 0; k < N; k++) {
      try {
        const v = JSON.parse(sinks[`snk${k}`] ?? 'null');
        if (v && typeof v.re === 'number' && typeof v.im === 'number') arr.push(v);
        else arr.push({ re: 0, im: 0 });
      } catch {
        arr.push({ re: 0, im: 0 });
      }
    }
    return arr;
  }, [N, sinks]);

  const mags = useMemo(() => X.map((v) => Math.hypot(v.re, v.im)), [X]);
  const maxMag = useMemo(() => Math.max(1e-12, ...mags), [mags]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = (c.width = c.clientWidth);
    const h = (c.height = c.clientHeight);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    const barW = w / Math.max(1, N);

    // ось
    ctx.strokeStyle = '#e3e3e3';
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();

    // шкала
    const toY = (m: number) => {
      if (scale === 'linear') return h - (m / maxMag) * (h - 4);
      // log: 20*log10(m/max)
      const db = 20 * Math.log10(Math.max(m, 1e-12) / maxMag); // ≤ 0
      const minDb = -80; // динамічний діапазон
      const t = Math.max(db, minDb) / minDb; // 0..1
      return h - t * (h - 4);
    };

    // стовпчики
    ctx.fillStyle = '#6aa9ff';
    mags.forEach((m, k) => {
      const x = k * barW + 1;
      const y = toY(m);
      ctx.fillRect(x, y, Math.max(1, barW - 2), h - y);
    });
  }, [N, mags, maxMag, scale]);

  // курсор-інспектор
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onMove = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const k = Math.min(N - 1, Math.max(0, Math.floor((x / r.width) * N)));
      const v = X[k];
      const mag = Math.hypot(v!.re, v!.im);
      const ph = phaseOf(v!.re, v!.im); // рад
      setHover({ k, mag, phase: ph });
    };
    const onLeave = () => setHover(null);
    c.addEventListener('mousemove', onMove);
    c.addEventListener('mouseleave', onLeave);
    return () => {
      c.removeEventListener('mousemove', onMove);
      c.removeEventListener('mouseleave', onLeave);
    };
  }, [N, X, setHover]);

  const hover = useSimStore((s) => s.spectrumHover);

  return (
    <div style={{ width: 520, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
      <div
        style={{ padding: '6px 8px', fontSize: 12, color: '#121212', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>|X[k]| ({scale === 'linear' ? 'linear' : 'log dB'})</span>
        {hover && hover.k !== null && (
          <span>
            k={hover.k} • |X|={hover.mag.toFixed(3)} • arg={((hover.phase * 180) / Math.PI).toFixed(1)}°
          </span>
        )}
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: 160, display: 'block' }} />
    </div>
  );
}
