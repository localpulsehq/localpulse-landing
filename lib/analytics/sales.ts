// lib/analytics/sales.ts
//
// Centralised analytics helpers for sales data,
// using the REAL SalesRow structure from your database.

import {
  format,
  parseISO,
  startOfDay,
  subDays,
  isAfter,
  isBefore,
} from "date-fns";

/* -------------------------------------------------------------------------- */
/* SalesRow Type (Matches Your Supabase Table Exactly)                        */
/* -------------------------------------------------------------------------- */

export type SalesRow = {
  id: string;
  cafe_id: string;
  sale_date: string;                // YYYY-MM-DD or ISO string
  total_revenue: number;
  total_transactions: number | null;
  cash_revenue: number | null;
  card_revenue: number | null;
  notes: string;
};

/* -------------------------------------------------------------------------- */
/* Small Helpers                                                              */
/* -------------------------------------------------------------------------- */

function toLocalDay(dateLike: string | Date): Date {
  const d = typeof dateLike === "string" ? parseISO(dateLike) : dateLike;
  return startOfDay(d);
}

export function filterLastNDays(
  rows: SalesRow[],
  days: number,
  now: Date = new Date()
): SalesRow[] {
  const end = startOfDay(now);
  const start = subDays(end, days - 1);

  return rows.filter((row) => {
    const d = toLocalDay(row.sale_date);
    return (isAfter(d, start) || d.getTime() === start.getTime()) &&
           (isBefore(d, end) || d.getTime() === end.getTime());
  });
}

function sumBy(
  rows: SalesRow[],
  selector: (r: SalesRow) => number | null
): number {
  return rows.reduce((acc, r) => acc + (selector(r) ?? 0), 0);
}

/* -------------------------------------------------------------------------- */
/* Core Metrics                                                                */
/* -------------------------------------------------------------------------- */

export function getTotalRevenueLastXDays(
  rows: SalesRow[],
  days: number,
  now: Date = new Date()
): number {
  const subset = filterLastNDays(rows, days, now);
  return sumBy(subset, (r) => r.total_revenue);
}

export function getAverageDailyRevenue(
  rows: SalesRow[],
  days: number,
  now: Date = new Date()
): number {
  if (days <= 0) return 0;
  const total = getTotalRevenueLastXDays(rows, days, now);
  return total / days;
}

export function getRevenueChangeVsPreviousPeriod(
  rows: SalesRow[],
  days: number,
  now: Date = new Date()
): number {
  const endCurrent = startOfDay(now);
  const startCurrent = subDays(endCurrent, days - 1);

  const endPrev = subDays(startCurrent, 1);
  const startPrev = subDays(endPrev, days - 1);

  const inRange = (row: SalesRow, start: Date, end: Date) => {
    const d = toLocalDay(row.sale_date);
    return (isAfter(d, start) || d.getTime() === start.getTime()) &&
           (isBefore(d, end) || d.getTime() === end.getTime());
  };

  const currentRows = rows.filter((r) => inRange(r, startCurrent, endCurrent));
  const previousRows = rows.filter((r) => inRange(r, startPrev, endPrev));

  const currentTotal = sumBy(currentRows, (r) => r.total_revenue);
  const previousTotal = sumBy(previousRows, (r) => r.total_revenue);

  if (previousTotal === 0) return 0;

  return ((currentTotal - previousTotal) / previousTotal) * 100;
}

export function getBestPerformingDay(
  rows: SalesRow[],
  days: number,
  now: Date = new Date()
) {
  const subset = filterLastNDays(rows, days, now);
  if (!subset.length) return null;

  const best = subset.reduce((a, b) =>
    a.total_revenue >= b.total_revenue ? a : b
  );

  const formatted = format(toLocalDay(best.sale_date), "dd MMM yyyy");

  return {
    date: best.sale_date,
    formattedDate: formatted,
    revenue: best.total_revenue,
  };
}

export function getCardCashShare(
  rows: SalesRow[],
  days: number,
  now: Date = new Date()
) {
  const subset = filterLastNDays(rows, days, now);

  const cash = sumBy(subset, (r) => r.cash_revenue);
  const card = sumBy(subset, (r) => r.card_revenue);

  const total = cash + card;
  if (total === 0)
    return { cashPct: 0, cardPct: 0, cashTotal: 0, cardTotal: 0 };

  return {
    cashPct: (cash / total) * 100,
    cardPct: (card / total) * 100,
    cashTotal: cash,
    cardTotal: card,
  };
}

export function getRevenueByWeekday(rows: SalesRow[]): number[] {
  const totals = Array(7).fill(0);

  rows.forEach((r) => {
    const wd = toLocalDay(r.sale_date).getDay(); // 0–6
    totals[wd] += r.total_revenue;
  });

  return totals;
}

export function getTopRevenueDays(rows: SalesRow[], count = 5) {
  return [...rows]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, count)
    .map((row) => ({
      date: row.sale_date,
      formattedDate: format(toLocalDay(row.sale_date), "dd MMM yyyy"),
      revenue: row.total_revenue,
    }));
}

/* -------------------------------------------------------------------------- */
/* Bundled Insight Helper                                                     */
/* -------------------------------------------------------------------------- */

export type SalesInsights = {
  windowDays: number;
  totalRevenue: number;
  averageDailyRevenue: number;
  revenueChangePct: number;
  bestDay: ReturnType<typeof getBestPerformingDay>;
  cardCashShare: ReturnType<typeof getCardCashShare>;
  revenueByWeekday: number[];
  topRevenueDays: ReturnType<typeof getTopRevenueDays>;
};

export function computeSalesInsights(
  rows: SalesRow[],
  windowDays: number,
  now: Date = new Date()
): SalesInsights {
  return {
    windowDays,
    totalRevenue: getTotalRevenueLastXDays(rows, windowDays, now),
    averageDailyRevenue: getAverageDailyRevenue(rows, windowDays, now),
    revenueChangePct: getRevenueChangeVsPreviousPeriod(rows, windowDays, now),
    bestDay: getBestPerformingDay(rows, windowDays, now),
    cardCashShare: getCardCashShare(rows, windowDays, now),
    revenueByWeekday: getRevenueByWeekday(rows),
    topRevenueDays: getTopRevenueDays(rows),
  };
}
