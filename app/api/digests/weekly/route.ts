import { NextRequest, NextResponse } from "next/server";
import { createUnsubscribeToken } from "@/lib/digestTokens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { format, startOfDay, subDays } from "date-fns";

export const runtime = "nodejs";

type Severity = "info" | "warn" | "success" | "error";

type ReviewRow = {
  id: string;
  rating: number | null;
  text: string | null;
  review_created_at: string | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  sentiment_topics: any;
};

type InsightCandidate = {
  insightId: string;
  insightType: string;
  title: string;
  summary: string;
  severity: Severity;
  metricLabel?: string;
  metricValue?: string;
  actionItems?: string[];
  score: number;
};

type SummaryItem = {
  label: string;
  value: string;
  tone: "good" | "warn" | "info";
  href: string;
};

function requireCronSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, error: "Missing CRON_SECRET" };
  }
  const url = new URL(req.url);
  const token = req.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  if (token !== secret) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true };
}

function normaliseTopics(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String);
  if (typeof x === "object") {
    if (Array.isArray((x as any).topics)) return (x as any).topics.map(String);
    return Object.keys(x).map(String);
  }
  return [];
}

const STOPWORDS = new Set([
  "this",
  "that",
  "with",
  "have",
  "they",
  "them",
  "from",
  "were",
  "when",
  "what",
  "your",
  "just",
  "very",
  "really",
  "nice",
  "like",
  "okay",
  "fine",
  "more",
  "been",
  "there",
  "here",
  "also",
  "because",
  "would",
  "could",
  "should",
  "about",
  "into",
]);

function extractPhrases(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    .slice(0, 40);
}

