// src/graph/TokenEdge.tsx
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

  // Вимірюємо довжину кривої для точної інтерполяції
  useEffect(() => {
    if (!pathRef.current) return;
    try {
      setTotalLen(pathRef.current.getTotalLength());
    } catch {
      /* noop */
    }
  }, [path]);

  // АРХІТЕКТУРНЕ ВИПРАВЛЕННЯ: Безпечне видалення токенів поза циклом рендеру
  useEffect(() => {
    const expiredTokens = tokens.filter((tk) => simTime - tk.t0 >= tk.delay);
    if (expiredTokens.length > 0) {
      expiredTokens.forEach((tk) => remove(id, tk.id));
    }
  }, [tokens, simTime, remove, id]);

  const circles = tokens.map((tk) => {
    const p = tk.delay > 0 ? (simTime - tk.t0) / tk.delay : 1;
    // Якщо токен вже вийшов за межі 1, він буде видалений у useEffect, 
    // але для поточного кадру фіксуємо його на кінці (1)
    const clamped = Math.min(Math.max(p, 0), 1);

    let cx = sourceX, cy = sourceY;
    const pathEl = pathRef.current;

    if (pathEl && totalLen > 0) {
      const pt = pathEl.getPointAtLength(totalLen * clamped);
      cx = pt.x;
      cy = pt.y;
    } else {
      cx = sourceX + (targetX - sourceX) * clamped;
      cy = sourceY + (targetY - sourceY) * clamped;
    }

    return (
        <circle
            key={tk.id}
            cx={cx} cy={cy} r={5}
            style={{ fill: '#22d3ee', filter: 'drop-shadow(0 0 4px #06b6d4)' }}
        />
    );
  });

  // Відображення кількості елементів у буфері
  const centerBadge = (() => {
    if (inBufferCount === 0) return null; // Ховаємо бейдж, якщо ребро порожнє
    const p = pathRef.current;
    if (!p) return null;
    const total = p.getTotalLength() || 1;
    const mid = p.getPointAtLength(total / 2);

    // Зсуваємо бейдж трохи вище, щоб він не перекривав мітки (labels)
    const x = mid.x, y = mid.y - 12;
    return (
        <g pointerEvents="none">
          <rect x={x - 10} y={y - 10} width='20' height='20' rx='10' fill='#1e293b' stroke='#334155' />
          <text x={x} y={y + 3} textAnchor='middle' fontSize='10' fill='#94a3b8' fontWeight="bold">
            {inBufferCount}
          </text>
        </g>
    );
  })();

  const pad = 6, size = 4;
  const bufferBadges = Array.from({ length: Math.min(inBufferCount, 3) }, (_, i) => (
      <rect key={i} x={-10} y={-10 - i * (size + pad)} width={size} height={size} rx={1} ry={1} />
  ));

  const badgeX = sourceX + 20;
  const badgeY = sourceY + 10;

  return (
      <>
        {/* Невидима крива для обчислення траєкторії */}
        <path d={path} ref={pathRef} fill='none' stroke='transparent' pointerEvents='none' />

        {/* Візуальне ребро */}
        <BaseEdge id={id} path={path} style={{ stroke: '#475569', strokeWidth: 1.5 }} />

        {/* Квадратики черги біля входу */}
        <g fill='#64748b' transform={`translate(${badgeX}, ${badgeY})`}>
          {bufferBadges}
        </g>

        {/* АКАДЕМІЧНА МІТКА ДЛЯ ПОВОРОТНИХ МНОЖНИКІВ */}
        {data?.label && (
            <g pointerEvents='none'>
              <rect
                  x={labelX - 22} y={labelY - 10}
                  width={44} height={20}
                  rx={10} ry={10}
                  fill="#2c2c2c" stroke="#fbbf24" strokeWidth={1}
              />
              <text
                  x={labelX} y={labelY + 1}
                  fontSize={11} fill='#fbbf24'
                  textAnchor='middle' dominantBaseline='central' fontWeight="bold"
              >
                {String((data as { label?: unknown }).label)}
              </text>
            </g>
        )}

        {/* Рухомі токени */}
        <g pointerEvents='none'>{circles}</g>

        {/* Бейдж кількості токенів */}
        <g pointerEvents='none'>{centerBadge}</g>
      </>
  );
});