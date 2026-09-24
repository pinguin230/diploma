// src/graph/nodes/DFT4Node.tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useHeatClass } from './_shared';
// Якщо у вас є BufferBadge для відображення черги, розкоментуйте:
// import { BufferBadge } from './BufferBadge';

type DFT4NodeProps = {
  id: string;
  data: {
    label?: string;
    [key: string]: any;
  };
};

// Теплова карта через відтінки синього (DFT-4 = обчислювальний вузол)
const HEAT_BG: Record<string, string> = {
  heat0: '#1e1e1e',
  heat1: '#26304a',
  heat2: '#2f3f63',
  heat3: '#3a5187',
  heat4: '#4a68b0',
};
const HEAT_BORDER: Record<string, string> = {
  heat0: '#555',
  heat1: '#6d91e088',
  heat2: '#6d91e0aa',
  heat3: '#6d91e0cc',
  heat4: '#6d91e0',
};

export function DFT4Node({ id, data }: DFT4NodeProps) {
  const heatClass = useHeatClass(id);

  // Стилі для рівномірного розташування 4-х портів по висоті вузла
  const portPositions = ['12.5%', '37.5%', '62.5%', '87.5%'];

  return (
      <div
        className={`app-node dft4-node ${heatClass}`}
        style={{
          ...styles.nodeBody,
          background: HEAT_BG[heatClass] ?? HEAT_BG.heat0,
          border: `2px solid ${HEAT_BORDER[heatClass] ?? HEAT_BORDER.heat0}`,
        }}
      >
        <div style={styles.header}>{data.label || 'DFT-4'}</div>

        {/* 4 Вхідні порти (Left) */}
        {portPositions.map((top, idx) => (
            <div key={`in-wrapper-${idx}`}>
              <Handle
                  type="target"
                  position={Position.Left}
                  id={`in${idx}`}
                  style={{ top, ...styles.handleTarget }}
              />
              {/* <BufferBadge nodeId={id} portId={`in${idx}`} /> - додайте, якщо є компонент */}
            </div>
        ))}

        {/* 4 Вихідні порти (Right) */}
        {portPositions.map((top, idx) => (
            <Handle
                key={`out-wrapper-${idx}`}
                type="source"
                position={Position.Right}
                id={`out${idx}`}
                style={{ top, ...styles.handleSource }}
            />
        ))}

        <div style={styles.bodyText}>
          N=4
        </div>
      </div>
  );
}

// Мінімальні стилі для блоку (можна перенести у ваш node.module.scss)
const styles = {
  nodeBody: {
    width: '80px',
    height: '140px', // Більша висота, щоб вмістити 4 порти
    borderRadius: '8px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    position: 'relative' as const,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    transition: 'background 0.2s ease, border-color 0.2s ease',
  },
  header: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px',
    borderBottom: '1px solid #444',
    width: '100%',
    textAlign: 'center' as const,
    background: '#2a2a2a',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px'
  },
  bodyText: {
    margin: 'auto',
    fontSize: '14px',
    color: '#aaa',
  },
  handleTarget: {
    background: '#4ade80', // Зеленуватий для входів
    width: '10px',
    height: '10px',
  },
  handleSource: {
    background: '#f87171', // Червонуватий для виходів
    width: '10px',
    height: '10px',
  }
};