'use client';

import { useState, useEffect } from 'react';
import s from '@/styles/onboarding.module.scss';

const STEPS = [
  {
    emoji: '🎯',
    title: 'Select a preset signal',
    body: 'Open the Preset dropdown in the toolbar and choose a signal — try "Impulse δ[0]" to see a pure spectral response.',
  },
  {
    emoji: '▶',
    title: 'Run the simulation',
    body: 'Press Space (or click Run) to start the dataflow computation. Watch tokens flow through the graph in real time.',
  },
  {
    emoji: '🔍',
    title: 'Inspect any node',
    body: 'Click any node on the graph to open its inspector. Use the Trace tab to see step-by-step arithmetic with actual values.',
  },
] as const;

const STORAGE_KEY = 'dft-toured-v1';

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((v) => v + 1);
    else close();
  };

  const current = STEPS[step];

  return (
    <div className={s.overlay} onClick={close} role="dialog" aria-modal aria-label="Welcome tour">
      <div className={s.card} onClick={(e) => e.stopPropagation()}>
        <div className={s.stepDots}>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? s.dotActive : s.dot} />
          ))}
        </div>

        <div className={s.emoji} aria-hidden>{current.emoji}</div>
        <h2 className={s.title}>{current.title}</h2>
        <p className={s.body}>{current.body}</p>

        <div className={s.actions}>
          <button type="button" className={s.skip} onClick={close}>
            Skip tour
          </button>
          <button type="button" className={s.next} onClick={next}>
            {step < STEPS.length - 1 ? 'Next →' : 'Get started'}
          </button>
        </div>
      </div>
    </div>
  );
}
