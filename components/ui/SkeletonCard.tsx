'use client';

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 animate-pulse">
      <div className="h-3 w-24 bg-slate-800 rounded mb-3" />
      <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
      <div className="h-3 w-40 bg-slate-800 rounded" />
    </div>
  );
}
