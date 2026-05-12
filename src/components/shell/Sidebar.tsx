'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import NodeInspector from '@/components/NodeInspector';
import SpectrumView from '@/components/SpectrumView';
import Metrics from '@/components/Metrics';
import TerminalOutput from '@/components/TerminalOutput';
import EventLog from '@/components/EventLog';
import s from '@/styles/app.module.scss';
import ui from '@/styles/ui.module.scss';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={clsx(s.sidebar, collapsed && s.collapsed)}>
      <div className={s.sidebarHeader}>
        <span className={s.sidebarTitle}>Inspector</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
              style={{ height: 24, width: 24 }}
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className={s.sidebarBody}>
        <NodeInspector />
        <SpectrumView />
        <Metrics />
        <EventLog />
        <TerminalOutput />
      </div>
    </aside>
  );
}
