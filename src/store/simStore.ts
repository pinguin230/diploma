// store/simStore.ts

import { devtools } from 'zustand/middleware';
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Complex, Graph, Token } from '@/core/types';
import { DataflowRuntime } from '@/core/scheduler';
import { computeCriticalPath } from '@/utils/criticalPath';

let startClickTime: number | null = null;
let startMeasurementDone = false;
// Окремий прапорець для виміру часу відгуку UI (NF2):
// перший тік анімаційного циклу після натискання «Пуск» — не залежить від
// затримок у графі, відображає лише затримку браузерного event-loop/rAF.
let startUiResponseDone = false;

export type TokenVis = { id: string; t0: number; delay: number; value?: { re: number; im: number } };
export type CustomPreset = {
  id: string;
  name: string;
  data: Record<string, { re: number; im: number }>;
};
export type EventLogEntry = {
  id: string;
  kind: 'fire' | 'output';
  label: string;
  simTime: number;
};
type PresetName = 'impulse' | 'two-impulses' | 'sin1' | 'sin3' | 'sin1+3' | 'ramp' | 'noise';
type BaModel = '4M2A' | '3M5A';
type InspectorState = {
  visible: boolean;
  nodeId: string | null;
  kind: 'source' | 'sink' | 'add' | 'mul' | 'butterfly' | 'dft4' | 'twiddle' | null;
  twiddle?: { N: number; k: number } | null;
  inputs: Record<string, Token> | null;
  outputs: Record<string, Token> | null;
  baModel: BaModel;
};

type SimState = {
  graph: Graph;
  runtime: DataflowRuntime | null;
  running: boolean;
  speed: number;
  setSpeed: (v: number) => void;

  sinks: Record<string, string>;
  setSinkValue: (id: string, val: string) => void;

  lastInput: Record<string, Complex>;
  mismatches: Record<string, boolean>;

  lastWall: number | null;

  setGraph: (g: Graph) => void;
  addEdgeToGraph: (p: { from: { node: string; port: string }; to: { node: string; port: string } }) => void;
  start: () => void;
  stop: () => void;
  step: () => void;
  reset: () => void;
  updateNodeLatency: (nodeId: string, latency: number) => void;
  updateEdgeDelay: (edgeId: string, delay: number) => void;

  inspector: InspectorState;
  openInspector: (p: Partial<InspectorState>) => void;
  closeInspector: () => void;
  setBaModel: (m: BaModel) => void;

  N: number;
  setN: (n: number) => void;

  tokensByEdge: Record<string, TokenVis[]>;
  addEdgeToken: (edgeId: string, delay: number, id: string, value?: { re: number; im: number }) => void;
  removeEdgeToken: (edgeId: string, id: string) => void;

  setLastInput: (id: string, v: Complex) => void;
  setMismatches: (m: Record<string, boolean>) => void;

  simTime: number;
  tickSimTime: () => number;

  pauseOnFire: boolean;
  setPauseOnFire: (v: boolean) => void;

  nodesDraggable: boolean;
  setNodesDraggable: (v: boolean) => void;

  mode: 'run' | 'single-fire';
  setMode: (m: 'run' | 'single-fire') => void;

  activeNodeId: string | null;
  setActiveNode: (id: string | null) => void;

  applyPreset: (p: PresetName) => void;

  injectData: (vec: Record<string, Complex>) => void;
  customPresets: CustomPreset[];
  setCustomPresets: (ps: CustomPreset[]) => void;
  addCustomPreset: (p: CustomPreset) => void;
  updateCustomPreset: (id: string, p: CustomPreset) => void;
  deleteCustomPreset: (id: string) => void;
  applyCustomPreset: (id: string) => void;

  isPresetManagerOpen: boolean;
  setPresetManagerOpen: (v: boolean) => void;

  firesTotal: number;

  spectrumScale: 'linear' | 'log';
  setSpectrumScale: (m: 'linear' | 'log') => void;

  onTokenReachedSinkForMetrics: () => void;

  spectrumHover: { k: number | null; mag: number; phase: number } | null;
  setSpectrumHover: (h: SimState['spectrumHover']) => void;

  nodeActivity: Record<string, number>; // heatmap інтенсивність 0..1+
  nodeDataCache: Record<string, { inputs?: Record<string, Token>; outputs?: Record<string, Token> }>;
  decayActivity: () => void; // експоненційний розпад
  bumpActivity: (nodeId: string) => void;

  fireCounter: number;

  eventLog: EventLogEntry[];
  addEventLog: (e: Omit<EventLogEntry, 'id'>) => void;
  clearEventLog: () => void;

  criticalPathNodeIds: string[];
  criticalPathEdgeIds: string[];
  showCriticalPath: boolean;
  toggleCriticalPath: () => void;

  pendingNodePositions: { id: string; x: number; y: number }[] | null;
  setPendingNodePositions: (p: { id: string; x: number; y: number }[] | null) => void;

  metrics: {
    // пропускна здатність (онлайн-підрахунок за simTime-вікном)
    windowStartSimT: number;
    firesInWindow: number;
    throughputFps: number;

    // латентність
    latencyEmaMs: number;
    latencyAlpha: number;

    // черги
    queueEma: number; // згладжений середній розмір
    queueAlpha: number; // 0..1

    // події Sink за останню секунду (таймстампи у simTime)
    sinkHits: number[];

    // продуктивність візуалізації
    fpsEma: number;
    tickTimeMs: number;
  };
  resetMetrics: () => void;
  onNodeFireForMetrics: () => void;
  sampleQueues: () => void;
};

