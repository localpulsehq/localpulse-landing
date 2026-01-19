'use client';

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white lp-card p-5 animate-pulse">
      <div className="h-3 w-24 bg-[#E2E8F0] rounded mb-3" />
      <div className="h-6 w-32 bg-[#E2E8F0] rounded mb-4" />
      <div className="h-3 w-40 bg-[#E2E8F0] rounded" />
    </div>
  );
}


