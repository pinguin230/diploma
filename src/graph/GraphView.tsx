'use client';

// graph/GraphView.tsx

import { useEffect, useRef, useCallback } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type Connection,
  useReactFlow,
} from '@xyflow/react';

import { DFT4Node } from './nodes/DFT4Node';
import { TwiddleNode } from './nodes/TwiddleNode';
import SourceNode from './nodes/SourceNode';
import SinkNode from './nodes/SinkNode';
import TokenEdge from './TokenEdge';

import { generateDFT4x4 } from '@/graph/generateDFT4x4';
import { layoutDFT4x4 } from '@/graph/layout4x4';

import { useSimStore } from '@/store/simStore';
import { compareWithFFT } from '@/utils/compare';
import { useShallow } from 'zustand/react/shallow';
import SpectrumView from '@/components/SpectrumView';
import Metrics from '@/components/Metrics';
import NodeInspector from '@/components/NodeInspector';

const nodeTypes = {
  dft4: DFT4Node,
  twiddle: TwiddleNode,
  source: SourceNode,
  sink: SinkNode,
} as const;
const edgeTypes = { token: TokenEdge } as const;

export default function GraphView() {
  const graph = useSimStore((s) => s.graph);
  const runtime = useSimStore((s) => s.runtime);

  const rf = useReactFlow();

  const { setGraph, addEdgeToGraph, start, stop, step } = useSimStore(
    useShallow((s) => ({
      setGraph: s.setGraph,
      addEdgeToGraph: s.addEdgeToGraph,
      start: s.start,
      stop: s.stop,
      step: s.step,
    })),
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const frame = useRef<number | null>(null);

  const scale = useSimStore((s) => s.spectrumScale);
  const setScale = useSimStore((s) => s.setSpectrumScale);

  const N = 16;

  const lastAggRef = useRef({ t: performance.now(), fires: 0 });

  const mode = useSimStore((s) => s.mode);
  const setMode = useSimStore((s) => s.setMode);
  const pauseOnFire = useSimStore((s) => s.pauseOnFire);
  const setPauseOnFire = useSimStore((s) => s.setPauseOnFire);
  const speed = useSimStore((s) => s.speed);
  const setSpeed = useSimStore((s) => s.setSpeed);

  const setMismatches = useSimStore((s) => s.setMismatches);
  const getState = useSimStore.getState;

  const onCompare = () => {
    const { graph, lastInput, sinks } = getState();
    const { mismatches } = compareWithFFT(graph, lastInput, sinks, 1e-9);
    setMismatches(mismatches);
  };

  useEffect(() => {
    if (!graph) return;
    setEdges(
      graph.edges.map((e) => ({
        id: e.id,
        type: 'token',
        source: e.from.node,
        sourceHandle: e.from.port,
        target: e.to.node,
        targetHandle: e.to.port,
        data: { label: e.label },
      })),
    );
  }, [graph, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      if (params.source && params.sourceHandle && params.target && params.targetHandle) {
        addEdgeToGraph({
          from: { node: params.source, port: params.sourceHandle },
          to: { node: params.target, port: params.targetHandle },
        });
      }
    },
    [setEdges, addEdgeToGraph],
  );

  // ОНОВЛЕНИЙ useEffect для генерації графа
  useEffect(() => {
    // Генеруємо 4x4 граф для 16 точок
    const g = generateDFT4x4();
    setGraph(g);

    // Розміщуємо по матричній сітці (рядки -> множники -> стовпці)
    const nodePositions = layoutDFT4x4(g, { stageGap: 280, rowGap: 140 });
    setNodes(nodePositions);
  }, [setGraph, setNodes]);

  useEffect(() => {
    queueMicrotask(() => rf.fitView({ padding: 0.15, includeHiddenNodes: true }));
  }, [nodes.length, rf]);

  useEffect(() => {
    if (!runtime) return;

    const loop = () => {
      const st = useSimStore.getState();
      if (st.running) {
        const dt = st.tickSimTime();
        const fires = runtime.tick(dt, st.mode === 'single-fire' ? 1 : Infinity);

        // агрегація fires/sec та середньої черги раз на ~1с
        lastAggRef.current.fires += fires;

        // підтримка допоміжних метрик на кожному кроці
        useSimStore.getState().sampleQueues();
        useSimStore.getState().decayActivity();
      }

      const now = performance.now();
      if (now - lastAggRef.current.t >= 1000) {
        useSimStore.setState((s) => ({
          metrics: { ...s.metrics, windowStartSimT: s.simTime, firesInWindow: 0 },
        }));
        lastAggRef.current = { t: now, fires: 0 };
      }

      frame.current = requestAnimationFrame(loop);
    };

    frame.current = requestAnimationFrame(loop);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [runtime]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', zIndex: 10, left: 22, top: 160, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={start}>▶︎</button>
        <button onClick={stop}>⏸</button>
        <button onClick={step}>Step</button>

        <button onClick={() => setMode(mode === 'run' ? 'single-fire' : 'run')} title='Toggle run/single-fire'>
          {mode === 'run' ? 'Run mode' : 'Single-fire'}
        </button>

        {/* pause-on-fire */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type='checkbox' checked={pauseOnFire} onChange={(e) => setPauseOnFire(e.target.checked)} />
          Pause on fire
        </label>

        {/* speed */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          speed
          <input
            type='range'
            min={0.1}
            max={4}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: 120 }}
          />
          {speed.toFixed(2)}×
        </label>
        <button onClick={onCompare}>Compare</button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: '10px', color: '#888' }}>
          Mode: 16-point 4x4 DFT
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          left: 22,
          bottom: 160,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => useSimStore.getState().applyPreset('impulse')}>Impulse</button>
            <button onClick={() => useSimStore.getState().applyPreset('two-impulses')}>2×Impulse</button>
            <button onClick={() => useSimStore.getState().applyPreset('sin1')}>sin k=1</button>
            <button onClick={() => useSimStore.getState().applyPreset('sin3')}>sin k=3</button>
            <button onClick={() => useSimStore.getState().applyPreset('sin1+3')}>sin k=1+3</button>

            <span>scale</span>
            <button onClick={() => setScale('linear')} style={{ opacity: scale === 'linear' ? 1 : 0.5 }}>
              linear
            </button>
            <button onClick={() => setScale('log')} style={{ opacity: scale === 'log' ? 1 : 0.5 }}>
              log(dB)
            </button>
          </div>
          <SpectrumView />
          <Metrics />
        </div>
      </div>
      <NodeInspector />
      <ReactFlow
        edgeTypes={edgeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
