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
  const criticalPathNodeIds = useSimStore((s) => s.criticalPathNodeIds);
  const criticalPathEdgeIds = useSimStore((s) => s.criticalPathEdgeIds);
  const showCriticalPath = useSimStore((s) => s.showCriticalPath);
  const pendingNodePositions = useSimStore((s) => s.pendingNodePositions);
  const setPendingNodePositions = useSimStore((s) => s.setPendingNodePositions);

  const rf = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const frame = useRef<number | null>(null);
  const lastAggRef = useRef({ t: performance.now(), fires: 0 });
  const frameNowRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const accumDeltaRef = useRef(0);

  useEffect(() => {
    if (!graph) return;
    const cpEdges = new Set(criticalPathEdgeIds);
    setEdges(
      graph.edges.map((e) => ({
        id: e.id,
        type: 'token',
        source: e.from.node,
        sourceHandle: e.from.port,
        target: e.to.node,
        targetHandle: e.to.port,
        data: { label: e.label, critical: cpEdges.has(e.id) },
      })),
    );
  }, [graph, criticalPathEdgeIds, setEdges]);

  // Apply critical-path node highlighting
  useEffect(() => {
    const cpNodes = new Set(criticalPathNodeIds);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: showCriticalPath && cpNodes.has(n.id) ? 'cp-node' : undefined,
      })),
    );
  }, [showCriticalPath, criticalPathNodeIds, setNodes]);

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

  // Restore node positions from a loaded session
  useEffect(() => {
    if (!pendingNodePositions) return;
    setNodes((nds) =>
      nds.map((n) => {
        const pos = pendingNodePositions.find((p) => p.id === n.id);
        return pos ? { ...n, position: { x: pos.x, y: pos.y } } : n;
      }),
    );
    setPendingNodePositions(null);
  }, [pendingNodePositions, setNodes, setPendingNodePositions]);

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

      const deltaFrame = now - frameNowRef.current;
      frameNowRef.current = now;
      if (deltaFrame > 0 && deltaFrame < 2000) {
        frameCountRef.current += 1;
        accumDeltaRef.current += deltaFrame;
      }

      // Smooth FPS / tick every few frames
      const UPDATE_EVERY = 5;
      if (frameCountRef.current >= UPDATE_EVERY && frameCountRef.current > 0) {
        const avgDelta = accumDeltaRef.current / frameCountRef.current;
        const instantFps = 1000 / avgDelta;
        const currentMetrics = useSimStore.getState().metrics;
        const prevFps = currentMetrics.fpsEma || 0;
        const newFps = prevFps * 0.95 + instantFps * 0.05;
        const prevTick = currentMetrics.tickTimeMs || 0;
        const newTick = prevTick * 0.95 + avgDelta * 0.05;

        useSimStore.setState((s) => ({
          metrics: { ...s.metrics, fpsEma: newFps, tickTimeMs: newTick },
        }));

        frameCountRef.current = 0;
        accumDeltaRef.current = 0;
      }

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
