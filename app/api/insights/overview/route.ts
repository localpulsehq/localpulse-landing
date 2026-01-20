import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// types
type Severity = "info" | "warn" | "success";
type InsightKind = "signal" | "opportunity";

type InsightCard = {
  id: string;
  title: string;
  kind: InsightKind;
  severity: Severity;
  why: string;
  metric?: { label: string; value: string };
  action: string[];
};


// Helpers
function normaliseTopics(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String);
  if (typeof x === "object") {
    if (Array.isArray((x as any).topics)) return (x as any).topics.map(String);
    return Object.keys(x).map(String);
  }
  return [];
}

function clampInt(x: any, min: number, max: number) {
  const n = Number(x);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function fmtPct(x: number | null) {
  if (x === null || !Number.isFinite(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(0)}%`;
}

function fmtNum(x: number | null, digits = 2) {
  if (x === null || !Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function fmtInt(x: number | null) {
  if (x === null || !Number.isFinite(x)) return "—";
  return `${Math.round(x)}`;
}


// super cheap phrase extraction (v1). Only used if sentiment_topics is not present.
function extractPhrases(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    .slice(0, 40);
}

const STOPWORDS = new Set([
  "this","that","with","have","they","them","from","were","when","what","your","just",
  "very","really","nice","like","okay","fine","more",
  "been","there","here","also","because","would","could","should","about","into",
]);

function addCounts(map: Map<string, number>, tokens: string[]) {
  for (const t of tokens) {
    const key = String(t).trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}


// GET REQUEST

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("windowDays");
  const windowDays = clampInt(raw && raw.trim() ? raw: "180", 7, 365);

  // 1) Find cafe
  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (cafeError || !cafe?.id) {
    return NextResponse.json({ error: "Cafe not found" }, { status: 400 });
  }

  const cafeId = cafe.id;
  const now = new Date();

  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // For velocity we always want a 14-day window available
  const velocityStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const last7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // 2) Load reviews (windowDays for aggregates) + 14d for velocity
  // simplest: just load max(windowDays,60) days in one query
  const queryStart = new Date(
    Math.min(windowStart.getTime(), velocityStart.getTime(), prev30Start.getTime())
  );

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("rating,text,review_created_at,sentiment_score,sentiment_label,sentiment_topics")
    .eq("cafe_id", cafeId)
    .gte("review_created_at", queryStart.toISOString())
    .order("review_created_at", { ascending: false });

  if (reviewsError) {
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }

  const safeReviewsAll = (reviews ?? []).filter((r) => typeof r.rating === "number");

  // Window-filtered subset for “main stats”
  const safeReviewsWindow = safeReviewsAll.filter((r) => {
    const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
    return t >= windowStart.getTime();
  });

  // --- aggregates ---
  const total = safeReviewsWindow.length;

  const avgRating =
    total > 0
      ? safeReviewsWindow.reduce((s, r) => s + (r.rating ?? 0), 0) / total
      : null;

  const sentimentVals = safeReviewsWindow
    .map((r) => (typeof r.sentiment_score === "number" ? r.sentiment_score : null))
    .filter((v): v is number => v !== null);

  const avgSentiment =
    sentimentVals.length > 0
      ? sentimentVals.reduce((s, v) => s + v, 0) / sentimentVals.length
      : null;

  // velocity computed on last 14d (regardless of windowDays)
  const last7 = safeReviewsAll.filter((r) => {
    const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
    return t >= last7Start.getTime();
  }).length;

  const prev7 = safeReviewsAll.filter((r) => {
    const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
    return t >= velocityStart.getTime() && t < last7Start.getTime();
  }).length;

  const deltaPct =
    prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : (last7 > 0 ? 100 : null);

  const last30 = safeReviewsAll.filter((r) => {
    const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
    return t >= last30Start.getTime();
  }).length;

  const prev30 = safeReviewsAll.filter((r) => {
    const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
    return t >= prev30Start.getTime() && t < last30Start.getTime();
  }).length;

  const delta30Pct =
    prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : (last30 > 0 ? 100 : null);

  // highlights (most recent 3 in window)
  const recentHighlights = safeReviewsWindow.slice(0, 3).map((r) => ({
    rating: r.rating,
    text: r.text ?? null,
    created_at: r.review_created_at ?? new Date().toISOString(),
    sentiment_score: typeof r.sentiment_score === "number" ? r.sentiment_score : null,
    sentiment_label: r.sentiment_label ?? null,
    sentiment_topics: r.sentiment_topics ?? null,
  }));

  // top complaints/praise
  const praiseTokens = new Map<string, number>();
  const complaintTokens = new Map<string, number>();

  for (const r of safeReviewsWindow) {
    const text = (r.text ?? "").trim();
    const topics = normaliseTopics(r.sentiment_topics);

    // Prefer topics when present; else fallback to cheap phrase extraction from text
    const tokens = topics.length ? topics : (text ? extractPhrases(text) : []);

    if (!tokens.length) continue; // nothing to count

    if (r.rating >= 4) {
      addCounts(praiseTokens, tokens);
      continue;
    }

    if (r.rating <= 2) {
      addCounts(complaintTokens, tokens);
      continue;
    }

    // For 3-star, use sentiment label as a tiebreaker if present
    if (r.sentiment_label === "negative") addCounts(complaintTokens, tokens);
    if (r.sentiment_label === "positive") addCounts(praiseTokens, tokens);
  }

  const topPraise = [...praiseTokens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([phrase, count]) => ({ phrase, count }));

  const topComplaints = [...complaintTokens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([phrase, count]) => ({ phrase, count }));

  // 3) Competitors: get latest snapshot batch for this cafe
  const { data: latestSnap, error: snapErr } = await supabase
    .from("competitor_snapshots")
    .select("snapshot_date")
    .eq("cafe_id", cafeId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapErr) {
    return NextResponse.json({ error: "Failed to load competitor snapshots" }, { status: 500 });
  }

  let competitorStats = {
    count: 0,
    snapshotAt: null as string | null,
    avgRating: null as number | null,
    avgReviewCount: null as number | null,
    yourVsCompetitors: {
      yourRating: avgRating,
      competitorAvgRating: null as number | null,
      ratingGap: null as number | null,
      yourTotalReviews: total,
      competitorAvgTotalReviews: null as number | null,
    },
  };

  const snapshotAt = latestSnap?.snapshot_date ?? null;

  if (snapshotAt) {
    const { data: comps } = await supabase
      .from("competitor_snapshots")
      .select("rating,total_reviews")
      .eq("cafe_id", cafeId)
      .eq("snapshot_date", snapshotAt);

    const list = comps ?? [];
    const ratings = list
      .map((c) => (typeof c.rating === "number" ? c.rating : null))
      .filter((v): v is number => v !== null);

    const totals = list
      .map((c) => (typeof c.total_reviews === "number" ? c.total_reviews : null))
      .filter((v): v is number => v !== null);

    const compAvgRating = ratings.length ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null;
    const compAvgTotals = totals.length ? totals.reduce((s, v) => s + v, 0) / totals.length : null;

    competitorStats = {
      count: list.length,
      snapshotAt,
      avgRating: compAvgRating,
      avgReviewCount: compAvgTotals,
      yourVsCompetitors: {
        yourRating: avgRating,
        competitorAvgRating: compAvgRating,
        ratingGap: avgRating != null && compAvgRating != null ? avgRating - compAvgRating : null,
        yourTotalReviews: total,
        competitorAvgTotalReviews: compAvgTotals,
      },
    };
  }

  // --------------------
  // INSIGHT CARDS (Week 7 core output)
  // --------------------
  const insightCards: InsightCard[] = [];
  const competitorAvgRating = competitorStats.yourVsCompetitors.competitorAvgRating;

  // Case 1: No reviews yet
  if (total === 0) {
    insightCards.push({
      id: "no_reviews",
      title: "No reviews yet",
      kind: "signal",
      severity: "info",
      why: `We found 0 reviews in the last ${windowDays} days. Without reviews, sentiment and complaint insights cannot be generated.`,
      action: [
        "Go to Settings > Reviews and run Sync reviews now.",
        "Check your Google Place ID is correct.",
        "Once reviews sync, insight cards will update automatically.",
      ],
    });

    if (competitorStats.count > 0 && competitorStats.avgRating != null) {
      insightCards.push({
        id: "competitor_benchmark_ready",
        title: "Competitor benchmark is ready",
        kind: "signal",
        severity: "info",
        why: `Nearby competitors average ${competitorStats.avgRating.toFixed(
          2
        )} stars across ~${Math.round(
          competitorStats.avgReviewCount ?? 0
        )} reviews.`,
        action: [
          "Get your first 10 reviews to unlock rating-gap insights.",
          "Use QR codes or receipts to prompt happy customers.",
        ],
      });
    }
  }

  // Case 2: Reviews exist (basic summary so the UI has cards to render)
  if (total > 0) {
    insightCards.push({
      id: "reviews_summary",
      title: "Reviews summary",
      kind: "signal",
      severity: avgRating != null && avgRating >= 4 ? "success" : "info",
      why:
        avgRating != null
          ? `You have ${total} review${total === 1 ? "" : "s"} in the last ${windowDays} days with an average rating of ${avgRating.toFixed(
              2
            )} stars.`
          : `You have ${total} review${total === 1 ? "" : "s"} in the last ${windowDays} days.`,
      action: [
        "Respond to new reviews promptly to boost visibility.",
        "Share your top reviews on social to drive more visits.",
      ],
    });
  }

  // 1) Rating gap vs competitors (anchor insight)
  if (avgRating != null && competitorAvgRating != null) {
    const gap = avgRating - competitorAvgRating;
    insightCards.push({
      id: "rating_gap",
      title:
        gap >= 0
          ? "Rated higher than nearby competitors"
          : "Competitors have a higher average rating",
      kind: gap >= 0 ? "opportunity" : "signal",
      severity: gap >= 0 ? "success" : "info",
      why: `You average ${avgRating.toFixed(
        1
      )} stars vs competitors at ${competitorAvgRating.toFixed(1)}.`,
      action:
        gap >= 0
          ? [
              "Promote your Google Maps reviews in-store and online.",
              "Highlight your rating on signage and your website.",
            ]
          : [
              "Review the top complaints below for patterns.",
              "Focus on service consistency this month.",
            ],
    });
  }

  // 2) Review velocity drop/spike
  if (deltaPct != null) {
    if (deltaPct <= -30) {
      insightCards.push({
        id: "velocity_drop",
        title: "Review volume is slowing",
        kind: "signal",
        severity: "info",
        why: `Reviews are down ${Math.abs(deltaPct).toFixed(
          0
        )}% vs previous week.`,
        action: [
          "Ask staff to prompt reviews at checkout.",
          "Add a QR code to receipts.",
        ],
      });
    } else if (deltaPct >= 30) {
      insightCards.push({
        id: "velocity_spike",
        title: "Review volume is accelerating",
        kind: "opportunity",
        severity: "success",
        why: `Reviews up ${deltaPct.toFixed(0)}% vs last week.`,
        action: [
          "Keep current review prompts running.",
          "Respond to new reviews quickly.",
        ],
      });
    }
  }

  // 3) Recurring complaint theme
  if (topComplaints.length >= 1 && total > 0) {
    const top = topComplaints[0];
    insightCards.push({
      id: "recurring_complaint",
      title: `Customers repeatedly mention "${top.phrase}"`,
      kind: "signal",
      severity: "info",
      why: `Theme spotted — appears in ${top.count} of the last ${total} reviews.`,
      action: [
        "Review peak-hour staffing.",
        "Set expectations at the counter.",
      ],
    });
  }

  // 4) Strong praise theme
  if (topPraise.length >= 1 && total > 0) {
    const top = topPraise[0];
    insightCards.push({
      id: "strong_praise",
      title: `Customers love your "${top.phrase}"`,
      kind: "opportunity",
      severity: "success",
      why: `Positive signal — mentioned in ${top.count} recent reviews.`,
      action: [
        "Feature this in Google review responses.",
        "Highlight it in marketing copy.",
      ],
    });
  }

  // 5) Rating vs sentiment mismatch
  if (avgRating != null && avgRating >= 4 && avgSentiment != null && avgSentiment < 0) {
    insightCards.push({
      id: "rating_sentiment_mismatch",
      title: "High ratings but negative themes detected",
      kind: "signal",
      severity: "info",
      why: "Ratings are strong, but complaints appear repeatedly in recent reviews.",
      action: [
        "Address service issues before they impact ratings.",
        "Review recent negative topics for quick fixes.",
      ],
    });
  }

  // 6) Low review volume warning
  if (total > 0 && total < 5) {
    insightCards.push({
      id: "low_review_volume",
      title: "Not enough reviews yet to draw conclusions",
      kind: "signal",
      severity: "info",
      why: `Only ${total} reviews in the last ${windowDays} days.`,
      action: [
        "Aim for 5-10 reviews to unlock deeper insights.",
        "Prompt happy customers to leave feedback.",
      ],
    });
  }


  return NextResponse.json({
    ok: true,
    windowDays,
    insightCards,
    reviews: {
      total,
      avgRating,
      avgSentiment,
      reviewVelocity: { last7, prev7, deltaPct, last30, prev30, delta30Pct },
      topComplaints,
      topPraise,
      recentHighlights,
    },
    competitors: competitorStats,
  });
}
