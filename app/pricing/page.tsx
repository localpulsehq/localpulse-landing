import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

const plans = [
  {
    name: "Starter",
    price: "$49 / month",
    blurb: "Best for independent cafes.",
    tone: "lp-card shadow-[0_18px_50px_rgba(34,195,166,0.15)]",
    cta: "Start free 14-day trial",
    href: "/contact",
    features: [
      "1 location",
      "Weekly insight emails",
      "Competitor benchmarking",
      "Google Business Profile connection",
      "Email alerts",
    ],
    limits: {
      locations: "1",
      refresh: "Weekly",
      lookback: "180 days",
      competitors: "5",
    },
    highlight: true,
  },
  {
    name: "Pro",
    price: "Coming soon",
    blurb: "For growing cafe groups.",
    tone: "lp-card-soft",
    cta: "Join waitlist",
    href: "/contact",
    features: [
      "Multi-location reporting",
      "Team access",
      "Deeper trends",
      "Priority support",
    ],
    limits: {
      locations: "Up to 5",
      refresh: "Weekly",
      lookback: "365 days",
      competitors: "10",
    },
    badge: "Coming soon",
  },
];

const limits = [
  { label: "Max locations", key: "locations" },
  { label: "Refresh frequency", key: "refresh" },
  { label: "Lookback window", key: "lookback" },
  { label: "Competitors tracked", key: "competitors" },
];

export default function PricingPage() {
  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">

        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 motion-safe:animate-fade-in">
          <div className="max-w-2xl space-y-5">
            <div className="flex gap-4">
              <span className="mt-2 h-14 w-1.5 rounded-full bg-[#22C3A6]" aria-hidden="true" />
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                  Simple pricing, low-risk to try.
                </h1>
                <p className="text-base text-[#94A3B8] opacity-80 md:text-lg">
                  LocalPulse helps you understand what customers are praising - and what is
                  costing you repeat visits. Start with a 14-day free trial and cancel
                  anytime.
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-16 motion-safe:animate-fade-in">
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-6 motion-safe:animate-card-in ${plan.tone}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="mt-1 text-sm text-[#94A3B8]">{plan.blurb}</p>
                </div>
                {plan.badge ? (
                  <span className="rounded-full bg-white lp-card px-2 py-1 text-[10px] font-semibold text-[#94A3B8]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <div className="text-3xl font-semibold">{plan.price}</div>
                {plan.name === "Starter" ? (
                  <div className="mt-1 text-xs text-[#94A3B8]">
                    Per location - 14-day free trial
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-[#94A3B8]">
                    Per location, billed monthly
                  </div>
                )}
              </div>

              <ul className="mt-5 space-y-2 text-sm text-[#0B1220]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#22C3A6]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                  plan.highlight
                    ? "bg-[#22C3A6] text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] hover:bg-[#17A98F]"
                    : "border border-[#E2E8F0] text-[#0B1220] hover:border-[#22C3A6] hover:text-[#17A98F]"
                } transition`}
              >
                {plan.cta}
              </Link>
              {plan.name === "Starter" ? (
                <p className="mt-3 text-center text-xs text-[#94A3B8]">
                  No credit card required. Cancel anytime.
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-[#94A3B8]">
          Early access cafes receive a reduced rate while the product is evolving.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-white lp-card px-6 py-10 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
                Limits
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Clear limits that stay predictable.
              </h2>
            </div>
            <p className="max-w-md text-sm text-[#94A3B8]">
              These limits keep LocalPulse simple and predictable. We'll always be
              transparent as the product evolves.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E2E8F0]">
            <div className="grid grid-cols-3 bg-[#F9FBFC] text-xs font-semibold text-[#94A3B8]">
              <div className="px-4 py-3">Limit</div>
              {plans.map((plan) => (
                <div key={plan.name} className="px-4 py-3 text-center">
                  {plan.name}
                </div>
              ))}
            </div>

            {limits.map((limit) => (
              <div
                key={limit.label}
                className="grid grid-cols-3 border-t border-[#E2E8F0] bg-white text-sm"
              >
                <div className="px-4 py-3 text-[#94A3B8]">{limit.label}</div>
                {plans.map((plan) => (
                  <div key={plan.name} className="px-4 py-3 text-center">
                    {plan.limits[limit.key as keyof typeof plan.limits]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}








