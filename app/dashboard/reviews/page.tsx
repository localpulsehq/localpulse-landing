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
};

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${r} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < r ? 'text-amber-400' : 'text-slate-700'}
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

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [source, setSource] = useState<ReviewSourceRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  // For “read more” toggles
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        'id,cafe_id,review_source_id,external_review_id,rating,author_name,text,language,review_created_at,created_at',
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

      // Reload source + reviews so badge updates immediately
      await loadAll();
    } catch (e: any) {
      console.error('Sync failed:', e);
      setError(e?.message ?? 'Failed to sync reviews.');
    } finally {
      setSyncing(false);
    }
  }

  // ---------- derived metrics ----------
  const { avgRating, totalReviews, new30d } = useMemo(() => {
    const total = reviews.length;

    const avg =
      total > 0
        ? reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0) / total
        : 0;

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);

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

  // ---------- render ----------
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-72 bg-slate-900 rounded animate-pulse" />
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
      <section className="border border-rose-800/60 rounded-xl bg-slate-950/60 p-6">
        <p className="text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  const connected = Boolean(source?.external_place_id);

  if (!connected) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-sm text-slate-400">
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
            <p className="text-sm text-slate-400">
              Connected to Google — sync to pull your latest reviews.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        <EmptyState
          title="No reviews found yet"
          description="Click “Sync now” to fetch reviews from Google. If you still see none, your Place ID may not have reviews or Google is returning a limited set."
        />

        {error && <p className="text-xs text-rose-400">{error}</p>}
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
          <p className="text-sm text-slate-400">
            {source?.display_name ? (
              <>
                Connected to <span className="text-slate-200 font-medium">{source.display_name}</span>{' '}
                <span className="text-slate-500">· Google</span>
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
              className="px-3 py-2 rounded-md border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-xs text-slate-200"
            >
              View on Google
            </Link>
          )}

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnimatedCardGroup>
          <AnimatedCard glass>
            <p className="text-xs font-medium text-slate-400 mb-1">Average rating (all)</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-semibold text-slate-50">
                {avgRating ? avgRating.toFixed(2) : '—'}
              </p>
              <div className="pb-1">
                <Stars rating={avgRating} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Based on synced reviews.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-slate-400 mb-1">Total reviews</p>
            <p className="text-2xl font-semibold text-slate-50">
              <AnimatedNumber value={totalReviews} />
            </p>
            <p className="mt-2 text-[11px] text-slate-500">Google subset (for now) — expands later.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-slate-400 mb-1">New reviews (last 30 days)</p>
            <p className="text-2xl font-semibold text-slate-50">
              <AnimatedNumber value={new30d} />
            </p>
            <p className="mt-2 text-[11px] text-slate-500">Uses review date when available.</p>
          </AnimatedCard>

          <AnimatedCard glass>
            <p className="text-xs font-medium text-slate-400 mb-1">Last synced</p>
            <p className="text-sm font-semibold text-slate-50">
              {source?.last_synced_at ? safeDateLabel(source.last_synced_at) : '—'}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              {lastSyncedAgo ? `${lastSyncedAgo}` : 'Not synced yet'}
            </p>
          </AnimatedCard>
        </AnimatedCardGroup>
      </div>

      {/* Review feed */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">Recent reviews</p>
          <span className="text-xs text-slate-500">Newest first</span>
        </div>

        <div className="divide-y divide-slate-800">
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
                    <span className="text-xs text-slate-500">{dateLabel}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950/50 text-slate-300">
                      Google
                    </span>
                  </div>

                  <div className="text-xs text-slate-400">
                    {r.author_name ? `by ${r.author_name}` : '—'}
                  </div>
                </div>

                <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                  {isExpanded ? fullText || <span className="text-slate-500">No text</span> : short || <span className="text-slate-500">No text</span>}
                </div>

                {fullText.length > 180 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
                    }
                    className="mt-2 text-xs text-sky-400 hover:text-sky-300"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </section>
  );
}
