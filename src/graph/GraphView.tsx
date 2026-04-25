'use client';

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
  const setGraph = useSimStore((s) => s.setGraph);
  const addEdgeToGraph = useSimStore((s) => s.addEdgeToGraph);
  const nodesDraggable = useSimStore((s) => s.nodesDraggable);

  const rf = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const frame = useRef<number | null>(null);
  const lastAggRef = useRef({ t: performance.now(), fires: 0 });

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

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const state = useSimStore.getState();
    const spec = state.graph?.nodes.find((n) => n.id === node.id);
    if (!spec) return;
    state.openInspector({
      nodeId: spec.id,
      kind: spec.kind as any,
      twiddle: spec.params?.twiddle ?? null,
    });
  }, []);

  useEffect(() => {
    const g = generateDFT4x4();
    setGraph(g);
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
        lastAggRef.current.fires += fires;
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
    <ReactFlow
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      nodesDraggable={nodesDraggable}
      onNodeClick={onNodeClick}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
