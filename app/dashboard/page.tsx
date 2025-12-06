'use client';

import { useEffect, useState } from 'react';
import AnimatedCard, {
  AnimatedCardGroup,
} from '@/components/ui/AnimatedCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { supabase } from '@/lib/supabaseClient';
import {
  computeSalesInsights,
  type SalesRow,
} from '@/lib/analytics/sales';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonChart } from '@/components/ui/SkeletonChart';
import { parseDate, formatDateAU } from '@/lib/date';
import { ENABLE_ANALYTICS_DEBUG } from '@/lib/debug';
import { DebugPanel } from '@/components/ui/DebugPanel';

// ---------- helpers ----------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return formatDateAU(dateStr);
}

function TrendLabel({
  change,
  label,
}: {
  change: number | null;
  label: string;
}) {
  if (change === null) {
    return <span className="text-xs text-slate-400">— {label}</span>;
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

// Simple sparkline SVG (same as before)
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
      const y = height - 6 - normalized * (height - 16); // padding
      return `${x},${y}`;
    })
    .join(' ');

  const lastIndex = values.length - 1;
  const lastX = lastIndex * stepX;
  const lastY =
    height - 6 - (values[lastIndex] / max) * (height - 16);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-16 text-sky-500/80"
      aria-hidden="true"
    >
      <line
        x1={0}
        y1={height - 6}
        x2={width}
        y2={height - 6}
        className="stroke-slate-700"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]"
      />
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

