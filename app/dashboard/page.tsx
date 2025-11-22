'use client';

export default function DashboardPage() {
  return (
    <section className="border border-slate-800 rounded-xl bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold mb-2">Overview</h2>
      <p className="text-slate-300 text-sm mb-4">
        This is your Local Pulse overview. In future weeks, this will show key
        metrics for your café at a glance: review trends, average rating,
        recent feedback, and sales correlations.
      </p>

      <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500 mb-1">Average Rating</div>
          <div className="text-2xl font-semibold">–</div>
          <div className="text-xs text-slate-500 mt-1">Coming soon</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Reviews</div>
          <div className="text-2xl font-semibold">–</div>
          <div className="text-xs text-slate-500 mt-1">Coming soon</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500 mb-1">Last 7 Days</div>
          <div className="text-2xl font-semibold">–</div>
          <div className="text-xs text-slate-500 mt-1">
            We&apos;ll show trends and anomalies here.
          </div>
        </div>
      </div>
    </section>
  );
}