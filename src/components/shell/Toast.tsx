'use client';

import { useEffect, useState } from 'react';

export type ToastItem = { id: number; message: string };

export function useToasts(timeout = 2500) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
  };

  return { toasts, push };
}

export function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <ToastView key={t.id} message={t.message} />
      ))}
    </div>
  );
}

function ToastView({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return <div className="toast">{message}</div>;
}
