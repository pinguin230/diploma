// graph/nodes/SourceNode.tsx

import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { useSimStore } from '@/store/simStore';
import { useHeatClass } from '@/graph/nodes/_shared';

// Теплова карта через відтінки зеленого (Source = вхідний вузол)
const HEAT_BG: Record<string, string> = {
  heat0: '#141a14',
  heat1: '#1a2a1a',
  heat2: '#22371f',
  heat3: '#2d4a28',
  heat4: '#3a6032',
};
const HEAT_BORDER: Record<string, string> = {
  heat0: '#2a3a2a',
  heat1: '#3a5a3a',
  heat2: '#4ade8099',
  heat3: '#4ade80cc',
  heat4: '#4ade80',
};

export default memo(function SourceNode({ id, selected }: NodeProps) {
  const runtime = useSimStore((s) => s.runtime);
  const lastInput = useSimStore((s) => s.lastInput[id as string]);
  const setLastInput = useSimStore((s) => s.setLastInput);
  const heatClass = useHeatClass(String(id));

  const [re, setRe] = useState(0);
  const [im, setIm] = useState(0);

  // синхронізуємо поля з lastInput (зміна пресету)
  useEffect(() => {
    if (lastInput) {
      setRe(parseFloat(lastInput.re.toFixed(4)));
      setIm(parseFloat(lastInput.im.toFixed(4)));
    }
  }, [lastInput]);

  useEffect(() => {
    setLastInput(id as string, { re, im });
  }, [id, re, im, setLastInput]);

  const emit = () => {
    if (!runtime) return;
    const now = useSimStore.getState().simTime;
    runtime.emitFrom(id as string, 'out', {
      id: crypto.randomUUID(),
      value: { re, im },
      t: now,
      originT: now,
    });
  };

  const bg = HEAT_BG[heatClass] ?? HEAT_BG.heat0;
  const border = selected
    ? '2px solid #6ea8fe'
    : `1px solid ${HEAT_BORDER[heatClass] ?? HEAT_BORDER.heat0}`;

  return (
    <div style={{ ...nodeStyle, background: bg, border }}>
      <div style={titleStyle}>Source</div>

      <div style={rowsStyle}>
        <Row label='re' value={re} onChange={setRe} />
        <Row label='im' value={im} onChange={setIm} />
      </div>

      <button onClick={emit} style={btnStyle} title='Вручну емітувати токен'>
        emit
      </button>

      <Handle
        type='source'
        position={Position.Right}
        id='out'
        style={handleOut}
      />
    </div>
  );
});

// ────────────────────────────────────────────────
function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      <input
        type='number'
        step='0.1'
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
      />
    </label>
  );
}

// ────────────────────────────────────────────────
const nodeStyle: CSSProperties = {
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '11px',
  minWidth: '96px',
  padding: '6px 8px 5px',
  position: 'relative',
  boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
  transition: 'background 0.12s ease, border-color 0.12s ease',
};
const titleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: '10px',
  color: '#4ade80',
  marginBottom: '5px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};
const rowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
};
const labelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};
const labelTextStyle: CSSProperties = {
  color: '#6b7f6b',
  width: '14px',
  fontSize: '10px',
};
const inputStyle: CSSProperties = {
  width: '58px',
  background: '#0b100b',
  border: '1px solid #263026',
  borderRadius: '4px',
  color: '#d1fae5',
  fontSize: '10px',
  padding: '1px 4px',
  outline: 'none',
};
const btnStyle: CSSProperties = {
  marginTop: '5px',
  width: '100%',
  background: '#1e3a1e',
  border: '1px solid #2d4a2d',
  borderRadius: '4px',
  color: '#4ade8099',
  fontSize: '9px',
  cursor: 'pointer',
  padding: '2px 0',
  letterSpacing: '0.05em',
};
const handleOut: CSSProperties = {
  background: '#f87171',
  width: '8px',
  height: '8px',
};
