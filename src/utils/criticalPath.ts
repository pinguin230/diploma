import type { Graph } from '@/core/types';

export type CriticalPathResult = {
  nodeIds: string[];
  edgeIds: string[];
  totalTime: number;
};

export function computeCriticalPath(graph: Graph): CriticalPathResult {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // nodeId → list of incoming edges
  const inEdges = new Map<string, (typeof graph.edges)[0][]>(
    graph.nodes.map((n) => [n.id, []]),
  );
  for (const e of graph.edges) inEdges.get(e.to.node)?.push(e);

  // Kahn's topological sort
  const inDeg = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) inDeg.set(e.to.node, (inDeg.get(e.to.node) ?? 0) + 1);

  const queue: string[] = [];
  for (const [id, deg] of inDeg) if (deg === 0) queue.push(id);

  const order: string[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);
    for (const e of graph.edges.filter((ed) => ed.from.node === u)) {
      const d = (inDeg.get(e.to.node) ?? 1) - 1;
      inDeg.set(e.to.node, d);
      if (d === 0) queue.push(e.to.node);
    }
  }

  // DP: dist[n] = max wall-clock time from any source until n finishes
  const dist = new Map<string, number>();
  const prevEdgeId = new Map<string, string>(); // nodeId → incoming edge on critical path

  for (const nid of order) {
    const node = nodeMap.get(nid)!;
    const inc = inEdges.get(nid) ?? [];
    if (inc.length === 0) {
      dist.set(nid, node.latency);
    } else {
      let maxT = -Infinity;
      let bestEdge = '';
      for (const e of inc) {
        const t = (dist.get(e.from.node) ?? 0) + (e.delay ?? 0);
        if (t > maxT) {
          maxT = t;
          bestEdge = e.id;
        }
      }
      dist.set(nid, maxT + node.latency);
      if (bestEdge) prevEdgeId.set(nid, bestEdge);
    }
  }

  // Find the sink with maximum completion time
  const sinks = graph.nodes.filter((n) => n.kind === 'sink');
  if (sinks.length === 0) return { nodeIds: [], edgeIds: [], totalTime: 0 };
  const maxSink = sinks.reduce((best, s) =>
    (dist.get(s.id) ?? 0) > (dist.get(best.id) ?? 0) ? s : best,
  );

  // Trace the path back to the source
  const nodeIds: string[] = [maxSink.id];
  const edgeIds: string[] = [];
  let cur = maxSink.id;
  while (prevEdgeId.has(cur)) {
    const eid = prevEdgeId.get(cur)!;
    edgeIds.push(eid);
    const edge = graph.edges.find((e) => e.id === eid)!;
    nodeIds.push(edge.from.node);
    cur = edge.from.node;
  }

  return { nodeIds, edgeIds, totalTime: dist.get(maxSink.id) ?? 0 };
}
