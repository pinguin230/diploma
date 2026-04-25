'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import p from '@/styles/panels.module.scss';

export default function TerminalOutput() {
  const [isOpen, setIsOpen] = useState(false);
  const sinks = useSimStore((s) => s.sinks);
  const N = 16;

  const results: Array<{ k: number; re: number; im: number } | null> = [];
  for (let k = 0; k < N; k++) {
    const raw = sinks[`snk${k}`];
    if (!raw) {
      results.push(null);
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      results.push({ k, re: parsed.re ?? 0, im: parsed.im ?? 0 });
    } catch {
      results.push(null);
    }
  }

  return (
    <section className={p.panel}>
      <button type="button" className={p.panelHeader} onClick={() => setIsOpen((v) => !v)}>
        <span>Console output — X16[k]</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isOpen && (
        <div className={p.terminal}>
          <div className={p.terminalPrompt}>$ ./run_dft4x4_simulation</div>
          {results.map((r, i) => (
            <div key={i} className={clsx(p.terminalRow, !r && p.pending)}>
              <span className={p.terminalKey}>X16</span>[{String(i).padStart(2, ' ')}] ={' '}
              {r
                ? `${r.re.toFixed(6)} ${r.im >= 0 ? '+' : '-'}${Math.abs(r.im).toFixed(6)}j`
                : '…waiting'}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
