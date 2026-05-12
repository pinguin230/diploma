import { describe, it, expect } from 'vitest';
import { generateDFT4x4 } from './generateDFT4x4';

describe('generateDFT4x4', () => {
  const graph = generateDFT4x4();

  describe('node counts', () => {
    it('has exactly 16 source nodes', () => {
      const sources = graph.nodes.filter((n) => n.kind === 'source');
      expect(sources).toHaveLength(16);
    });

    it('has exactly 16 sink nodes', () => {
      const sinks = graph.nodes.filter((n) => n.kind === 'sink');
      expect(sinks).toHaveLength(16);
    });

    it('has exactly 4 row DFT4 nodes', () => {
      const rows = graph.nodes.filter((n) => n.kind === 'dft4' && n.id.startsWith('row-'));
      expect(rows).toHaveLength(4);
    });

    it('has exactly 4 column DFT4 nodes', () => {
      const cols = graph.nodes.filter((n) => n.kind === 'dft4' && n.id.startsWith('col-'));
      expect(cols).toHaveLength(4);
    });

    it('has exactly 16 twiddle nodes', () => {
      const tw = graph.nodes.filter((n) => n.kind === 'twiddle');
      expect(tw).toHaveLength(16);
    });

    it('has 56 total nodes', () => {
      // 16 sources + 4 row-dft4 + 16 twiddles + 4 col-dft4 + 16 sinks = 56
      expect(graph.nodes).toHaveLength(56);
    });
  });

  describe('node IDs', () => {
    it('source nodes are named src0..src15', () => {
      for (let i = 0; i < 16; i++) {
        expect(graph.nodes.find((n) => n.id === `src${i}`)).toBeDefined();
      }
    });

    it('sink nodes are named snk0..snk15', () => {
      for (let i = 0; i < 16; i++) {
        expect(graph.nodes.find((n) => n.id === `snk${i}`)).toBeDefined();
      }
    });

    it('row nodes are named row-0..row-3', () => {
      for (let i = 0; i < 4; i++) {
        expect(graph.nodes.find((n) => n.id === `row-${i}`)).toBeDefined();
      }
    });
  });

  describe('node ports', () => {
    it('source nodes have no inputs and one out port', () => {
      const src = graph.nodes.find((n) => n.id === 'src0')!;
      expect(src.inPorts).toHaveLength(0);
      expect(src.outPorts).toEqual(['out']);
    });

    it('sink nodes have one in port and no outputs', () => {
      const snk = graph.nodes.find((n) => n.id === 'snk0')!;
      expect(snk.inPorts).toEqual(['in']);
      expect(snk.outPorts).toHaveLength(0);
    });

    it('dft4 nodes have 4 in and 4 out ports', () => {
      const row = graph.nodes.find((n) => n.id === 'row-0')!;
      expect(row.inPorts).toHaveLength(4);
      expect(row.outPorts).toHaveLength(4);
    });
  });

  describe('twiddle params', () => {
    it('tw-0-0 has twiddle k=0 (trivial factor)', () => {
      const tw = graph.nodes.find((n) => n.id === 'tw-0-0')!;
      expect(tw.params?.twiddle?.k).toBe(0);
      expect(tw.params?.twiddle?.N).toBe(16);
    });

    it('tw-1-1 has twiddle k=1 (n1=1, k2=1)', () => {
      const tw = graph.nodes.find((n) => n.id === 'tw-1-1')!;
      expect(tw.params?.twiddle?.k).toBe(1);
    });

    it('tw-3-3 has twiddle k=9 (n1=3, k2=3, power=9)', () => {
      const tw = graph.nodes.find((n) => n.id === 'tw-3-3')!;
      expect(tw.params?.twiddle?.k).toBe(9);
    });
  });

  describe('edge connectivity', () => {
    it('every edge has unique id', () => {
      const ids = graph.edges.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all source edges point to row DFT nodes', () => {
      const srcEdges = graph.edges.filter((e) => e.from.node.startsWith('src'));
      srcEdges.forEach((e) => expect(e.to.node.startsWith('row-')).toBe(true));
    });

    it('all col DFT output edges point to sink nodes', () => {
      const colOutEdges = graph.edges.filter((e) => e.from.node.startsWith('col-'));
      colOutEdges.forEach((e) => expect(e.to.node.startsWith('snk')).toBe(true));
    });
  });

  describe('latency parameter', () => {
    it('uses default latency=400 for dft4 nodes', () => {
      const row = graph.nodes.find((n) => n.id === 'row-0')!;
      expect(row.latency).toBe(400);
    });

    it('uses latency/2=200 for twiddle nodes by default', () => {
      const tw = graph.nodes.find((n) => n.id === 'tw-1-1')!;
      expect(tw.latency).toBe(200);
    });

    it('accepts custom latency', () => {
      const g = generateDFT4x4(800);
      const row = g.nodes.find((n) => n.id === 'row-0')!;
      expect(row.latency).toBe(800);
    });
  });
});
