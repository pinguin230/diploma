// graph/nodes/SinkNode.tsx

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { useSimStore } from '@/store/simStore';
import s from '@/styles/node.module.scss';
import { useHeatClass } from '@/graph/nodes/_shared';

function fmtC(v: any) {
  if (!v || typeof v !== 'object') return String(v ?? '—');
  const re = v.re ?? v.value?.re ?? 0;
  const im = v.im ?? v.value?.im ?? 0;
  return `${re.toFixed(3)} ${im >= 0 ? '+' : '−'} j${Math.abs(im).toFixed(3)}`;
}

export default memo(function SinkNode({ id, selected }: NodeProps) {
  const raw = useSimStore((st) => st.sinks?.[id] ?? '—');
  const mismatch = useSimStore((s) => s.mismatches[id as string]);
  const heat = useHeatClass(String(id));

  const val = typeof raw === 'string' ? raw : fmtC(raw);

  return (
    <div
      className={clsx(s.node, selected && s.selected, s[heat])}
      style={mismatch ? { borderColor: '#ff4d4f', borderWidth: 2 } : undefined}
    >
      <div className={s.title}>Sink</div>
      <div className={s.body}>
        <div>{val}</div>
      </div>
      <Handle type='target' position={Position.Left} id='in' />
    </div>
  );
});
