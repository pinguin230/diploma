'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import p from '@/styles/panels.module.scss';
import ui from '@/styles/ui.module.scss';
import e from '@/styles/eventlog.module.scss';

export default function EventLog() {
  const [isOpen, setIsOpen] = useState(false);
  const log = useSimStore((s) => s.eventLog);
  const clear = useSimStore((s) => s.clearEventLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, isOpen]);

  return (
    <section className={p.panel}>
      <button type="button" className={p.panelHeader} onClick={() => setIsOpen((v) => !v)}>
        <span>
          Event log
          {log.length > 0 && <span className={e.badge}>{log.length}</span>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isOpen && (
            <span
              role="button"
              tabIndex={0}
              className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
              style={{ height: 18, width: 18, fontSize: 10 }}
              onClick={(ev) => { ev.stopPropagation(); clear(); }}
              onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.stopPropagation(); clear(); } }}
              aria-label="Clear log"
            >
              <Trash2 size={11} />
            </span>
          )}
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className={e.logScroll} ref={scrollRef}>
          {log.length === 0 && (
            <div className={p.emptyState}>No events yet. Run the simulation.</div>
          )}
          {log.map((entry) => (
            <div key={entry.id} className={clsx(e.entry, e[entry.kind])}>
              <span className={e.time}>{entry.simTime.toFixed(0)}</span>
              <span className={e.kind}>{entry.kind === 'fire' ? 'FIRE' : 'OUT'}</span>
              <span className={e.label}>{entry.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
