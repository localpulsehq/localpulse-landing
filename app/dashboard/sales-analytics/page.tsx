'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase } from '@/lib/supabaseClient';
import AnimatedCard from '@/components/ui/AnimatedCard'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'


// ---------- types ---------- 

type SalesRow = {
  id: string;
  cafe_id: string;
  sale_date: string;          // YYYY-MM-DD
  total_revenue: number;
  total_transactions: number | null;
  cash_revenue: number | null;
  card_revenue: number | null;
  notes: string;
};

type RangeKey = '7d' | '30d' | '90d' | 'custom';

type DailyPoint = {
  date: string; // 'YYYY-MM-DD'
  label: string; // 'oct 01'
  total: number;
  cash: number;
  card: number;
};

// ---------- helpers ----------

function addDays(d: Date, delta: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function formatShortLabel(d: Date) {
  return d.toLocaleDateString('en-AU', {
    month: 'short',
    day: '2-digit',
  });
}

function dateToYmd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getRangeDates(range: RangeKey, customFrom?: string, customTo?: string) {
  const today = new Date();
  const end = new Date(dateToYmd(today)); // strip time

  if (range === 'custom' && customFrom && customTo) {
    return {
      start: new Date(customFrom),
      end: new Date(customTo),
    };
  }

  const size =
    range === '7d'
      ? 7
      : range === '30d'
      ? 30
      : range === '90d'
      ? 90
      : 30;

  const start = addDays(end, -size + 1);
  return { start, end };
}

function buildDailySeries(
  sales: SalesRow[],
  start: Date,
  end: Date,
): DailyPoint[] {
  const byDate = new Map<
    string,
    { total: number; cash: number; card: number }
  >();

  for (const row of sales) {
    const key = row.sale_date;
    if (!byDate.has(key)) {
      byDate.set(key, { total: 0, cash: 0, card: 0 });
    }
    const agg = byDate.get(key)!;
    agg.total += row.total_revenue ?? 0;
    agg.cash += row.cash_revenue ?? 0;
    agg.card += row.card_revenue ?? 0;
  }

  const days: DailyPoint[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const ymd = dateToYmd(d);
    const agg = byDate.get(ymd) ?? { total: 0, cash: 0, card: 0 };

    days.push({
      date: ymd,
      label: formatShortLabel(d),
      total: agg.total,
      cash: agg.cash,
      card: agg.card,
    });
  }

  return days;
}

function sum(arr: number[]) {
  return arr.reduce((acc, v) => acc + v, 0);
}

function percentageChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function formatCurrency(value: number): string {
  return `A$${value.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function daysAgo(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Simple SVG sparkline (same style as overview)
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
      const y = height - 6 - normalized * (height - 16);
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
      />
    </svg>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CHART_COLORS = {
  line: '#38bdf8',
  lineFaint: '#0f172a',
  cash: '#22c55e',
  card: '#0ea5e9',
  bars: '#38bdf8',
};

// ---------- period selector ----------

type PeriodSelectorProps = {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
};

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const options: { key: RangeKey; label: string }[] = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'custom', label: 'Custom (coming soon)' },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-800 p-1 text-xs">
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => opt.key !== 'custom' && onChange(opt.key)}
          className={[
            'px-3 py-1 rounded-full transition-colors',
            value === opt.key
              ? 'bg-sky-600 text-slate-50'
              : opt.key === 'custom'
              ? 'text-slate-500 cursor-not-allowed'
              : 'text-slate-300 hover:bg-slate-800',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------- KPI card helper ----------
type KpiProps = {
  label: string;
  value: number;
  prefix?: string;
  changePct?: number | null;
  changeLabel?: string;
  delay?: number;
};

function KpiCard({
  label,
  value,
  prefix = 'A$',
  changePct,
  changeLabel,
  delay = 0,
}: KpiProps) {
  const positive = (changePct ?? 0) >= 0;

  return (
    <AnimatedCard delay={delay}>
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-50">
        <AnimatedNumber value={value} />
      </p>
      {changePct != null && (
        <p
          className={[
            'mt-2 text-[11px] flex items-center gap-1',
            positive ? 'text-emerald-400' : 'text-rose-400',
          ].join(' ')}
        >
          <span>{positive ? '▲' : '▼'}</span>
          <span>{Math.abs(changePct).toFixed(1)}%</span>
          {changeLabel && (
            <span className="text-slate-400">· {changeLabel}</span>
          )}
        </p>
      )}
    </AnimatedCard>
  );
}

// ---------- main page ----------

export default function SalesAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('30d');
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load all sales for the logged-in cafe
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setErrorMessage('You must be logged in to see analytics.');
        setLoading(false);
        return;
      }

      const { data: cafeData, error: cafeError } = await supabase
        .from('cafes')
        .select('id')
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (cafeError || !cafeData) {
        setErrorMessage('Could not load your café.');
        setLoading(false);
        return;
      }

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('cafe_id', cafeData.id)
        .order('sale_date', { ascending: true });

      if (salesError) {
        console.error('Failed to load sales for analytics:', salesError);
        setErrorMessage('Could not load sales data.');
        setLoading(false);
        return;
      }

      setSales((salesData ?? []) as SalesRow[]);
      setLoading(false);
    }

    load();
  }, []);

  // Derived analytics based on range
  const {
    series,
    totalRevenue,
    avgDailyRevenue,
    bestWeekdayLabel,
    trendPct,
    cashTotal,
    cardTotal,
    weekdayData,
    topDays,
    periodLabel,
  } = useMemo(() => {
    if (!sales.length) {
      return {
        series: [] as DailyPoint[],
        totalRevenue: 0,
        avgDailyRevenue: 0,
        bestWeekdayLabel: null as string | null,
        trendPct: null as number | null,
        cashTotal: 0,
        cardTotal: 0,
        weekdayData: [] as { name: string; total: number }[],
        topDays: [] as SalesRow[],
        periodLabel: '',
      };
    }

    const { start, end } = getRangeDates(range);
    const daysInRange =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    const startYmd = dateToYmd(start);
    const endYmd = dateToYmd(end);

    const filtered = sales.filter(
      s => s.sale_date >= startYmd && s.sale_date <= endYmd,
    );

    const series = buildDailySeries(filtered, start, end);

    const totalRevenue = sum(filtered.map(r => r.total_revenue));
    const avgDailyRevenue =
      daysInRange > 0 ? totalRevenue / daysInRange : totalRevenue;

    // previous period (same length immediately before)
    const prevStart = addDays(start, -daysInRange);
    const prevEnd = addDays(start, -1);

    const prevFiltered = sales.filter(
      s =>
        s.sale_date >= dateToYmd(prevStart) &&
        s.sale_date <= dateToYmd(prevEnd),
    );
    const prevTotalRevenue = sum(prevFiltered.map(r => r.total_revenue));
    const trendPct = percentageChange(totalRevenue, prevTotalRevenue);

    // cash vs card
    const cashTotal = sum(filtered.map(r => r.cash_revenue ?? 0));
    const cardTotal = sum(filtered.map(r => r.card_revenue ?? 0));

    // weekday totals
    const weekdayTotals = new Array(7).fill(0);
    for (const row of filtered) {
      const d = new Date(row.sale_date);
      const idx = d.getDay();
      weekdayTotals[idx] += row.total_revenue ?? 0;
    }

    const weekdayData = WEEKDAYS.map((name, idx) => ({
      name,
      total: weekdayTotals[idx],
    }));

    // best weekday label
    let bestWeekdayLabel: string | null = null;
    if (filtered.length) {
      let bestIdx = 0;
      for (let i = 1; i < 7; i++) {
        if (weekdayTotals[i] > weekdayTotals[bestIdx]) bestIdx = i;
      }
      bestWeekdayLabel = `${WEEKDAYS[bestIdx]}s`;
    }

    // top days
    const topDays = [...filtered]
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 7);

    const periodLabel =
      range === '7d'
        ? 'last 7 days'
        : range === '30d'
        ? 'last 30 days'
        : range === '90d'
        ? 'last 90 days'
        : 'selected period';

    return {
      series,
      totalRevenue,
      avgDailyRevenue,
      bestWeekdayLabel,
      trendPct,
      cashTotal,
      cardTotal,
      weekdayData,
      topDays,
      periodLabel,
    };
  }, [sales, range]);

  const hasData = series.length > 0;

  // ---------- skeletons ----------

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-900 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-8 w-56 bg-slate-900 rounded-full animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-6 animate-pulse"
            >
              <div className="h-3 w-24 bg-slate-800 rounded mb-3" />
              <div className="h-6 w-32 bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-4">
          <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,1.7fr] gap-4">
          <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
        </div>
      </section>
    );
  }

  // ---------- empty state ----------

  if (!hasData) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sales analytics</h2>
            <p className="text-sm text-slate-400">
              Once you have at least a week of sales, we’ll show richer
              analytics here.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
          Add some sales in the <span className="font-semibold">Sales</span>{' '}
          tab to unlock analytics like revenue trends, busy days of the week,
          and cash vs card breakdowns.
        </div>
      </section>
    );
  }

  // ---------- chart tooltips ----------

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as DailyPoint;
    return (
      <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
        <div className="font-medium mb-1">{point.date}</div>
        <div>Total: {formatCurrency(point.total)}</div>
        <div className="text-slate-400">
          Cash: {formatCurrency(point.cash)} · Card:{' '}
          {formatCurrency(point.card)}
        </div>
      </div>
    );
  };

  const donutData = [
    { name: 'Card', value: cardTotal, color: CHART_COLORS.card },
    { name: 'Cash', value: cashTotal, color: CHART_COLORS.cash },
  ];

  const avgForPeriod =
    series.length > 0
      ? sum(series.map(p => p.total)) / series.length
      : 0;

  return (
    <section className="space-y-6">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sales analytics</h2>
          <p className="text-sm text-slate-400">
            See how your café is performing over time, which days are busiest,
            and how guests are paying.
          </p>
        </div>

        <PeriodSelector value={range} onChange={setRange} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label={`Revenue (${periodLabel})`}
          value={totalRevenue}
          changePct={trendPct}
          changeLabel="vs previous period"
          delay={0}
        />

        <KpiCard
          label="Average daily revenue"
          value={avgDailyRevenue}
          changePct={null}
          delay={80}
        />

        <AnimatedCard delay={160}>
          <p className="text-xs font-medium text-slate-400 mb-1">
            Best-performing day
          </p>
          <p className="text-2xl font-semibold text-slate-50">
            {bestWeekdayLabel ?? '—'}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Based on revenue over the selected period.
          </p>
        </AnimatedCard>

        <AnimatedCard delay={240}>
          <p className="text-xs font-medium text-slate-400 mb-1">
            Card vs cash share
          </p>
          <p className="text-sm text-slate-200">
            Card:{' '}
            <span className="font-semibold">
              {cardTotal + cashTotal === 0
                ? '—'
                : `${Math.round(
                    (cardTotal / (cardTotal + cashTotal)) * 100,
                  )}%`}
            </span>{' '}
            · Cash:{' '}
            <span className="font-semibold">
              {cardTotal + cashTotal === 0
                ? '—'
                : `${Math.round(
                    (cashTotal / (cardTotal + cashTotal)) * 100,
                  )}%`}
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Helps you track how guests prefer to pay.
          </p>
        </AnimatedCard>
      </div>

      {/* main chart + donut */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-4">
        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-2">
            Revenue over time
          </p>
          <div className="h-56 sm:5-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.line}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.lineFaint}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={v =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : v
                  }
                />
                <Tooltip content={<CustomLineTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_COLORS.line}
                  strokeWidth={2}
                  fill="url(#revArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Shows daily revenue for the selected period.
          </p>
        </AnimatedCard>

        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-2">
            Cash vs card revenue
          </p>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    return (
                      <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
                        <div className="font-medium mb-1">{p.name}</div>
                        <div>{formatCurrency(p.value ?? 0)}</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Useful for reconciling your till and POS.
          </p>
        </AnimatedCard>
      </div>

      {/* weekday chart + top days table */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,1.7fr] gap-4">
        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-2">
            Revenue by weekday
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={v =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : v
                  }
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    return (
                      <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
                        <div className="font-medium mb-1">{p.payload.name}</div>
                        <div>{formatCurrency(p.value ?? 0)}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} fill={CHART_COLORS.bars} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Helps you plan rostering and promos around your busiest days.
          </p>
        </AnimatedCard>

        <AnimatedCard>
          <p className="text-xs font-medium text-slate-400 mb-2">
            Highest revenue days
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">vs daily avg</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {topDays.map(row => {
                  const diff = row.total_revenue - avgForPeriod;
                  const pct =
                    avgForPeriod > 0 ? (diff / avgForPeriod) * 100 : null;
                  const positive = (pct ?? 0) >= 0;

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-900 last:border-0"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap text-slate-200">
                        {row.sale_date}
                      </td>
                      <td className="py-2 pr-4 text-slate-50">
                        {formatCurrency(row.total_revenue)}
                      </td>
                      <td className="py-2 pr-4">
                        {pct == null ? (
                          '—'
                        ) : (
                          <span
                            className={
                              positive ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {positive ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 max-w-xs truncate text-slate-400">
                        {row.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Use this to remember what was happening on standout days (weather,
            events, promos, etc.).
          </p>
        </AnimatedCard>
      </div>

      {errorMessage && (
        <p className="text-xs text-rose-400 mt-2">{errorMessage}</p>
      )}
    </section>
  );
}