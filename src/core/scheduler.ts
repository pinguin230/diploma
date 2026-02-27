// core/scheduler.ts

import { FIFO } from './buffers';
import type { Edge, FireResult, Graph, NodeSpec, PortId, Token } from './types';

type Buffers = Map<string, FIFO<Token>>; // key = edge.id
type ReadyAt = Map<string, number>; // nodeId -> time when outputs become available

export class DataflowRuntime {
  readonly graph: Graph;
  readonly buffers: Buffers = new Map();

  private readyAt: ReadyAt = new Map();
  private now: () => number;

  private pickOriginT(inputs: Record<string, Token>): number {
    const first = Object.values(inputs)[0];
    return first?.originT ?? this.now();
  }

  private inbox: Map<string, Map<PortId, Token>> = new Map(); // nodeId -> port -> token
  private listeners: {
    onToken?: (edge: Edge, token: Token) => void;
    onFire?: (node: NodeSpec) => void;
    onBeforeFire?: (node: NodeSpec, inputs: Record<PortId, Token>) => void;
    onOutput?: (node: NodeSpec, out: Record<PortId, Token>) => void;
  } = {};

  private complexMul(a: { re: number; im: number }, b: { re: number; im: number }) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
  }
  private twiddle(N: number, k: number) {
    const ang = (-2 * Math.PI * (k % N)) / N; // e^{-j 2πk/N}
    return { re: Math.cos(ang), im: Math.sin(ang) };
  }

  constructor(graph: Graph, listeners?: DataflowRuntime['listeners'], getTime: () => number = () => performance.now()) {
    this.graph = graph;
    this.listeners = listeners ?? {};
    this.now = getTime;
    graph.edges.forEach((e) => this.buffers.set(e.id, new FIFO<Token>()));
  }

  // подати дані в конкретний вхід вузла (джерело)
  inject(nodeId: string, port: PortId, token: Token) {
    const mp = this.inbox.get(nodeId) ?? new Map();
    mp.set(port, token);
    this.inbox.set(nodeId, mp);
  }

  tick(dt = 16, maxFires = Infinity) {
    const t = this.now();

    // 1) доставляємо з буферів у inbox з урахуванням edge.delay
    for (const e of this.graph.edges) {
      const buf = this.buffers.get(e.id)!;
      if (!buf.size()) continue;
      const peek = buf.peek()!;
      if (t - peek.t >= (e.delay ?? 0)) {
        const tok = buf.pop()!;
        const mp = this.inbox.get(e.to.node) ?? new Map();
        mp.set(e.to.port, tok);
        this.inbox.set(e.to.node, mp);
      }
    }

    // 2) fire вузлів з урахуванням node.latency
    let fires = 0;
    for (const n of this.graph.nodes) {
      if (fires >= maxFires) break;
      const notReady = (this.readyAt.get(n.id) ?? -Infinity) > t;
      if (notReady) continue;

      const inMap = this.inbox.get(n.id);
      if (!inMap || !n.inPorts.every((p) => inMap.has(p))) continue;

      const inputs: Record<string, Token> = {};
      n.inPorts.forEach((p) => (inputs[p] = inMap.get(p)!));
      this.listeners.onBeforeFire?.(n, inputs);

      const out = this.execute(n, inputs);
      const latency = n.latency ?? 0;
      this.readyAt.set(n.id, t + latency); // блокування вузла до t+latency
      this.listeners.onFire?.(n);

      for (const [port, token] of Object.entries(out.outputs)) {
        for (const e of this.graph.edges.filter((ed) => ed.from.node === n.id && ed.from.port === port)) {
          const tok: Token = { ...token, t: t + latency }; // випуск після latency
          this.buffers.get(e.id)!.push(tok);
          this.listeners.onToken?.(e, tok);
        }
      }

      this.listeners.onOutput?.(n, out.outputs);
      this.inbox.delete(n.id);
      fires++;
    }
    return fires;
  }

  private execute(node: NodeSpec, inputs: Record<string, Token>): FireResult {
    const originT = this.pickOriginT(inputs);
    switch (node.kind) {
      case 'add': {
        const a = inputs['a']!.value as number;
        const b = inputs['b']!.value as number;
        return {
          outputs: {
            out: { id: crypto.randomUUID(), value: a + b, t: this.now(), originT },
          },
        };
      }
      case 'mul': {
        const a = inputs['a']!.value as number;
        const b = inputs['b']!.value as number;
        return {
          outputs: {
            out: { id: crypto.randomUUID(), value: a * b, t: this.now(), originT },
          },
        };
      }
      case 'butterfly': {
        const x0 = inputs['x0']!.value as { re: number; im: number };
        const x1 = inputs['x1']!.value as { re: number; im: number };

        // DIF: спочатку sum/diff, потім твідл на гілці y1
        const sum = { re: x0.re + x1.re, im: x0.im + x1.im }; // y0
        const diff = { re: x0.re - x1.re, im: x0.im - x1.im }; // перед твідлом

        const tw = node.params?.twiddle;
        const y1c = tw ? this.complexMul(diff, this.twiddle(tw.N, tw.k)) : diff;

        return {
          outputs: {
            y0: { id: crypto.randomUUID(), value: sum, t: this.now(), originT },
            y1: { id: crypto.randomUUID(), value: y1c, t: this.now(), originT },
          },
        };
      }
      case 'sink': {
        const tok = inputs['in']!;
        if (!tok) return { outputs: {} };
        return {
          outputs: {
            out: { id: crypto.randomUUID(), value: tok.value, t: this.now(), originT },
          },
        };
      }
      default:
        return { outputs: {} };
    }
  }

  getAverageQueueSize(): number {
    let total = 0,
      cnt = 0;
    for (const buf of this.buffers.values()) {
      total += buf.size();
      cnt++;
    }
    return cnt ? total / cnt : 0;
  }

  getBufferSize(edgeId: string): number {
    return this.buffers.get(edgeId)?.size() ?? 0;
  }

  emitFrom(nodeId: string, outPort: string, token: Token) {
    for (const e of this.graph.edges.filter((ed) => ed.from.node === nodeId && ed.from.port === outPort)) {
      const baseT = this.now(); // simTime (бо ти прокинув getTime)
      const t: Token = {
        ...token, // зберігаємо originT як є!
        t: baseT, // оновлюємо лише час надходження в буфер
      };
      this.buffers.get(e.id)!.push(t);
      this.listeners.onToken?.(e, t);
    }
  }
}
