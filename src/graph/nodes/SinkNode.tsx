// graph/nodes/SinkNode.tsx

import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { useSimStore } from '@/store/simStore';
import { useHeatClass } from '@/graph/nodes/_shared';

// Теплова карта через відтінки фіолетового (Sink = вихідний вузол)
const HEAT_BG: Record<string, string> = {
  heat0: '#141420',
  heat1: '#1c1c2e',
  heat2: '#23233e',
  heat3: '#2d2d54',
  heat4: '#393968',
};
const HEAT_BORDER: Record<string, string> = {
  heat0: '#2a2a3a',
  heat1: '#3a3a5a',
  heat2: '#818cf899',
  heat3: '#818cf8cc',
  heat4: '#818cf8',
};

/** Форматує комплексне число з підтримкою дуже малих значень */
function fmtC(v: unknown): string {
  if (!v || typeof v !== 'object') return '—';
  const obj = v as Record<string, number>;
  const re = typeof obj.re === 'number' ? obj.re : 0;
  const im = typeof obj.im === 'number' ? obj.im : 0;
  const fmt = (n: number) =>
    Math.abs(n) < 1e-9 ? '0.000' : n.toFixed(3);
  return `${fmt(re)} ${im >= 0 ? '+' : '−'} j${fmt(Math.abs(im))}`;
}

/** Парсить рядок або об'єкт зі store і форматує */
function parseAndFmt(raw: string): string {
  if (!raw || raw === '—') return '—';
  try {
    return fmtC(JSON.parse(raw));
  } catch {
    return raw; // fallback: показати як є
  }
}

export default memo(function SinkNode({ id, selected }: NodeProps) {
  const raw = useSimStore((st) => st.sinks?.[id] ?? '—');
  const mismatch = useSimStore((s) => s.mismatches[id as string]);
  const heatClass = useHeatClass(String(id));

  const val = parseAndFmt(raw);
  const idle = val === '—';

  const bg = HEAT_BG[heatClass] ?? HEAT_BG.heat0;
  const border = mismatch
    ? '2px solid #ff4d4f'
    : selected
    ? '2px solid #6ea8fe'
    : `1px solid ${HEAT_BORDER[heatClass] ?? HEAT_BORDER.heat0}`;

  return (
    <div style={{ ...nodeStyle, background: bg, border }}>
      <div style={titleStyle}>Sink</div>

      <div
        style={{
          ...valStyle,
          color: idle ? '#3a3a5a' : '#a5b4fc',
        }}
      >
        {val}
      </div>

      <Handle
        type='target'
        position={Position.Left}
        id='in'
        style={handleIn}
      />
    </div>
  );
});

// ────────────────────────────────────────────────
const nodeStyle: CSSProperties = {
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '11px',
  minWidth: '96px',
  maxWidth: '130px',
  padding: '6px 8px',
  position: 'relative',
  boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
  transition: 'background 0.12s ease, border-color 0.12s ease',
};
const titleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: '10px',
  color: '#818cf8',
  marginBottom: '5px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};
const valStyle: CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '10px',
  lineHeight: 1.5,
  wordBreak: 'break-word',
  transition: 'color 0.15s ease',
};
const handleIn: CSSProperties = {
  background: '#4ade80',
  width: '8px',
  height: '8px',
};
