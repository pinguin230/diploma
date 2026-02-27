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

export function TwiddleNode({ id, data }: TwiddleNodeProps) {
  const heatClass = useHeatClass(id);

  return (
      <div className={`app-node twiddle-node ${heatClass}`} style={styles.nodeBody}>
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
    background: '#2c2c2c',
    border: '1px solid #777',
    borderRadius: '16px', // Робимо його овальним для відмінності
    color: '#fbbf24', // Жовтуватий колір для множників
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70px',
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