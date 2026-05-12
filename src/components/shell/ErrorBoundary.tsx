'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      style={{
        padding: '1rem',
        margin: '0.5rem',
        color: 'var(--danger-fg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--danger)',
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      <strong>Something went wrong</strong>
      <pre
        style={{
          marginTop: 8,
          marginBottom: 8,
          fontSize: 11,
          whiteSpace: 'pre-wrap',
          color: 'var(--fg-secondary)',
        }}
      >
        {(error as Error)?.message}
      </pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          cursor: 'pointer',
          background: 'var(--danger)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
        }}
      >
        Reset
      </button>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={Fallback}>
      {children}
    </ReactErrorBoundary>
  );
}
