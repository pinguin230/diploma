'use client';

import { useEffect } from 'react';
import { useSimStore } from '@/store/simStore';

const BUILTIN_IDS = ['impulse', 'two-impulses', 'ramp', 'sin1', 'sin3', 'sin1+3'] as const;
type BuiltinPreset = (typeof BUILTIN_IDS)[number];

function isBuiltin(id: string): id is BuiltinPreset {
  return (BUILTIN_IDS as readonly string[]).includes(id);
}

export function useUrlSync() {
  const applyPreset = useSimStore((s) => s.applyPreset);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const params = new URLSearchParams(hash);
      const presetId = params.get('preset');
      if (presetId && isBuiltin(presetId)) {
        // Delay to let the graph initialise first
        const id = setTimeout(() => applyPreset(presetId), 600);
        return () => clearTimeout(id);
      }
    } catch {
      /* malformed hash — ignore */
    }
  }, [applyPreset]);
}

export function setPresetHash(presetId: string) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams({ preset: presetId });
  window.history.replaceState(null, '', `#${params.toString()}`);
}

export function clearPresetHash() {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', window.location.pathname);
}

export async function copyShareUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch {
    /* permission denied — no-op */
  }
}
