'use client';

import { useMemo, useRef, useState } from 'react';
import { evaluate } from 'mathjs';
import { nanoid } from 'nanoid';
import { Download, Upload, Plus, X, Play, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useSimStore, CustomPreset } from '@/store/simStore';
import PresetSignalPreview from '@/components/PresetSignalPreview';
import pm from '@/styles/preset.module.scss';
import ui from '@/styles/ui.module.scss';

type EditMode = 'formula' | 'grid';

const EMPTY_DATA = () => {
  const d: Record<string, { re: number; im: number }> = {};
  for (let i = 0; i < 16; i++) d[`src${i}`] = { re: 0, im: 0 };
  return d;
};

function evalExpr(expr: string, n: number): number {
  const scope = { n, N: 16, pi: Math.PI, Pi: Math.PI };
  const result = evaluate(expr, scope);
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Expression must evaluate to a finite number');
  }
  return result;
}

function applyFormula(reExpr: string, imExpr: string) {
  const out: Record<string, { re: number; im: number }> = {};
  for (let n = 0; n < 16; n++) {
    out[`src${n}`] = {
      re: reExpr.trim() ? evalExpr(reExpr, n) : 0,
      im: imExpr.trim() ? evalExpr(imExpr, n) : 0,
    };
  }
  return out;
}

