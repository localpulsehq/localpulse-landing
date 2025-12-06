'use client';

import { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
      {icon && (
        <div className="flex justify-center mb-4 text-slate-600 text-3xl">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-slate-200 mb-1">
        {title}
      </h3>

      <p className="text-xs text-slate-400 max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}
