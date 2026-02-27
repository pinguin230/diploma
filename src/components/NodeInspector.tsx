// components/NodeInspector.tsx
import { useSimStore } from '@/store/simStore';

export default function NodeInspector() {
  const { visible, nodeId, kind, twiddle, inputs, outputs, baModel } = useSimStore((s) => s.inspector);
  const setBaModel = useSimStore((s) => s.setBaModel);
  const close = useSimStore((s) => s.closeInspector);

  if (!visible) return null;

  const fmtC = (v: any) => {
    if (!v) return '—';
    const re = v.value?.re ?? v.re ?? 0;
    const im = v.value?.im ?? v.im ?? 0;
    return `${re.toFixed(3)} ${im >= 0 ? '+' : '−'} j${Math.abs(im).toFixed(3)}`;
  };

  // оцінка BA (butterfly DIF: y0 = x0 + x1, y1 = (x0 − x1)·W)
  const ba = (() => {
    if (kind !== 'butterfly') return null;
    if (baModel === '4M2A') return { mul: 4, add: 2 };
    return { mul: 3, add: 5 };
  })();

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        width: 360,
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 6px 18px rgba(0,0,0,.08)',
        zIndex: 1000,
        color: '#121212',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Node Inspector</div>
        <button onClick={close}>✕</button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        node: <b>{nodeId}</b> &middot; kind: <b>{kind}</b>
        {twiddle && (
          <>
            {' '}
            &middot; twiddle: W<sub>{twiddle.N}</sub>
            <sup>{twiddle.k}</sup>
          </>
        )}
      </div>

      {kind === 'butterfly' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.4 }}>
            y₀ = x₀ + x₁
            <br />
            y₁ = (x₀ − x₁) · W<sub>{twiddle?.N ?? 'N'}</sub>
            <sup>{twiddle?.k ?? 'k'}</sup>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>x₀</div>
          <div>{fmtC(inputs?.['x0'])}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>x₁</div>
          <div>{fmtC(inputs?.['x1'])}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>y₀</div>
          <div>{fmtC(outputs?.['y0'])}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>y₁</div>
          <div>{fmtC(outputs?.['y1'])}</div>
        </div>
      </div>

      {kind === 'butterfly' && ba && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>BA model</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type='radio' checked={baModel === '4M2A'} onChange={() => setBaModel('4M2A')} /> 4M+2A (classic
              CMUL)
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type='radio' checked={baModel === '3M5A'} onChange={() => setBaModel('3M5A')} /> 3M+5A (оптиміз.)
            </label>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
            real muls: <b>{ba.mul}</b>, real adds: <b>{ba.add}</b>
          </div>
        </div>
      )}
    </div>
  );
}