export default function PresetManager() {
  const isOpen = useSimStore((s) => s.isPresetManagerOpen);
  const close = () => useSimStore.getState().setPresetManagerOpen(false);

  const customPresets = useSimStore((s) => s.customPresets);
  const {
    addCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
    setCustomPresets,
    applyCustomPreset,
  } = useSimStore.getState();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editData, setEditData] = useState<Record<string, { re: number; im: number }>>(EMPTY_DATA);
  const [mode, setMode] = useState<EditMode>('formula');
  const [reExpr, setReExpr] = useState('cos(2*pi*n/16)');
  const [imExpr, setImExpr] = useState('sin(2*pi*n/16)');
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewedData = useMemo(() => {
    if (mode === 'grid') return editData;
    try {
      const next = applyFormula(reExpr, imExpr);
      return next;
    } catch {
      return editData;
    }
  }, [mode, editData, reExpr, imExpr]);

  if (!isOpen) return null;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(customPresets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dft_presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json)) setCustomPresets(json);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const startCreate = () => {
    setEditData(EMPTY_DATA());
    setEditName('New Preset');
    setEditingId(null);
    setMode('formula');
    setReExpr('cos(2*pi*n/16)');
    setImExpr('sin(2*pi*n/16)');
    setFormulaError(null);
    setView('edit');
  };

  const startEdit = (preset: CustomPreset) => {
    setEditData(JSON.parse(JSON.stringify(preset.data)));
    setEditName(preset.name);
    setEditingId(preset.id);
    setMode('grid');
    setFormulaError(null);
    setView('edit');
  };

  const savePreset = () => {
    let data = editData;
    if (mode === 'formula') {
      try {
        data = applyFormula(reExpr, imExpr);
        setFormulaError(null);
      } catch (err: any) {
        setFormulaError(err.message ?? 'Invalid expression');
        return;
      }
    }

    if (editingId) {
      updateCustomPreset(editingId, { id: editingId, name: editName, data });
    } else {
      addCustomPreset({ id: nanoid(), name: editName, data });
    }
    setView('list');
  };

  const updateCell = (src: string, field: 're' | 'im', val: string) => {
    setEditData((prev) => ({
      ...prev,
      [src]: { ...prev[src], [field]: parseFloat(val) || 0 },
    }));
  };

  const applyFormulaToGrid = () => {
    try {
      const next = applyFormula(reExpr, imExpr);
      setEditData(next);
      setFormulaError(null);
      setMode('grid');
    } catch (err: any) {
      setFormulaError(err.message ?? 'Invalid expression');
    }
  };

  return (
    <div className={pm.overlay} onClick={close}>
      <div className={pm.modal} onClick={(e) => e.stopPropagation()}>
        <header className={pm.header}>
          <h2>{view === 'list' ? 'Preset manager' : editingId ? 'Edit preset' : 'New preset'}</h2>
          <button
            type="button"
            className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
            onClick={close}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        {view === 'list' && (
          <>
            <div className={pm.body}>
              <div className={pm.toolbar}>
                <button type="button" className={clsx(ui.btn, ui.btnPrimary)} onClick={startCreate}>
                  <Plus size={14} /> Create
                </button>
                <button type="button" className={ui.btn} onClick={handleExport}>
                  <Upload size={14} /> Export
                </button>
                <button type="button" className={ui.btn} onClick={() => fileInputRef.current?.click()}>
                  <Download size={14} /> Import
                </button>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </div>

              {customPresets.length === 0 ? (
                <div className={pm.empty}>No custom presets yet. Click “Create” to build one.</div>
              ) : (
                <div className={pm.list}>
                  {customPresets.map((p) => (
                    <div key={p.id} className={pm.listItem}>
                      <span className={pm.name}>{p.name}</span>
                      <div className={pm.actions}>
                        <button
                          type="button"
                          className={clsx(ui.btn, ui.btnSuccess)}
                          onClick={() => {
                            applyCustomPreset(p.id);
                            close();
                          }}
                        >
                          <Play size={12} /> Run
                        </button>
                        <button
                          type="button"
                          className={ui.btn}
                          onClick={() => startEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className={clsx(ui.btn, ui.btnDanger)}
                          onClick={() => deleteCustomPreset(p.id)}
                          aria-label="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'edit' && (
          <>
            <div className={pm.body}>
              <label>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Name
                </div>
                <input
                  className={ui.input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. chirp 0..8"
                />
              </label>

              <div className={pm.tabs}>
                <button
                  type="button"
                  className={clsx(mode === 'formula' && pm.active)}
                  onClick={() => setMode('formula')}
                >
                  Formula
                </button>
                <button
                  type="button"
                  className={clsx(mode === 'grid' && pm.active)}
                  onClick={() => setMode('grid')}
                >
                  Grid
                </button>
              </div>

              {mode === 'formula' && (
                <div className={pm.formulaEditor}>
                  <div className={pm.formulaHint}>
                    Variable <code>n</code> ranges 0..15. Use math functions:{' '}
                    <code>sin</code>, <code>cos</code>, <code>exp</code>, <code>sqrt</code>,{' '}
                    <code>pi</code>. Example:{' '}
                    <code>cos(2*pi*n/16)</code>
                  </div>
                  <div className={pm.formulaRow}>
                    <label>Re(n) =</label>
                    <input
                      className={ui.input}
                      value={reExpr}
                      onChange={(e) => setReExpr(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div className={pm.formulaRow}>
                    <label>Im(n) =</label>
                    <input
                      className={ui.input}
                      value={imExpr}
                      onChange={(e) => setImExpr(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  {formulaError && <div className={pm.error}>{formulaError}</div>}
                  <button type="button" className={ui.btn} onClick={applyFormulaToGrid}>
                    Bake into grid
                  </button>
                </div>
              )}

              {mode === 'grid' && (
                <div className={pm.gridEditor}>
                  <div className={pm.gridHeader}>Node</div>
                  <div className={pm.gridHeader}>Re</div>
                  <div className={pm.gridHeader}>Im</div>
                  {Array.from({ length: 16 }).map((_, i) => {
                    const key = `src${i}`;
                    const val = editData[key] ?? { re: 0, im: 0 };
                    return (
                      <div key={key} style={{ display: 'contents' }}>
                        <div className={pm.gridCell}>{key}</div>
                        <input
                          className={pm.gridInput}
                          type="number"
                          step="any"
                          value={val.re}
                          onChange={(e) => updateCell(key, 're', e.target.value)}
                        />
                        <input
                          className={pm.gridInput}
                          type="number"
                          step="any"
                          value={val.im}
                          onChange={(e) => updateCell(key, 'im', e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={pm.preview}>
                <PresetSignalPreview data={previewedData} />
                <div className={pm.caption}>
                  <span>Signal preview</span>
                  <span className={pm.legend}>
                    <span className={pm.re}>Re</span>
                    <span className={pm.im}>Im</span>
                  </span>
                </div>
              </div>
            </div>
            <footer className={pm.footer}>
              <button type="button" className={ui.btn} onClick={() => setView('list')}>
                Cancel
              </button>
              <button type="button" className={clsx(ui.btn, ui.btnPrimary)} onClick={savePreset}>
                Save preset
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
