# / Project Overview

This is a specialized Next.js application designed for the **Simulation and Visualization of Radix-2 FFT (Fast Fourier Transform) Graphs**. It employs a dataflow-based execution model where data "tokens" flow through a graph of processing nodes (Butterfly, Source, Sink, etc.).

The project serves as an educational and research tool to observe how the Decimation-In-Frequency (DIF) Radix-2 algorithm operates in a distributed, asynchronous manner.

### Main Technologies
- **Framework:** Next.js 16+ (App Router), React 19.
- **Graph Visualization:** `@xyflow/react` (React Flow) for rendering the butterfly network.
- **State Management:** `Zustand` for simulation state and UI coordination.
- **Signal Processing:** `mathjs`, `fft.js` for verification and spectrum analysis.
- **Simulation Engine:** Custom Dataflow Runtime (`src/core`) supporting node latency, edge delays, and token-based scheduling.
- **Animation:** `motion` (Framer Motion) for UI interactions.
- **Web Workers:** `comlink` for offloading intensive simulation tasks.

### Architecture
- **`src/core`**: The heart of the simulation. Contains the `DataflowRuntime` that manages the execution of nodes and token queues.
- **`src/graph`**: Components and logic for the graph UI, including custom node types (`ButterflyNode`, `SourceNode`, `SinkNode`) and layout algorithms.
- **`src/store`**: Zustand stores (`simStore.ts`) managing the simulation lifecycle, metrics, and parameters.
- **`src/workers`**: Web worker logic for running the simulation off the main thread.
- **`src/components`**: UI components like `SpectrumView`, `Metrics`, and `NodeInspector`.

# Building and Running

The project uses `npm` as the package manager.

*   **Install dependencies:** `npm install`
*   **Run development server:** `npm run dev` (Default: `http://localhost:3000`)
*   **Build for production:** `npm run build`
*   **Start production server:** `npm run start`
*   **Run linter:** `npm run lint`
*   **Run tests:** `npm test` or `npx vitest` (Inferred from `package.json` devDependencies)

# Development Conventions

*   **Git Hooks:** `husky` and `lint-staged` are configured to run linting and formatting before commits.
*   **Language:** TypeScript (strict mode enabled).
*   **Styling:** Global CSS (`src/app/globals.css`), CSS Modules (`src/app/page.module.css`), and SASS (`sass` dependency present).
*   **Linting:** ESLint with `next/core-web-vitals` and `typescript-eslint`. Prettier is also configured.
*   **Code Structure:**
    - Use Functional Components and Hooks.
    - Simulation logic should remain separated from the UI in `src/core`.
    - Use `useSimStore` for shared simulation state.
*   **Testing:** Vitest and React Testing Library for unit and component testing.
*   **Performance:** Offload heavy simulation logic to Web Workers using `comlink`.
