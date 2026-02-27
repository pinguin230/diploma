// components/NodeInspector.tsx
import { useSimStore } from '@/store/simStore';

export default function NodeInspector() {
  const { visible, nodeId, kind, twiddle, baModel } = useSimStore((s) => s.inspector);
  const setBaModel = useSimStore((s) => s.setBaModel);
  const close = useSimStore((s) => s.closeInspector);

  const nodeData = useSimStore((s) => nodeId ? s.nodeDataCache[nodeId] : null);
  const inputs = nodeData?.inputs;
  const outputs = nodeData?.outputs;

  if (!visible) return null;

  const fmtC = (v: any) => {
    if (!v) return '—';
    const re = v.value?.re ?? v.re ?? 0;
    const im = v.value?.im ?? v.im ?? 0;
    return `${re.toFixed(3)} ${im >= 0 ? '+' : '−'} j${Math.abs(im).toFixed(3)}`;
  };

  // Отримуємо ключі портів, щоб рендерити їх динамічно
  const inKeys = inputs ? Object.keys(inputs).sort() : [];
  const outKeys = outputs ? Object.keys(outputs).sort() : [];

  // Оцінка арифметичної складності (BA - Butterfly/Block Arithmetic)
  const ba = (() => {
    if (kind === 'twiddle') {
      // Для одного комплексного множення
      if (baModel === '4M2A') return { mul: 4, add: 2 };
      return { mul: 3, add: 5 };
    }
    if (kind === 'dft4') {
      // 4-точкове ДПФ: 8 комплексних додавань (16 дійсних),
      // множення на j - це просто перестановка, тому 0 дійсних множень!
      return { mul: 0, add: 16 };
    }
    return null;
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
          <button onClick={close} style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '16px' }}>✕</button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          node: <b>{nodeId}</b> &middot; kind: <b>{kind}</b>
          {twiddle && (
              <>
                {' '}
                &middot; factor: W<sub>{twiddle.N}</sub>
                <sup>{twiddle.k}</sup>
              </>
          )}
        </div>

        {/* Математичні формули залежно від типу вузла */}
        {kind === 'dft4' && (
            <div style={{ marginBottom: 12, background: '#f5f5f5', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.4 }}>
                E₀ = in₀ + in₂ &nbsp; | &nbsp; O₀ = in₁ + in₃<br />
                E₁ = in₀ − in₂ &nbsp; | &nbsp; O₁ = in₁ − in₃<br />
                out₀ = E₀ + O₀ &nbsp;&nbsp;&nbsp; | &nbsp; out₂ = E₀ − O₀<br />
                out₁ = E₁ − jO₁ &nbsp; | &nbsp; out₃ = E₁ + jO₁
              </div>
            </div>
        )}

        {kind === 'twiddle' && (
            <div style={{ marginBottom: 12, background: '#f5f5f5', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 }}>
                out = in · W<sub>{twiddle?.N ?? 'N'}</sub>
                <sup>{twiddle?.k ?? 'k'}</sup>
              </div>
            </div>
        )}

        {/* Динамічний рендер вхідних та вихідних портів */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: 4, marginBottom: 4 }}>Inputs</div>
            {inKeys.length === 0 ? <div style={{ fontSize: 12, opacity: 0.5 }}>—</div> : inKeys.map((k) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{k}:</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{fmtC(inputs?.[k])}</span>
                </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: 4, marginBottom: 4 }}>Outputs</div>
            {outKeys.length === 0 ? <div style={{ fontSize: 12, opacity: 0.5 }}>—</div> : outKeys.map((k) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{k}:</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{fmtC(outputs?.[k])}</span>
                </div>
            ))}
          </div>
        </div>

        {ba && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Arithmetic Complexity (Real ops)</div>

              {kind === 'twiddle' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <input type='radio' checked={baModel === '4M2A'} onChange={() => setBaModel('4M2A')} /> 4M+2A
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <input type='radio' checked={baModel === '3M5A'} onChange={() => setBaModel('3M5A')} /> 3M+5A
                    </label>
                  </div>
              )}

              <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#eef2ff', padding: '4px 8px', borderRadius: '4px', color: '#3730a3' }}>
                Multiplications: <b>{ba.mul}</b> | Additions: <b>{ba.add}</b>
              </div>
            </div>
        )}
      </div>
  );
}