import { describe, it, expect, vi } from 'vitest';
import { DataflowRuntime } from './scheduler';
import type { Graph, Token } from './types';

const tok = (value: number | { re: number; im: number }, t = 0): Token => ({
  id: 'test',
  value,
  t,
  originT: t,
});

const mkGraph = (...nodes: Graph['nodes']): Graph => ({ nodes, edges: [] });

describe('DataflowRuntime', () => {
  describe('inject + tick', () => {
    it('fires add node when both inputs present', () => {
      const g: Graph = {
        nodes: [{ id: 'a', kind: 'add', inPorts: ['a', 'b'], outPorts: ['out'], latency: 0 }],
        edges: [],
      };
      const fired: string[] = [];
      const rt = new DataflowRuntime(g, { onFire: (n) => fired.push(n.id) }, () => 0);
      rt.inject('a', 'a', tok(3));
      rt.inject('a', 'b', tok(4));
      rt.tick(0);
      expect(fired).toContain('a');
    });

    it('does not fire when only one input present', () => {
      const g = mkGraph({ id: 'a', kind: 'add', inPorts: ['a', 'b'], outPorts: ['out'], latency: 0 });
      const fired: string[] = [];
      const rt = new DataflowRuntime(g, { onFire: (n) => fired.push(n.id) }, () => 0);
      rt.inject('a', 'a', tok(3));
      rt.tick(0);
      expect(fired).toHaveLength(0);
    });

    it('add node produces correct sum', () => {
      const g = mkGraph({ id: 'adder', kind: 'add', inPorts: ['a', 'b'], outPorts: ['out'], latency: 0 });
      const results: Record<string, Token>[] = [];
      const rt = new DataflowRuntime(g, { onOutput: (_, out) => results.push(out) }, () => 0);
      rt.inject('adder', 'a', tok(10));
      rt.inject('adder', 'b', tok(7));
      rt.tick(0);
      expect((results[0]?.out?.value as number)).toBe(17);
    });

    it('mul node produces correct product', () => {
      const g = mkGraph({ id: 'm', kind: 'mul', inPorts: ['a', 'b'], outPorts: ['out'], latency: 0 });
      const results: Record<string, Token>[] = [];
      const rt = new DataflowRuntime(g, { onOutput: (_, out) => results.push(out) }, () => 0);
      rt.inject('m', 'a', tok(6));
      rt.inject('m', 'b', tok(7));
      rt.tick(0);
      expect((results[0]?.out?.value as number)).toBe(42);
    });
  });

  describe('dft4 node', () => {
    const dft4Node = {
      id: 'dft',
      kind: 'dft4' as const,
      inPorts: ['in0', 'in1', 'in2', 'in3'],
      outPorts: ['out0', 'out1', 'out2', 'out3'],
      latency: 0,
    };

    it('impulse x=[1,0,0,0] → all-ones output', () => {
      const g = mkGraph(dft4Node);
      const results: Record<string, Token>[] = [];
      const rt = new DataflowRuntime(g, { onOutput: (_, o) => results.push(o) }, () => 0);
      rt.inject('dft', 'in0', tok({ re: 1, im: 0 }));
      rt.inject('dft', 'in1', tok({ re: 0, im: 0 }));
      rt.inject('dft', 'in2', tok({ re: 0, im: 0 }));
      rt.inject('dft', 'in3', tok({ re: 0, im: 0 }));
      rt.tick(0);
      const out = results[0]!;
      for (const key of ['out0', 'out1', 'out2', 'out3']) {
        const v = out[key]?.value as { re: number; im: number };
        expect(Math.abs(v.re - 1)).toBeLessThan(1e-9);
        expect(Math.abs(v.im)).toBeLessThan(1e-9);
      }
    });

    it('DC signal x=[1,1,1,1] → X[0]=4, rest=0', () => {
      const g = mkGraph(dft4Node);
      const results: Record<string, Token>[] = [];
      const rt = new DataflowRuntime(g, { onOutput: (_, o) => results.push(o) }, () => 0);
      for (const p of ['in0', 'in1', 'in2', 'in3']) {
        rt.inject('dft', p, tok({ re: 1, im: 0 }));
      }
      rt.tick(0);
      const out = results[0]!;
      const X0 = out['out0']?.value as { re: number; im: number };
      const X1 = out['out1']?.value as { re: number; im: number };
      expect(Math.abs(X0.re - 4)).toBeLessThan(1e-9);
      expect(Math.abs(X1.re)).toBeLessThan(1e-9);
      expect(Math.abs(X1.im)).toBeLessThan(1e-9);
    });
  });

  describe('twiddle node', () => {
    it('k=0 twiddle factor is 1 (identity)', () => {
      const g = mkGraph({
        id: 'tw',
        kind: 'twiddle',
        inPorts: ['in'],
        outPorts: ['out'],
        latency: 0,
        params: { twiddle: { N: 16, k: 0 } },
      });
      const results: Record<string, Token>[] = [];
      const rt = new DataflowRuntime(g, { onOutput: (_, o) => results.push(o) }, () => 0);
      rt.inject('tw', 'in', tok({ re: 2, im: 3 }));
      rt.tick(0);
      const v = results[0]?.out?.value as { re: number; im: number };
      expect(Math.abs(v.re - 2)).toBeLessThan(1e-9);
      expect(Math.abs(v.im - 3)).toBeLessThan(1e-9);
    });

    it('W_4^1 = -j: multiplying {re:1,im:0} gives {re:0,im:-1}', () => {
      const g = mkGraph({
        id: 'tw',
        kind: 'twiddle',
        inPorts: ['in'],
        outPorts: ['out'],
        latency: 0,
        params: { twiddle: { N: 4, k: 1 } },
      });
      const results: Record<string, Token>[] = [];
      const rt = new DataflowRuntime(g, { onOutput: (_, o) => results.push(o) }, () => 0);
      rt.inject('tw', 'in', tok({ re: 1, im: 0 }));
      rt.tick(0);
      const v = results[0]?.out?.value as { re: number; im: number };
      expect(Math.abs(v.re)).toBeLessThan(1e-9);
      expect(Math.abs(v.im - (-1))).toBeLessThan(1e-9);
    });
  });

  describe('latency blocking', () => {
    it('node is blocked until latency expires', () => {
      let time = 0;
      const g = mkGraph({ id: 'a', kind: 'add', inPorts: ['a', 'b'], outPorts: ['out'], latency: 100 });
      const fired: number[] = [];
      const rt = new DataflowRuntime(g, { onFire: () => fired.push(time) }, () => time);

      rt.inject('a', 'a', tok(1));
      rt.inject('a', 'b', tok(2));
      rt.tick(0); // fires at t=0, readyAt=100

      // inject again immediately
      rt.inject('a', 'a', tok(3));
      rt.inject('a', 'b', tok(4));
      rt.tick(0); // still blocked
      expect(fired).toHaveLength(1);

      time = 101;
      rt.tick(0); // now unblocked
      expect(fired).toHaveLength(2);
    });
  });

  describe('emitFrom', () => {
    it('pushes token into outgoing edge buffer', () => {
      const g: Graph = {
        nodes: [
          { id: 'src', kind: 'source', inPorts: [], outPorts: ['out'], latency: 0 },
          { id: 'snk', kind: 'sink', inPorts: ['in'], outPorts: [], latency: 0 },
        ],
        edges: [{ id: 'e1', from: { node: 'src', port: 'out' }, to: { node: 'snk', port: 'in' }, delay: 0 }],
      };
      const rt = new DataflowRuntime(g, {}, () => 0);
      rt.emitFrom('src', 'out', tok(99));
      expect(rt.getBufferSize('e1')).toBe(1);
    });
  });

  describe('getAverageQueueSize', () => {
    it('returns 0 for empty buffers', () => {
      const g: Graph = {
        nodes: [
          { id: 'a', kind: 'source', inPorts: [], outPorts: ['out'], latency: 0 },
          { id: 'b', kind: 'sink', inPorts: ['in'], outPorts: [], latency: 0 },
        ],
        edges: [{ id: 'e', from: { node: 'a', port: 'out' }, to: { node: 'b', port: 'in' }, delay: 0 }],
      };
      const rt = new DataflowRuntime(g, {}, () => 0);
      expect(rt.getAverageQueueSize()).toBe(0);
    });

    it('reflects tokens in buffers', () => {
      const g: Graph = {
        nodes: [
          { id: 'a', kind: 'source', inPorts: [], outPorts: ['out'], latency: 0 },
          { id: 'b', kind: 'sink', inPorts: ['in'], outPorts: [], latency: 0 },
        ],
        edges: [{ id: 'e', from: { node: 'a', port: 'out' }, to: { node: 'b', port: 'in' }, delay: 0 }],
      };
      const rt = new DataflowRuntime(g, {}, () => 0);
      rt.emitFrom('a', 'out', tok(1));
      rt.emitFrom('a', 'out', tok(2));
      expect(rt.getAverageQueueSize()).toBe(2);
    });
  });

  describe('maxFires limit', () => {
    it('fires at most maxFires nodes per tick', () => {
      const nodes = Array.from({ length: 5 }, (_, i) => ({
        id: `a${i}`,
        kind: 'add' as const,
        inPorts: ['a', 'b'],
        outPorts: ['out'],
        latency: 0,
      }));
      const g = mkGraph(...nodes);
      const fired: string[] = [];
      const rt = new DataflowRuntime(g, { onFire: (n) => fired.push(n.id) }, () => 0);

      for (const n of nodes) {
        rt.inject(n.id, 'a', tok(1));
        rt.inject(n.id, 'b', tok(2));
      }

      const count = rt.tick(0, 2);
      expect(count).toBe(2);
    });
  });
});
