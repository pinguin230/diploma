'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import GraphView from '@/graph/GraphView';
import { useSimStore } from '@/store/simStore';
import PresetManager from '@/components/PresetManager';
import Header from '@/components/shell/Header';
import Sidebar from '@/components/shell/Sidebar';
import Toolbar from '@/components/shell/Toolbar';
import HeatmapLegend from '@/components/shell/HeatmapLegend';
import { ToastHost, useToasts } from '@/components/shell/Toast';
import { AppErrorBoundary } from '@/components/shell/ErrorBoundary';
import OnboardingTour from '@/components/shell/OnboardingTour';
import { useUrlSync } from '@/hooks/useUrlSync';
import s from '@/styles/app.module.scss';
import '@xyflow/react/dist/style.css';

export default function AppShell() {
  const setPresetManagerOpen = useSimStore((st) => st.setPresetManagerOpen);
  const { toasts, push } = useToasts();

  useUrlSync();

  return (
    <ReactFlowProvider>
      <TooltipProvider delayDuration={150}>
        <div className={s.shell}>
          <Header />
          <main className={s.canvas}>
            <AppErrorBoundary>
              <GraphView />
            </AppErrorBoundary>
            <HeatmapLegend />
          </main>
          <AppErrorBoundary>
            <Sidebar />
          </AppErrorBoundary>
          <Toolbar onOpenPresets={() => setPresetManagerOpen(true)} onToast={push} />
        </div>
        <AppErrorBoundary>
          <PresetManager />
        </AppErrorBoundary>
        <ToastHost toasts={toasts} />
        <OnboardingTour />
      </TooltipProvider>
    </ReactFlowProvider>
  );
}