const makePreset = (N: number, kind: PresetName): Record<string, { re: number; im: number }> => {
  const out: Record<string, { re: number; im: number }> = {};
  const twoPi = 2 * Math.PI;

  for (let n = 0; n < N; n++) {
    let v = { re: 0, im: 0 };
    switch (kind) {
      case 'impulse': {
        v = n === 0 ? { re: 1, im: 0 } : { re: 0, im: 0 };
        break;
      }
      case 'two-impulses': {
        v = n === 0 || n === N / 2 ? { re: 1, im: 0 } : { re: 0, im: 0 };
        break;
      }
      case 'sin1': {
        v = { re: Math.cos((twoPi * 1 * n) / N), im: Math.sin((twoPi * 1 * n) / N) };
        break;
      }
      case 'sin3': {
        v = { re: Math.cos((twoPi * 3 * n) / N), im: Math.sin((twoPi * 3 * n) / N) };
        break;
      }
      case 'sin1+3': {
        const a = { re: Math.cos((twoPi * 1 * n) / N), im: Math.sin((twoPi * 1 * n) / N) };
        const b = { re: Math.cos((twoPi * 3 * n) / N), im: Math.sin((twoPi * 3 * n) / N) };
        v = { re: a.re + b.re, im: a.im + b.im };
        break;
      }
      case 'ramp': {
        v = { re: n, im: 0 };
        break;
      }
      case 'noise': {
        v = { re: Math.random() * 2 - 1, im: Math.random() * 2 - 1 };
        break;
      }
    }
    out[`src${n}`] = v;
  }
  return out;
};

