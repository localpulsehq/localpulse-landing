"use client";

import AnimatedCard from "@/components/ui/AnimatedCard";

type InsightCard = {
  id: string;
  title: string;
  kind: "signal" | "opportunity";
  severity: "info" | "warn" | "error" | "success";
  why: string;
  action?: string[];
};

function pillStyle(kind: InsightCard["kind"], sev: InsightCard["severity"]) {
  if (kind === "opportunity") {
    return "border-[#22C3A6]/40 bg-[#22C3A6]/10 text-[#22C3A6] opacity-90";
  }
  if (sev === "warn" || sev === "error") {
    return "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B] opacity-90";
  }
  return "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#38BDF8] opacity-90";
}

function pillLabel(kind: InsightCard["kind"], sev: InsightCard["severity"]) {
  if (kind === "opportunity") return "Opportunity";
  if (sev === "warn" || sev === "error") return "Needs attention";
  return "Signal";
}

type Tone = "positive" | "neutral" | "attention" | "action";

function toneForCard(card: InsightCard): Tone {
  switch (card.id) {
    case "strong_praise":
      return "positive";
    case "velocity_spike":
      return "positive";
    case "rating_gap":
      return card.kind === "opportunity" ? "positive" : "attention";
    case "velocity_drop":
      return "attention";
    case "low_review_volume":
      return "attention";
    case "recurring_complaint":
      return "attention";
    case "rating_sentiment_mismatch":
      return "action";
    case "competitor_benchmark_ready":
      return "neutral";
    case "reviews_summary":
      return "neutral";
    case "no_reviews":
      return "neutral";
    default:
      return card.kind === "opportunity" ? "positive" : "neutral";
  }
}

function toneClass(tone: Tone) {
  switch (tone) {
    case "positive":
      return "bg-gradient-to-r from-[#E8F7F1] to-[#F4FFFB] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
    case "attention":
      return "bg-gradient-to-r from-[#FFF4E5] to-[#FFF8ED] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
    case "action":
      return "bg-gradient-to-r from-[#FFEFE6] to-[#FFF6F0] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
    default:
      return "";
  }
}

function signalReason(cardId: string) {
  switch (cardId) {
    case "rating_gap":
      return "Shown when your average rating differs by more than 0.2 stars from nearby competitors over the last 180 days.";
    case "low_review_volume":
      return "Shown when there are fewer than 5 reviews in the last 180 days.";
    case "velocity_drop":
      return "Shown when review volume drops by 30% or more versus the previous 7-day period.";
    case "recurring_complaint":
      return "Shown when a theme appears repeatedly in recent reviews.";
    case "rating_sentiment_mismatch":
      return "Shown when ratings are high but sentiment trends negative.";
    case "competitor_benchmark_ready":
      return "Shown when competitor snapshots are available for your area.";
    case "no_reviews":
      return "Shown when no reviews are available in the last 180 days.";
    case "reviews_summary":
      return "Shown when review totals and averages are available.";
    default:
      return null;
  }
}

export function InsightCards({
  cards,
  loading,
}: {
  cards: InsightCard[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
        <AnimatedCard>
          <div className="h-4 w-40 bg-[#F9FBFC] rounded animate-pulse" />
          <div className="mt-3 h-3 w-full bg-[#F9FBFC] rounded animate-pulse" />
          <div className="mt-2 h-3 w-5/6 bg-[#F9FBFC] rounded animate-pulse" />
        </AnimatedCard>
        <AnimatedCard>
          <div className="h-4 w-40 bg-[#F9FBFC] rounded animate-pulse" />
          <div className="mt-3 h-3 w-full bg-[#F9FBFC] rounded animate-pulse" />
          <div className="mt-2 h-3 w-5/6 bg-[#F9FBFC] rounded animate-pulse" />
        </AnimatedCard>
        <AnimatedCard>
          <div className="h-4 w-40 bg-[#F9FBFC] rounded animate-pulse" />
          <div className="mt-3 h-3 w-full bg-[#F9FBFC] rounded animate-pulse" />
          <div className="mt-2 h-3 w-5/6 bg-[#F9FBFC] rounded animate-pulse" />
        </AnimatedCard>
      </div>
    );
  }

  if (!cards?.length) return null;

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

  const signals = cards
    .filter((c) => c.kind === "signal")
    .sort((a, b) => {
      const aRank = signalOrder.indexOf(a.id);
      const bRank = signalOrder.indexOf(b.id);
      const aScore = aRank === -1 ? signalOrder.length : aRank;
      const bScore = bRank === -1 ? signalOrder.length : bRank;
      return aScore - bScore;
    });
  const opportunities = cards.filter((c) => c.kind === "opportunity");

  const renderCard = (card: InsightCard) => {
    const tone = toneForCard(card);
    const surface = tone === "neutral" ? "default" : "gradient";
    const reason = card.kind === "signal" ? signalReason(card.id) : null;
    return (
      <AnimatedCard
        key={card.id}
        glass
        surface={surface}
        className={toneClass(tone)}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-[#0B1220]">{card.title}</p>
          <div className="flex items-center gap-2">
            {reason && (
              <button
                type="button"
                className="text-[11px] text-[#94A3B8] underline decoration-dotted"
                title={reason}
                aria-label="Why am I seeing this?"
              >
                Why am I seeing this?
              </button>
            )}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${pillStyle(
                card.kind,
                card.severity
              )}`}
            >
              {pillLabel(card.kind, card.severity)}
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">{card.why}</p>

        {card.action?.length ? (
          <ul className="mt-3 space-y-1 text-xs text-[#94A3B8] list-disc list-inside">
            {card.action.slice(0, 3).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        ) : null}
      </AnimatedCard>
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0B1220]">Insights</h3>
        <p className="text-xs text-[#94A3B8]">
          Based on recent activity (last 180 days)
        </p>
      </div>

      {signals.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
            Signals
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
            {signals.slice(0, 3).map(renderCard)}
          </div>
        </div>
      )}

      {opportunities.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
            Opportunities
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
            {opportunities.slice(0, 3).map(renderCard)}
          </div>
        </div>
      )}
    </section>
  );
}


