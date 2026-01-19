"use client";

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
import { ENABLE_ANALYTICS_DEBUG } from '@/lib/debug';
import { DebugPanel } from '@/components/ui/DebugPanel';
import { InsightCards } from "@/components/insights/InsightCards";

// ---------- helpers ----------



function DeltaLabel({
  change,
  label,
}: {
  change: number | null;
  label: string;
}) {
  if (change === null) {
    return (
      <span className="text-xs text-[#94A3B8]">
        No comparison yet {label}
      </span>
    );
  }

  const isUp = change >= 0;
  const rounded = Math.abs(change).toFixed(0);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isUp ? "text-[#22C3A6]" : "text-[#F59E0B]"
      }`}
    >
      <span>{isUp ? "Up" : "Down"}</span>
      <span>
        {rounded}% {label}
      </span>
    </span>
  );
}

function confidenceLabel(level: "low" | "moderate" | "high") {
  switch (level) {
    case "high":
      return "High confidence";
    case "moderate":
      return "Moderate confidence";
    default:
      return "Low confidence (limited data)";
  }
}

function confidenceFromCount(
  count: number,
  moderateAt: number,
  highAt: number
): "low" | "moderate" | "high" {
  if (count >= highAt) return "high";
  if (count >= moderateAt) return "moderate";
  return "low";
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
      className="w-full h-16 text-[#22C3A6]/80"
      aria-hidden="true"
    >
      <line
        x1={0}
        y1={height - 6}
        x2={width}
        y2={height - 6}
        className="stroke-[#E2E8F0]"
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
        className="fill-[#22C3A6] animate-pulse"
      >
        <title>Most recent day</title>
      </circle>
    </svg>
  );
}

type InsightCard = {
  id: string;
  title: string;
  kind: "signal" | "opportunity";
  severity: "info" | "warn" | "error" | "success";
  why: string;
  action?: string[];
};

type ReviewVelocity = {
  last7: number;
  prev7: number;
  deltaPct: number | null;
  last30?: number;
  prev30?: number;
  delta30Pct?: number | null;
};

type ReviewSummary = {
  total: number;
  avgRating: number | null;
  reviewVelocity: ReviewVelocity;
};

type OnboardingStatus =
  | "account_created"
  | "location_connected"
  | "data_fetching"
  | "first_insight_ready"
  | "digest_confirmed"
  | "preferences_set"
  | "onboarding_complete";

const ONBOARDING_STORAGE_KEY = "lp:onboarding:v1";
const ONBOARDING_CHECKLIST_DISMISS_KEY = "lp:onboarding:checklist_dismissed";

function OnboardingChecklist() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(
      ONBOARDING_CHECKLIST_DISMISS_KEY
    );
    if (dismissed === "true") return;

    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { status?: OnboardingStatus };
      if (parsed?.status) {
        setStatus(parsed.status);
        setVisible(true);
      }
    } catch {
      return;
    }
  }, []);

  if (!visible || !status) return null;

  const isLocationConnected = [
    "location_connected",
    "data_fetching",
    "first_insight_ready",
    "digest_confirmed",
    "preferences_set",
    "onboarding_complete",
  ].includes(status);

  const isInsightReady = [
    "first_insight_ready",
    "digest_confirmed",
    "preferences_set",
    "onboarding_complete",
  ].includes(status);

  const isDigestQueued = [
    "digest_confirmed",
    "preferences_set",
    "onboarding_complete",
  ].includes(status);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
            Onboarding checklist
          </p>
          <p className="mt-1 text-sm text-[#0B1220]">
            Quick status for your first week on LocalPulse.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(
              ONBOARDING_CHECKLIST_DISMISS_KEY,
              "true"
            );
            setVisible(false);
          }}
          className="text-xs text-[#94A3B8] hover:text-[#0B1220]"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[#94A3B8] sm:grid-cols-3">
        <div
          className={`rounded-xl border px-3 py-2 ${
            isLocationConnected
              ? "border-[#DCFCE7] bg-[#F0FDF4] text-[#166534]"
              : "border-[#E2E8F0] bg-[#F9FBFC]"
          }`}
        >
          {isLocationConnected ? "OK" : "."} Location connected
        </div>
        <div
          className={`rounded-xl border px-3 py-2 ${
            isInsightReady
              ? "border-[#DCFCE7] bg-[#F0FDF4] text-[#166534]"
              : "border-[#E2E8F0] bg-[#F9FBFC]"
          }`}
        >
          {isInsightReady ? "OK" : "."} First insight generated
        </div>
        <div
          className={`rounded-xl border px-3 py-2 ${
            isDigestQueued
              ? "border-[#DCFCE7] bg-[#F0FDF4] text-[#166534]"
              : "border-[#E2E8F0] bg-[#F9FBFC]"
          }`}
        >
          {isDigestQueued ? "OK" : "."} Weekly digest scheduled
        </div>
      </div>
    </div>
  );
}



// ---------- page ----------

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue30, setRevenue30] = useState(0);
  const [revenue30Change, setRevenue30Change] =
    useState<number | null>(null);

  const [sparklineValues, setSparklineValues] = useState<number[]>([]);

  // other insights
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

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

      // Load insights
      setInsightsLoading(true);
      try {
        const res = await fetch(`/api/insights/overview?windowDays=180`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to load insights");
        }

        const cards = Array.isArray(json?.insightCards)
          ? json.insightCards
          : [];

        if (!cancelled) {
          setInsightCards(cards);
          setReviewSummary(
            json?.reviews && typeof json.reviews.total === "number"
              ? (json.reviews as ReviewSummary)
              : null
          );
        }
      } catch {
        if (!cancelled) {
          setInsightCards([]);
          setReviewSummary(null);
        }
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }

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
      const insights30 = computeSalesInsights(rows, 30);

      setRevenue30(insights30.totalRevenue);
      setRevenue30Change(insights30.revenueChangePct);

      // Sparkline for last 30 days
      const revenueMap = new Map<string, number>();

      for (const row of rows) {
        const date = row.sale_date;
        const existing = revenueMap.get(date) ?? 0;
        revenueMap.set(date, existing + (row.total_revenue ?? 0));

      }

      const spark: number[] = [];
      for (let offset = 29; offset >= 0; offset--) {
        const d = daysAgo(offset);
        const key = d.toISOString().slice(0, 10);
        spark.push(revenueMap.get(key) ?? 0);
      }
      setSparklineValues(spark);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- loading state (Task 2 polish) ----------

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-[#E2E8F0] rounded animate-pulse" />
          <div className="h-3 w-64 bg-[#E2E8F0] rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  // ---------- error state ----------

  if (error) {
    return (
      <section className="border border-[#EF4444]/40 rounded-xl bg-white p-6">
        <p className="text-sm text-[#EF4444]">{error}</p>
      </section>
    );
  }

    // ---------- main content ----------
  const hasReviewData = Boolean(reviewSummary?.total);
  const reviewVelocity = reviewSummary?.reviewVelocity ?? null;
  const reviewCount30 = reviewVelocity?.last30 ?? reviewSummary?.total ?? 0;
  const reviewDelta30 = reviewVelocity?.delta30Pct ?? null;
  const reviewConfidence = confidenceFromCount(
    reviewSummary?.total ?? 0,
    10,
    30
  );
  const velocityConfidence = confidenceFromCount(reviewCount30, 10, 30);

  const revenueCoverage = sparklineValues.filter((value) => value > 0).length;
  const hasRevenueData = revenue30 > 0 && revenueCoverage > 0;
  const revenueConfidence = confidenceFromCount(revenueCoverage, 10, 20);
  const sparklineHasData = sparklineValues.some((value) => value > 0);

  const hasAnyData = hasReviewData || hasRevenueData || revenueCoverage > 0;
  const anyLowConfidence =
    (hasReviewData && reviewConfidence === "low") ||
    (hasReviewData && velocityConfidence === "low") ||
    (hasRevenueData && revenueConfidence === "low");
  const primaryAlert = insightCards.find((card) => card.severity === "warn") ?? null;

  const signalOrder = [
    "rating_gap",
    "reviews_summary",
    "low_review_volume",
    "velocity_drop",
    "rating_sentiment_mismatch",
    "recurring_complaint",
    "no_reviews",
    "competitor_benchmark_ready",
  ];

  const rankedSignals = insightCards
    .filter((card) => card.kind === "signal")
    .sort((a, b) => {
      const aRank = signalOrder.indexOf(a.id);
      const bRank = signalOrder.indexOf(b.id);
      const aScore = aRank === -1 ? signalOrder.length : aRank;
      const bScore = bRank === -1 ? signalOrder.length : bRank;
      return aScore - bScore;
    });

  const focusFromSignals = rankedSignals
    .map((card) => {
      switch (card.id) {
        case "rating_gap":
          return {
            text: "Review top complaints and adjust service by Friday.",
            linkedTo: "Competitors have a higher average rating",
          };
        case "reviews_summary":
          return {
            text: "Respond to 3 recent reviews within 48 hours.",
            linkedTo: "Reviews summary",
          };
        case "low_review_volume":
          return {
            text: "Aim for 10 reviews by next Sunday.",
            linkedTo: "Not enough reviews yet to draw conclusions",
          };
        case "velocity_drop":
          return {
            text: "Ask for reviews during off-peak hours this week.",
            linkedTo: "Review volume is slowing",
          };
        case "recurring_complaint": {
          const match = card.title.match(/"([^"]+)"/);
          const phrase = match?.[1];
          return {
            text: phrase
              ? `Address "${phrase}" feedback with staff by Friday.`
              : "Address repeated feedback with staff by Friday.",
            linkedTo: card.title,
          };
        }
        case "rating_sentiment_mismatch":
          return {
            text: "Resolve one recurring complaint before Friday.",
            linkedTo: "High ratings but negative themes detected",
          };
        case "no_reviews":
          return {
            text: "Connect Google reviews by Friday to unlock insights.",
            linkedTo: "No reviews yet",
          };
        default:
          return null;
      }
    })
    .filter(
      (item): item is { text: string; linkedTo: string } => Boolean(item)
    );

  const fallbackFocus = [
    hasReviewData
      ? { text: "Respond to 3 recent reviews within 48 hours." }
      : { text: "Connect Google reviews by Friday to unlock insights." },
    hasRevenueData
      ? { text: "Confirm daily sales entries by end of day this week." }
      : { text: "Add sales entries for each trading day this week." },
  ];

  const focusSource = focusFromSignals.length ? focusFromSignals : fallbackFocus;
  const focusList = focusSource
    .filter((item, index) => focusSource.indexOf(item) === index)
    .slice(0, anyLowConfidence ? 2 : 3);

  const showInsights = (insightsLoading || insightCards.length > 0) && hasAnyData;

  return (
    <section className="space-y-8">
      <OnboardingChecklist />
      <header>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-1 text-sm text-[#94A3B8] max-w-2xl">
          This is your LocalPulse overview. As you add sales (and later,
          reviews), this panel shows the key signals for your cafe at a glance.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B1220]">Health snapshot</h3>
          <p className="text-xs text-[#94A3B8]">Should I worry today?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6">
          <AnimatedCardGroup>
            {!hasAnyData && (
              <AnimatedCard variant="scale" glass>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                  Connect your data to unlock insights
                </p>
                <ul className="mt-3 space-y-2 text-xs text-[#94A3B8] list-disc list-inside">
                  <li>Add sales entries</li>
                  <li>Connect Google reviews</li>
                  <li>Invite staff (later)</li>
                </ul>
              </AnimatedCard>
            )}

            {hasAnyData && hasReviewData && (
              <AnimatedCard variant="scale" glass>
                <p className="text-xs font-medium text-[#94A3B8] mb-1">
                  Rating & reviews (last 180 days)
                </p>
                <p className="text-2xl font-semibold text-[#0B1220]">
                  {reviewSummary?.avgRating != null
                    ? `${reviewSummary.avgRating.toFixed(1)} stars`
                    : `${reviewSummary?.total ?? 0} reviews`}
                </p>
                <p className="mt-2 text-xs text-[#94A3B8]">
                  {reviewSummary?.total ?? 0} reviews in the last 180 days.
                </p>
                <p className="mt-2 text-[11px] text-[#94A3B8]">
                  {confidenceLabel(reviewConfidence)}
                </p>
              </AnimatedCard>
            )}

            {hasAnyData && hasReviewData && (
              <AnimatedCard variant="scale" glass>
                <p className="text-xs font-medium text-[#94A3B8] mb-1">
                  Review velocity (last 30 days)
                </p>
                <p className="text-2xl font-semibold text-[#0B1220]">
                  {reviewCount30} reviews
                </p>
                {anyLowConfidence ? (
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    Review activity is limited this period.
                  </p>
                ) : reviewCount30 === 0 ? (
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    No reviews in the last 30 days.
                  </p>
                ) : (
                  <div className="mt-2">
                    <DeltaLabel change={reviewDelta30} label="vs previous 30 days" />
                  </div>
                )}
                <p className="mt-2 text-[11px] text-[#94A3B8]">
                  {confidenceLabel(velocityConfidence)}
                </p>
              </AnimatedCard>
            )}

            {hasAnyData && hasRevenueData && (
              <AnimatedCard variant="scale" glass>
                <p className="text-xs font-medium text-[#94A3B8] mb-1">
                  Revenue trend (last 30 days)
                </p>
                <AnimatedNumber
                  value={revenue30}
                  prefix="A"
                  className="text-2xl font-semibold text-[#0B1220]"
                />
                {sparklineHasData && !anyLowConfidence && (
                  <div className="mt-3">
                    <RevenueSparkline values={sparklineValues} />
                  </div>
                )}
                {anyLowConfidence ? (
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    Revenue activity is limited this period.
                  </p>
                ) : (
                  <div className="mt-2">
                    <DeltaLabel change={revenue30Change} label="vs previous 30 days" />
                  </div>
                )}
                <p className="mt-2 text-[11px] text-[#94A3B8]">
                  {confidenceLabel(revenueConfidence)}
                </p>
              </AnimatedCard>
            )}

            {hasAnyData && revenueCoverage === 0 && (
              <AnimatedCard variant="scale" glass>
                <p className="text-xs font-medium text-[#94A3B8] mb-1">
                  Connect sales to track revenue trends
                </p>
                <p className="text-sm text-[#94A3B8]">
                  Add daily sales entries to unlock revenue insights here.
                </p>
              </AnimatedCard>
            )}

            {hasAnyData && primaryAlert && (
              <AnimatedCard>
                <p className="text-xs font-medium text-[#94A3B8] mb-1">
                  Needs attention
                </p>
                <p className="text-sm font-semibold text-[#0B1220]">
                  {primaryAlert.title}
                </p>
                <p className="mt-2 text-xs text-[#94A3B8]">
                  {primaryAlert.why}
                </p>
              </AnimatedCard>
            )}
          </AnimatedCardGroup>
        </div>
      </section>

      {showInsights && (
        <InsightCards loading={insightsLoading} cards={insightCards} />
      )}

      {hasAnyData && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0B1220]">This week&apos;s focus</h3>
            <p className="text-xs text-[#94A3B8]">
              {anyLowConfidence ? "Max 2 items" : "Max 3 items"}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <ul className="space-y-2 text-sm text-[#0B1220] list-disc list-inside">
              {focusList.map((item) => (
                <li key={item.text}>
                  {item.text}
                  {item.linkedTo && (
                    <span className="mt-1 block text-[11px] text-[#94A3B8]">
                      Linked to: {item.linkedTo}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {ENABLE_ANALYTICS_DEBUG && (
        <DebugPanel
          title="Overview debug"
          data={{
            revenue30,
            revenue30Change,
            sparklineValues,
            reviewSummary,
          }}
        />
      )}
    </section>
  );
}






