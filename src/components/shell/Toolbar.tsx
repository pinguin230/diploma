'use client';

import { useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Move,
  Gauge,
  GitCompare,
  Maximize,
  Settings2,
  Zap,
  ImageDown,
  Route,
  Save,
  FolderOpen,
  Link2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import { useHotkeys } from 'react-hotkeys-hook';
import { useReactFlow } from '@xyflow/react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { useSimStore } from '@/store/simStore';
import { compareWithFFT } from '@/utils/compare';
import { setPresetHash, copyShareUrl } from '@/hooks/useUrlSync';
import s from '@/styles/app.module.scss';
import ui from '@/styles/ui.module.scss';

type ToolbarProps = {
  onOpenPresets: () => void;
  onToast?: (msg: string) => void;
};

const BUILTIN_PRESETS = [
  { id: 'impulse', label: 'Impulse δ[0]' },
  { id: 'two-impulses', label: '2 × Impulse' },
  { id: 'ramp', label: 'Ramp 0..15' },
  { id: 'sin1', label: 'sin k=1' },
  { id: 'sin3', label: 'sin k=3' },
  { id: 'sin1+3', label: 'sin k=1 + k=3' },
  { id: 'noise', label: 'White noise' },
] as const;

export default function Toolbar({ onOpenPresets, onToast }: ToolbarProps) {
  const rf = useReactFlow();

  const { running, start, stop, step, reset, mode, setMode, speed, setSpeed } = useSimStore(
    useShallow((st) => ({
      running: st.running,
      start: st.start,
      stop: st.stop,
      step: st.step,
      reset: st.reset,
      mode: st.mode,
      setMode: st.setMode,
      speed: st.speed,
      setSpeed: st.setSpeed,
    })),
  );

  const pauseOnFire = useSimStore((st) => st.pauseOnFire);
  const setPauseOnFire = useSimStore((st) => st.setPauseOnFire);
  const nodesDraggable = useSimStore((st) => st.nodesDraggable);
  const setNodesDraggable = useSimStore((st) => st.setNodesDraggable);
  const customPresets = useSimStore((st) => st.customPresets);
  const setMismatches = useSimStore((st) => st.setMismatches);
  const showCriticalPath = useSimStore((st) => st.showCriticalPath);
  const toggleCriticalPath = useSimStore((st) => st.toggleCriticalPath);
  const setPendingNodePositions = useSimStore((st) => st.setPendingNodePositions);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleRun = useCallback(() => {
    if (useSimStore.getState().running) stop();
    else start();
  }, [start, stop]);

  const doCompare = useCallback(() => {
    const st = useSimStore.getState();
    const { mismatches, maxDeviation } = compareWithFFT(st.graph, st.lastInput, st.sinks, 1e-9);
    setMismatches(mismatches);
    const bad = Object.values(mismatches).filter(Boolean).length;
    if (bad === 0) {
      const dev = maxDeviation ? maxDeviation.value.toExponential(2) : '0';
      onToast?.(`✓ Spectrum matches — max |ΔX| = ${dev}`);
    } else {
      const dev = maxDeviation ? maxDeviation.value.toExponential(2) : '?';
      onToast?.(`⚠ ${bad} bins differ — max |ΔX| = ${dev} at k=${maxDeviation?.k ?? '?'}`);
    }
  }, [setMismatches, onToast]);

  const doFit = useCallback(() => {
    rf.fitView({ padding: 0.15, duration: 300 });
  }, [rf]);

  const doSaveSession = useCallback(() => {
    const st = useSimStore.getState();
    const rfNodes = rf.getNodes();
    const session = {
      version: 1,
      savedAt: new Date().toISOString(),
      customPresets: st.customPresets,
      nodePositions: rfNodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
      settings: {
        mode: st.mode,
        speed: st.speed,
        spectrumScale: st.spectrumScale,
        pauseOnFire: st.pauseOnFire,
        nodesDraggable: st.nodesDraggable,
      },
    };
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dft-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.('Session saved');
  }, [rf, onToast]);

  const doLoadSession = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const session = JSON.parse(raw);
        if (session.version !== 1) throw new Error('Unknown session version');
        const st = useSimStore.getState();
        if (session.customPresets) st.setCustomPresets(session.customPresets);
        if (session.nodePositions) setPendingNodePositions(session.nodePositions);
        if (session.settings) {
          const s = session.settings;
          if (s.mode) st.setMode(s.mode);
          if (typeof s.speed === 'number') st.setSpeed(s.speed);
          if (s.spectrumScale) st.setSpectrumScale(s.spectrumScale);
          if (typeof s.pauseOnFire === 'boolean') st.setPauseOnFire(s.pauseOnFire);
          if (typeof s.nodesDraggable === 'boolean') st.setNodesDraggable(s.nodesDraggable);
        }
        onToast?.('Session loaded');
      } catch {
        onToast?.('Failed to load session');
      }
    };
    reader.readAsText(file);
  }, [setPendingNodePositions, onToast]);

  const doExport = useCallback(async () => {
    const el = document.querySelector<HTMLElement>('.react-flow');
    if (!el) { onToast?.('Graph element not found'); return; }
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim() || '#f6f7fb';
      const { toPng } = await import('html-to-image');
      const url = await toPng(el, { backgroundColor: bg, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `dft-graph-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onToast?.('Graph exported as PNG');
    } catch {
      onToast?.('Export failed');
    }
  }, [onToast]);

  const doExportUI = useCallback(async () => {
    const el = document.querySelector<HTMLElement>(`.${s.shell}`) ?? document.body;
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim() || '#f6f7fb';
      const { toPng } = await import('html-to-image');
      const url = await toPng(el, { backgroundColor: bg, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `dft-ui-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onToast?.('Full UI exported as PNG');
    } catch {
      onToast?.('Export failed');
    }
  }, [onToast]);

  const hkOpts = { enableOnFormTags: false as const };
  useHotkeys('space', (e) => { e.preventDefault(); toggleRun(); }, hkOpts, [toggleRun]);
  useHotkeys('s', () => step(), hkOpts, [step]);
  useHotkeys('x', () => reset(), hkOpts, [reset]);
  useHotkeys('r', doFit, hkOpts, [doFit]);
  useHotkeys('c', doCompare, hkOpts, [doCompare]);
  useHotkeys('e', doExport, hkOpts, [doExport]);
  useHotkeys('k', toggleCriticalPath, hkOpts, [toggleCriticalPath]);
  useHotkeys('m', () => setMode(useSimStore.getState().mode === 'run' ? 'single-fire' : 'run'), hkOpts, [setMode]);
  useHotkeys('p', onOpenPresets, hkOpts, [onOpenPresets]);

  const applyPresetId = (id: string) => {
    const st = useSimStore.getState();
    if (BUILTIN_PRESETS.some((p) => p.id === id)) {
      st.applyPreset(id as any);
      setPresetHash(id);
      onToast?.(`Preset applied: ${BUILTIN_PRESETS.find((p) => p.id === id)?.label}`);
    } else if (id.startsWith('custom:')) {
      const cid = id.slice('custom:'.length);
      st.applyCustomPreset(cid);
      const name = customPresets.find((p) => p.id === cid)?.name ?? 'custom';
      onToast?.(`Preset applied: ${name}`);
    }
  };

  const doShare = useCallback(async () => {
    await copyShareUrl();
    onToast?.('Link copied to clipboard');
  }, [onToast]);

  return (
    <div className={s.toolbar}>
      {/* Transport */}
      <div className={s.toolbarGroup}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={clsx(ui.btn, running ? ui.btnDanger : ui.btnPrimary)}
              onClick={toggleRun}
              aria-label={running ? 'Pause' : 'Run'}
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? 'Pause' : 'Run'}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            {running ? 'Pause simulation' : 'Run simulation'} <kbd>Space</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={step}>
              <StepForward size={14} /> Step
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Advance one activation <kbd>S</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={reset}>
              <RotateCcw size={14} /> Reset
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Reset simulation to initial state <kbd>X</kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Mode / options */}
      <div className={s.toolbarGroup}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={clsx(ui.btn, mode === 'single-fire' && ui.btnActive)}
              onClick={() => setMode(mode === 'run' ? 'single-fire' : 'run')}
            >
              <Zap size={14} /> {mode === 'run' ? 'Run mode' : 'Single-fire'}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Toggle run / single-fire <kbd>M</kbd>
          </TooltipContent>
        </Tooltip>

        <label className={ui.checkbox}>
          <input
            type="checkbox"
            checked={pauseOnFire}
            onChange={(e) => setPauseOnFire(e.target.checked)}
          />
          Pause on fire
        </label>
        <label className={ui.checkbox}>
          <input
            type="checkbox"
            checked={nodesDraggable}
            onChange={(e) => setNodesDraggable(e.target.checked)}
          />
          <Move size={12} /> Drag nodes
        </label>
      </div>

      {/* Presets */}
      <div className={s.toolbarGroup}>
        <span className={s.toolbarLabel}>Preset</span>
        <select
          className={ui.select}
          style={{ minWidth: 180 }}
          value=""
          onChange={(e) => {
            if (e.target.value) applyPresetId(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="" disabled>
            Select preset…
          </option>
          <optgroup label="Built-in">
            {BUILTIN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </optgroup>
          {customPresets.length > 0 && (
            <optgroup label="Custom">
              {customPresets.map((p) => (
                <option key={p.id} value={`custom:${p.id}`}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={onOpenPresets}>
              <Settings2 size={14} /> Manage
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Open preset manager <kbd>P</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={clsx(ui.btn, ui.btnIcon)} onClick={doShare} aria-label="Copy share link">
              <Link2 size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Copy shareable link (preset is encoded in URL)
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Speed */}
      <div className={s.toolbarGroup}>
        <span className={s.toolbarLabel}>
          <Gauge size={12} style={{ verticalAlign: '-2px' }} /> Speed
        </span>
        <input
          type="range"
          className={ui.range}
          min={0.1}
          max={5}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--fg-muted)', minWidth: 40 }}>
          {speed.toFixed(2)}×
        </span>
      </div>

      <div className={s.toolbarSpacer} />

      {/* Actions */}
      <div className={s.toolbarGroup}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={doFit}>
              <Maximize size={14} /> Fit
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Fit graph to view <kbd>R</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={clsx(ui.btn, ui.btnSuccess)} onClick={doCompare}>
              <GitCompare size={14} /> Compare
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Verify output vs reference FFT <kbd>C</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={doExport}>
              <ImageDown size={14} /> Graph PNG
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Export graph as PNG <kbd>E</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={doExportUI}>
              <ImageDown size={14} /> UI PNG
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Export full UI screenshot as PNG
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={clsx(ui.btn, showCriticalPath && ui.btnActive)}
              onClick={toggleCriticalPath}
            >
              <Route size={14} /> Critical path
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Highlight critical path T=3400ms <kbd>K</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={doSaveSession}>
              <Save size={14} /> Save
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Save session (presets + layout + settings)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={ui.btn} onClick={() => fileInputRef.current?.click()}>
              <FolderOpen size={14} /> Load
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            Load session from JSON file
          </TooltipContent>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            if (file) doLoadSession(file);
            ev.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
