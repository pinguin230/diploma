import GraphView from "@/graph/GraphView";
import s from '@/styles/app.module.scss';
import {ReactFlowProvider} from "@xyflow/react";
import {TooltipProvider} from "@radix-ui/react-tooltip";
import '@xyflow/react/dist/style.css';

export default function Home() {
  return (
      <ReactFlowProvider>
        <TooltipProvider delayDuration={150}>
          <div className={s.app}>
            <header className={s.header}>
              <h1>Dataflow FFT Simulator</h1>
            </header>
            <GraphView />
          </div>
        </TooltipProvider>
      </ReactFlowProvider>
  );
}
