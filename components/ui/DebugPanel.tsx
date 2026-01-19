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
        className="px-2 py-1 rounded-md border border-[#22C3A6]/40 bg-[#0F172A] text-[#E2E8F0] hover:bg-[#22C3A6]/10 shadow-lg"
      >
        {open ? 'Hide debug' : 'Show debug'}
      </button>

      {open && (
        <div className="mt-2 max-h-72 w-[360px] overflow-auto rounded-lg border border-[#22C3A6]/40 bg-[#0F172A] p-3 text-[#E2E8F0] shadow-2xl">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
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

