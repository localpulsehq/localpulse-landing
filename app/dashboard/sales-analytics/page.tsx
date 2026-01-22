'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import AnimatedCard from '@/components/ui/AnimatedCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { computeSalesInsights, type SalesRow } from '@/lib/analytics/sales';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonChart } from '@/components/ui/SkeletonChart';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  toYMD, addDaysSafe, formatShortLabel
} from "@/lib/date";
import { formatCurrencyAUD } from '@/lib/format';
import { ENABLE_ANALYTICS_DEBUG } from '@/lib/debug';
import { DebugPanel } from '@/components/ui/DebugPanel';

// ---------- types ----------

type RangeKey = '7d' | '30d' | '90d' | 'custom';

type DailyPoint = {
  date: string; // 'YYYY-MM-DD'
  label: string; // 'Oct 01'
  total: number;
  cash: number;
  card: number;
};

type WeeklyPoint = {
  label: string;
  total: number;
};

type TopDayView = {
  id: string;
  date: string;
  formattedDate: string;
  revenue: number;
  notes: string | null;
};

// ---------- helpers ----------


function getRangeDates(range: RangeKey, customFrom?: string, customTo?: string) {
  const today = new Date();
  const end = new Date(toYMD(today)); // strip time

  if (range === 'custom' && customFrom && customTo) {
    return {
      start: new Date(customFrom),
      end: new Date(customTo),
    };
  }

  const size =
    range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30;

  const start = addDaysSafe(end, -size + 1);
  return { start, end };
}

function buildDailySeries(
  sales: SalesRow[],
  start: Date,
  end: Date
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
  for (let d = new Date(start); d <= end; d = addDaysSafe(d, 1)) {
    const ymd = toYMD(d);
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

function weekStartYmd(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday as start
  copy.setDate(copy.getDate() - diff);
  return toYMD(copy);
}

function buildWeeklySeries(points: DailyPoint[]): WeeklyPoint[] {
  const byWeek = new Map<string, number>();
  for (const point of points) {
    const d = new Date(point.date);
    const weekKey = weekStartYmd(d);
    byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + point.total);
  }

  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekKey, total]) => ({
      label: `Week of ${formatShortLabel(new Date(weekKey))}`,
      total,
    }));
}

function sum(arr: number[]) {
  return arr.reduce((acc, v) => acc + v, 0);
}