// ---------- page ----------

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue7, setRevenue7] = useState(0);
  const [revenue7Change, setRevenue7Change] =
    useState<number | null>(null);

  const [revenue30, setRevenue30] = useState(0);
  const [revenue30Change, setRevenue30Change] =
    useState<number | null>(null);

  const [sparklineValues, setSparklineValues] = useState<number[]>([]);
  const [lastSaleDate, setLastSaleDate] = useState<string | null>(null);

  // mini-insights
  const [coverage30, setCoverage30] = useState<number | null>(null);
  const [activeDays30, setActiveDays30] = useState(0);
  const [bestDayDate, setBestDayDate] = useState<string | null>(null);
  const [bestDayRevenue, setBestDayRevenue] = useState(0);
  const [avgTicket30, setAvgTicket30] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
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

      // Load last 60 days of sales (enough for 30d window + previous 30d)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysAgo = (n: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - n);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const fromDate = daysAgo(59).toISOString().slice(0, 10);
      const toDate = today.toISOString().slice(0, 10);

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(
          'id,cafe_id,sale_date,total_revenue,total_transactions,cash_revenue,card_revenue,notes',
        )
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

      const rows = (sales ?? []) as SalesRow[];

      // Use central analytics engine
      const insights7 = computeSalesInsights(rows, 7);
      const insights30 = computeSalesInsights(rows, 30);

      setRevenue7(insights7.totalRevenue);
      setRevenue7Change(insights7.revenueChangePct);

      setRevenue30(insights30.totalRevenue);
      setRevenue30Change(insights30.revenueChangePct);

      // Sparkline for last 30 days
      const revenueMap = new Map<string, number>();
      const txMap = new Map<string, number>();

      for (const row of rows) {
        const date = row.sale_date;
        const existing = revenueMap.get(date) ?? 0;
        revenueMap.set(date, existing + (row.total_revenue ?? 0));

        const tx =
          row.total_transactions != null
            ? Number(row.total_transactions)
            : 0;
        txMap.set(date, (txMap.get(date) ?? 0) + tx);
      }

      const spark: number[] = [];
      for (let offset = 29; offset >= 0; offset--) {
        const d = daysAgo(offset);
        const key = d.toISOString().slice(0, 10);
        spark.push(revenueMap.get(key) ?? 0);
      }
      setSparklineValues(spark);

      // Most recent sale date
      if (rows.length > 0) {
        const latest = rows[rows.length - 1].sale_date;
        setLastSaleDate(latest);
      } else {
        setLastSaleDate(null);
      }

      // ---- MINI-INSIGHTS (last 30 days) ----
      let activeDays = 0;
      let bestDay = '';
      let bestRevenue = 0;
      let totalTx30 = 0;

      for (let offset = 29; offset >= 0; offset--) {
        const d = daysAgo(offset);
        const key = d.toISOString().slice(0, 10);

        const dayRevenue = revenueMap.get(key) ?? 0;
        const dayTx = txMap.get(key) ?? 0;

        if (dayRevenue > 0) {
          activeDays++;
        }
        if (dayRevenue > bestRevenue) {
          bestRevenue = dayRevenue;
          bestDay = key;
        }

        totalTx30 += dayTx;
      }

      const coverage =
        activeDays > 0 ? (activeDays / 30) * 100 : null;
      const avgTicket =
        totalTx30 > 0 ? insights30.totalRevenue / totalTx30 : null;

      setActiveDays30(activeDays);
      setCoverage30(coverage);
      setBestDayDate(bestDay || null);
      setBestDayRevenue(bestRevenue);
      setAvgTicket30(avgTicket);

      setLoading(false);
    }

    load();
  }, []);

  // ---------- loading state (Task 2 polish) ----------

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-64 bg-slate-900 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6">
          <SkeletonChart height={120} />
          <SkeletonChart height={120} />
        </div>
      </section>
    );
  }

  // ---------- error state ----------

  if (error) {
    return (
      <section className="border border-rose-800/60 rounded-xl bg-slate-950/60 p-6">
        <p className="text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  // ---------- main content ----------

  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-1 text-sm text-slate-400 max-w-2xl">
          This is your Local Pulse overview. As you add sales (and
          later, reviews), this panel shows key metrics for your café
          at a glance.
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
              <TrendLabel
                change={revenue7Change}
                label="vs previous 7 days"
              />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="scale" glass>
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
              <TrendLabel
                change={revenue30Change}
                label="vs previous 30 days"
              />
              <span className="text-[11px] text-slate-500">
                Sparkline shows daily revenue over the last 30 days.
              </span>
            </div>
          </AnimatedCard>

          <AnimatedCard>
            <p className="text-xs font-medium text-slate-400 mb-1">
              Most recent sales entry
            </p>
            <p className="text-xl font-semibold text-slate-50">
              {lastSaleDate
                ? formatDate(lastSaleDate)
                : 'No sales yet'}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Keep this up to date to make your trends accurate.
            </p>
          </AnimatedCard>
        </AnimatedCardGroup>
      </div>

      {/* NEW: mini-insights row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-1">
            Data coverage (last 30 days)
          </p>
          <p className="text-xl font-semibold text-slate-50">
            {coverage30 != null ? `${coverage30.toFixed(0)}%` : '—'}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {activeDays30} of 30 days have at least one sales
            entry logged.
          </p>
        </AnimatedCard>

        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-1">
            Best day (last 30 days)
          </p>
          <p className="text-sm font-semibold text-slate-50">
            {bestDayDate ? formatDate(bestDayDate) : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {bestDayRevenue > 0
              ? `Revenue: A$${bestDayRevenue.toLocaleString('en-AU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : 'Add more sales to see your standout days.'}
          </p>
        </AnimatedCard>

        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-1">
            Avg ticket size (last 30 days)
          </p>
          <p className="text-xl font-semibold text-slate-50">
            {avgTicket30 != null
              ? `A$${avgTicket30.toLocaleString('en-AU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '—'}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Based on total revenue ÷ total transactions where
            transactions were recorded.
          </p>
        </AnimatedCard>
      </div>

      {/* Bottom row: reviews placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 mb-1">
            Reviews (last 30 days)
          </p>
          <p className="text-sm text-slate-400">
            Once you connect Local Pulse to your reviews source,
            we&apos;ll show your average rating, review count, and
            change over time here.
          </p>
          <div className="mt-4 h-16 rounded-lg border border-dashed border-slate-700/70 flex items-center justify-center text-xs text-slate-500">
            Reviews integration coming soon
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 mb-1">
            Latest review highlight
          </p>
          <p className="text-sm text-slate-400">
            When new reviews come in, we&apos;ll surface a recent
            comment here so you can quickly see what guests are saying.
          </p>
          <div className="mt-4 h-16 rounded-lg border border-dashed border-slate-700/70 flex items-center justify-center text-xs text-slate-500">
            Waiting for your first review
          </div>
        </div>
      </div>

      {ENABLE_ANALYTICS_DEBUG && (
        <DebugPanel
          title="Overview debug"
          data={{
            revenue7,
            revenue7Change,
            revenue30,
            revenue30Change,
            sparklineValues,
            lastSaleDate,
          }}
        />
      )}
    </section>
  );
}
