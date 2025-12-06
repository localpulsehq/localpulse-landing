'use client';

export function SkeletonChart({
  height = 240,
}: {
  height?: number;
}) {
  return (
    <div
      className="w-full rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse"
      style={{ height }}
    >
      <div className="p-4 space-y-3">
        <div className="h-3 w-32 bg-slate-800 rounded" />
        <div className="h-3 w-20 bg-slate-900 rounded" />
      </div>

      <div className="px-4">
        <div className="h-full w-full bg-slate-900 rounded" />
      </div>
    </div>
  );
}
