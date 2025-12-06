
# Local Pulse – Sales Analytics Engine

This document explains how the sales analytics layer for **Local Pulse** works as of Week 4.  
It’s written so that “future you” (or anyone else) can safely refactor, debug, or extend it.

---

## 1. High‑level architecture

### 1.1. Overall flow

1. **User logs in** and is routed to `/dashboard`.
2. The **overview page** (`app/dashboard/page.tsx`) and **analytics page** (`app/dashboard/sales-analytics/page.tsx`) both:
   - Look up the current Supabase user.
   - Resolve the user’s `cafe_id` from the `cafes` table.
   - Load a slice of rows from the `sales` table for that café.
3. The raw sales rows are passed into the **analytics engine**:
   - Located in `lib/analytics/sales.ts`.
   - Core function: `computeSalesInsights(sales, windowSizeDays)`.
4. The React pages take the **computed metrics** and render:
   - KPI cards (total revenue, trend vs previous period, etc.).
   - Charts (Recharts line/area/bar/pie).
   - Tables (top days, weekday aggregates, etc.).

Key idea: **all business logic around revenue windows & comparisons lives in `lib/analytics/sales.ts`**, so UI components stay dumb and easy to change.

---

## 2. Data model recap

### 2.1. `sales` table (Supabase / Postgres)

Each row is one day of sales for one café.

```ts
// lib/analytics/sales.ts and multiple pages
export type SalesRow = {
  id: string;
  cafe_id: string;
  sale_date: string;          // 'YYYY-MM-DD' (UTC-normalised)
  total_revenue: number;
  total_transactions: number | null;
  cash_revenue: number | null;
  card_revenue: number | null;
  notes: string | null;
};
```

Constraints / indexes (defined in SQL migrations):

- `unique (cafe_id, sale_date)`  
  → one row per day per café.
- `index (cafe_id, sale_date desc)`  
  → fast range queries for a given café.

There is also an **audit table** `sales_audit` populated by triggers, but it is not used for analytics; it’s for safety / debugging.

---

## 3. The analytics engine (`lib/analytics/sales.ts`)

### 3.1. Goals

`computeSalesInsights` aims to answer the questions:

- *“What was revenue in the last N days?”*
- *“How does that compare to the previous N days?”*
- *“What does the daily trend look like?”*
- *“What are the best days in that window?”*

…without duplicating this logic across pages.

### 3.2. Utility types and helpers

```ts
export type SalesInsights = {
  windowDays: number;

  // Core aggregates
  totalRevenue: number;
  avgDailyRevenue: number;
  totalTransactions: number;
  cashTotal: number;
  cardTotal: number;

  // Change vs previous period
  previousTotalRevenue: number;
  revenueChangePct: number | null; // null if no meaningful comparison

  // Time series for charting
  dailySeries: {
    date: string; // 'YYYY-MM-DD'
    total: number;
    cash: number;
    card: number;
  }[];

  // Best days in the window
  topDays: SalesRow[];
};
```

#### 3.2.1. Date helpers

We normalise dates and avoid timezone gotchas:

```ts
function toStartOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}
```

#### 3.2.2. Window math

We think in terms of:

- **Current window**: last `windowDays` days including today.
- **Previous window**: the `windowDays` immediately before the current window.

```ts
type DateRange = { start: Date; end: Date };

function getWindowRanges(windowDays: number, today = new Date()): {
  current: DateRange;
  previous: DateRange;
} {
  const end = toStartOfDay(today);
  const start = addDays(end, -windowDays + 1);

  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -windowDays + 1);

  return {
    current: { start, end },
    previous: { start: prevStart, end: prevEnd },
  };
}
```

---

### 3.3. Core function: `computeSalesInsights`

