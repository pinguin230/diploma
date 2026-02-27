// components/Metrics.tsx

import { useSimStore } from '@/store/simStore';

function fmt(x: number, d = 1) {
  return Number.isFinite(x) ? x.toFixed(d) : (0).toFixed(d);
}

export default function Metrics() {
  const running = useSimStore((s) => s.running);
  const N = useSimStore((s) => s.N);
  const throughputFps = useSimStore((s) => s.metrics.throughputFps);
  const latencyEmaMs = useSimStore((s) => s.metrics.latencyEmaMs);
  // const queueMean = useSimStore((s) => s.metrics.queueMean);

  const badgeStyle: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: running ? '#d1fae5' : '#e5e7eb',
    color: running ? '#065f46' : '#374151',
    border: `1px solid ${running ? '#10b981' : '#d1d5db'}`,
    justifySelf: 'end',
    alignSelf: 'center',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 12,
        width: 460,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* статус */}
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Runtime metrics</div>
        <div style={badgeStyle}>{running ? 'Run' : 'Pause'}</div>
      </div>

      {/* fires / sec */}
      <div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>fires / sec</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#121212' }}>{fmt(throughputFps, 1)}</div>
      </div>

      {/* avg latency */}
      <div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>avg latency → sink, ms</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#121212' }}>{fmt(latencyEmaMs, 1)}</div>
      </div>

      {/* avg queue */}
      <div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>avg queue size</div>
        {/*<div style={{ fontSize: 22, fontWeight: 700, color: '#121212' }}>{fmt(queueMean, 2)}</div>*/}
      </div>

      {/* пояснення */}
      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
        N = {N}. Зі зростанням N очікуй більшу паралельність (fires/сек росте) і більші черги за фіксованих <i>delay</i>
        .
      </div>
    </div>
  );
}
