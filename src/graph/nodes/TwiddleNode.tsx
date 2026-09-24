// src/graph/nodes/TwiddleNode.tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useHeatClass } from './_shared';

type TwiddleNodeProps = {
  id: string;
  data: {
    label?: string;
    twiddle?: { N: number; k: number };
  };
};

// Теплова карта через відтінки амбри (Twiddle = поворотний множник)
const HEAT_BG: Record<string, string> = {
  heat0: '#2c2c2c',
  heat1: '#3a3320',
  heat2: '#4a3f1e',
  heat3: '#5e4f1c',
  heat4: '#7a6420',
};
const HEAT_BORDER: Record<string, string> = {
  heat0: '#777',
  heat1: '#fbbf2466',
  heat2: '#fbbf2499',
  heat3: '#fbbf24cc',
  heat4: '#fbbf24',
};

export function TwiddleNode({ id, data }: TwiddleNodeProps) {
  const heatClass = useHeatClass(id);

  return (
      <div
        className={`app-node twiddle-node ${heatClass}`}
        style={{
          ...styles.nodeBody,
          background: HEAT_BG[heatClass] ?? HEAT_BG.heat0,
          border: `1px solid ${HEAT_BORDER[heatClass] ?? HEAT_BORDER.heat0}`,
        }}
      >
        <Handle type="target" position={Position.Left} id="in" style={styles.handleTarget} />

        <div style={styles.content}>
          <span style={styles.mathText}>×</span>
          <span>{data.label}</span>
        </div>

        <Handle type="source" position={Position.Right} id="out" style={styles.handleSource} />
      </div>
  );
}

const styles = {
  nodeBody: {
    padding: '8px 12px',
    borderRadius: '16px', // Робимо його овальним для відмінності
    color: '#fbbf24', // Жовтуватий колір для множників
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70px',
    transition: 'background 0.2s ease, border-color 0.2s ease',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  mathText: {
    color: '#fff',
    fontSize: '14px',
  },
  handleTarget: {
    background: '#4ade80',
    width: '8px', height: '8px',
  },
  handleSource: {
    background: '#f87171',
    width: '8px', height: '8px',
  }
};