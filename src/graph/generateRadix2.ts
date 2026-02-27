// graph/generateRadix2.ts

import type { Graph } from '@/core/types';

type PortRef = { node: string; port: string };

function bitReverse(i: number, bits: number) {
  let r = 0;
  for (let b = 0; b < bits; b++) {
    r = (r << 1) | ((i >> b) & 1);
  }
  return r;
}

export function generateRadix2(N: number, delay = 80): Graph {
  if ((N & (N - 1)) !== 0) throw new Error('N must be power of two');
  const stages = Math.log2(N);

  const nodes: Graph['nodes'] = [];
  const edges: Graph['edges'] = [];

  // Sources
  let prev: PortRef[] = [];
  for (let i = 0; i < N; i++) {
    const id = `src${i}`;
    nodes.push({ id, kind: 'source', inPorts: [], outPorts: ['out'], latency: 0 });
    prev.push({ node: id, port: 'out' });
  }

  // Стадії radix-2 DIF
  for (let s = 0; s < stages; s++) {
    const span = N >> s; // ← ВАЖЛИВО: зменшуємо
    const half = span >> 1; // відстань між парою
    const twStride = N / span; // 1,2,4,... (експонента k = j * twStride)

    // метелики + вхідні ребра
    for (let k = 0; k < N; k += span) {
      for (let j = 0; j < half; j++) {
        const a = k + j;
        const b = k + j + half;
        const bid = `b_${s}_${a}`;

        nodes.push({
          id: bid,
          kind: 'butterfly',
          inPorts: ['x0', 'x1'],
          outPorts: ['y0', 'y1'],
          latency: 1,
          params: { twiddle: { N, k: j * twStride } }, // DIF експонента
        });

        edges.push({ id: `e_${s}_in_${a}`, from: prev[a]!, to: { node: bid, port: 'x0' }, delay });
        edges.push({ id: `e_${s}_in_${b}`, from: prev[b]!, to: { node: bid, port: 'x1' }, delay });
      }
    }

    // вихід цієї стадії: y0 на позиції a, y1 на позиції b
    const next: PortRef[] = new Array(N);
    for (let k = 0; k < N; k += span) {
      for (let j = 0; j < half; j++) {
        const a = k + j;
        const b = k + j + half;
        const bid = `b_${s}_${a}`;
        next[a] = { node: bid, port: 'y0' };
        next[b] = { node: bid, port: 'y1' };
      }
    }
    prev = next;
  }

  // Вихід DIF у bit-reversed порядку → підключаємо Sink через BR до натурального
  for (let i = 0; i < N; i++) {
    const sid = `snk${i}`;
    nodes.push({ id: sid, kind: 'sink', inPorts: ['in'], outPorts: [], latency: 0 });
    const br = bitReverse(i, stages);
    edges.push({ id: `e_out_${i}`, from: prev[br]!, to: { node: sid, port: 'in' }, delay });
  }

  for (const n of nodes) {
    if (n.kind !== 'butterfly') continue;
    const tw = n.params?.twiddle;
    if (!tw) continue;
    for (const e of edges) {
      if (e.from.node === n.id && e.from.port === 'y1') {
        e.label = `W${tw.N}^${tw.k}`;
        // не рахуємо тут cosine/sine, віддамо це TokenEdge (або додай сюди precompute)
      }
    }
  }

  return { nodes, edges };
}
