// src/graph/generateDFT4x4.ts

import type { Graph, NodeSpec, Edge } from '@/core/types';

export function generateDFT4x4(latency = 10): Graph {
  const nodes: NodeSpec[] = [];
  const edges: Edge[] = [];

  const N = 16;
  const radix = 4;

  // 1. СТВОРЕННЯ ВХІДНИХ ВУЗЛІВ (Source)
  for (let i = 0; i < N; i++) {
    nodes.push({
      id: `src${i}`,
      kind: 'source',
      inPorts: [],
      outPorts: ['out'],
      latency: 0,
    });
  }

  // 2. СТВОРЕННЯ ВУЗЛІВ ДПФ ДЛЯ РЯДКІВ (Row DFTs)
  for (let n1 = 0; n1 < radix; n1++) {
    nodes.push({
      id: `row-${n1}`,
      kind: 'dft4',
      inPorts: ['in0', 'in1', 'in2', 'in3'],
      outPorts: ['out0', 'out1', 'out2', 'out3'],
      latency,
    });

    // Підключення Source -> Row DFT
    // Індекс вхідного масиву: i = n1 + 4*n2
    for (let n2 = 0; n2 < radix; n2++) {
      const srcIndex = n1 + 4 * n2;
      edges.push({
        id: `edge-src${srcIndex}-row${n1}in${n2}`,
        from: { node: `src${srcIndex}`, port: 'out' },
        to: { node: `row-${n1}`, port: `in${n2}` },
        delay: 5, // Невелика затримка на шині
      });
    }
  }

  // 3. СТВОРЕННЯ ВУЗЛІВ ПОВОРОТНИХ МНОЖНИКІВ (Twiddle Factors)
  // W_16^(n1 * k2)
  for (let n1 = 0; n1 < radix; n1++) {
    for (let k2 = 0; k2 < radix; k2++) {
      const twiddlePower = n1 * k2;
      const twiddleId = `tw-${n1}-${k2}`;

      nodes.push({
        id: twiddleId,
        kind: 'twiddle',
        inPorts: ['in'],
        outPorts: ['out'],
        latency: latency / 2, // Множення швидше за ДПФ
        params: {
          twiddle: { N: 16, k: twiddlePower },
        },
      });

      // Підключення Row DFT -> Twiddle
      edges.push({
        id: `edge-row${n1}out${k2}-tw${n1}_${k2}`,
        from: { node: `row-${n1}`, port: `out${k2}` },
        to: { node: twiddleId, port: 'in' },
        label: twiddlePower > 0 ? `W¹⁶_${twiddlePower}` : undefined,
        delay: 5,
      });
    }
  }

  // 4. СТВОРЕННЯ ВУЗЛІВ ДПФ ДЛЯ СТОВПЦІВ (Column DFTs)
  for (let k2 = 0; k2 < radix; k2++) {
    nodes.push({
      id: `col-${k2}`,
      kind: 'dft4',
      inPorts: ['in0', 'in1', 'in2', 'in3'],
      outPorts: ['out0', 'out1', 'out2', 'out3'],
      latency,
    });

    // Підключення Twiddle -> Col DFT (ТРАНСПОНУВАННЯ)
    // Вузол стовпця k2 збирає дані з усіх рядків n1
    for (let n1 = 0; n1 < radix; n1++) {
      const twiddleId = `tw-${n1}-${k2}`;
      edges.push({
        id: `edge-tw${n1}_${k2}-col${k2}in${n1}`,
        from: { node: twiddleId, port: 'out' },
        to: { node: `col-${k2}`, port: `in${n1}` },
        delay: 5,
      });
    }
  }

  // 5. СТВОРЕННЯ ВИХІДНИХ ВУЗЛІВ (Sink)
  for (let i = 0; i < N; i++) {
    nodes.push({
      id: `snk${i}`,
      kind: 'sink',
      inPorts: ['in'],
      outPorts: [],
      latency: 0,
    });
  }

  // Підключення Col DFT -> Sink
  // Вихідний індекс: k = k2 + 4*k1
  for (let k2 = 0; k2 < radix; k2++) {
    for (let k1 = 0; k1 < radix; k1++) {
      const sinkIndex = k2 + 4 * k1;
      edges.push({
        id: `edge-col${k2}out${k1}-sink${sinkIndex}`,
        from: { node: `col-${k2}`, port: `out${k1}` },
        to: { node: `snk${sinkIndex}`, port: 'in' },
        delay: 5,
      });
    }
  }

  return { nodes, edges };
}