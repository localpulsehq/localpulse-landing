'use client';

export default function ReviewsPage() {
  return (
    <section className="border border-slate-800 rounded-xl bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold mb-2">Reviews</h2>
      <p className="text-slate-300 text-sm mb-4">
        This page will show your café&apos;s reviews, ratings, and sentiment
        analysis once we hook up data sources in later weeks.
      </p>

      <div className="text-sm text-slate-400">
        For now, this is a placeholder. We&apos;ll add:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Review feed with filters</li>
          <li>Average rating over time</li>
          <li>Keyword and sentiment breakdown</li>
        </ul>
      </div>
    </section>
  );
}
