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
    <div className="rounded-xl bg-white lp-card p-8 text-center">
      {icon && (
        <div className="flex justify-center mb-4 text-[#94A3B8] text-3xl">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-[#0B1220] mb-1">{title}</h3>

      <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">{description}</p>

      {action && (
        <div className="mt-5">
          <Link
            href={action.href}
            className="inline-flex items-center justify-center rounded-md bg-[#22C3A6] px-4 py-2 text-xs font-medium text-[#0B1220] hover:bg-[#17A98F] transition-colors"
          >
            {action.label}
          </Link>
        </div>
      )}
    </div>
  );
}

