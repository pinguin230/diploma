'use client';

import { useCallback } from 'react';
import {
  Play,
  Pause,
  StepForward,
  Move,
  Gauge,
  GitCompare,
  Maximize,
  Settings2,
  Zap,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import { useHotkeys } from 'react-hotkeys-hook';
import { useReactFlow } from '@xyflow/react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { useSimStore } from '@/store/simStore';
import { compareWithFFT } from '@/utils/compare';
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
] as const;

export default function Toolbar({ onOpenPresets, onToast }: ToolbarProps) {
  const rf = useReactFlow();

  const { running, start, stop, step, mode, setMode, speed, setSpeed } = useSimStore(
    useShallow((st) => ({
      running: st.running,
      start: st.start,
      stop: st.stop,
      step: st.step,
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

  const toggleRun = useCallback(() => {
    if (useSimStore.getState().running) stop();
    else start();
  }, [start, stop]);

  const doCompare = useCallback(() => {
    const st = useSimStore.getState();
    const { mismatches } = compareWithFFT(st.graph, st.lastInput, st.sinks, 1e-9);
    setMismatches(mismatches);
    const count = Object.keys(mismatches).length;
    onToast?.(count === 0 ? '✓ Spectrum matches reference FFT' : `⚠ ${count} bins differ`);
  }, [setMismatches, onToast]);

  const doFit = useCallback(() => {
    rf.fitView({ padding: 0.15, duration: 300 });
  }, [rf]);

  const hkOpts = { enableOnFormTags: false as const };
  useHotkeys('space', (e) => { e.preventDefault(); toggleRun(); }, hkOpts, [toggleRun]);
  useHotkeys('s', () => step(), hkOpts, [step]);
  useHotkeys('r', doFit, hkOpts, [doFit]);
  useHotkeys('c', doCompare, hkOpts, [doCompare]);
  useHotkeys('m', () => setMode(useSimStore.getState().mode === 'run' ? 'single-fire' : 'run'), hkOpts, [setMode]);
  useHotkeys('p', onOpenPresets, hkOpts, [onOpenPresets]);

  const applyPresetId = (id: string) => {
    const st = useSimStore.getState();
    if (BUILTIN_PRESETS.some((p) => p.id === id)) {
      st.applyPreset(id as any);
      onToast?.(`Preset applied: ${BUILTIN_PRESETS.find((p) => p.id === id)?.label}`);
    } else if (id.startsWith('custom:')) {
      const cid = id.slice('custom:'.length);
      st.applyCustomPreset(cid);
      const name = customPresets.find((p) => p.id === cid)?.name ?? 'custom';
      onToast?.(`Preset applied: ${name}`);
    }
  };

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
          max={4}
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
      </div>
    </div>
  );
}
