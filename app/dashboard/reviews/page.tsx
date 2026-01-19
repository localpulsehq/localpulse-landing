'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AnimatedCard, { AnimatedCardGroup } from '@/components/ui/AnimatedCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonChart } from '@/components/ui/SkeletonChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { parseDate, formatDateAU } from '@/lib/date';

type ReviewSourceRow = {
  id: string;
  cafe_id: string;
  platform: string;
  external_place_id: string;
  display_name: string | null;
  url: string | null;
  last_synced_at: string | null;
};

type ReviewRow = {
  id: string;
  cafe_id: string;
  review_source_id: string;
  external_review_id: string | null;
  rating: number;
  author_name: string | null;
  text: string | null;
  language: string | null;
  review_created_at: string | null; // timestamptz
  created_at: string | null; // timestamptz

  //sentiment columns
  sentiment_score: number | null;
  sentiment_label: string | null; // 'positive' | 'neutral' | 'negative'
  sentiment_topics: any[] | null; // jsonb array
  sentiment_version: string | null;
};

type CompetitorSnapshotRow = {
  id: string;
  cafe_id: string;
  name: string;
  place_id: string;
  rating: number | null;
  total_reviews: number | null;
  distance_m: number | null;
  snapshot_date: string | null; // timestamptz
};

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${r} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < r ? 'text-[#22C3A6]' : 'text-[#94A3B8]'}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function safeDateLabel(iso: string | null) {
  if (!iso) return '—';
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return '—';
  // If your lib/date expects YYYY-MM-DD, just fall back to locale:
  try {
    return formatDateAU(iso);
  } catch {
    return d.toLocaleDateString('en-AU');
  }
}

function hoursAgoLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;

  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function cutoff30d() {
  const now = new Date(); 
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return d; // date object 30 days ago 
}

function cutoff180d() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 180);
  return d;
}

function inLast30Days(r: ReviewRow) {
  const iso = r.review_created_at ?? r.created_at;
  if (!iso) return false;
  const d = new Date(iso);
  return d >= cutoff30d();
}

function inLast180Days(r: ReviewRow) {
  const iso = r.review_created_at ?? r.created_at;
  if (!iso) return false;
  const d = new Date(iso);
  return d >= cutoff180d();
}

function normaliseTopics(topics: any[] | null): string[] {
  // check whether its empty, if not trim and set string to lowercase 
  if (!Array.isArray(topics)) return []; 
  return topics
    .map(t => String(t ?? '').trim().toLowerCase())
    .filter(Boolean);
}

function topTopics(reviews: ReviewRow[], n = 5) {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    for (const t of normaliseTopics(r.sentiment_topics)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a,b) => b[1] - a[1])
    .slice(0,n)
}

