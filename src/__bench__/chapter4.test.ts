// Headless-харнес для Розділу 4 БКР.
// Збирає РЕАЛЬНІ дані безпосередньо з ядра симулятора (без браузера):
//  - функціональну верифікацію проти fft.js (макс. та RMS похибка) для всіх пресетів;
//  - повний спектр сценарію ramp (для Табл. 4.3);
//  - реальний розклад активацій вузлів (часова діаграма, Табл. 4.6);
//  - ASAP/ALAP, мобільність вузлів, профіль паралелізму, критичний шлях;
//  - підрахунок операцій (складність) та перевірку детермінізму (NF5).
// Результат друкується в консоль і пишеться у section4_data.json у корені проєкту.

import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import FFT from 'fft.js';
import { generateDFT4x4 } from '@/graph/generateDFT4x4';
import { DataflowRuntime } from '@/core/scheduler';
import type { Complex, Graph } from '@/core/types';

const N = 16;
const TWO_PI = 2 * Math.PI;

type Scenario = { name: string; x: Complex[] };

function makePreset(kind: string): Complex[] {
  const out: Complex[] = [];
  for (let n = 0; n < N; n++) {
    let v: Complex = { re: 0, im: 0 };
    switch (kind) {
      case 'impulse':
        v = n === 0 ? { re: 1, im: 0 } : { re: 0, im: 0 };
        break;
      case 'two-impulses':
        v = n === 0 || n === N / 2 ? { re: 1, im: 0 } : { re: 0, im: 0 };
        break;
      case 'sin1':
        v = { re: Math.cos((TWO_PI * 1 * n) / N), im: Math.sin((TWO_PI * 1 * n) / N) };
        break;
      case 'sin3':
        v = { re: Math.cos((TWO_PI * 3 * n) / N), im: Math.sin((TWO_PI * 3 * n) / N) };
        break;
      case 'sin1+3': {
        const a = { re: Math.cos((TWO_PI * 1 * n) / N), im: Math.sin((TWO_PI * 1 * n) / N) };
        const b = { re: Math.cos((TWO_PI * 3 * n) / N), im: Math.sin((TWO_PI * 3 * n) / N) };
        v = { re: a.re + b.re, im: a.im + b.im };
        break;
      }
      case 'ramp':
        v = { re: n, im: 0 };
        break;
    }
    out.push(v);
  }
  return out;
}

type RunResult = {
  sinks: Complex[];
  fires: { id: string; kind: string; t: number }[];
  finishTime: number;
};

function runScenario(x: Complex[]): RunResult {
  const graph = generateDFT4x4();
  let now = 0;
  const sinks: Complex[] = new Array(N);
  let collected = 0;
  const fires: { id: string; kind: string; t: number }[] = [];

  const rt = new DataflowRuntime(
    graph,
    {
      onFire: (n) => fires.push({ id: n.id, kind: n.kind, t: now }),
      onOutput: (n, out) => {
        if (n.kind === 'sink') {
          const idx = parseInt(n.id.replace('snk', ''), 10);
          const v = (out.out?.value ?? out[Object.keys(out)[0]!]?.value) as Complex;
          if (sinks[idx] === undefined) collected++;
          sinks[idx] = { re: v.re, im: v.im };
        }
      },
    },
    () => now,
  );

  for (let i = 0; i < N; i++) {
    rt.emitFrom(`src${i}`, 'out', { id: `x${i}`, value: x[i], t: now, originT: now });
  }

  for (now = 0; now <= 6000 && collected < N; now++) {
    rt.tick();
  }
  return { sinks, fires, finishTime: now };
}

function referenceFFT(x: Complex[]): Complex[] {
  const fft = new FFT(N);
  const inp = fft.createComplexArray();
  const out = fft.createComplexArray();
  for (let i = 0; i < N; i++) {
    inp[2 * i] = x[i]!.re;
    inp[2 * i + 1] = x[i]!.im;
  }
  fft.transform(out, inp);
  return Array.from({ length: N }, (_, k) => ({ re: out[2 * k]!, im: out[2 * k + 1]! }));
}