function addCounts(map: Map<string, number>, tokens: string[]) {
  for (const t of tokens) {
    const key = String(t).trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}

function getWeeklyPeriod(now = new Date()) {
  const periodEnd = startOfDay(now);
  const periodStart = subDays(periodEnd, 7);
  return {
    periodStart,
    periodEnd,
    label: `Week of ${format(periodStart, "MMM d")}`,
  };
}

function scoreCandidate(severity: Severity, magnitude: number, volume: number) {
  const severityWeight = severity === "error" ? 4 : severity === "warn" ? 3 : severity === "success" ? 2 : 1;
  return severityWeight * 10 + Math.min(10, Math.abs(magnitude)) + Math.min(6, volume);
}

function toTone(severity: Severity): SummaryItem["tone"] {
  if (severity === "success") return "good";
  if (severity === "warn" || severity === "error") return "warn";
  return "info";
}

function buildInsightLink(
  baseUrl: string,
  cafeId: string,
  insightId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const params = new URLSearchParams({
    locationId: cafeId,
    insightId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });
  return `${baseUrl}/dashboard?${params.toString()}`;
}

function wrapTrackingLink(baseUrl: string, recipientId: string, insightId: string, nextUrl: string) {
  const params = new URLSearchParams({
    rid: recipientId,
    iid: insightId,
    next: nextUrl,
  });
  return `${baseUrl}/api/digests/redirect?${params.toString()}`;
}

async function getRecipientEmail(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

export async function GET(req: NextRequest) {
  const auth = requireCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const url = new URL(req.url);
  const cafeFilter = url.searchParams.get("cafeId");

  const { periodStart, periodEnd, label } = getWeeklyPeriod();
  const reviewQueryStart = subDays(periodEnd, 14);

  const { data: cafes, error: cafesError } = await supabaseAdmin
    .from("cafes")
    .select("id,name,owner_id");

  if (cafesError) {
    return NextResponse.json({ error: "Failed to load cafes" }, { status: 500 });
  }

  const allCafes = cafes ?? [];
  const targetCafes = cafeFilter
    ? allCafes.filter((cafe) => cafe.id === cafeFilter)
    : allCafes;

  if (cafeFilter && targetCafes.length === 0) {
    return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
  }

  const results: Array<{ cafeId: string; status: string; detail?: string }> = [];

  for (const cafe of targetCafes) {
    const cafeId = cafe.id;
    const ownerId = cafe.owner_id;

    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("digest_enabled,unsubscribed_at")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (prefs?.digest_enabled === false || prefs?.unsubscribed_at) {
      results.push({ cafeId, status: "skipped", detail: "disabled" });
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .from("digest_runs")
      .select("id,sent_at")
      .eq("cafe_id", cafeId)
      .eq("period_start", periodStart.toISOString().slice(0, 10))
      .eq("period_end", periodEnd.toISOString().slice(0, 10))
      .maybeSingle();

    if (existing?.sent_at) {
      results.push({ cafeId, status: "skipped", detail: "already_sent" });
      continue;
    }

    const recipientEmail = await getRecipientEmail(ownerId);
    if (!recipientEmail) {
      results.push({ cafeId, status: "skipped", detail: "missing_email" });
      continue;
    }

    let digestRun = existing ?? null;
    if (!digestRun) {
      const { data, error: digestRunError } = await supabaseAdmin
        .from("digest_runs")
        .insert({
          cafe_id: cafeId,
          period_start: periodStart.toISOString().slice(0, 10),
          period_end: periodEnd.toISOString().slice(0, 10),
          period_label: label,
          status: "pending",
          window_days: 7,
        })
        .select("*")
        .maybeSingle();
      if (digestRunError || !data) {
        results.push({ cafeId, status: "failed", detail: "digest_run_insert" });
        continue;
      }
      digestRun = data;
    }

    if (!digestRun) {
      results.push({ cafeId, status: "failed", detail: "digest_run_missing" });
      continue;
    }

    let recipientRow = null as any;
    const { data: existingRecipient } = await supabaseAdmin
      .from("digest_recipients")
      .select("*")
      .eq("digest_run_id", digestRun.id)
      .eq("user_id", ownerId)
      .maybeSingle();

    if (existingRecipient) {
      recipientRow = existingRecipient;
      if (recipientRow.status === "sent") {
        results.push({ cafeId, status: "skipped", detail: "recipient_sent" });
        continue;
      }
    } else {
      const { data, error: recipientError } = await supabaseAdmin
        .from("digest_recipients")
        .insert({
          digest_run_id: digestRun.id,
          user_id: ownerId,
          email: recipientEmail,
          status: "queued",
        })
        .select("*")
        .maybeSingle();

      if (recipientError || !data) {
        results.push({ cafeId, status: "failed", detail: "recipient_insert" });
        await supabaseAdmin
          .from("digest_runs")
          .update({ status: "failed" })
          .eq("id", digestRun.id);
        continue;
      }
      recipientRow = data;
    }

    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from("reviews")
      .select("id,rating,text,review_created_at,sentiment_score,sentiment_label,sentiment_topics")
      .eq("cafe_id", cafeId)
      .gte("review_created_at", reviewQueryStart.toISOString())
      .order("review_created_at", { ascending: false });

    if (reviewsError) {
      results.push({ cafeId, status: "failed", detail: "reviews_load" });
      await supabaseAdmin
        .from("digest_runs")
        .update({ status: "failed" })
        .eq("id", digestRun.id);
      continue;
    }

    const safeReviews = (reviews ?? []).filter((r) => typeof r.rating === "number") as ReviewRow[];
    const windowReviews = safeReviews.filter((r) => {
      const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
      return t >= periodStart.getTime();
    });

    const total = windowReviews.length;
    const avgRating =
      total > 0 ? windowReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / total : null;

    const sentimentVals = windowReviews
      .map((r) => (typeof r.sentiment_score === "number" ? r.sentiment_score : null))
      .filter((v): v is number => v !== null);

    const avgSentiment =
      sentimentVals.length > 0 ? sentimentVals.reduce((s, v) => s + v, 0) / sentimentVals.length : null;

    const last7 = safeReviews.filter((r) => {
      const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
      return t >= subDays(periodEnd, 7).getTime();
    }).length;

    const prev7 = safeReviews.filter((r) => {
      const t = r.review_created_at ? new Date(r.review_created_at).getTime() : 0;
      return t >= subDays(periodEnd, 14).getTime() && t < subDays(periodEnd, 7).getTime();
    }).length;

    const deltaPct = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : last7 > 0 ? 100 : null;

    const praiseTokens = new Map<string, number>();
    const complaintTokens = new Map<string, number>();

    for (const r of windowReviews) {
      const text = (r.text ?? "").trim();
      const topics = normaliseTopics(r.sentiment_topics);
      const tokens = topics.length ? topics : text ? extractPhrases(text) : [];
      if (!tokens.length) continue;
      if ((r.rating ?? 0) >= 4) {
        addCounts(praiseTokens, tokens);
        continue;
      }
      if ((r.rating ?? 0) <= 2) {
        addCounts(complaintTokens, tokens);
        continue;
      }
      if (r.sentiment_label === "negative") addCounts(complaintTokens, tokens);
      if (r.sentiment_label === "positive") addCounts(praiseTokens, tokens);
    }

    const topPraise = [...praiseTokens.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([phrase, count]) => ({ phrase, count }));

    const topComplaints = [...complaintTokens.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([phrase, count]) => ({ phrase, count }));

    const { data: latestSnap } = await supabaseAdmin
      .from("competitor_snapshots")
      .select("snapshot_date")
      .eq("cafe_id", cafeId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    let competitorAvgRating: number | null = null;

    if (latestSnap?.snapshot_date) {
      const { data: comps } = await supabaseAdmin
        .from("competitor_snapshots")
        .select("rating")
        .eq("cafe_id", cafeId)
        .eq("snapshot_date", latestSnap.snapshot_date);
      const ratings = (comps ?? [])
        .map((c) => (typeof c.rating === "number" ? c.rating : null))
        .filter((v): v is number => v !== null);
      competitorAvgRating = ratings.length ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null;
    }

    const candidates: InsightCandidate[] = [];

    if (total === 0) {
      candidates.push({
        insightId: `no_reviews_${digestRun.id}`,
        insightType: "no_reviews",
        title: "Not enough new reviews this week",
        summary: "We did not find new reviews to surface a clear trend yet.",
        severity: "warn",
        actionItems: [
          "Ask staff to prompt reviews at checkout.",
          "Add a QR code to receipts.",
        ],
        score: scoreCandidate("warn", 1, 0),
      });
    }

    if (topPraise.length > 0 && total >= 3) {
      const top = topPraise[0];
      candidates.push({
        insightId: `praise_${digestRun.id}`,
        insightType: "strong_praise",
        title: `Customers love your ${top.phrase}`,
        summary: `Mentioned in ${top.count} recent reviews.`,
        severity: "success",
        actionItems: [
          "Feature this in your Google review responses.",
          "Highlight it in marketing copy.",
        ],
        score: scoreCandidate("success", top.count, total),
      });
    }

    if (topComplaints.length > 0 && total >= 3) {
      const top = topComplaints[0];
      candidates.push({
        insightId: `complaint_${digestRun.id}`,
        insightType: "recurring_complaint",
        title: `Customers mention ${top.phrase} often`,
        summary: `Appears in ${top.count} of the last ${total} reviews.`,
        severity: "warn",
        actionItems: [
          "Review peak hour staffing.",
          "Set expectations at the counter.",
        ],
        score: scoreCandidate("warn", top.count, total),
      });
    }

    if (deltaPct != null) {
      if (deltaPct <= -30) {
        candidates.push({
          insightId: `velocity_drop_${digestRun.id}`,
          insightType: "review_velocity_drop",
          title: "Review momentum is slowing",
          summary: `Reviews down ${Math.abs(deltaPct).toFixed(0)}% vs last week.`,
          severity: "warn",
          actionItems: [
            "Ask staff to prompt reviews at checkout.",
            "Add a QR code to receipts.",
          ],
          score: scoreCandidate("warn", deltaPct, last7),
        });
      } else if (deltaPct >= 30) {
        candidates.push({
          insightId: `velocity_spike_${digestRun.id}`,
          insightType: "review_velocity_spike",
          title: "Review momentum is increasing",
          summary: `Reviews up ${deltaPct.toFixed(0)}% vs last week.`,
          severity: "success",
          actionItems: [
            "Keep current review prompts running.",
            "Respond to new reviews quickly.",
          ],
          score: scoreCandidate("success", deltaPct, last7),
        });
      }
    }

    if (avgRating != null && competitorAvgRating != null) {
      const gap = avgRating - competitorAvgRating;
      candidates.push({
        insightId: `competitor_gap_${digestRun.id}`,
        insightType: "competitor_gap",
        title: gap >= 0 ? "Rated higher than nearby competitors" : "Competitors are rated higher",
        summary: `You average ${avgRating.toFixed(1)} stars vs competitors at ${competitorAvgRating.toFixed(1)}.`,
        severity: gap >= 0 ? "success" : "warn",
        actionItems:
          gap >= 0
            ? ["Promote your rating on signage and your website.", "Respond to new reviews to keep momentum."]
            : ["Review top complaints for patterns.", "Focus on service consistency this week."],
        score: scoreCandidate(gap >= 0 ? "success" : "warn", gap * 10, total),
      });
    }

    if (avgRating != null && avgRating >= 4 && avgSentiment != null && avgSentiment < 0) {
      candidates.push({
        insightId: `rating_sentiment_${digestRun.id}`,
        insightType: "rating_sentiment_mismatch",
        title: "High ratings but negative themes",
        summary: "Ratings are strong, but complaints appear repeatedly in recent reviews.",
        severity: "warn",
        actionItems: ["Address service issues before they impact ratings."],
        score: scoreCandidate("warn", avgSentiment, total),
      });
    }

    if (total > 0 && total < 10) {
      candidates.push({
        insightId: `low_volume_${digestRun.id}`,
        insightType: "low_review_volume",
        title: "Too few reviews for strong conclusions",
        summary: `Only ${total} reviews in the last 7 days.`,
        severity: "warn",
        actionItems: ["Aim for 10-15 reviews to unlock deeper insights."],
        score: scoreCandidate("warn", total, total),
      });
    }

    const ranked = [...candidates].sort((a, b) => b.score - a.score);
    const summaryCandidates = ranked.slice(0, 3);

    const focusCandidate =
      ranked.find((c) => c.severity === "warn" || c.severity === "error") ?? ranked[0];

    const focusLine = focusCandidate?.actionItems?.[0] ?? "Review your latest insights this week.";
    const focusReason = focusCandidate?.summary ?? "See what changed in the last 7 days.";

    const unsubscribeToken = createUnsubscribeToken(ownerId);
    const unsubscribeUrl = `${baseUrl}/api/digests/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

    const summaryItems: SummaryItem[] = summaryCandidates.map((candidate) => {
      const nextUrl = buildInsightLink(baseUrl, cafeId, candidate.insightId, periodStart, periodEnd);
      const href = wrapTrackingLink(baseUrl, recipientRow.id, candidate.insightId, nextUrl);
      return {
        label: candidate.title,
        value: candidate.summary,
        tone: toTone(candidate.severity),
        href,
      };
    });

    const ctaNext = buildInsightLink(baseUrl, cafeId, "weekly_digest", periodStart, periodEnd);
    const ctaUrl = wrapTrackingLink(baseUrl, recipientRow.id, "weekly_digest", ctaNext);

    const focusNext = focusCandidate
      ? buildInsightLink(baseUrl, cafeId, focusCandidate.insightId, periodStart, periodEnd)
      : ctaNext;
    const focusLink = wrapTrackingLink(baseUrl, recipientRow.id, focusCandidate?.insightId ?? "focus", focusNext);

    const insightRows = summaryCandidates.map((candidate) => ({
      digest_run_id: digestRun.id,
      insight_id: candidate.insightId,
      insight_type: candidate.insightType,
      severity: candidate.severity,
      title: candidate.title,
      summary: candidate.summary,
      metric_label: candidate.metricLabel ?? null,
      metric_value: candidate.metricValue ?? null,
      action_items: candidate.actionItems ?? null,
      deep_link: buildInsightLink(baseUrl, cafeId, candidate.insightId, periodStart, periodEnd),
      supporting_data: {
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      },
    }));

    if (insightRows.length > 0) {
      await supabaseAdmin.from("digest_insights").insert(insightRows);
    }

    const { render } = await import("@react-email/render");
    const { default: WeeklyDigestEmail } = await import("@/emails/WeeklyDigestEmail");

    const html = await render(
      WeeklyDigestEmail({
        cafeName: cafe.name ?? "Your cafe",
        weekOf: label,
        summaryItems,
        focusLine,
        focusReason,
        focusLink,
        ctaUrl,
        unsubscribeUrl,
      })
    );

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM ?? "LocalPulse <insights@localpulsehq.com>";

    if (!resendKey) {
      await supabaseAdmin
        .from("digest_runs")
        .update({ status: "failed" })
        .eq("id", digestRun.id);
      results.push({ cafeId, status: "failed", detail: "missing_resend_key" });
      continue;
    }

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipientEmail,
        subject: `Weekly Digest - ${label}`,
        html,
      }),
    });

    if (!sendRes.ok) {
      const error = await sendRes.json().catch(() => null);
      await supabaseAdmin
        .from("digest_runs")
        .update({ status: "failed" })
        .eq("id", digestRun.id);
      await supabaseAdmin
        .from("digest_recipients")
        .update({ status: "failed", error: JSON.stringify(error) })
        .eq("id", recipientRow.id);
      results.push({ cafeId, status: "failed", detail: "resend_failed" });
      continue;
    }

    const sendData = await sendRes.json();
    await supabaseAdmin
      .from("digest_runs")
      .update({ status: "sent", sent_at: new Date().toISOString(), cta_url: ctaUrl })
      .eq("id", digestRun.id);
    await supabaseAdmin
      .from("digest_recipients")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_message_id: sendData?.id ?? null,
      })
      .eq("id", recipientRow.id);

    results.push({ cafeId, status: "sent" });
  }

  return NextResponse.json({
    ok: true,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    results,
  });
}
