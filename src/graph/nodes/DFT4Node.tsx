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

export function DFT4Node({ id, data }: DFT4NodeProps) {
  const heatClass = useHeatClass(id);

  // Стилі для рівномірного розташування 4-х портів по висоті вузла
  const portPositions = ['12.5%', '37.5%', '62.5%', '87.5%'];

  return (
      <div className={`app-node dft4-node ${heatClass}`} style={styles.nodeBody}>
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
    background: '#1e1e1e',
    border: '2px solid #555',
    borderRadius: '8px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    position: 'relative' as const,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
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