function snippet(text: string | null, max=110) {
  const s = (text ?? '').trim();
  if (!s) return '—';
  return s.length > max ? s.slice(0,max) + '…' : s;
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [source, setSource] = useState<ReviewSourceRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  // For “read more” toggles
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // For competitor snapshot stuff
  const [activeTab, setActiveTab] = useState<"reviews" | "competitors">("reviews");
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [competitorsRefreshing, setCompetitorsRefreshing] = useState(false);
  const [competitorsError, setCompetitorsError] = useState<string | null>(null);

  const [competitorsLatest, setCompetitorsLatest] = useState<CompetitorSnapshotRow[]>([]);
  const [competitorsHistory30d, setCompetitorsHistory30d] = useState<CompetitorSnapshotRow[]>([]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError('You must be logged in to view reviews.');
      setLoading(false);
      return;
    }

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

    setCafeId(cafe.id);
    await loadCompetitors(cafe.id); // get competitors as well!

    // Load Google review source
    const { data: src, error: srcError } = await supabase
      .from('review_sources')
      .select('id,cafe_id,platform,external_place_id,display_name,url,last_synced_at')
      .eq('cafe_id', cafe.id)
      .eq('platform', 'google')
      .maybeSingle();

    if (srcError) {
      console.error('Failed to load review_sources:', srcError);
      setError('Could not load review connection status.');
      setLoading(false);
      return;
    }

    setSource((src ?? null) as any);

    // If not connected, don’t try load reviews
    if (!src?.id) {
      setReviews([]);
      setLoading(false);
      return;
    }

    const { data: revs, error: revError } = await supabase
      .from('reviews')
      .select(
        'id,cafe_id,review_source_id,external_review_id,rating,author_name,text,language,review_created_at,created_at,sentiment_score,sentiment_label,sentiment_topics,sentiment_version',
      )
      .eq('cafe_id', cafe.id)
      .eq('review_source_id', src.id)
      .order('review_created_at', { ascending: false, nullsFirst: false });

    if (revError) {
      console.error('Failed to load reviews:', revError);
      setError('Could not load reviews data.');
      setLoading(false);
      return;
    }

    setReviews((revs ?? []) as ReviewRow[]);
    setLoading(false);
  }

  // competitor loader!
  async function loadCompetitors(cafeId: string) {
    setCompetitorsLoading(true);
    setCompetitorsError(null);

    try {
      const cutoff = cutoff180d();

      // Pull last 180 days of snapshots (derive latest per place client-side)
      const { data, error } = await supabase
        .from("competitor_snapshots")
        .select("id,cafe_id,name,place_id,rating,total_reviews,distance_m,snapshot_date")
        .eq("cafe_id", cafeId)
        .gte("snapshot_date", cutoff.toISOString())
        .order("snapshot_date", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as CompetitorSnapshotRow[];
      setCompetitorsHistory30d(rows);

      // Latest snapshot per place_id
      const seen = new Set<string>();
      const latest: CompetitorSnapshotRow[] = [];
      for (const r of rows) {
        if (!r.place_id) continue;
        if (seen.has(r.place_id)) continue;
        seen.add(r.place_id);
        latest.push(r);
      }

      // Keep it tidy: sort by distance if present
      latest.sort((a, b) => (a.distance_m ?? 9e15) - (b.distance_m ?? 9e15));

      setCompetitorsLatest(latest);
    } catch (e: any) {
      console.error("Failed to load competitors:", e);
      setCompetitorsError(e?.message ?? "Could not load competitors.");
    } finally {
      setCompetitorsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSyncNow() {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews/sync', { method: 'POST' });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Expected JSON, got: ${contentType}. Body: ${text.slice(0, 120)}`);
      }
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Sync failed');
      }

      const competitorsRes = await fetch("/api/competitors/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radiusMeters: 1500, maxResults: 10 }),
      });
      const competitorsJson = await competitorsRes.json().catch(() => null);
      if (!competitorsRes.ok || !competitorsJson?.ok) {
        throw new Error(competitorsJson?.error || "Competitor snapshot failed");
      }

      // Reload source + reviews so badge updates immediately
      await loadAll();
    } catch (e: any) {
      console.error('Sync failed:', e);
      setError(e?.message ?? 'Failed to sync reviews.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleRefreshCompetitors() {
    setCompetitorsRefreshing(true);
    setCompetitorsError(null);

    try {
      const res = await fetch("/api/competitors/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radiusMeters: 1500, maxResults: 10 }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Competitor snapshot failed");
      }

      if (cafeId) {
        await loadCompetitors(cafeId);
      }
    } catch (e: any) {
      console.error("Competitor snapshot failed:", e);
      setCompetitorsError(e?.message ?? "Failed to refresh competitors.");
    } finally {
      setCompetitorsRefreshing(false);
    }
  }

  // ---------- derived metrics ----------
  const { avgRating, totalReviews, new30d } = useMemo(() => {
    const total = reviews.length;

    const avg =
      total > 0
        ? reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0) / total
        : 0;

    const cutoff = cutoff180d();

    const newLast30 = reviews.filter(r => {
      const iso = r.review_created_at ?? r.created_at;
      if (!iso) return false;
      const d = new Date(iso);
      return d >= cutoff;
    }).length;

    return {
      avgRating: avg,
      totalReviews: total,
      new30d: newLast30,
    };
  }, [reviews]);

  // useMemo
  const insights = useMemo(() => {
    const last180 = reviews.filter(inLast180Days);

    const positives = last180.filter(r => r.sentiment_label === 'positive');
    const negatives = last180.filter(r => {
      if (r.sentiment_label === 'negative') return true;
      if (typeof r.sentiment_score === 'number' && r.sentiment_score <= -0.1) return true;
      return typeof r.rating === 'number' && r.rating <= 2;
    });

    const praiseTop = topTopics(positives, 5);
    const complaintTop = topTopics(negatives, 5);

    const mismatches = last180.filter(r => {
      const score = r.sentiment_score ?? null;
      const rating = r.rating ?? 0;
      if (score == null) return false;

      const positiveMismatch = rating >= 4 && score <= -0.2;
      const negativeMismatch = rating <= 2 && score >= 0.2;
      return positiveMismatch || negativeMismatch;
    });

    // newest mismatch first
    mismatches.sort((a, b) => {
      const ad = new Date(a.review_created_at ?? a.created_at ?? 0).getTime();
      const bd = new Date(b.review_created_at ?? b.created_at ?? 0).getTime();
      return bd - ad;
    });

    const example = mismatches[0] ?? null;

    return {
      last30Count: last180.length,
      praiseTop,
      complaintTop,
      mismatchCount: mismatches.length,
      mismatchExample: example
        ? {
            rating: example.rating,
            score: example.sentiment_score,
            author: example.author_name,
            text: example.text,
            date: example.review_created_at ?? example.created_at ?? null,
          }
        : null,
    };
}, [reviews]);

  const competitorTrends180d = useMemo(() => {
    // group by competitor (place_id)
    const byPlace = new Map<string, CompetitorSnapshotRow[]>();
    for (const r of competitorsHistory30d) {
      if (!r.place_id) continue;
      const arr = byPlace.get(r.place_id) ?? [];
      arr.push(r);
      byPlace.set(r.place_id, arr);
    }

    let avgRatingLatest: number | null = null;
    let mostReviewsLatest: { name: string; total: number } | null = null;

    // compute avg rating from latest snapshot per competitor
    const latest = competitorsLatest;
    const ratings = latest.map(x => x.rating).filter((x): x is number => typeof x === "number");
    if (ratings.length) {
      avgRatingLatest = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }

    for (const [placeId, snaps] of byPlace.entries()) {
      const s = [...snaps].sort(
        (a, b) =>
          new Date(a.snapshot_date ?? 0).getTime() -
          new Date(b.snapshot_date ?? 0).getTime()
      );
      const last = s[s.length - 1];
      const total = last?.total_reviews;
      if (typeof total !== "number") continue;

      if (!mostReviewsLatest || total > mostReviewsLatest.total) {
        mostReviewsLatest = { name: last?.name ?? "Unknown", total };
      }
    }

    return { avgRatingLatest, mostReviewsLatest };
  }, [competitorsHistory30d, competitorsLatest]);



  // ---------- render ----------
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-white rounded animate-pulse" />
          <div className="h-3 w-72 bg-white rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <SkeletonChart height={260} />
      </section>
    );
  }

  // not logged in / other errors
  if (error && !cafeId) {
    return (
      <section className="border border-[#EF4444]/40 rounded-xl bg-white p-6">
        <p className="text-sm text-[#EF4444]">{error}</p>
      </section>
    );
  }

  const connected = Boolean(source?.external_place_id);

  if (!connected) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-sm text-[#94A3B8]">
            Connect Google Reviews to see ratings, recent comments, and competitor comparison.
          </p>
        </div>

        <EmptyState
          title="Google Reviews not connected"
          description="Go to Settings and paste your Google Maps link or Place ID to connect."
          action={{
            label: 'Go to Settings',
            href: '/dashboard/settings',
          }}
        />
      </section>
    );
  }

  // connected but no reviews yet
  if (connected && reviews.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Reviews</h2>
            <p className="text-sm text-[#94A3B8]">
              Connected to Google — sync to pull your latest reviews.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-md bg-[#22C3A6] hover:bg-[#17A98F] text-sm font-medium text-[#0B1220] disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        <EmptyState
          title="No reviews found yet"
          description="Click “Sync now” to fetch reviews from Google. If you still see none, your Place ID may not have reviews or Google is returning a limited set."
        />

        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      </section>
    );
  }

  const lastSyncedAgo = hoursAgoLabel(source?.last_synced_at ?? null);

  return (
    <section className="space-y-6">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-sm text-[#94A3B8]">
            {source?.display_name ? (
              <>
                Connected to <span className="text-[#0B1220] font-medium">{source.display_name}</span>{' '}
                <span className="text-[#94A3B8]">· Google</span>
              </>
            ) : (
              <>Connected to Google</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {source?.url && (
            <Link
              href={source.url}
              target="_blank"
              className="px-3 py-2 rounded-md bg-white lp-card hover:bg-white text-xs text-[#0B1220]"
            >
              View on Google
            </Link>
          )}

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-md bg-[#22C3A6] hover:bg-[#17A98F] text-sm font-medium text-[#0B1220] disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-3 py-2 rounded-md text-xs border ${
              activeTab === "reviews"
                ? "border-[#E2E8F0] bg-white text-[#0B1220]"
                : "border-[#E2E8F0] bg-[#F9FBFC] text-[#94A3B8] hover:text-[#0B1220]"
            }`}
          >
            Reviews
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("competitors")}
            className={`px-3 py-2 rounded-md text-xs border ${
              activeTab === "competitors"
                ? "border-[#E2E8F0] bg-white text-[#0B1220]"
                : "border-[#E2E8F0] bg-[#F9FBFC] text-[#94A3B8] hover:text-[#0B1220]"
            }`}
          >
            Competitors
          </button>
        </div>

      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnimatedCardGroup>
          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Average rating (all)</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-semibold text-[#0B1220]">
                {avgRating ? avgRating.toFixed(2) : '—'}
              </p>
              <div className="pb-1">
                <Stars rating={avgRating} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">Based on synced reviews.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Total reviews</p>
            <p className="text-2xl font-semibold text-[#0B1220]">
              <AnimatedNumber value={totalReviews} format="number" />
            </p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">Google subset (for now) — expands later.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">New reviews (last 180 days)</p>
            <p className="text-2xl font-semibold text-[#0B1220]">
              <AnimatedNumber value={new30d} format="number" />
            </p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">Uses review date when available.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Last synced</p>
            <p className="text-sm font-semibold text-[#0B1220]">
              {source?.last_synced_at ? safeDateLabel(source.last_synced_at) : '—'}
            </p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              {lastSyncedAgo ? `${lastSyncedAgo}` : 'Not synced yet'}
            </p>
          </AnimatedCard>
        </AnimatedCardGroup>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCardGroup>
          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Top praise themes (180d)</p>
            {insights.praiseTop.length ? (
              <ul className="mt-2 space-y-1 text-sm text-[#0B1220]">
                {insights.praiseTop.map(([topic, count]) => (
                  <li key={topic} className="flex items-center justify-between gap-3">
                    <span className="capitalize">{topic}</span>
                    <span className="text-xs text-[#94A3B8]">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#94A3B8]">No positive-topic data yet (sync again after sentiment runs).</p>
            )}
            <p className="mt-3 text-[11px] text-[#94A3B8]">Based on sentiment topics from the last 180 days.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Top complaint themes (180d)</p>
            {insights.complaintTop.length ? (
              <ul className="mt-2 space-y-1 text-sm text-[#0B1220]">
                {insights.complaintTop.map(([topic, count]) => (
                  <li key={topic} className="flex items-center justify-between gap-3">
                    <span className="capitalize">{topic}</span>
                    <span className="text-xs text-[#94A3B8]">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#94A3B8]">No negative-topic data yet.</p>
            )}
            <p className="mt-3 text-[11px] text-[#94A3B8]">Useful for operational fixes and training (last 180 days).</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Rating vs sentiment mismatches (180d)</p>
            <p className="text-2xl font-semibold text-[#0B1220]">
              <AnimatedNumber value={insights.mismatchCount} format="number" />
            </p>

            {insights.mismatchExample ? (
              <div className="mt-2 text-sm text-[#0B1220]">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <span>{insights.mismatchExample.date ? safeDateLabel(insights.mismatchExample.date) : '—'}</span>
                  <span>·</span>
                  <span>{insights.mismatchExample.author ? `by ${insights.mismatchExample.author}` : '—'}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Stars rating={insights.mismatchExample.rating ?? 0} />
                  <span className="text-[11px] text-[#94A3B8]">
                    sentiment {typeof insights.mismatchExample.score === 'number' ? insights.mismatchExample.score.toFixed(2) : '—'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#0B1220]">{snippet(insights.mismatchExample.text)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#94A3B8]">No mismatches detected (good sign).</p>
            )}

            <p className="mt-3 text-[11px] text-[#94A3B8]">
              Flags confusing reviews where rating and text disagree. Useful for spotting silent dissatisfaction.
            </p>
          </AnimatedCard>
        </AnimatedCardGroup>
      </div>

      {activeTab === "reviews" && competitorsLatest.length > 0 && (
        <AnimatedCard glass>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0B1220]">Competitor context (nearby)</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Nearby cafes average{" "}
                {competitorTrends180d.avgRatingLatest
                  ? `${competitorTrends180d.avgRatingLatest.toFixed(2)}★`
                  : "—"}{" "}
                across {competitorsLatest.length} locations.
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Snapshot updated weekly from Google Places.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("competitors")}
              className="px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#0B1220] hover:bg-[#F9FBFC]"
            >
              View competitors
            </button>
          </div>
        </AnimatedCard>
      )}

      {activeTab === "competitors" && (
        <div className="rounded-xl bg-white lp-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0B1220]">Nearby competitors</p>
              <p className="text-xs text-[#94A3B8]">
                Pulls nearby cafes via Google Places and snapshots rating/review-count for trending.
              </p>
              <p className="text-[11px] text-[#94A3B8]">
                Snapshot updated weekly from Google Places.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshCompetitors}
              disabled={competitorsRefreshing}
              className="px-3 py-2 rounded-md bg-[#F9FBFC] border border-[#E2E8F0] text-xs text-[#0B1220] hover:bg-white disabled:opacity-60"
            >
              {competitorsRefreshing ? "Refreshing…" : "Refresh snapshot"}
            </button>
          </div>

          {competitorsError && <p className="text-xs text-[#EF4444]">{competitorsError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AnimatedCard glass>
              <p className="text-xs font-medium text-[#94A3B8] mb-1">Avg competitor rating (latest)</p>
              <p className="text-2xl font-semibold text-[#0B1220]">
                {competitorTrends180d.avgRatingLatest ? competitorTrends180d.avgRatingLatest.toFixed(2) : "—"}
              </p>
              <p className="mt-2 text-[11px] text-[#94A3B8]">From latest snapshot per competitor.</p>
            </AnimatedCard>

            <AnimatedCard glass>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">Most reviews (latest)</p>
              <p className="text-sm font-semibold text-[#0B1220]">
                {competitorTrends180d.mostReviewsLatest
                  ? `${competitorTrends180d.mostReviewsLatest.name}`
                  : "—"}
              </p>
              <p className="mt-2 text-[11px] text-[#94A3B8]">
                {competitorTrends180d.mostReviewsLatest
                  ? `${competitorTrends180d.mostReviewsLatest.total} reviews`
                  : "Needs at least 1 snapshot per competitor."}
              </p>
            </AnimatedCard>

            <AnimatedCard glass>
              <p className="text-xs font-medium text-[#94A3B8] mb-1">Competitors found (latest)</p>
              <p className="text-2xl font-semibold text-[#0B1220]">
                {competitorsLatest.length}
              </p>
              <p className="mt-2 text-[11px] text-[#94A3B8]">Deduped by place_id.</p>
            </AnimatedCard>
          </div>

          <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#0B1220]">Nearest competitors</p>
              <span className="text-xs text-[#94A3B8]">Latest snapshot</span>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {(competitorsLatest ?? []).slice(0, 12).map((c) => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[#0B1220] truncate">{c.name}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {typeof c.distance_m === "number" ? `${Math.round(c.distance_m)} m` : "—"} ·{" "}
                      {c.snapshot_date ? safeDateLabel(c.snapshot_date) : "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-[#0B1220]">
                      {typeof c.rating === "number" ? c.rating.toFixed(1) : "—"}
                      <span className="text-xs text-[#94A3B8]"> / 5</span>
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {typeof c.total_reviews === "number" ? `${c.total_reviews} reviews` : "—"}
                    </p>
                  </div>
                </div>
              ))}

              {!competitorsLoading && competitorsLatest.length === 0 && (
                <div className="px-4 py-6 text-sm text-[#94A3B8]">
                  No competitors loaded yet. Click “Refresh snapshot”.
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Review feed */}
      {activeTab === "reviews" && (
        <div className="rounded-xl bg-white lp-card">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0B1220]">Recent reviews</p>
            <span className="text-xs text-[#94A3B8]">Newest first</span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {reviews.slice(0, 50).map(r => {
              const id = r.id;
              const isExpanded = Boolean(expanded[id]);
              const fullText = r.text ?? '';
              const short = fullText.length > 180 ? fullText.slice(0, 180) + '…' : fullText;

              const dateIso = r.review_created_at ?? r.created_at;
              const dateLabel = safeDateLabel(dateIso);

              return (
                <div key={id} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Stars rating={r.rating ?? 0} />
                      <span className="text-xs text-[#94A3B8]">{dateLabel}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white lp-card text-[#94A3B8]">
                        Google
                      </span>
                    </div>

                    <div className="text-xs text-[#94A3B8]">
                      {r.author_name ? `by ${r.author_name}` : '—'}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-[#0B1220] leading-relaxed">
                    {isExpanded ? fullText || <span className="text-[#94A3B8]">No text</span> : short || <span className="text-[#94A3B8]">No text</span>}
                  </div>

                  {fullText.length > 180 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
                      }
                      className="mt-2 text-xs text-[#22C3A6] hover:text-[#17A98F]"
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </section>
  );
}










