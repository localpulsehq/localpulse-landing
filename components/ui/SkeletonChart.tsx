'use client';

export function SkeletonChart({
  height = 240,
}: {
  height?: number;
}) {
  return (
    <div
      className="w-full rounded-xl bg-white lp-card animate-pulse"
      style={{ height }}
    >
      <div className="p-4 space-y-3">
        <div className="h-3 w-32 bg-[#E2E8F0] rounded" />
        <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
      </div>

      <div className="px-4">
        <div className="h-full w-full bg-[#E2E8F0] rounded" />
      </div>
    </div>
  );
}


