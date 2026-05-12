import { describe, it, expect } from 'vitest';
import { compareWithFFT } from './compare';
import type { Graph } from '@/core/types';

const makeGraph = (n: number): Graph => ({
  nodes: [
    ...Array.from({ length: n }, (_, i) => ({
      id: `src${i}`,
      kind: 'source' as const,
      inPorts: [],
      outPorts: ['out'],
      latency: 0,
    })),
    ...Array.from({ length: n }, (_, i) => ({
      id: `snk${i}`,
      kind: 'sink' as const,
      inPorts: ['in'],
      outPorts: [],
      latency: 0,
    })),
  ],
  edges: [],
});

describe('compareWithFFT', () => {
  it('finds no mismatch for impulse with correct DFT-4 output', () => {
    // DFT of [1,0,0,0] = [1,1,1,1]
    const graph = makeGraph(4);
    const lastInput = {
      src0: { re: 1, im: 0 },
      src1: { re: 0, im: 0 },
      src2: { re: 0, im: 0 },
      src3: { re: 0, im: 0 },
    };
    const sinks = {
      snk0: JSON.stringify({ re: 1, im: 0 }),
      snk1: JSON.stringify({ re: 1, im: 0 }),
      snk2: JSON.stringify({ re: 1, im: 0 }),
      snk3: JSON.stringify({ re: 1, im: 0 }),
    };
    const { mismatches, ref } = compareWithFFT(graph, lastInput, sinks);
    expect(Object.values(mismatches).every((v) => !v)).toBe(true);
    expect(ref).toHaveLength(4);
  });

  it('detects mismatch when output differs from reference', () => {
    const graph = makeGraph(4);
    const lastInput = {
      src0: { re: 1, im: 0 },
      src1: { re: 0, im: 0 },
      src2: { re: 0, im: 0 },
      src3: { re: 0, im: 0 },
    };
    // snk0 should be {re:1,im:0} but we provide wrong value
    const sinks = {
      snk0: JSON.stringify({ re: 0, im: 0 }),
      snk1: JSON.stringify({ re: 1, im: 0 }),
      snk2: JSON.stringify({ re: 1, im: 0 }),
      snk3: JSON.stringify({ re: 1, im: 0 }),
    };
    const { mismatches } = compareWithFFT(graph, lastInput, sinks);
    expect(mismatches['snk0']).toBe(true);
    expect(mismatches['snk1']).toBe(false);
  });

  it('flags missing sinks as mismatches', () => {
    const graph = makeGraph(4);
    const { mismatches } = compareWithFFT(graph, {}, {});
    expect(Object.values(mismatches).every((v) => v)).toBe(true);
  });

  it('flags sinks with invalid JSON as mismatches', () => {
    const graph = makeGraph(4);
    const sinks = {
      snk0: 'not-json',
      snk1: '{"re":1,"im":0}',
      snk2: '{"re":1,"im":0}',
      snk3: '{"re":1,"im":0}',
    };
    const { mismatches } = compareWithFFT(graph, {}, sinks);
    expect(mismatches['snk0']).toBe(true);
  });

  it('returns ref array matching fft.js output for DC signal', () => {
    // DC [1,1,1,1] → X[0]=4, rest=0
    const graph = makeGraph(4);
    const lastInput = {
      src0: { re: 1, im: 0 },
      src1: { re: 1, im: 0 },
      src2: { re: 1, im: 0 },
      src3: { re: 1, im: 0 },
    };
    const { ref } = compareWithFFT(graph, lastInput, {});
    expect(Math.abs(ref[0]!.re - 4)).toBeLessThan(1e-9);
    expect(Math.abs(ref[1]!.re)).toBeLessThan(1e-9);
    expect(Math.abs(ref[1]!.im)).toBeLessThan(1e-9);
  });
});
