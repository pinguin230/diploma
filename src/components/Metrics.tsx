// components/Metrics.tsx
import { useSimStore } from '@/store/simStore';

function fmt(x: number, d = 1) {
  return Number.isFinite(x) ? x.toFixed(d) : (0).toFixed(d);
}

export default function Metrics() {
  const running = useSimStore((s) => s.running);
  const throughputFps = useSimStore((s) => s.metrics.throughputFps);
  const latencyEmaMs = useSimStore((s) => s.metrics.latencyEmaMs);

  // Відновлено зчитування правильної змінної зі store
  const queueEma = useSimStore((s) => s.metrics.queueEma);

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
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 12,
            width: 520, // Зробили блок симетричним до SpectrumView (520px)
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
      >
        {/* Верхній ряд: Динамічні метрики симулятора */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Dataflow Runtime Metrics</div>
            <div style={badgeStyle}>{running ? 'Running' : 'Paused'}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Throughput (Fires/s)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#121212' }}>{fmt(throughputFps, 1)}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Avg Latency (ms)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#121212' }}>{fmt(latencyEmaMs, 0)}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Avg Queue Size</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#121212' }}>{fmt(queueEma, 2)}</div>
          </div>
        </div>

        {/* Нижній ряд: Академічна цінність алгоритму 4x4 */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#374151', fontWeight: 'bold', marginBottom: 6 }}>
            Arithmetic Complexity Comparison (N=16)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#4b5563' }}>

            <div style={{ background: '#f3f4f6', padding: '6px 10px', borderRadius: 6 }}>
              <b style={{ color: '#ef4444' }}>Direct DFT O(N²):</b><br/>
              <span style={{ fontFamily: 'monospace' }}>256</span> Complex Muls<br/>
              <span style={{ fontFamily: 'monospace' }}>240</span> Complex Adds
            </div>

            <div style={{ background: '#eff6ff', padding: '6px 10px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
              <b style={{ color: '#3b82f6' }}>4x4 Matrix Method:</b><br/>
              <span style={{ fontFamily: 'monospace' }}>16</span> Complex Muls (Twiddles)<br/>
              <span style={{ fontFamily: 'monospace' }}>64</span> Complex Adds (8 per DFT4)
            </div>

          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280', lineHeight: 1.3 }}>
            * 4-point DFTs require 0 actual multiplications (only additions and j-swaps).
            The matrix approach reduces multiplicative complexity by <b>16x</b>.
          </div>
        </div>
      </div>
  );
}