'use client';

import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useSimStore } from '@/store/simStore';
import p from '@/styles/panels.module.scss';

function phaseOf(re: number, im: number) {
  return Math.atan2(im, re);
}

function readCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function SpectrumView() {
  const N = useSimStore((s) => s.N);
  const sinks = useSimStore((s) => s.sinks);
  const scale = useSimStore((s) => s.spectrumScale);
  const setScale = useSimStore((s) => s.setSpectrumScale);
  const setHover = useSimStore((s) => s.setSpectrumHover);
  const hover = useSimStore((s) => s.spectrumHover);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Чи дістався хоч один вихідний відлік (sink) реальних даних
  const hasData = useMemo(() => {
    for (let k = 0; k < N; k++) {
      const raw = sinks[`snk${k}`];
      if (!raw) continue;
      try {
        const v = JSON.parse(raw);
        if (v && typeof v.re === 'number' && typeof v.im === 'number') return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  }, [N, sinks]);

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

    const axis = readCssVar('--border', '#e2e8f0');
    const bar = readCssVar('--accent', '#3b82f6');

    ctx.strokeStyle = axis;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();

    const barW = w / Math.max(1, N);
    const toY = (m: number) => {
      if (scale === 'linear') return h - (m / maxMag) * (h - 4);
      const db = 20 * Math.log10(Math.max(m, 1e-12) / maxMag);
      const minDb = -80;
      const t = Math.max(db, minDb) / minDb;
      return h - t * (h - 4);
    };

    ctx.fillStyle = bar;
    mags.forEach((m, k) => {
      const x = k * barW + 1;
      const y = toY(m);
      ctx.fillRect(x, y, Math.max(1, barW - 2), h - y);
    });
  }, [N, mags, maxMag, scale]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onMove = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const k = Math.min(N - 1, Math.max(0, Math.floor((x / r.width) * N)));
      const v = X[k];
      const mag = Math.hypot(v!.re, v!.im);
      const ph = phaseOf(v!.re, v!.im);
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

  return (
    <section className={p.panel}>
      <div className={p.panelHeader}>
        <span>Output spectrum |X[k]|</span>
        <div className={p.spectrumScale}>
          <button
            type="button"
            onClick={() => setScale('linear')}
            className={clsx(scale === 'linear' && p.active)}
          >
            linear
          </button>
          <button
            type="button"
            onClick={() => setScale('log')}
            className={clsx(scale === 'log' && p.active)}
          >
            dB
          </button>
        </div>
      </div>
      {hasData ? (
        <>
          <canvas ref={canvasRef} className={p.spectrumCanvas} />
          <div className={p.spectrumCaption}>
            {hover && hover.k !== null ? (
              <span>
                k = {hover.k} · |X| = {hover.mag.toFixed(3)} · ∠ ={' '}
                {((hover.phase * 180) / Math.PI).toFixed(1)}°
              </span>
            ) : (
              <span>Hover bars to inspect bin</span>
            )}
            <span>{scale === 'linear' ? 'linear scale' : 'log (dB)'}</span>
          </div>
        </>
      ) : (
        <div className={p.emptyState}>Run the simulation to see the output spectrum.</div>
      )}
    </section>
  );
}