function errors(sim: Complex[], ref: Complex[]) {
  let maxAbs = 0;
  let sumSq = 0;
  for (let k = 0; k < N; k++) {
    const dRe = Math.abs(sim[k]!.re - ref[k]!.re);
    const dIm = Math.abs(sim[k]!.im - ref[k]!.im);
    maxAbs = Math.max(maxAbs, dRe, dIm);
    sumSq += dRe * dRe + dIm * dIm;
  }
  return { maxAbs, rms: Math.sqrt(sumSq / (2 * N)) };
}

// Аналітичні ASAP/ALAP/мобільність на основі latency вузлів і delay дуг.
function schedule(graph: Graph) {
  const node = new Map(graph.nodes.map((n) => [n.id, n]));
  const succ = new Map<string, { to: string; delay: number }[]>();
  const pred = new Map<string, { from: string; delay: number }[]>();
  graph.nodes.forEach((n) => {
    succ.set(n.id, []);
    pred.set(n.id, []);
  });
  for (const e of graph.edges) {
    succ.get(e.from.node)!.push({ to: e.to.node, delay: e.delay ?? 0 });
    pred.get(e.to.node)!.push({ from: e.from.node, delay: e.delay ?? 0 });
  }
  // топологічний порядок (Kahn)
  const indeg = new Map(graph.nodes.map((n) => [n.id, pred.get(n.id)!.length]));
  const q = graph.nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const s of succ.get(u)!) {
      indeg.set(s.to, indeg.get(s.to)! - 1);
      if (indeg.get(s.to) === 0) q.push(s.to);
    }
  }
  // ASAP fire time: max over preds (asapFire[pred] + lat[pred] + delay)
  const asap = new Map<string, number>();
  for (const id of order) {
    const ps = pred.get(id)!;
    if (ps.length === 0) asap.set(id, 0);
    else asap.set(id, Math.max(...ps.map((p) => asap.get(p.from)! + node.get(p.from)!.latency + p.delay)));
  }
  const makespan = Math.max(...graph.nodes.map((n) => asap.get(n.id)! + node.get(n.id)!.latency));
  // ALAP fire time: min over succs (alapFire[succ] - delay) - lat[self]
  const alap = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const ss = succ.get(id)!;
    const lat = node.get(id)!.latency;
    if (ss.length === 0) alap.set(id, makespan - lat);
    else alap.set(id, Math.min(...ss.map((s) => alap.get(s.to)! - s.delay)) - lat);
  }
  const mobility = new Map<string, number>();
  graph.nodes.forEach((n) => mobility.set(n.id, alap.get(n.id)! - asap.get(n.id)!));
  // профіль паралелізму: к-сть вузлів, що виконуються в кожен момент (за ASAP)
  const events = new Set<number>();
  graph.nodes.forEach((n) => {
    events.add(asap.get(n.id)!);
    events.add(asap.get(n.id)! + node.get(n.id)!.latency);
  });
  const times = [...events].sort((a, b) => a - b);
  let peak = 0;
  for (let i = 0; i < times.length - 1; i++) {
    const t = times[i]!;
    const active = graph.nodes.filter((n) => {
      const s = asap.get(n.id)!;
      const lat = node.get(n.id)!.latency;
      return lat > 0 && s <= t && t < s + lat;
    }).length;
    peak = Math.max(peak, active);
  }
  const work = graph.nodes.reduce((acc, n) => acc + n.latency, 0);
  return { asap, alap, mobility, makespan, peak, work, order };
}