const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const CHART_COLORS = {
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
    <div className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E2E8F0] p-1 text-xs">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => opt.key !== 'custom' && onChange(opt.key)}
          className={[
            'px-3 py-1 rounded-full transition-colors',
            value === opt.key
              ? 'bg-[#22C3A6] text-[#0B1220]'
              : opt.key === 'custom'
              ? 'text-[#94A3B8] cursor-not-allowed'
              : 'text-[#94A3B8] hover:bg-white',
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
  prefix = 'A',
  changePct,
  changeLabel,
  delay = 0,
}: KpiProps) {
  const positive = (changePct ?? 0) >= 0;

  return (
    <AnimatedCard delay={delay}>
      <p className="text-xs font-medium text-[#94A3B8] mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[#0B1220]">
        <AnimatedNumber value={value} prefix={prefix} />
      </p>
      {changePct != null && Math.abs(changePct) >= 10 && (
        <p
          className={[
            'mt-2 text-[11px] flex items-center gap-1',
            positive ? 'text-[#22C3A6]' : 'text-[#94A3B8]',
          ].join(' ')}
        >
          <span>{positive ? '▲' : '▼'}</span>
          <span>{Math.abs(changePct).toFixed(1)}%</span>
          {changeLabel && (
            <span className="text-[#94A3B8]">· {changeLabel}</span>
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
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  // Load all sales for the logged-in cafe
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
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

  // Derived analytics based on range – now powered by computeSalesInsights
  const {
    series,
    weeklySeries,
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
        weeklySeries: [] as WeeklyPoint[],
        totalRevenue: 0,
        avgDailyRevenue: 0,
        bestWeekdayLabel: null as string | null,
        trendPct: null as number | null,
        cashTotal: 0,
        cardTotal: 0,
        weekdayData: [] as { name: string; total: number }[],
        topDays: [] as TopDayView[],
        periodLabel: '',
      };
    }

    const windowDays: Record<RangeKey, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      custom: 30, // placeholder; custom not yet active
    };

    const selectedWindow = windowDays[range];
    const insights = computeSalesInsights(sales, selectedWindow);

    // Build chart series for the selected date window
    const { start, end } = getRangeDates(range);
    const startYmd = toYMD(start);
    const endYmd = toYMD(end);

    const filteredForSeries = sales.filter(
      (s) => s.sale_date >= startYmd && s.sale_date <= endYmd
    );

    const series = buildDailySeries(filteredForSeries, start, end);
    const weeklySeries = buildWeeklySeries(series);

    // Best weekday label, from revenueByWeekday
    let bestWeekdayLabel: string | null = null;
    const weekdayTotals = insights.revenueByWeekday ?? [];
    if (weekdayTotals.length) {
      let bestIdx = 0;
      for (let i = 1; i < weekdayTotals.length; i++) {
        if (weekdayTotals[i] > weekdayTotals[bestIdx]) bestIdx = i;
      }
      if (weekdayTotals[bestIdx] > 0) {
        bestWeekdayLabel = WEEKDAYS_FULL[bestIdx];
      }
    }

    const weekdayData = WEEKDAYS.map((name, idx) => ({
      name,
      total: insights.revenueByWeekday[idx] ?? 0,
    }));

    const { cashTotal, cardTotal } = insights.cardCashShare;

    // Top days from insights, re-attached with notes from the original rows
    const topDays: TopDayView[] = insights.topRevenueDays.map((day) => {
      const row = sales.find((r) => r.sale_date === day.date);
      return {
        id: row?.id ?? day.date,
        date: day.date,
        formattedDate: day.formattedDate,
        revenue: day.revenue,
        notes: row?.notes ?? null,
      };
    });

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
      weeklySeries,
      totalRevenue: insights.totalRevenue,
      avgDailyRevenue: insights.averageDailyRevenue,
      bestWeekdayLabel,
      trendPct: insights.revenueChangePct,
      cashTotal,
      cardTotal,
      weekdayData,
      topDays,
      periodLabel,
    };
  }, [sales, range]);

  const hasData = series.length > 0;
  const totalWeekdayRevenue = sum(weekdayData.map((d) => d.total));
  const bestWeekdayIndex =
    weekdayData.length && totalWeekdayRevenue > 0
      ? weekdayData.reduce(
          (bestIdx, day, idx, arr) =>
            day.total > arr[bestIdx].total ? idx : bestIdx,
          0
        )
      : -1;
  const worstWeekdayIndex =
    weekdayData.length && totalWeekdayRevenue > 0
      ? weekdayData.reduce(
          (worstIdx, day, idx, arr) =>
            day.total < arr[worstIdx].total ? idx : worstIdx,
          0
        )
      : -1;

  const paymentTotal = cashTotal + cardTotal;
  const cardSharePct =
    paymentTotal > 0 ? Math.round((cardTotal / paymentTotal) * 100) : null;
  const cashSharePct =
    paymentTotal > 0 ? Math.round((cashTotal / paymentTotal) * 100) : null;

  const insightCards = [
    bestWeekdayIndex >= 0
      ? {
          title: `${WEEKDAYS_FULL[bestWeekdayIndex]} drives ~${Math.round(
            (weekdayData[bestWeekdayIndex].total / totalWeekdayRevenue) * 100
          )}% of revenue`,
          action:
            'Consider extending hours or adding staff on your best day.',
        }
      : null,
    worstWeekdayIndex >= 0
      ? {
          title: `${WEEKDAYS_FULL[worstWeekdayIndex]} is consistently the weakest day`,
          action: 'Candidate for a lunch special or promo next week.',
        }
      : null,
    cardSharePct != null && cardSharePct >= 70
      ? {
          title: `Card payments dominate (${cardSharePct}% of revenue)`,
          action:
            'High card usage usually correlates with faster checkout and higher ticket sizes.',
        }
      : null,
  ].filter(Boolean) as { title: string; action: string }[];

  // ---------- skeletons ----------

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-white rounded animate-pulse" />
          <div className="h-8 w-56 bg-white rounded-full animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-4">
          <SkeletonChart height={260} />
          <SkeletonChart height={260} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,1.7fr] gap-4">
          <SkeletonChart height={240} />
          <SkeletonChart height={240} />
        </div>
      </section>
    );
  }

  // ---------- empty state ----------

  if (!hasData) {
    return (
      <EmptyState
        title="Not enough data yet"
        description="Add at least a week of sales entries to unlock trend analysis."
      />
    );
  }

  // ---------- chart tooltips ----------

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const value = payload[0]?.value ?? 0;
    return (
      <div className="rounded-md bg-white lp-card px-3 py-2 text-xs text-[#0B1220] shadow-lg">
        <div className="font-medium mb-1">{label}</div>
        <div>{formatCurrencyAUD(value)}</div>
      </div>
    );
  };

  return (
    <section className="space-y-4 md:space-y-6">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sales analytics</h2>
          <p className="text-sm text-[#94A3B8]">
            Practical signals to decide staffing, promos, and priorities.
          </p>
        </div>

        <PeriodSelector value={range} onChange={setRange} />
      </div>

      {/* At-a-glance health */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B1220]">At-a-glance health</h3>
          <p className="text-xs text-[#94A3B8]">Key signals for this period</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
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
            <p className="text-xs font-medium text-[#94A3B8] mb-1">
              Best-performing day
            </p>
            <p className="text-2xl font-semibold text-[#0B1220]">
              {bestWeekdayLabel ?? 'No data'}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-2">
              Based on revenue over the selected period.
            </p>
          </AnimatedCard>

          {paymentTotal > 0 && (
            <AnimatedCard delay={240}>
              <p className="text-xs font-medium text-[#94A3B8] mb-1">
                Card vs cash share
              </p>
              <p className="text-sm text-[#0B1220]">
                Card:{' '}
                <span className="font-semibold">
                  {cardSharePct == null ? 'No data' : `${cardSharePct}%`}
                </span>{' '}
                &middot; Cash:{' '}
                <span className="font-semibold">
                  {cashSharePct == null ? 'No data' : `${cashSharePct}%`}
                </span>
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-2">
                High card usage usually correlates with faster checkout.
              </p>
            </AnimatedCard>
          )}
        </div>
      </section>

      {/* Patterns that matter */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B1220]">Patterns that matter</h3>
          <p className="text-xs text-[#94A3B8]">Use this to plan staffing and promos</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,1.7fr] gap-4">
          <AnimatedCard>
            <p className="text-xs font-medium text-[#94A3B8] mb-2">
              {range === '7d' ? 'Daily revenue totals' : 'Weekly revenue totals'}
            </p>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={range === '7d' ? series : weeklySeries}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
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
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} fill={CHART_COLORS.bars} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              {range === '7d'
                ? 'Daily totals for the last week.'
                : 'Weekly totals keep the trend readable without daily noise.'}
            </p>
          </AnimatedCard>

          <AnimatedCard>
            <p className="text-xs font-medium text-[#94A3B8] mb-2">Revenue by weekday</p>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
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
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {weekdayData.map((entry, idx) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={
                          idx === bestWeekdayIndex
                            ? '#22C3A6'
                            : idx === worstWeekdayIndex
                            ? '#F59E0B'
                            : CHART_COLORS.bars
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              Top and weakest days are highlighted automatically.
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* Actionable insight blocks */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B1220]">Actionable insights</h3>
          <p className="text-xs text-[#94A3B8]">Suggested actions for next week</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insightCards.length ? (
            insightCards.slice(0, 3).map((insight) => (
              <AnimatedCard key={insight.title}>
                <p className="text-sm font-semibold text-[#0B1220]">{insight.title}</p>
                <p className="mt-2 text-xs text-[#94A3B8]">{insight.action}</p>
              </AnimatedCard>
            ))
          ) : (
            <AnimatedCard>
              <p className="text-sm font-semibold text-[#0B1220]">No clear patterns yet</p>
              <p className="mt-2 text-xs text-[#94A3B8]">Add a few more weeks of sales to surface actionable insights.</p>
            </AnimatedCard>
          )}
        </div>
      </section>

      {/* Standout days */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B1220]">Standout days (what happened here?)</h3>
          <p className="text-xs text-[#94A3B8]">Use notes to capture weather, events, promos</p>
        </div>
        <AnimatedCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-[#94A3B8] border-b border-[#E2E8F0]">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4 hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {topDays.map((day) => (
                  <tr
                    key={day.id}
                    className="border-b border-[#E2E8F0] last:border-0"
                  >
                    <td className="py-2 pr-4 whitespace-nowrap text-[#0B1220]">
                      {day.formattedDate}
                    </td>
                    <td className="py-2 pr-4 text-[#0B1220]">
                      {formatCurrencyAUD(day.revenue)}
                    </td>
                    <td className="py-2 pr-4 max-w-xs truncate text-[#94A3B8] hidden md:table-cell">
                      {day.notes ?? 'No notes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      </section>

      {errorMessage && (
        <p className="text-xs text-[#EF4444] mt-2">{errorMessage}</p>
      )}

      {ENABLE_ANALYTICS_DEBUG && (
        <DebugPanel
          title="Sales analytics debug"
          data={{
            range,
            salesCount: sales.length,
            totalRevenue,
            avgDailyRevenue,
            trendPct,
            cashTotal,
            cardTotal,
            weekdayData,
            series,
            topDays,
          }}
        />
      )}
    </section>
  );
}





