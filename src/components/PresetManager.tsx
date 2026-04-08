'use client';

// components/PresetManager.tsx
import { useState, useRef } from 'react';
import { useSimStore, CustomPreset } from '@/store/simStore';
import { nanoid } from 'nanoid';

export default function PresetManager() {
  const isOpen = useSimStore((s) => s.isPresetManagerOpen);
  const close = () => useSimStore.getState().setPresetManagerOpen(false);

  const customPresets = useSimStore((s) => s.customPresets);
  const { addCustomPreset, updateCustomPreset, deleteCustomPreset, setCustomPresets, applyCustomPreset } = useSimStore.getState();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editData, setEditData] = useState<Record<string, {re: number, im: number}>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- Експорт / Імпорт JSON ---
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
        if (Array.isArray(json)) {
          setCustomPresets(json); // Базова перевірка. У продакшені варто додати валідацію схеми
          alert('Presets successfully imported!');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Скидаємо input
  };

  // --- Редактор ---
  const startCreate = () => {
    const newData: Record<string, {re: number, im: number}> = {};
    for (let i = 0; i < 16; i++) newData[`src${i}`] = { re: 0, im: 0 };
    setEditData(newData);
    setEditName('New Preset');
    setEditingId(null);
    setView('edit');
  };

  const startEdit = (p: CustomPreset) => {
    setEditData(JSON.parse(JSON.stringify(p.data))); // Deep copy
    setEditName(p.name);
    setEditingId(p.id);
    setView('edit');
  };

  const savePreset = () => {
    if (editingId) {
      updateCustomPreset(editingId, { id: editingId, name: editName, data: editData });
    } else {
      addCustomPreset({ id: nanoid(), name: editName, data: editData });
    }
    setView('list');
  };

  const updateNodeVal = (src: string, field: 're'|'im', val: string) => {
    setEditData(prev => ({
      ...prev,
      [src]: { ...prev[src], [field]: parseFloat(val) || 0 }
    }));
  };

  return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2>{view === 'list' ? 'Preset Manager' : 'Edit Preset'}</h2>
            <button onClick={close} style={styles.closeBtn}>✕</button>
          </div>

          {view === 'list' && (
              <div style={styles.body}>
                <div style={styles.toolbar}>
                  <button onClick={startCreate} style={styles.primaryBtn}>+ Create New</button>
                  <button onClick={handleExport} style={styles.btn}>📤 Export JSON</button>
                  <button onClick={() => fileInputRef.current?.click()} style={styles.btn}>📥 Import JSON</button>
                  <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
                </div>

                <div style={styles.list}>
                  {customPresets.length === 0 ? (
                      <div style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No custom presets yet.</div>
                  ) : (
                      customPresets.map((p) => (
                          <div key={p.id} style={styles.listItem}>
                            <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => applyCustomPreset(p.id)} style={styles.runBtn}>▶ Run</button>
                              <button onClick={() => startEdit(p)} style={styles.btn}>Edit</button>
                              <button onClick={() => deleteCustomPreset(p.id)} style={styles.deleteBtn}>Delete</button>
                            </div>
                          </div>
                      ))
                  )}
                </div>
              </div>
          )}

          {view === 'edit' && (
              <div style={styles.body}>
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#666' }}>Preset Name</span>
                  <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '6px', marginTop: 4 }}
                  />
                </label>

                <div style={styles.gridContainer}>
                  <div style={styles.gridHeader}>Node</div>
                  <div style={styles.gridHeader}>Real (re)</div>
                  <div style={styles.gridHeader}>Imag (im)</div>

                  {Array.from({ length: 16 }).map((_, i) => {
                    const key = `src${i}`;
                    const val = editData[key] ?? { re: 0, im: 0 };
                    return (
                        <div key={key} style={{ display: 'contents' }}>
                          <div style={styles.gridCell}>{key}</div>
                          <input
                              type="number" step="any" value={val.re}
                              onChange={(e) => updateNodeVal(key, 're', e.target.value)}
                              style={styles.inputCell}
                          />
                          <input
                              type="number" step="any" value={val.im}
                              onChange={(e) => updateNodeVal(key, 'im', e.target.value)}
                              style={styles.inputCell}
                          />
                        </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button onClick={() => setView('list')} style={styles.btn}>Cancel</button>
                  <button onClick={savePreset} style={styles.primaryBtn}>Save Preset</button>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}

// Мінімалістичні стилі для модального вікна
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  modal: {
    width: 480, background: '#fff', borderRadius: 8,
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', maxHeight: '90vh'
  },
  header: {
    padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' },
  body: { padding: 16, overflowY: 'auto' },
  toolbar: { display: 'flex', gap: 8, marginBottom: 16 },
  btn: { padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 4, cursor: 'pointer' },
  primaryBtn: { padding: '6px 12px', border: 'none', background: '#3b82f6', color: '#fff', borderRadius: 4, cursor: 'pointer' },
  runBtn: { padding: '4px 8px', border: '1px solid #10b981', background: '#d1fae5', color: '#065f46', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  deleteBtn: { padding: '4px 8px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc' },
  gridContainer: { display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 4, background: '#f1f5f9', padding: 8, borderRadius: 6 },
  gridHeader: { fontWeight: 'bold', fontSize: 12, paddingBottom: 4, color: '#475569' },
  gridCell: { fontSize: 12, fontFamily: 'monospace', alignSelf: 'center', color: '#334155' },
  inputCell: { padding: 4, border: '1px solid #cbd5e1', borderRadius: 4, width: '100%' }
};