describe('Розділ 4 — реальні експериментальні дані', () => {
  const scenarios = ['ramp', 'impulse', 'sin1', 'sin3', 'sin1+3', 'two-impulses'];
  const data: Record<string, unknown> = {};

  it('верифікація проти fft.js для всіх пресетів', () => {
    const verify: Record<string, { maxAbs: number; rms: number }> = {};
    for (const name of scenarios) {
      const x = makePreset(name);
      const { sinks } = runScenario(x);
      const ref = referenceFFT(x);
      const e = errors(sinks, ref);
      verify[name] = e;
      expect(e.maxAbs).toBeLessThan(1e-9); // NF1
    }
    data.verify = verify;
    // спектр ramp (Табл. 4.3)
    const xr = makePreset('ramp');
    const r = runScenario(xr);
    const ref = referenceFFT(xr);
    data.rampSpectrum = r.sinks.map((s, k) => ({
      k,
      simRe: s.re,
      simIm: s.im,
      refRe: ref[k]!.re,
      refIm: ref[k]!.im,
    }));
  });

  it('розклад активацій, ASAP/ALAP, паралелізм, складність', () => {
    const graph = generateDFT4x4();
    const sch = schedule(graph);

    // реальні часи активацій із симуляції (ramp)
    const { fires, finishTime } = runScenario(makePreset('ramp'));
    const tierTimes: Record<string, { start: number; end: number; count: number }> = {};
    const tierOf = (id: string, kind: string) =>
      kind === 'source' ? 'source' : kind === 'sink' ? 'sink' : id.startsWith('row-') ? 'row-dft4' : id.startsWith('col-') ? 'col-dft4' : 'twiddle';
    const lat: Record<string, number> = { source: 0, 'row-dft4': 400, twiddle: 200, 'col-dft4': 400, sink: 0 };
    for (const f of fires) {
      const tier = tierOf(f.id, f.kind);
      const end = f.t + (lat[tier] ?? 0);
      if (!tierTimes[tier]) tierTimes[tier] = { start: f.t, end, count: 0 };
      tierTimes[tier]!.start = Math.min(tierTimes[tier]!.start, f.t);
      tierTimes[tier]!.end = Math.max(tierTimes[tier]!.end, end);
      tierTimes[tier]!.count++;
    }
    // джерела не «fire» через tick — додаємо вручну (емісія у t=0)
    tierTimes['source'] = { start: 0, end: 0, count: N };

    const node = new Map(graph.nodes.map((n) => [n.id, n]));
    const mobilities = [...sch.mobility.values()];
    const maxMobility = Math.max(...mobilities);

    // критичний шлях (трасування від найпізнішого sink за ASAP)
    const criticalNodes = graph.nodes
      .filter((n) => sch.mobility.get(n.id) === 0)
      .map((n) => n.id);

    // підрахунок операцій
    const twiddles = graph.nodes.filter((n) => n.kind === 'twiddle');
    const nontrivial = twiddles.filter((n) => (n.params?.twiddle?.k ?? 0) % 16 !== 0).length;
    const trivial = twiddles.length - nontrivial;

    data.dfg = {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      bySource: graph.nodes.filter((n) => n.kind === 'source').length,
      byDft4: graph.nodes.filter((n) => n.kind === 'dft4').length,
      byTwiddle: twiddles.length,
      bySink: graph.nodes.filter((n) => n.kind === 'sink').length,
    };
    data.schedule = {
      criticalPath: sch.makespan,
      sequentialWork: sch.work,
      parallelism: sch.work / sch.makespan,
      peakConcurrency: sch.peak,
      maxMobility,
      criticalNodeCount: criticalNodes.length,
      simFinishTime: finishTime - 1,
      tiers: tierTimes,
    };
    data.complexity = {
      directDFT_complexMul: N * N,
      directDFT_realMul: N * N * 4,
      directDFT_complexAdd: N * (N - 1),
      radix4_nontrivialComplexMul: nontrivial,
      radix4_realMul: nontrivial * 4,
      radix4_complexAdd: 8 * graph.nodes.filter((n) => n.kind === 'dft4').length,
      trivialTwiddles: trivial,
      speedupKM: (N * N) / nontrivial,
    };

    // ASAP/ALAP/мобільність по типах вузлів (для аналізу розкладу)
    const groupBy = (kindOrTier: (n: typeof graph.nodes[number]) => string) => {
      const m: Record<string, { asap: number; alap: number; mobility: number; latency: number }[]> = {};
      for (const n of graph.nodes) {
        const k = kindOrTier(n);
        if (!m[k]) m[k] = [];
        m[k]!.push({
          asap: sch.asap.get(n.id)!,
          alap: sch.alap.get(n.id)!,
          mobility: sch.mobility.get(n.id)!,
          latency: n.latency,
        });
      }
      return m;
    };
    const tierKey = (n: typeof graph.nodes[number]) =>
      n.kind === 'source' ? 'source' :
      n.kind === 'sink' ? 'sink' :
      n.id.startsWith('row-') ? 'row-dft4' :
      n.id.startsWith('col-') ? 'col-dft4' : 'twiddle';

    const tierStats: Record<string, { asapStart: number; alapStart: number; mobility: number; count: number }> = {};
    const grouped = groupBy(tierKey);
    for (const [t, arr] of Object.entries(grouped)) {
      tierStats[t] = {
        asapStart: arr[0]!.asap,
        alapStart: arr[0]!.alap,
        mobility: arr[0]!.mobility,
        count: arr.length,
      };
    }
    // гістограма мобільності
    const mobilityHistogram: Record<string, number> = {};
    for (const m of sch.mobility.values()) {
      const k = String(m);
      mobilityHistogram[k] = (mobilityHistogram[k] ?? 0) + 1;
    }
    // частка часу T_kr, що припадає на обчислювальні latency проти затримок дуг
    const computeShare = sch.work / (N) / sch.makespan; // середня к-сть «зайнятих» вузлів за один такт * N
    const arcDelayOnCriticalPath = 4 * 600; // source→row + row→tw + tw→col + col→sink
    const computeOnCriticalPath = 400 + 200 + 400; // одна row-dft4 + одна twiddle + одна col-dft4
    data.utilization = {
      arcDelayOnCriticalPath,
      computeOnCriticalPath,
      arcShare: arcDelayOnCriticalPath / sch.makespan,
      computeShare: computeOnCriticalPath / sch.makespan,
      // середнє завантаження (sum latency / (makespan * peak))
      meanLoad: sch.work / (sch.makespan * sch.peak),
    };
    data.tierStats = tierStats;
    data.mobilityHistogram = mobilityHistogram;

    // фактичні часи появи кожного спектрального відліку X(k) у sink (для ramp)
    const sinkArrival: Array<{ k: number; t: number }> = [];
    for (const f of fires) {
      if (f.kind === 'sink') {
        const k = parseInt(f.id.replace('snk', ''), 10);
        sinkArrival.push({ k, t: f.t });
      }
    }
    data.sinkArrival = sinkArrival.sort((a, b) => a.k - b.k);

    // 9 нетривіальних twiddle-ів за параметром k (для документа)
    const nontrivialList = twiddles
      .filter((n) => (n.params?.twiddle?.k ?? 0) % 16 !== 0)
      .map((n) => ({ id: n.id, k: n.params?.twiddle?.k }));
    data.nontrivialTwiddles = nontrivialList;

    expect(sch.makespan).toBe(3400);
    expect(sch.work).toBe(6400);
    expect(sch.peak).toBe(16);
    expect(graph.nodes.length).toBe(56);
    expect(graph.edges.length).toBe(64);
  });

  it('детермінізм (NF5): два прогони дають ідентичний результат', () => {
    const a = runScenario(makePreset('ramp'));
    const b = runScenario(makePreset('ramp'));
    const seqA = a.fires.map((f) => `${f.id}@${f.t}`).join(',');
    const seqB = b.fires.map((f) => `${f.id}@${f.t}`).join(',');
    expect(seqA).toBe(seqB);
    const sinkEq = a.sinks.every((s, k) => s.re === b.sinks[k]!.re && s.im === b.sinks[k]!.im);
    expect(sinkEq).toBe(true);
    data.determinism = { identical: seqA === seqB && sinkEq, fireCount: a.fires.length };
  });

  it('запис результатів у section4_data.json', () => {
    writeFileSync(`${process.cwd()}/section4_data.json`, JSON.stringify(data, null, 2), 'utf8');
    // короткий друк у консоль
    console.log('\n===== РЕАЛЬНІ ДАНІ РОЗДІЛУ 4 =====');
    console.log('Верифікація (макс. абс. похибка):', JSON.stringify(data.verify, null, 2));
    console.log('Розклад/паралелізм:', JSON.stringify(data.schedule, null, 2));
    console.log('Складність:', JSON.stringify(data.complexity, null, 2));
    console.log('Детермінізм:', JSON.stringify(data.determinism, null, 2));
    expect(true).toBe(true);
  });
});
