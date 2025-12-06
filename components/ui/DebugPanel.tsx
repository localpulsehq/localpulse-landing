'use client';

import { useState } from 'react';

type DebugPanelProps = {
  title?: string;
  data: unknown;
  className?: string;
};

export function DebugPanel({ title = 'Debug', data, className }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={[
        'fixed bottom-3 right-3 z-40 text-xs',
        className ?? '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="px-2 py-1 rounded-md border border-amber-400/60 bg-slate-950/90 text-amber-100 hover:bg-amber-500/10 shadow-lg"
      >
        {open ? 'Hide debug' : 'Show debug'}
      </button>

      {open && (
        <div className="mt-2 max-h-72 w-[360px] overflow-auto rounded-lg border border-amber-500/60 bg-slate-950/95 p-3 text-amber-50 shadow-2xl">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            {title}
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