export const useSimStore = create<SimState>()(
  devtools(
    (set, get) => ({
      graph: {
        nodes: [
          { id: 'src1', kind: 'source', inPorts: [], outPorts: ['out'], latency: 0 },
          { id: 'src2', kind: 'source', inPorts: [], outPorts: ['out'], latency: 0 }, // ← друге джерело (залиши, ти вже мав)
          { id: 'n1', kind: 'butterfly', inPorts: ['x0', 'x1'], outPorts: ['y0', 'y1'], latency: 1 },
          { id: 'snk1', kind: 'sink', inPorts: ['in'], outPorts: [], latency: 0 },
          { id: 'snk2', kind: 'sink', inPorts: ['in'], outPorts: [], latency: 0 }, // ← другий sink
        ],
        edges: [
          { id: 'e1', from: { node: 'src1', port: 'out' }, to: { node: 'n1', port: 'x0' }, delay: 60 },
          { id: 'e2', from: { node: 'src2', port: 'out' }, to: { node: 'n1', port: 'x1' }, delay: 60 },
          { id: 'e3', from: { node: 'n1', port: 'y0' }, to: { node: 'snk1', port: 'in' }, delay: 60 },
          { id: 'e4', from: { node: 'n1', port: 'y1' }, to: { node: 'snk2', port: 'in' }, delay: 60 }, // ← різниця
        ],
      },

      activeNodeId: null,
      runtime: null,
      running: false,
      speed: 1,
      setSpeed: (v) => {
        const t0 = performance.now();
        set({ speed: v });
        // Повзунок може стріляти часто — логуємо кожен раз; для Б2 беремо макс.
        requestAnimationFrame(() =>
          console.log(`[NF2] Швидкість → ${v}× (rAF): ${(performance.now() - t0).toFixed(2)} мс`),
        );
      },
      tokensByEdge: {},

      simTime: 0,
      lastWall: null,

      nodesDraggable: false,
      setNodesDraggable: (v) => set({ nodesDraggable: v }),
      nodeDataCache: {},

      eventLog: [],
      addEventLog: (e) =>
        set((s) => {
          const entry: EventLogEntry = { ...e, id: nanoid(6) };
          const log = s.eventLog.length >= 200 ? s.eventLog.slice(-199) : s.eventLog;
          return { eventLog: [...log, entry] };
        }),
      clearEventLog: () => set({ eventLog: [] }),

      criticalPathNodeIds: [],
      criticalPathEdgeIds: [],
      showCriticalPath: false,
      toggleCriticalPath: () => set((s) => ({ showCriticalPath: !s.showCriticalPath })),

      pendingNodePositions: null,
      setPendingNodePositions: (p) => set({ pendingNodePositions: p }),


      lastInput: {},
      sinks: {},
      mismatches: {},

      firesTotal: 0,

      N: 16,
      setN: (n) => {
        // гарантуємо ступінь двійки
        const pow = Math.round(Math.log2(n));
        const N = 1 << Math.max(1, pow);
        set({ N });
      },

      metrics: {
        windowStartSimT: 0,
        firesInWindow: 0,
        throughputFps: 0,
        latencyEmaMs: 0,
        latencyAlpha: 0.15,
        queueEma: 0,
        queueAlpha: 0.1,
        sinkHits: [],
        fpsEma: 0,
        tickTimeMs: 0,
      },

      resetMetrics: () =>
        set((s) => ({
          metrics: {
            ...s.metrics,
            windowStartSimT: s.simTime,
            firesInWindow: 0,
            throughputFps: 0,
            latencyEmaMs: 0,
            queueEma: 0,
            sinkHits: [],
            fpsEma: 0,
            tickTimeMs: 0,
          },
        })),

      onTokenReachedSinkForMetrics: () =>
        set((s) => ({ metrics: { ...s.metrics, sinkHits: [...s.metrics.sinkHits, s.simTime] } })),

      onNodeFireForMetrics: () =>
        set((s) => {
          const dt = s.simTime - s.metrics.windowStartSimT;
          const firesInWindow = s.metrics.firesInWindow + 1;
          const throughputFps = dt > 1e-6 ? firesInWindow / (dt / 1000) : s.metrics.throughputFps;
          return { metrics: { ...s.metrics, firesInWindow, throughputFps } };
        }),

      sampleQueues: () =>
        set((s) => {
          const rt = s.runtime;
          if (!rt) return s;
          let sum = 0,
            m = 0;
          for (const e of s.graph.edges) {
            sum += rt.getBufferSize(e.id);
            m++;
          }
          const mean = m ? sum / m : 0;
          const a = s.metrics.queueAlpha;
          const ema = a * mean + (1 - a) * s.metrics.queueEma;
          return { metrics: { ...s.metrics, queueEma: ema } };
        }),

      inspector: {
        visible: false,
        nodeId: null,
        kind: null,
        twiddle: null,
        inputs: null,
        outputs: null,
        baModel: '4M2A',
      },
      openInspector: (p) =>
        set((s) => ({
          inspector: {
            ...s.inspector,
            visible: true,
            nodeId: p.nodeId ?? s.inspector.nodeId,
            kind: (p.kind as any) ?? s.inspector.kind,
            twiddle: p.twiddle !== undefined ? p.twiddle : s.inspector.twiddle,
            inputs: p.inputs !== undefined ? p.inputs : s.inspector.inputs,
            outputs: p.outputs !== undefined ? p.outputs : s.inspector.outputs,
          },
        })),
      closeInspector: () => set((s) => ({ inspector: { ...s.inspector, visible: false } })),
      setBaModel: (m) => set((s) => ({ inspector: { ...s.inspector, baModel: m } })),

      spectrumScale: 'linear',
      setSpectrumScale: (m) => set({ spectrumScale: m }),

      spectrumHover: null,
      setSpectrumHover: (h) => set({ spectrumHover: h }),

      nodeActivity: {},
      decayActivity: () =>
        set((s) => {
          const out: Record<string, number> = {};
          const a = 0.92; // коефіцієнт розпаду на кадр/тик
          for (const [id, v] of Object.entries(s.nodeActivity)) out[id] = v * a;
          return { nodeActivity: out };
        }),
      bumpActivity: (id) =>
        set((s) => {
          const v = (s.nodeActivity[id] ?? 0) + 1;
          return { nodeActivity: { ...s.nodeActivity, [id]: v } };
        }),

      injectData: (vec) => {
        const { N, runtime } = get();
        if (!runtime) return;

        set(() => ({ lastInput: { ...vec } }));
        const now = get().simTime;

        for (let i = 0; i < N; i++) {
          const nodeId = `src${i}`;
          const value = vec[nodeId] ?? { re: 0, im: 0 };
          runtime.emitFrom(nodeId, 'out', {
            id: runtime.nextTokenId(),
            value,
            t: now,
            originT: now,
          });
        }
        get().resetMetrics();
        set({ nodeDataCache: {} });
      },

      // Старі вбудовані пресети тепер використовують injectData
      applyPreset(preset) {
        const vec = makePreset(get().N, preset);
        get().injectData(vec);
      },

      // --- ЛОГІКА КАСТОМНИХ ПРЕСЕТІВ ---
      customPresets: [],
      setCustomPresets: (ps) => set({ customPresets: ps }),
      addCustomPreset: (p) => set((s) => ({ customPresets: [...s.customPresets, p] })),
      updateCustomPreset: (id, p) => set((s) => ({
        customPresets: s.customPresets.map((x) => x.id === id ? p : x)
      })),
      deleteCustomPreset: (id) => set((s) => ({
        customPresets: s.customPresets.filter((x) => x.id !== id)
      })),
      applyCustomPreset: (id) => {
        const p = get().customPresets.find(x => x.id === id);
        if (p) get().injectData(p.data);
      },

      isPresetManagerOpen: false,
      setPresetManagerOpen: (v) => set({ isPresetManagerOpen: v }),

      mode: 'run',
      pauseOnFire: false,
      setMode: (m) => set({ mode: m }),
      setPauseOnFire: (v) => set({ pauseOnFire: v }),

      setActiveNode(id) {
        set({ activeNodeId: id });
      },

      setLastInput(id, v) {
        set((st) => ({ lastInput: { ...st.lastInput, [id]: v } }));
      },
      setSinkValue(id, s) {
        set((st) => ({ sinks: { ...st.sinks, [id]: s } }));
      },
      setMismatches(m) {
        set({ mismatches: m });
      },

      addEdgeToken(edgeId, delay, id, value) {
        const t0 = get().simTime; // ← єдиний годинник
        set((state) => {
          const arr = state.tokensByEdge[edgeId] ?? [];
          return { tokensByEdge: { ...state.tokensByEdge, [edgeId]: [...arr, { id, t0, delay, value }] } };
        });
      },
      removeEdgeToken(edgeId, id) {
        set((state) => {
          const arr = state.tokensByEdge[edgeId] ?? [];
          return { tokensByEdge: { ...state.tokensByEdge, [edgeId]: arr.filter((t) => t.id !== id) } };
        });
      },

      setGraph(g) {
        const mkRuntime = (gg: Graph) =>
          new DataflowRuntime(
            gg,
            {
              onToken: (edge, token) => {
                const v = token.value as { re?: number; im?: number } | undefined;
                const complex =
                  typeof v?.re === 'number' && typeof v?.im === 'number'
                    ? (v as { re: number; im: number })
                    : undefined;
                get().addEdgeToken(edge.id, edge.delay ?? 0, token.id, complex);
              },
              onFire: (node) => {
                get().onNodeFireForMetrics();
                get().bumpActivity(node.id);
                set((s) => ({ firesTotal: s.firesTotal + 1 }));
                get().setActiveNode(node.id);
                get().addEventLog({ kind: 'fire', label: `${node.kind} · ${node.id}`, simTime: get().simTime });
                if (get().pauseOnFire && get().running) {
                  get().stop();
                }
                setTimeout(() => {
                  if (get().activeNodeId === node.id) get().setActiveNode(null);
                }, 180);
              },
              onBeforeFire: (node, inputs) => {
                const tw = node.params?.twiddle ?? null;

                set((s) => ({
                  nodeDataCache: {
                    ...s.nodeDataCache,
                    [node.id]: { ...s.nodeDataCache[node.id], inputs },
                  },
                }));

                get().openInspector({
                  nodeId: node.id,
                  kind: node.kind,
                  twiddle: tw,
                });

                get().bumpActivity(node.id);
                if (get().pauseOnFire && get().running) {
                  get().stop();
                }
              },
              onOutput: (node, outputs) => {
                set((s) => ({
                  nodeDataCache: {
                    ...s.nodeDataCache,
                    [node.id]: { ...s.nodeDataCache[node.id], outputs: outputs as any },
                  },
                }));

                if (node.kind !== 'sink') return;

                if (startClickTime !== null && !startMeasurementDone) {
                  const delta = performance.now() - startClickTime;
                  // Це час критичного шляху графа (simTime ≈ real-time при speed=1).
                  // Для DFT4x4: edge 600×4 + DFT4 400×2 + twiddle 200 = ~3400 мс.
                  // Не є показником UI-відгуку — для NF2 дивіться лог [NF2] вище.
                  console.log(`[КРИТИЧНИЙ ШЛЯХ] Час до першого результату (persh onOutput): ${delta.toFixed(2)} мс`);
                  startMeasurementDone = true;
                }

                const first = Object.values(outputs)[0] as Token | undefined;
                if (!first) return;

                const born = typeof first.originT === 'number' ? first.originT : first.t;
                const now = get().simTime;
                const lat = Math.max(0, now - born);

                set((s) => ({
                  metrics: {
                    ...s.metrics,
                    latencyEmaMs:
                      s.metrics.latencyEmaMs === 0
                        ? lat
                        : s.metrics.latencyAlpha * lat + (1 - s.metrics.latencyAlpha) * s.metrics.latencyEmaMs,
                  },
                }));

                get().onTokenReachedSinkForMetrics(); // ← тут рахуємо throughput
                get().addEventLog({ kind: 'output', label: `${node.id} ← ${JSON.stringify(first.value)}`, simTime: get().simTime });

                const val = JSON.stringify(first.value);
                get().setSinkValue(node.id, val);
                const ins = get().inspector;
                if (ins.visible && ins.nodeId === node.id) {
                  set((s) => ({ inspector: { ...s.inspector, outputs: outputs as any } }));
                }
              },
            },
            () => get().simTime,
          );
        const cp = computeCriticalPath(g);
        set({
          graph: g,
          runtime: mkRuntime(g),
          mismatches: {},
          tokensByEdge: {},
          sinks: {},
          nodeDataCache: {},
          criticalPathNodeIds: cp.nodeIds,
          criticalPathEdgeIds: cp.edgeIds,
          eventLog: [],
        });
      },

      addEdgeToGraph(p) {
        const g = get().graph;
        const next: Graph = { ...g, edges: [...g.edges, { id: nanoid(), from: p.from, to: p.to, delay: 60 }] };
        get().setGraph(next);
      },

      tickSimTime() {
        const now = performance.now();
        let dt = 0;
        set((s) => {
          if (!s.running || s.lastWall == null) return s;
          dt = (now - s.lastWall) * s.speed;
          return { simTime: s.simTime + dt, lastWall: now };
        });

        // ─── NF2: час відгуку UI ──────────────────────────────────────────────
        // Логується один раз на першому кадрі анімаційного циклу після кліку
        // «Пуск». Вимірює затримку браузерного event-loop + requestAnimationFrame
        // (не залежить від затримок у графі). Очікуване значення: 10–50 мс.
        if (startClickTime !== null && !startUiResponseDone) {
          const uiDelta = now - startClickTime;
          console.log(`[NF2] Час відгуку UI (перший тік rAF): ${uiDelta.toFixed(2)} мс`);
          startUiResponseDone = true;
        }

        return dt; // щоб GraphView знав, наскільки крокнути runtime
      },

      start() {
        startClickTime = performance.now();
        startMeasurementDone = false;
        startUiResponseDone = false; // скидаємо перед кожним запуском
        set({
          running: true,
          lastWall: performance.now(),
        });
        get().resetMetrics();
      },

      stop() {
        const t0 = performance.now();
        set((s) =>
          s.lastWall == null
            ? { running: false }
            : { running: false, simTime: s.simTime + (t0 - s.lastWall) * s.speed, lastWall: null },
        );
        requestAnimationFrame(() =>
          console.log(`[NF2] Пауза (rAF): ${(performance.now() - t0).toFixed(2)} мс`),
        );
        // get().resetMetrics();
      },
      step() {
        const t0 = performance.now();
        const dt = 16 * get().speed;
        set((s) => ({ simTime: s.simTime + dt })); // ← посунути логічний час
        get().runtime?.tick(dt);
        requestAnimationFrame(() =>
          console.log(`[NF2] Крок (rAF): ${(performance.now() - t0).toFixed(2)} мс`),
        );
      },

      reset() {
        const t0 = performance.now();
        startClickTime = null;
        startMeasurementDone = false;
        startUiResponseDone = false;
        get().stop();
        get().setGraph(get().graph);
        set({ simTime: 0, firesTotal: 0, nodeActivity: {}, lastWall: null });
        get().resetMetrics();
        requestAnimationFrame(() =>
          console.log(`[NF2] Скидання (rAF): ${(performance.now() - t0).toFixed(2)} мс`),
        );
      },

      updateNodeLatency(nodeId, latency) {
        get().runtime?.updateNodeLatency(nodeId, latency);
        set((s) => ({
          graph: {
            ...s.graph,
            nodes: s.graph.nodes.map((n) => (n.id === nodeId ? { ...n, latency } : n)),
          },
        }));
      },

      updateEdgeDelay(edgeId, delay) {
        get().runtime?.updateEdgeDelay(edgeId, delay);
        set((s) => ({
          graph: {
            ...s.graph,
            edges: s.graph.edges.map((e) => (e.id === edgeId ? { ...e, delay } : e)),
          },
        }));
      },
    }),
    { name: 'dataflow-sim' },
  ),
);
