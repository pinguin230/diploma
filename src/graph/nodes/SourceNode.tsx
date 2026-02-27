// graph/nodes/SourceNode.tsx

import { memo, useEffect, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { useSimStore } from '@/store/simStore';
import s from '@/styles/node.module.scss';
import { useHeatClass } from '@/graph/nodes/_shared';

export default memo(function SourceNode({ id, selected }: NodeProps) {
  const runtime = useSimStore((s) => s.runtime);
  const [re, setRe] = useState(1);
  const [im, setIm] = useState(0);
  const setLastInput = useSimStore((s) => s.setLastInput);
  const heat = useHeatClass(String(id));

  useEffect(() => {
    setLastInput(id as string, { re, im });
  }, [id, re, im, setLastInput]);

  const emit = () => {
    if (!runtime) return;
    const now = useSimStore.getState().simTime;
    runtime.emitFrom(id, 'out', {
      id: crypto.randomUUID(),
      value: { re, im },
      t: now,
      originT: now,
    });
  };

  return (
    <div className={clsx(s.node, selected && s.selected, s[heat])}>
      <div className={s.title}>Source</div>
      <div className={s.body}>
        <div className={s.controls}>
          <input type='number' step='1' value={re} onChange={(e) => setRe(Number(e.target.value))} />
          <input type='number' step='1' value={im} onChange={(e) => setIm(Number(e.target.value))} />
          <button onClick={emit}>Emit</button>
        </div>
      </div>
      <Handle type='source' position={Position.Right} id='out' />
    </div>
  );
});
