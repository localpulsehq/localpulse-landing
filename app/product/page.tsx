import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

const insightCards = [
  {
    title: "Wait time mentioned repeatedly",
    body: "Shows up in 5 of the last 18 reviews.",
  },
  {
    title: "Coffee quality is a standout",
    body: "Positive mentions across 9 recent reviews.",
  },
  {
    title: "High ratings, negative themes",
    body: "Ratings are strong but service issues appear.",
  },
];

const competitorPoints = [
  {
    title: "Local benchmark",
    body: "Compare your rating and review volume against nearby cafes.",
  },
  {
    title: "Snapshot cadence",
    body: "We refresh competitor snapshots regularly, not in real time.",
  },
  {
    title: "Fair context",
    body: "See review volume so you know if a 0.2 gap is meaningful.",
  },
];

const actions = [
  {
    title: "Fix one issue at a time",
    body: "Use the top complaint theme to choose what to tackle this month.",
  },
  {
    title: "Double down on strengths",
    body: "Turn praise themes into marketing copy and signage.",
  },
  {
    title: "Track momentum weekly",
    body: "Review velocity tells you if prompts are working.",
  },
];

const salesSignals = [
  {
    title: "Weekly revenue movement",
    body: "Upload sales data to spot lifts or dips after operational changes.",
  },
  {
    title: "Transaction volume context",
    body: "Track whether higher ratings are translating into more visits.",
  },
];

const notItems = [
  {
    title: "Not a POS replacement",
    body: "We pair with your existing POS. No switching required.",
  },
  {
    title: "Not a marketing agency",
    body: "LocalPulse gives the insights. You stay in control.",
  },
  {
    title: "Not enterprise BI",
    body: "No sprawling dashboards. Just clear, owner-friendly actions.",
  },
];

