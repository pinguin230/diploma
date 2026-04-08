'use client';

// components/TerminalOutput.tsx
import { useState } from 'react';
import { useSimStore } from '@/store/simStore';

export default function TerminalOutput() {
  const [isOpen, setIsOpen] = useState(false);
  const sinks = useSimStore((s) => s.sinks);
  const N = 16;

  // Збираємо результати з раковин (Sinks)
  const results = [];
  for (let k = 0; k < N; k++) {
    const s = sinks[`snk${k}`];
    if (s) {
      try {
        const parsed = JSON.parse(s);
        results.push({ k, re: parsed.re ?? 0, im: parsed.im ?? 0 });
      } catch {
        results.push(null);
      }
    } else {
      results.push(null);
    }
  }

  // Кнопка для відкриття термінала
  if (!isOpen) {
    return (
        <button
            onClick={() => setIsOpen(true)}
            style={{
              position: 'absolute', right: 22, bottom: 22, zIndex: 50,
              background: '#1e1e1e', color: '#4ade80', fontFamily: 'monospace',
              padding: '10px 16px', borderRadius: '6px', border: '1px solid #333',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
        >
          <span>&gt;_</span> Show C-Console Output
        </button>
    );
  }

  // Відкрите вікно термінала
  return (
      <div style={{
        position: 'absolute', right: 22, bottom: 22, zIndex: 50,
        width: 360, background: '#1e1e1e', color: '#d4d4d4',
        fontFamily: 'monospace', fontSize: '13px',
        borderRadius: '8px', border: '1px solid #333',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Заголовок термінала */}
        <div style={{
          background: '#2d2d2d', padding: '8px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #444', color: '#9cdcfe', fontSize: '12px'
        }}>
          <span>Terminal - DFT16_Teslja.exe</span>
          <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#ff5f56', cursor: 'pointer', fontSize: '16px', lineHeight: '12px' }}
              title="Close"
          >
            ●
          </button>
        </div>

        {/* Тіло термінала з результатами */}
        <div style={{ padding: '12px', height: '280px', overflowY: 'auto', lineHeight: '1.6' }}>
          <div style={{ color: '#ce9178', marginBottom: '12px' }}>
            $ ./run_dft4x4_simulation<br/>
            Computing 16-point DFT using 4x4 row-col method...
          </div>

          {results.map((r, i) => {
            if (!r) {
              return (
                  <div key={i} style={{ color: '#666' }}>
                    <span style={{ color: '#4fc1ff', opacity: 0.5 }}>X16</span>[{i.toString().padStart(2, ' ')}] = ...waiting
                  </div>
              );
            }

            // Форматування знаку для уявних чисел (додаємо +, якщо число додатнє)
            const sign = r.im >= 0 ? '+' : '';
            return (
                <div key={i}>
                  <span style={{ color: '#4fc1ff' }}>X16</span>[{r.k.toString().padStart(2, ' ')}] = {r.re.toFixed(6)} {sign}{r.im.toFixed(6)}j
                </div>
            );
          })}
        </div>
      </div>
  );
}