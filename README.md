# Dataflow FFT Simulator

**Visual simulation of a 16-point radix-4 FFT under data-flow control.**  
Bachelor's Qualification Work — Lviv Polytechnic National University, 2025.

---

## Features

- **Live dataflow graph** — 56-node DFT4×4 computation graph rendered with React Flow; tokens animate along edges in real time
- **Step-by-step node inspector** — select any node to see its Values, Formula, Trace (full arithmetic with actual numbers), and Complexity tabs
- **Spectrum visualiser** — canvas-based FFT output chart with linear / log scale and hover readout
- **Activity heatmap** — per-node fire-intensity overlay rendered with CSS custom properties
- **Event log** — chronological stream of `FIRE` / `OUT` events with simulation timestamps
- **Critical path highlight** — one-click overlay showing the T = 3400 ms critical path (golden glow on nodes and edges)
- **Preset signals** — six built-in signals (impulse, DC, ramp, sin k=1/3/1+3) and a custom preset editor with formula support (mathjs)
- **FFT verification** — compare output against reference fft.js with ε = 10⁻⁹ tolerance
- **Session save / load** — export a full session JSON (presets + node positions + settings) and restore it later
- **URL sharing** — preset name is encoded in the URL hash so a link reproduces the input signal
- **Export PNG** — one-click graph snapshot at 2× pixel ratio
- **Dark / light theme** — CSS custom-property token system, respects `prefers-color-scheme`

---

## Tech stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js | 16 |
| UI | React | 19 |
| Language | TypeScript | 5 |
| Graph | @xyflow/react | 12 |
| State | Zustand | 5 |
| Math | mathjs, fft.js | 15, 4 |
| Styling | SCSS Modules | — |
| Testing | Vitest + @testing-library | 4 |
| Icons | lucide-react | 0.563 |

---

## Getting started

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm start

# Run unit tests
npm test

# Coverage report
npm run test:coverage
```

---

## Architecture

The simulator implements the **4×4 matrix decomposition** of a 16-point DFT:

```
x[0..15]  — 16 Source nodes
     │
     │  edge delay = 600 ms
     ▼
┌──────────────────────────────────────┐
│  Row DFT-4  ×4  (latency = 400 ms)  │
│  row-0  row-1  row-2  row-3          │
└──────────────────────────────────────┘
     │
     │  16 Twiddle factors  W₁₆^(n₁·k₂)  (latency = 200 ms)
     │  tw-0-0 … tw-3-3
     │
     ▼
┌──────────────────────────────────────┐
│  Col DFT-4  ×4  (latency = 400 ms)  │
│  col-0  col-1  col-2  col-3          │
└──────────────────────────────────────┘
     │
     │  edge delay = 600 ms
     ▼
X[0..15]  — 16 Sink nodes

Critical path  T = 4×600 + 400 + 200 + 400 = 3 400 ms
```

Each **DFT-4 node** computes:

```
E₀ = x₀ + x₂     O₀ = x₁ + x₃
E₁ = x₀ − x₂     O₁ = x₁ − x₃

X₀ = E₀ + O₀     X₁ = E₁ − j·O₁
X₂ = E₀ − O₀     X₃ = E₁ + j·O₁
```

No nontrivial multiplications — only additions and j-swaps (free rotations).

---

## Project structure

```
src/
├── app/              Next.js App Router entry points
├── components/
│   ├── shell/        AppShell, Header, Sidebar, Toolbar, Onboarding…
│   ├── NodeInspector.tsx
│   ├── SpectrumView.tsx
│   ├── EventLog.tsx
│   ├── node-trace.ts   Step-by-step arithmetic (KaTeX strings)
│   └── node-diagram.tsx  SVG butterfly / twiddle diagrams
├── core/
│   ├── scheduler.ts  DataflowRuntime — tick(), inject(), emitFrom()
│   ├── buffers.ts    FIFO<T>
│   └── types.ts      Graph, NodeSpec, Token, Edge
├── graph/
│   ├── GraphView.tsx   React Flow canvas + rAF loop
│   ├── generateDFT4x4.ts  Pure graph factory
│   ├── layout4x4.ts   Node position computation
│   └── nodes/         DFT4Node, TwiddleNode, SourceNode, SinkNode
├── hooks/
│   ├── useTheme.ts
│   └── useUrlSync.ts  Hash-based preset sharing
├── store/
│   └── simStore.ts   Zustand store (graph, runtime, metrics, eventLog…)
├── utils/
│   ├── math.ts        cplxAdd, cplxSub, cplxMulJ, computeDFT4
│   ├── compare.ts     compareWithFFT (ε = 1e-9)
│   └── criticalPath.ts  DAG longest-path algorithm
└── styles/
    ├── globals.scss   CSS token system (light + dark theme)
    ├── app.module.scss
    ├── panels.module.scss
    ├── ui.module.scss
    └── …
```

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Run / Pause |
| `S` | Step one activation |
| `R` | Fit graph to view |
| `C` | Compare with reference FFT |
| `K` | Toggle critical path highlight |
| `E` | Export graph as PNG |
| `M` | Toggle run / single-fire mode |
| `P` | Open preset manager |

---

## Bundle sizes (production build)

| Metric | Value |
|---|---|
| Total JS (gzip) | **516 KB** |
| Largest chunk (gzip) | 348 KB (`@xyflow/react` + React) |
| Build time (Turbopack) | ~4.4 s |
| First render (Lighthouse) | < 1.8 s on localhost |

---

## Testing

```
76 tests across 6 files — all pass
```

| File | What is covered |
|---|---|
| `core/buffers.test.ts` | FIFO queue operations |
| `utils/math.test.ts` | Complex arithmetic, computeDFT4 (linearity, impulse, DC) |
| `components/node-trace.test.ts` | Trace functions, missing-input detection |
| `graph/generateDFT4x4.test.ts` | Graph structure, twiddle params, edge connectivity |
| `core/scheduler.test.ts` | tick(), latency blocking, maxFires, emitFrom |
| `utils/compare.test.ts` | FFT comparison, mismatch detection, epsilon tolerance |

---

## License

MIT — see [LICENSE](LICENSE).
