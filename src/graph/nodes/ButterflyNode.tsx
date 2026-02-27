// graph/nodes/ButterflyNode.tsx

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { useSimStore } from '@/store/simStore';
import s from '@/styles/node.module.scss';
import { useHeatClass } from '@/graph/nodes/_shared';

function ButterflyNode({ id, selected }: NodeProps) {
  // Дістаємо параметри твідла для цього вузла з графа
  const tw = useSimStore((st) => st.graph.nodes.find((n) => n.id === String(id))?.params?.twiddle);
  const activeNodeId = useSimStore((s) => s.activeNodeId);
  const isActive = activeNodeId === id;
  const heat = useHeatClass(String(id));

  return (
    <div className={clsx(s.node, selected && s.selected, isActive && s.active, s[heat])}>
      <div className={s.title}>FFT Butterfly</div>

      <Handle type='target' position={Position.Left} id='x0' />
      <Handle type='target' position={Position.Left} id='x1' />

      <div className={s.body}>
        <div className={s.symbol}>🦋</div>
        <div className={s.desc}>
          y₀ = x₀ + x₁
          <br />
          {tw ? (
            <>
              y₁ = (x₀ − x₁) · W<sub>{tw.N}</sub>
              <sup>{tw.k}</sup>
            </>
          ) : (
            <>y₁ = x₀ − x₁</>
          )}
        </div>
      </div>

      <Handle type='source' position={Position.Right} id='y0' />
      <Handle type='source' position={Position.Right} id='y1' />
    </div>
  );
}

export default memo(ButterflyNode);
