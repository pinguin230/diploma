import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useSimStore } from '@/store/simStore';

const EMPTY: readonly { id: string; t0: number; delay: number }[] = Object.freeze([]);

export default memo(function TokenEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data } = props;

  const tokens = useSimStore((s) => s.tokensByEdge?.[id] ?? EMPTY);
  const remove = useSimStore((s) => s.removeEdgeToken);
  const simTime = useSimStore((s) => s.simTime);

  const inBufferCount = useMemo(
    () => tokens.reduce((acc, tk) => acc + (simTime - tk.t0 < tk.delay ? 1 : 0), 0),
    [tokens, simTime],
  );

  const [path, labelX, labelY] = useMemo(
    () => getBezierPath({ sourceX, sourceY, targetX, targetY }),
    [sourceX, sourceY, targetX, targetY],
  );

  const pathRef = useRef<SVGPathElement | null>(null);
  const [totalLen, setTotalLen] = useState(0);

  useEffect(() => {
    if (!pathRef.current) return;
    try {
      setTotalLen(pathRef.current.getTotalLength());
    } catch {
      /* noop */
    }
  }, [path]);

  const circles = tokens.map((tk) => {
    const p = tk.delay > 0 ? (simTime - tk.t0) / tk.delay : 1;
    const clamped = Math.min(Math.max(p, 0), 1);

    let cx = sourceX,
      cy = sourceY;
    const pathEl = pathRef.current;

    if (pathEl && totalLen > 0) {
      const pt = pathEl.getPointAtLength(totalLen * clamped);
      cx = pt.x;
      cy = pt.y;
    } else {
      cx = sourceX + (targetX - sourceX) * clamped;
      cy = sourceY + (targetY - sourceY) * clamped;
    }

    if (p >= 1) queueMicrotask(() => remove(id, tk.id));

    return <circle key={tk.id} cx={cx} cy={cy} r={5} style={{ fill: '#cfe2ff', opacity: 0.9 }} />;
  });

  // ✅ і центр-бейдж, і «квадратики» беруть одне й те саме число
  const centerBadge = (() => {
    const p = pathRef.current;
    if (!p) return null;
    const total = p.getTotalLength() || 1;
    const mid = p.getPointAtLength(total / 2);
    const x = mid.x,
      y = mid.y;
    return (
      <>
        <rect x={x - 9} y={y - 18} width='18' height='14' rx='3' fill='#2c3346' stroke='#3a4258' />
        <text x={x} y={y - 7} textAnchor='middle' fontSize='10' fill='#cfe2ff'>
          {inBufferCount}
        </text>
      </>
    );
  })();

  const pad = 6,
    size = 4;
  const bufferBadges = Array.from({ length: Math.min(inBufferCount, 3) }, (_, i) => (
    <rect key={i} x={-10} y={-10 - i * (size + pad)} width={size} height={size} rx={1} ry={1} />
  ));

  const badgeX = sourceX + 20;
  const badgeY = sourceY + 10;

  return (
    <>
      <path d={path} ref={pathRef} fill='none' stroke='transparent' pointerEvents='none' />
      <BaseEdge id={id} path={path} />
      <g fill='white' transform={`translate(${badgeX}, ${badgeY})`}>
        {bufferBadges}
      </g>

      {data?.label && (
        <g pointerEvents='none'>
          <rect x={labelX - 14} y={labelY - 9} width={28} height={16} rx={4} ry={4} opacity={0.15} />
          <text x={labelX} y={labelY} fontSize={11} fill='red' textAnchor='middle' dominantBaseline='central'>
            {String((data as { label?: unknown })?.label)}
          </text>
        </g>
      )}

      <g>{circles}</g>
      <g>{centerBadge}</g>
    </>
  );
});
