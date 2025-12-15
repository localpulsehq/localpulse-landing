'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type EmptyStateAction = {
  label: string;
  href: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: EmptyStateAction;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
      {icon && (
        <div className="flex justify-center mb-4 text-slate-600 text-3xl">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-slate-200 mb-1">{title}</h3>

      <p className="text-xs text-slate-400 max-w-sm mx-auto">{description}</p>

      {action && (
        <div className="mt-5">
          <Link
            href={action.href}
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-xs font-medium text-slate-50 hover:bg-sky-500 transition-colors"
          >
            {action.label}
          </Link>
        </div>
      )}
    </div>
  );
}