export default function ProductPage() {
  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">

        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14 motion-safe:animate-fade-in">
          <div className="max-w-2xl space-y-5">
            {/*<p className="inline-flex items-center gap-2 rounded-full bg-white lp-card px-3 py-1 text-xs font-medium text-[#94A3B8] shadow-sm">
              Product overview
            </p>*/}
            <div className="flex gap-4">
              <span className="mt-2 h-14 w-1.5 rounded-full bg-[#22C3A6]" aria-hidden="true" />
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                  See exactly what to improve at your cafe.
                </h1>
                <p className="text-base text-[#94A3B8] opacity-80 md:text-lg">
                  LocalPulse pulls reviews, sales, and competitor snapshots into a single
                  overview. It is designed for owners who want clarity, not charts.
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
              Dashboard overview
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Your week at a glance.
            </h2>
            <p className="mt-3 text-sm text-[#94A3B8]">
              The overview highlights revenue, review momentum, and the most important
              insights in one place. No digging through tabs.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/pricing"
                className="rounded-full border border-[#E2E8F0] bg-transparent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:border-[#22C3A6] hover:text-[#17A98F]"
              >
                View pricing
              </Link>
              <Link
                href="/contact"
                className="rounded-full bg-[#22C3A6] px-5 py-3 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
              >
                Request early access
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white lp-card p-5 shadow-[0_20px_50px_rgba(11,18,32,0.12)]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
              <img
                src="/screenshots/overview.png"
                alt="LocalPulse overview dashboard"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-white lp-card px-6 py-10 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
                Insights engine
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                We turn feedback into clear actions.
              </h2>
            </div>
            <p className="max-w-md text-sm text-[#94A3B8]">
              LocalPulse uses sentiment analysis and topic detection to surface patterns
              you can act on. It is like an AI co-pilot that speaks owner language.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {insightCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-[#F9FBFC] lp-card-soft px-4 py-4 shadow-[0_12px_30px_rgba(11,18,32,0.08)]"
              >
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="mt-2 text-xs text-[#94A3B8]">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white lp-card px-5 py-4">
              <p className="text-sm font-semibold">Sentiment with context</p>
              <p className="mt-2 text-xs text-[#94A3B8]">
                We do not just label reviews as positive or negative. We show the theme
                behind the sentiment so you know what to fix.
              </p>
            </div>
            <div className="rounded-2xl bg-white lp-card px-5 py-4">
              <p className="text-sm font-semibold">Weekly summaries</p>
              <p className="mt-2 text-xs text-[#94A3B8]">
                You get mailed a short weekly recap of what changed, what to keep, and what to
                address next.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-8 md:grid md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
              Competitor tracking
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Know where you stand locally.
            </h2>
            <p className="mt-3 text-sm text-[#94A3B8]">
              Compare your cafe to nearby competitors with a simple benchmark. See the
              gap and decide where to focus.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[#94A3B8]">
              {competitorPoints.map((point) => (
                <div key={point.title} className="rounded-2xl bg-[#F9FBFC] lp-card-soft px-4 py-3">
                  <p className="text-sm font-semibold text-[#0B1220]">{point.title}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
              <img
                src="/screenshots/competitors.png"
                alt="Local competitor snapshot"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
            <p className="mt-4 text-xs text-[#94A3B8]">
              Limits: competitor data is a snapshot of public review counts and ratings.
              It is designed for relative context, not real-time tracking.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-8 md:grid md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
              Sales signals
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Tie review changes back to revenue.
            </h2>
            <p className="mt-3 text-sm text-[#94A3B8]">
              Optional sales uploads help you confirm whether operational changes are moving the
              numbers that matter.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[#94A3B8]">
              {salesSignals.map((item) => (
                <div key={item.title} className="rounded-2xl bg-[#F9FBFC] lp-card-soft px-4 py-3">
                  <p className="text-sm font-semibold text-[#0B1220]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
              <img
                src="/screenshots/insights.png"
                alt="LocalPulse insights overview"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
            <p className="mt-4 text-xs text-[#94A3B8]">
              Limits: sales uploads are optional and rely on weekly CSV imports.
            </p>
            <p className="mt-2 text-xs text-[#94A3B8]">
              You can use LocalPulse without uploading sales data. Sales signals add
              confirmation, not complexity.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-white lp-card px-6 py-10 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
            How cafes use LocalPulse
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Fit it into your week without adding overhead.
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Connect Google Business Profile",
                body: "Link your reviews once. No ongoing setup.",
              },
              {
                title: "Receive weekly insights by email",
                body: "Short summaries highlight what changed and why it matters.",
              },
              {
                title: "Act on one recommendation at a time",
                body: "Pick the most important fix and let the rest wait.",
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="rounded-2xl bg-[#F9FBFC] lp-card-soft p-5"
              >
                <div className="text-xs font-semibold text-[#94A3B8]">
                  Step {idx + 1}
                </div>
                <p className="mt-2 text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-xs text-[#94A3B8]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-white lp-card px-6 py-10 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
            A real week in action
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            One change, visible impact.
          </h2>
          <p className="mt-3 text-sm text-[#94A3B8] max-w-2xl">
            Last week, Luna Espresso saw repeated mentions of wait times. They adjusted
            staffing on Saturday mornings and saw review momentum recover the following
            week.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
              What you will do with it
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Practical steps, not busywork.
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#94A3B8]">
            LocalPulse keeps you focused on the decisions that matter most each week.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {actions.map((item, idx) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white lp-card p-6 shadow-[0_14px_36px_rgba(11,18,32,0.08)]"
            >
              <div className="mb-4 h-10 w-10 rounded-xl bg-[#F9FBFC] text-xs font-semibold text-[#22C3A6] flex items-center justify-center">
                {idx + 1}
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-white lp-card px-6 py-10 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
            What LocalPulse is not
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Clear focus, no false promises.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {notItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-[#F9FBFC] lp-card-soft px-5 py-4"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-xs text-[#94A3B8]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}








