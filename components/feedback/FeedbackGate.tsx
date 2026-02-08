"use client";

import { useMemo, useState } from "react";

type FeedbackGateProps = {
  businessId: string;
  businessName: string;
  googleReviewUrl: string;
  threshold: number;
  source?: string | null;
  slug?: string | null;
};

function StarButton({
  value,
  active,
  onClick,
}: {
  value: number;
  active: boolean;
  onClick: (value: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={[
        "h-12 w-12 rounded-full border text-lg transition transform-gpu hover:-translate-y-0.5 hover:scale-105",
        active
          ? "border-[#22C3A6] bg-[#22C3A6] text-[#0B1220]"
          : "border-[#E2E8F0] bg-white text-[#94A3B8] hover:border-[#22C3A6] hover:text-[#0B1220]",
      ].join(" ")}
      aria-label={`${value} star${value === 1 ? "" : "s"}`}
    >
      {"\u2605"}
    </button>
  );
}

export function FeedbackGate({
  businessId,
  businessName,
  googleReviewUrl,
  threshold,
  source,
  slug,
}: FeedbackGateProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [happyLogged, setHappyLogged] = useState(false);

  const isHappy = rating != null && rating >= threshold;
  const isUnhappy = rating != null && rating < threshold;

  const meta = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      slug,
      path: window.location.pathname,
      referrer: document.referrer || null,
      ua: navigator.userAgent,
    };
  }, [slug]);

  async function submitUnhappy() {
    if (rating == null) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          rating,
          message,
          contact,
          source,
          meta,
          company: honeypot,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to submit feedback.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendHappySubmission() {
    if (happyLogged || rating == null) return;
    setHappyLogged(true);

    try {
      await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          rating,
          source,
          meta,
          company: honeypot,
        }),
        keepalive: true,
      });
    } catch {
      // non-blocking
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_20px_50px_rgba(11,18,32,0.12)] motion-safe:animate-card-slide-up">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#22C3A6]">
            Quick feedback
          </p>
          <h1 className="text-2xl font-semibold text-[#0B1220]">
            How was your visit to {businessName}?
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Rate your experience so we can route your feedback the right way.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3 motion-safe:animate-card-in">
          {[1, 2, 3, 4, 5].map((value) => (
            <StarButton
              key={value}
              value={value}
              active={rating != null && value <= rating}
              onClick={setRating}
            />
          ))}
        </div>

        {isUnhappy && !submitted && (
          <div className="mt-6 space-y-4 motion-safe:animate-card-slide-up">
            <div>
              <label className="text-sm font-medium text-[#0B1220]">
                What went wrong?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220] focus:border-[#22C3A6] focus:outline-none"
                rows={4}
                placeholder="Short, specific feedback helps the owner fix it."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0B1220]">
                Leave your number or email (optional)
              </label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220] focus:border-[#22C3A6] focus:outline-none"
                placeholder="Phone or email"
              />
            </div>

            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {error && <p className="text-xs text-[#EF4444]">{error}</p>}

            <button
              type="button"
              onClick={submitUnhappy}
              disabled={submitting || !message.trim()}
              className="w-full rounded-full bg-[#22C3A6] px-4 py-3 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F] disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send privately"}
            </button>
          </div>
        )}

        {isUnhappy && submitted && (
          <div className="mt-6 rounded-2xl bg-[#F9FBFC] px-4 py-4 text-sm text-[#0B1220] motion-safe:animate-pop-in">
            <p className="font-semibold">Thanks - we hear you.</p>
            <p className="mt-2 text-xs text-[#94A3B8]">
              Your feedback goes directly to the owner.
            </p>
            <p className="mt-2 text-xs text-[#94A3B8]">
              It helps the team fix issues quickly and improve the next visit.
            </p>
          </div>
        )}

        {isHappy && (
          <div className="mt-6 space-y-3 rounded-2xl bg-[#F9FBFC] px-4 py-4 motion-safe:animate-pop-in">
            <p className="text-sm font-semibold text-[#0B1220]">
              Thanks for the feedback.
            </p>
            <p className="text-xs text-[#94A3B8]">
              If you have a moment, a Google review helps other locals find this cafe.
            </p>
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              onClick={sendHappySubmission}
              className="inline-flex items-center justify-center rounded-full bg-[#22C3A6] px-4 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
            >
              Leave a Google review
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