```ts
export function computeSalesInsights(
  rawSales: SalesRow[],
  windowDays: number,
  todayInput?: Date,
): SalesInsights {
  if (!windowDays || windowDays <= 0) {
    throw new Error('windowDays must be a positive integer');
  }

  const today = todayInput ? toStartOfDay(todayInput) : toStartOfDay(new Date());

  // 1. Build a map date → aggregated data
  const byDate = new Map<string, {
    total: number;
    cash: number;
    card: number;
    transactions: number;
  }>();

  for (const row of rawSales) {
    if (!row.sale_date) continue;
    const key = row.sale_date; // already 'YYYY-MM-DD'

    if (!byDate.has(key)) {
      byDate.set(key, { total: 0, cash: 0, card: 0, transactions: 0 });
    }

    const agg = byDate.get(key)!;
    agg.total += row.total_revenue ?? 0;
    agg.cash += row.cash_revenue ?? 0;
    agg.card += row.card_revenue ?? 0;
    agg.transactions += row.total_transactions ?? 0;
  }

  // 2. Determine current + previous windows
  const { current, previous } = getWindowRanges(windowDays, today);

  const currentStartYmd = toYmd(current.start);
  const currentEndYmd   = toYmd(current.end);
  const prevStartYmd    = toYmd(previous.start);
  const prevEndYmd      = toYmd(previous.end);

  // 3. Build daily series for current window
  const dailySeries: SalesInsights['dailySeries'] = [];
  let totalRevenue = 0;
  let totalTransactions = 0;
  let cashTotal = 0;
  let cardTotal = 0;

  for (
    let d = new Date(current.start);
    d <= current.end;
    d = addDays(d, 1)
  ) {
    const key = toYmd(d);
    const agg = byDate.get(key) ?? {
      total: 0,
      cash: 0,
      card: 0,
      transactions: 0,
    };

    dailySeries.push({
      date: key,
      total: agg.total,
      cash: agg.cash,
      card: agg.card,
    });

    totalRevenue += agg.total;
    totalTransactions += agg.transactions;
    cashTotal += agg.cash;
    cardTotal += agg.card;
  }

  const daysInWindow =
    (current.end.getTime() - current.start.getTime()) / (1000 * 60 * 60 * 24) + 1;

  const avgDailyRevenue =
    daysInWindow > 0 ? totalRevenue / daysInWindow : totalRevenue;

  // 4. Compute previous window revenue
  let previousTotalRevenue = 0;

  for (
    let d = new Date(previous.start);
    d <= previous.end;
    d = addDays(d, 1)
  ) {
    const key = toYmd(d);
    const agg = byDate.get(key);
    if (agg) previousTotalRevenue += agg.total;
  }

  // 5. Percentage change vs previous
  let revenueChangePct: number | null = null;
  if (previousTotalRevenue > 0) {
    revenueChangePct =
      ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100;
  }

  // 6. Top days (within the *current* window)
  const inWindowRows = rawSales.filter(
    row => row.sale_date >= currentStartYmd && row.sale_date <= currentEndYmd,
  );

  const topDays = [...inWindowRows]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 7);

  return {
    windowDays,
    totalRevenue,
    avgDailyRevenue,
    totalTransactions,
    cashTotal,
    cardTotal,
    previousTotalRevenue,
    revenueChangePct,
    dailySeries,
    topDays,
  };
}
```

#### Notes

- **Zero / missing data**:
  - If the previous window has `0` revenue, `revenueChangePct` is `null` (not ±∞).
- **Gaps** in sales (days with no row) appear as `0` in the daily series.
- Changing the window length (7, 30, 90 days) is just a parameter change.

---

## 4. How pages use the analytics engine

### 4.1. Overview page (`app/dashboard/page.tsx`)

**Purpose:**  
Show quick, high-level KPIs for the last 7 and 30 days + visual sparkline.

**Key flow:**

1. Resolve `cafeId` from logged-in user.
2. Query last **60 days** of `sales` (enough for a 30‑day window + previous 30‑day window).
3. Pass all these rows into `computeSalesInsights` twice:
   - `computeSalesInsights(rows, 7)`
   - `computeSalesInsights(rows, 30)`
4. Read values:
   - `totalRevenue` → revenue in current window.
   - `revenueChangePct` → change vs previous window.
5. Build a 30‑day sparkline from the same data.

Pseudo-snippet (simplified):

```ts
const rows = (sales ?? []) as SalesRow[];

const insights7 = computeSalesInsights(rows, 7);
const insights30 = computeSalesInsights(rows, 30);

setRevenue7(insights7.totalRevenue);
setRevenue7Change(insights7.revenueChangePct);

setRevenue30(insights30.totalRevenue);
setRevenue30Change(insights30.revenueChangePct);
```

The sparkline is still computed manually on the page since it’s purely visual and doesn’t affect other logic.

---

### 4.2. Sales analytics page (`app/dashboard/sales-analytics/page.tsx`)

**Purpose:**  
Richer, more detailed view:

- Full revenue-over-time chart.
- Cash vs card donut.
- Revenue by weekday.
- Top revenue days table.

**Key flow:**

1. Load all `sales` for the café (ordered by `sale_date`).
2. Let the user choose a period (`7d`, `30d`, `90d`).
3. For the selected period:
   - Locally filter rows to a date window.
   - Build charts and metrics.

Here we **don’t** call `computeSalesInsights` directly for every range, because the page also needs some bespoke visual data:

- Weekday totals.
- Donut segments for cash vs card.
- Per-day chart series with nice labels.

