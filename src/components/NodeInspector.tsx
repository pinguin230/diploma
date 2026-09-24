'use client';

import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { BlockMath, InlineMath } from 'react-katex';
import { X, Maximize2 } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import {
  traceDft4,
  traceTwiddle,
  traceSource,
  traceSink,
  type TraceResult,
} from '@/components/node-trace';
import { Dft4ButterflyDiagram, TwiddleDiagram } from '@/components/node-diagram';
import p from '@/styles/panels.module.scss';
import ui from '@/styles/ui.module.scss';

// type Tab = 'values' | 'formula' | 'trace' | 'complexity' | 'params';
type Tab = 'values' | 'formula' | 'trace';

export default function NodeInspector() {
  const { visible, nodeId, kind, twiddle, baModel } = useSimStore((s) => s.inspector);
  const setBaModel = useSimStore((s) => s.setBaModel);
  const close = useSimStore((s) => s.closeInspector);
  const graph = useSimStore((s) => s.graph);
  const updateNodeLatency = useSimStore((s) => s.updateNodeLatency);
  const updateEdgeDelay = useSimStore((s) => s.updateEdgeDelay);

  const nodeData = useSimStore((s) => (nodeId ? s.nodeDataCache[nodeId] : null));
  const inputs = nodeData?.inputs;
  const outputs = nodeData?.outputs;

  const [tab, setTab] = useState<Tab>('values');

  if (!visible) {
    return (
      <section className={p.panel}>
        <div className={p.panelHeader}>
          <span>Node inspector</span>
        </div>
        <div className={p.emptyState}>Click a node on the graph to inspect it.</div>
      </section>
    );
  }

  const fmtC = (v: any) => {
    if (!v) return '—';
    const re = v.value?.re ?? v.re ?? 0;
    const im = v.value?.im ?? v.im ?? 0;
    return `${re.toFixed(3)} ${im >= 0 ? '+' : '−'} j${Math.abs(im).toFixed(3)}`;
  };

  const inKeys = inputs ? Object.keys(inputs).sort() : [];
  const outKeys = outputs ? Object.keys(outputs).sort() : [];

  const ba = (() => {
    if (kind === 'twiddle') {
      if (baModel === '4M2A') return { mul: 4, add: 2 };
      return { mul: 3, add: 5 };
    }
    if (kind === 'dft4') return { mul: 0, add: 16 };
    return null;
  })();

  const kindLabel: Record<string, string> = {
    source: 'Source',
    sink: 'Sink',
    dft4: '4-point DFT',
    twiddle: 'Twiddle multiplier',
    butterfly: 'Butterfly',
    add: 'Adder',
    mul: 'Multiplier',
  };

  return (
    <section className={p.panel}>
      <div className={p.panelHeader}>
        <span>Node inspector</span>
        <button
          type="button"
          className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
          style={{ height: 24, width: 24 }}
          onClick={close}
          aria-label="Close inspector"
        >
          <X size={12} />
        </button>
      </div>
      <div className={p.panelBody}>
        <div className={p.inspectorMeta}>
          <span>
            kind <strong>{kind ? kindLabel[kind] ?? kind : '—'}</strong>
          </span>
          <span>
            id <strong>{nodeId}</strong>
          </span>
          {twiddle && (
            <span>
              factor <strong>W{twiddle.N}^{twiddle.k}</strong>
            </span>
          )}
        </div>

        <div className={p.inspectorTabs}>
          <button
            type="button"
            className={clsx(tab === 'values' && p.active)}
            onClick={() => setTab('values')}
          >
            Values
          </button>
          <button
            type="button"
            className={clsx(tab === 'formula' && p.active)}
            onClick={() => setTab('formula')}
          >
            Formula
          </button>
          <button
            type="button"
            className={clsx(tab === 'trace' && p.active)}
            onClick={() => setTab('trace')}
          >
            Trace
          </button>
          {/*<button*/}
          {/*  type="button"*/}
          {/*  className={clsx(tab === 'complexity' && p.active)}*/}
          {/*  onClick={() => setTab('complexity')}*/}
          {/*>*/}
          {/*  Complexity*/}
          {/*</button>*/}
          {/*<button*/}
          {/*  type="button"*/}
          {/*  className={clsx(tab === 'params' && p.active)}*/}
          {/*  onClick={() => setTab('params')}*/}
          {/*>*/}
          {/*  Params*/}
          {/*</button>*/}
        </div>

        {tab === 'values' && (
          <div className={p.portGrid}>
            <div className={p.portColumn}>
              <div className={p.portColumnTitle}>Inputs</div>
              {inKeys.length === 0 ? (
                <div className={p.portRow}>
                  <span>—</span>
                  <span />
                </div>
              ) : (
                inKeys.map((k) => (
                  <div key={k} className={p.portRow}>
                    <span>{k}</span>
                    <span>{fmtC(inputs?.[k])}</span>
                  </div>
                ))
              )}
            </div>
            <div className={p.portColumn}>
              <div className={p.portColumnTitle}>Outputs</div>
              {outKeys.length === 0 ? (
                <div className={p.portRow}>
                  <span>—</span>
                  <span />
                </div>
              ) : (
                outKeys.map((k) => (
                  <div key={k} className={p.portRow}>
                    <span>{k}</span>
                    <span>{fmtC(outputs?.[k])}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'formula' && (
          <div className={p.formulaBlock}>
            {kind === 'dft4' && (
              <BlockMath math={String.raw`\begin{aligned}
                E_0 &= x_0 + x_2 & O_0 &= x_1 + x_3 \\
                E_1 &= x_0 - x_2 & O_1 &= x_1 - x_3 \\
                X_0 &= E_0 + O_0 & X_2 &= E_0 - O_0 \\
                X_1 &= E_1 - j O_1 & X_3 &= E_1 + j O_1
              \end{aligned}`} />
            )}
            {kind === 'twiddle' && (
              <BlockMath
                math={`y = x \\cdot W_{${twiddle?.N ?? 'N'}}^{${twiddle?.k ?? 'k'}} = x \\cdot e^{-j 2\\pi \\cdot ${twiddle?.k ?? 'k'} / ${twiddle?.N ?? 'N'}}`}
              />
            )}
            {kind === 'source' && (
              <div className={p.formulaInline}>
                Source node emits a constant complex token x(n) = re + j·im.
              </div>
            )}
            {kind === 'sink' && (
              <div className={p.formulaInline}>
                Sink node records spectrum bin <InlineMath math="X(k)" /> on arrival.
              </div>
            )}
            {kind && !['dft4', 'twiddle', 'source', 'sink'].includes(kind) && (
              <div className={p.formulaInline}>No formula documented for this kind.</div>
            )}
          </div>
        )}

        {tab === 'trace' && (
          <TraceView
            kind={kind}
            inputs={inputs}
            outputs={outputs}
            twiddle={twiddle ?? undefined}
          />
        )}

        {tab === 'complexity' && (
          <>
            {!ba && (
              <div className={p.emptyState}>No arithmetic cost defined for this node.</div>
            )}
            {ba && (
              <>
                {kind === 'twiddle' && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <label className={ui.checkbox}>
                      <input
                        type="radio"
                        checked={baModel === '4M2A'}
                        onChange={() => setBaModel('4M2A')}
                      />
                      4M + 2A
                    </label>
                    <label className={ui.checkbox}>
                      <input
                        type="radio"
                        checked={baModel === '3M5A'}
                        onChange={() => setBaModel('3M5A')}
                      />
                      3M + 5A
                    </label>
                  </div>
                )}
                <div className={p.complexityBox}>
                  Real multiplications: <strong>{ba.mul}</strong> · Real additions:{' '}
                  <strong>{ba.add}</strong>
                </div>
              </>
            )}
          </>
        )}
        {tab === 'params' && (() => {
          const nodeSpec = graph.nodes.find((n) => n.id === nodeId);
          const outEdges = graph.edges.filter((e) => e.from.node === nodeId);
          return (
            <div className={p.portGrid} style={{ flexDirection: 'column', gap: 10 }}>
              <div className={p.portColumn}>
                <div className={p.portColumnTitle}>Node latency (ms)</div>
                <div className={p.portRow}>
                  <span>latency</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    defaultValue={nodeSpec?.latency ?? 0}
                    key={nodeId}
                    style={{ width: 80, background: 'var(--bg-sunken)', color: 'var(--fg-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}
                    onBlur={(e) => {
                      if (nodeId) updateNodeLatency(nodeId, Number(e.target.value));
                    }}
                  />
                </div>
              </div>
              {outEdges.length > 0 && (
                <div className={p.portColumn}>
                  <div className={p.portColumnTitle}>Outgoing edge delays (ms)</div>
                  {outEdges.map((edge) => (
                    <div key={edge.id} className={p.portRow}>
                      <span style={{ fontSize: 11 }}>{edge.from.port} → {edge.to.node}:{edge.to.port}</span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        defaultValue={edge.delay ?? 0}
                        key={edge.id}
                        style={{ width: 80, background: 'var(--bg-sunken)', color: 'var(--fg-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}
                        onBlur={(e) => updateEdgeDelay(edge.id, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

function TraceView({
  kind,
  inputs,
  outputs,
  twiddle,
}: {
  kind: string | null;
  inputs: Record<string, any> | null | undefined;
  outputs: Record<string, any> | null | undefined;
  twiddle?: { N: number; k: number } | null;
}) {
  const [expanded, setExpanded] = useState(false);

  let result: TraceResult;
  if (kind === 'dft4') result = traceDft4(inputs);
  else if (kind === 'twiddle') result = traceTwiddle(inputs, twiddle?.N, twiddle?.k);
  else if (kind === 'source') result = traceSource(outputs);
  else if (kind === 'sink') result = traceSink(inputs);
  else {
    return <div className={p.emptyState}>No trace available for this node kind.</div>;
  }

  const diagram = (() => {
    if (kind === 'dft4') return <Dft4ButterflyDiagram inputs={inputs} />;
    if (kind === 'twiddle')
      return <TwiddleDiagram inputs={inputs} N={twiddle?.N} k={twiddle?.k} />;
    return null;
  })();

  // Діаграму потоку сигналів можна розгорнути у великий попап (зручно під час захисту)
  const diagramBlock = diagram && (
    <div style={{ position: 'relative' }}>
      {diagram}
      <button
        type="button"
        className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
        style={{ position: 'absolute', top: 6, right: 6, height: 24, width: 24 }}
        onClick={() => setExpanded(true)}
        aria-label="Expand diagram"
        title="Розгорнути діаграму"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );

  const modal =
    expanded && diagram
      ? createPortal(
          <div
            onClick={() => setExpanded(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(2px)',
              padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                width: 'min(900px, 92vw)',
                maxHeight: '92vh',
                overflow: 'auto',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg, 10px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <strong style={{ fontSize: 13 }}>
                  {kind === 'dft4' ? 'Діаграма метелика DFT-4' : 'Діаграма поворотного множника'}
                </strong>
                <button
                  type="button"
                  className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
                  style={{ height: 26, width: 26 }}
                  onClick={() => setExpanded(false)}
                  aria-label="Close diagram"
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ '--diagram-max-h': '78vh' } as CSSProperties}>{diagram}</div>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (result.kind === 'missing') {
    return (
      <>
        <div className={p.emptyState}>{result.message}</div>
        {diagramBlock}
        {modal}
      </>
    );
  }

  return (
    <>
      <div className={p.formulaBlock}>
        <BlockMath math={result.math} />
      </div>
      {diagramBlock}
      {modal}
      {result.note && (
        <p
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {result.note}
        </p>
      )}
    </>
  );
}
