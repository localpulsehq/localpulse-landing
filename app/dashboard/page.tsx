'use client';

import AnimatedCard, { AnimatedCardGroup } from '@/components/ui/AnimatedCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { useCountUp } from '@/hooks/useCountUp';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type DailyRevenue = {
  date: string; // YYYY-MM-DD
  total: number;
};

function formatCurrency(value: number): string {
  return `A$${value.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function calcChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function TrendLabel({ change, label }: { change: number | null; label: string }) {
  if (change === null) {
    return (
      <span className="text-xs text-slate-400">
        — {label}
      </span>
    );
  }

  const isUp = change >= 0;
  const rounded = Math.abs(change).toFixed(1);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isUp ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      <span>{isUp ? '▲' : '▼'}</span>
      <span>
        {rounded}% {isUp ? 'higher' : 'lower'} {label}
      </span>
    </span>
  );
}

function RevenueSparkline({ values }: { values: number[] }) {
  if (!values.length) return null;

  const width = 260;
  const height = 60;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const normalized = v / max;
      const y = height - 6 - normalized * (height - 16); // padding top/bottom
      return `${x},${y}`;
    })
    .join(' ');

  const lastIndex = values.length - 1;
  const lastX = lastIndex * stepX;
  const lastY = height - 6 - (values[lastIndex] / max) * (height - 16);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-16 text-sky-500/80"
      aria-hidden="true"
    >
      {/* baseline */}
      <line
        x1={0}
        y1={height - 6}
        x2={width}
        y2={height - 6}
        className="stroke-slate-700"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* sparkline */}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]"
      />

      {/* last point */}
      <circle
        cx={lastX}
        cy={lastY}
        r={3}
        className="fill-sky-400 animate-pulse"
      >
        <title>Most recent day</title>
      </circle>
    </svg>
  );
}

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue7, setRevenue7] = useState(0);
  const [revenue7Change, setRevenue7Change] = useState<number | null>(null);

  const [revenue30, setRevenue30] = useState(0);
  const [revenue30Change, setRevenue30Change] = useState<number | null>(null);

  const [sparklineValues, setSparklineValues] = useState<number[]>([]);
  const [lastSaleDate, setLastSaleDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError('You must be logged in to view your dashboard.');
        setLoading(false);
        return;
      }

      // Find the cafe for this owner
      const { data: cafe, error: cafeError } = await supabase
        .from('cafes')
        .select('id')
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (cafeError || !cafe) {
        setError('Could not load your café.');
        setLoading(false);
        return;
      }

      const cafeId = cafe.id;

      // --- Load sales for last 60 days ---
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysAgo = (n: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - n);
        return d;
      };

      const fromDate = daysAgo(59).toISOString().slice(0, 10);
      const toDate = today.toISOString().slice(0, 10);

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('sale_date,total_revenue')
        .eq('cafe_id', cafeId)
        .gte('sale_date', fromDate)
        .lte('sale_date', toDate)
        .order('sale_date', { ascending: true });

      if (salesError) {
        console.error('Failed to load sales', salesError);
        setError('Could not load sales data.');
        setLoading(false);
        return;
      }

      // Group into a map by date
      const revenueMap = new Map<string, number>();
      (sales ?? []).forEach(row => {
        const date = row.sale_date as string;
        const existing = revenueMap.get(date) ?? 0;
        revenueMap.set(date, existing + Number(row.total_revenue ?? 0));
      });

      // Helper: sum over a date range [startOffset, endOffset] (inclusive) where 0 = today
      const sumRange = (startOffset: number, endOffset: number) => {
        let total = 0;
        for (let offset = startOffset; offset <= endOffset; offset++) {
          const d = daysAgo(-offset); // negative because startOffset is e.g. -6
          const key = d.toISOString().slice(0, 10);
          total += revenueMap.get(key) ?? 0;
        }
        return total;
      };

      // Last 7 days: offsets -6..0  (today + previous 6)
      const last7 = sumRange(-6, 0);
      const prev7 = sumRange(-13, -7);

      // Last 30 days
      const last30 = sumRange(-29, 0);
      const prev30 = sumRange(-59, -30);

      setRevenue7(last7);
      setRevenue7Change(calcChange(last7, prev7));
      setRevenue30(last30);
      setRevenue30Change(calcChange(last30, prev30));

      // Sparkline: revenue for each of last 30 days (oldest -> newest)
      const spark: number[] = [];
      for (let offset = -29; offset <= 0; offset++) {
        const d = daysAgo(-offset);
        const key = d.toISOString().slice(0, 10);
        spark.push(revenueMap.get(key) ?? 0);
      }
      setSparklineValues(spark);

      // Most recent sale date
      if (sales && sales.length > 0) {
        const latest = sales[sales.length - 1].sale_date as string;
        setLastSaleDate(latest);
      } else {
        setLastSaleDate(null);
      }

      setLoading(false);
    }

    load();
  }, []);

  // --- RENDER ---

  if (loading) {
    return (
      <section className="border border-slate-800 rounded-xl bg-slate-900/40 p-6">
        <p className="text-sm text-slate-300">Loading overview…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border border-rose-800/60 rounded-xl bg-slate-950/60 p-6">
        <p className="text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-1 text-sm text-slate-400 max-w-2xl">
          This is your Local Pulse overview. As you add sales (and later, reviews),
          this panel shows key metrics for your café at a glance.
        </p>
      </header>

      {/* Top row: three primary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
        <AnimatedCardGroup>
          <AnimatedCard variant="scale" glass>
            <p className="text-xs font-medium text-slate-400 mb-1">
              Revenue (last 7 days)
            </p>

            <AnimatedNumber 
              value={revenue7}
              prefix="A"
              className="text-2xl font-semibold text-slate-50"
            />
              
            <div className="mt-3 flex items-center justify-between">
              <TrendLabel change={revenue7Change} label="vs previous 7 days" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="scale" glass>
            {/* Revenue 30d + sparkline */}
            <p className="text-xs font-medium text-slate-400 mb-1">
              Revenue (last 30 days)
            </p>

            <AnimatedNumber
              value={revenue30}
              prefix="A"
              className="text-2xl font-semibold text-slate-50"
            />

            <div className="mt-3">
              <RevenueSparkline values={sparklineValues} />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <TrendLabel change={revenue30Change} label="vs previous 30 days" />
              <span className="text-[11px] text-slate-500">
                Sparkline shows daily revenue over the last 30 days.
              </span>
            </div>
          </AnimatedCard>

          <AnimatedCard>
            {/* Latest sale date */}
            <p className="text-xs font-medium text-slate-400 mb-1">
              Most recent sales entry
            </p>
            <p className="text-xl font-semibold text-slate-50">
              {lastSaleDate ? formatDate(lastSaleDate) : 'No sales yet'}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Keep this up to date to make your trends accurate.
            </p>
          </AnimatedCard>

        </AnimatedCardGroup>
      </div>

      {/* Bottom row: reviews placeholders (for future sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6">
        {/* Reviews summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 mb-1">
            Reviews (last 30 days)
          </p>
          <p className="text-sm text-slate-400">
            Once you connect Local Pulse to your reviews source, we&apos;ll show
            your average rating, review count, and change over time here.
          </p>
          <div className="mt-4 h-16 rounded-lg border border-dashed border-slate-700/70 flex items-center justify-center text-xs text-slate-500">
            Reviews integration coming soon
          </div>
        </div>

        {/* Latest review highlight */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 mb-1">
            Latest review highlight
          </p>
          <p className="text-sm text-slate-400">
            When new reviews come in, we&apos;ll surface a recent comment here so
            you can quickly see what guests are saying.
          </p>
          <div className="mt-4 h-16 rounded-lg border border-dashed border-slate-700/70 flex items-center justify-center text-xs text-slate-500">
            Waiting for your first review
          </div>
        </div>
      </div>
    </section>
  );
}