Instead, the analytics page maintains its own `useMemo` that:

- Uses the same ***ideas*** as `computeSalesInsights` (current vs previous windows, etc.).
- But shaped specifically for the UI chart requirements.

If you want to centralise even more logic later, you could:

- Add extra fields to `SalesInsights` (weekday totals, etc.).
- Or add new functions like `computeWeekdayBreakdown(rows, windowDays)`.

---

## 5. Loading / error / empty states

### 5.1. Shared skeleton components

- `components/ui/SkeletonCard.tsx`  
  → grey placeholder cards used while loading.
- `components/ui/SkeletonChart.tsx`  
  → wide rectangular skeleton used for chart placeholders.

Both the **Overview** and **Sales Analytics** pages use these closely so the UX stays consistent.

### 5.2. Empty vs error

- If Supabase queries fail:
  - Pages show **error boxes** (red border, explanatory text).
- If queries succeed but there’s **no sales**:
  - Analytics page shows a **friendly empty state** explaining that they need some data first:
    - e.g. “Add some sales in the Sales tab to unlock analytics…”.

This separation matters for debugging:  
*“Is something broken?”* vs *“Or do we just have no data?”*

---

## 6. Performance and future‑proofing

### 6.1. Current performance

- For now we’re dealing with a **single café** and modest data sizes.
- Queries:
  - Overview → last 60 days of sales (cheap).
  - Analytics → all sales for that café (still cheap at MVP scale).

Supabase + Postgres handle these easily, especially with the `(cafe_id, sale_date)` index.

### 6.2. Scaling ideas (for later)

If the app grows:

1. **Server-side analytics endpoints**
   - Move `computeSalesInsights` (or similar) server‑side.
   - Expose `/api/analytics/sales?window=30` that returns JSON‐ready metrics.
2. **Materialised views**
   - Pre‑compute rolling 7/30/90 day aggregates in Postgres.
3. **Partitioning**
   - Partition `sales` by month/year for really large datasets.

But for Week 4 the current approach is **more than sufficient** and keeps things simple.

---

## 7. How to extend safely

### 7.1. Adding a new KPI

Example: *“Average ticket size (revenue per transaction)”*.

1. Extend `SalesInsights`:

   ```ts
   avgTicketSize: number | null;
   ```

2. Compute it in `computeSalesInsights`:

   ```ts
   const avgTicketSize =
     totalTransactions > 0 ? totalRevenue / totalTransactions : null;
   ```

3. Return it:

   ```ts
   return {
     // existing fields...
     avgTicketSize,
   };
   ```

4. Use it on the Overview or Analytics page via a new `AnimatedCard`.

### 7.2. Adding a new period on analytics (e.g. “This calendar month”)

- Either add a new `RangeKey` to the analytics page and compute date range with a month‑aware helper.
- Or extend `computeSalesInsights` to accept an explicit start/end date instead of `windowDays`.

Example:

```ts
export function computeSalesInsightsForRange(
  rawSales: SalesRow[],
  range: { start: Date; end: Date },
  todayInput?: Date,
): SalesInsights { /* ... */ }
```

Then plug that into a calendar/period picker.

---

## 8. Debugging guide

### 8.1. Numbers look “too low” or “zero”

Checklist:

1. **Is the user logged in as the correct café owner?**
   - Check `supabase.auth.getUser()` result in dev tools.
2. **Does `cafes` have a row with `owner_id = user.id`?**
   - Look at Supabase → Table Editor → `cafes`.
3. **Does `sales` have rows for that `cafe_id` and date range?**
   - Filter by `cafe_id` and `sale_date` in Supabase.
4. Log the `rows` passed into `computeSalesInsights`:
   ```ts
   console.log('insights rows', rows);
   ```
5. Log window boundaries:
   ```ts
   console.log({ currentStartYmd, currentEndYmd, prevStartYmd, prevEndYmd });
   ```

### 8.2. Trend percentage looks wrong

- Remember: it’s **current window** vs **previous window of same length**.
- If the previous window has 0 revenue, the function intentionally returns `null`.

---

## 9. Summary

- All **core analytics math** sits in `lib/analytics/sales.ts` via `computeSalesInsights`.
- The **Overview** and **Sales Analytics** pages are now thin consumers:
  - They query Supabase for `sales`.
  - They hand those rows to the analytics engine.
  - They render charts and cards using the returned metrics.
- This design makes it easy to:
  - Add new KPIs.
  - Change UI libraries.
  - Move computation server‑side later, without rewriting every page.

If you’re changing anything:
- Start by updating **`SalesInsights` + `computeSalesInsights`**.
- Then adjust whichever page consumes those new fields.
