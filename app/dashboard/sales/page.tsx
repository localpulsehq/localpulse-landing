'use client';

export default function SalesPage() {
  return (
    <section className="border border-slate-800 rounded-xl bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold mb-2">Sales</h2>
      <p className="text-slate-300 text-sm mb-4">
        This page will show POS data, revenue trends, and how they relate to
        customer feedback once POS integrations are in place.
      </p>

      <div className="text-sm text-slate-400">
        Coming soon:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Daily / weekly sales charts</li>
          <li>Product or category breakdown</li>
          <li>Correlation with review activity</li>
        </ul>
      </div>
    </section>
  );
}
