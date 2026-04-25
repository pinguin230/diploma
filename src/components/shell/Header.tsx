'use client';

import { Moon, Sun } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { useTheme } from '@/hooks/useTheme';
import { useSimStore } from '@/store/simStore';
import s from '@/styles/app.module.scss';
import ui from '@/styles/ui.module.scss';

export default function Header() {
  const { theme, toggle } = useTheme();
  const running = useSimStore((st) => st.running);

  return (
    <header className={s.header}>
      <div className={s.title}>
        <span className={s.titleMark}>ƒ</span>
        Dataflow FFT Simulator
        <span className={s.titleMeta}>N = 16 · radix-4</span>
      </div>
      <div className={s.headerSpacer} />
      <div className={s.headerActions}>
        <span
          className={clsx(ui.badge, running ? ui.badgeSuccess : ui.badgeMuted)}
          aria-live="polite"
        >
          <span className={ui.dot} />
          {running ? 'Running' : 'Paused'}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={clsx(ui.btn, ui.btnIcon, ui.btnGhost)}
              onClick={toggle}
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="tooltip-content">
            {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
