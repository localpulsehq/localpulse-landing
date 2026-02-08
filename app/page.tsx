import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

const proofCards: Array<{
  title: string;
  body: string;
  tone: "success" | "warn" | "error" | "info";
}> = [
  {
    title: "7 unhappy customers were routed privately",
    body: "Their feedback reached you before it reached Google.",
    tone: "success",
  },
  {
    title: "Your rating stayed steady this week",
    body: "Happy guests were prompted to leave Google reviews.",
    tone: "success",
  },
  {
    title: "Early warning: wait time feedback rising",
    body: "Showing up in private responses before it hits Google.",
    tone: "warn",
  },
  {
    title: "Staffing change reduced complaints",
    body: "Private feedback about service dropped this week.",
    tone: "error",
  },
  {
    title: "Coffee quality praise is consistent",
    body: "A strong signal to keep prompting happy guests.",
    tone: "success",
  },
  {
    title: "Weekend rush feedback needs attention",
    body: "Patterns are appearing in private responses.",
    tone: "warn",
  },
  {
    title: "Follow-up resolved 4 issues",
    body: "Customers confirmed problems were fixed.",
    tone: "success",
  },
  {
    title: "Afternoon service flagged early",
    body: "Came up in private feedback before any new reviews.",
    tone: "warn",
  },
  {
    title: "Complaints trending down",
    body: "Private feedback shows fewer repeat issues.",
    tone: "success",
  },
];

const pillars = [
  {
    title: "Review protection",
    body: "Unhappy customers are routed to you privately before reviews go public.",
  },
  {
    title: "Google rating stability",
    body: "Happy customers are prompted to share their experience on Google.",
  },
  {
    title: "Early issue detection",
    body: "Spot repeat complaints and fix them before they spread.",
  },
  {
    title: "Proof & validation",
    body: "Trends show what improved and what still needs attention.",
  },
];

const steps = [
  {
    title: "Customer feedback checkpoint",
    body: "Guests leave a quick star rating first.",
  },
  {
    title: "Smart routing",
    body: "Happy guests go to Google; unhappy guests go to you.",
  },
  {
    title: "Learn & prevent repeats",
    body: "Weekly guidance shows what to fix and what worked.",
  },
];

function toneClass(tone: "success" | "warn" | "error" | "info") {
  switch (tone) {
    case "success":
      return "bg-gradient-to-r from-[#E8F7F1] to-[#F4FFFB] text-[#0B1220] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
    case "warn":
      return "bg-gradient-to-r from-[#FFF4E5] to-[#FFF8ED] text-[#0B1220] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
    case "error":
      return "bg-gradient-to-r from-[#FFEFE6] to-[#FFF6F0] text-[#0B1220] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
    default:
      return "bg-[#F9FBFC] text-[#0B1220] shadow-[0_8px_22px_rgba(11,18,32,0.08)]";
  }
}

export default function Home() {
  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">

        <MarketingHeader />

        <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14 md:grid-cols-2 motion-safe:animate-fade-in">
          <div className="space-y-6">
            {/* <p className="inline-flex items-center gap-2 rounded-full bg-white lp-card px-3 py-1 text-xs font-medium text-[#94A3B8] shadow-sm">
              Quiet premium for cafe owners
            </p> */}

            <div className="flex gap-4">
              <span className="mt-2 h-16 w-1.5 rounded-full bg-[#22C3A6]" aria-hidden="true" />
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                  Stop bad Google reviews before they happen.
                </h1>

                <p className="max-w-xl text-base text-[#94A3B8] opacity-80 md:text-lg">
                  LocalPulse adds a private feedback checkpoint so unhappy customers
                  reach you first, while happy customers are invited to leave a Google
                  review.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-[#22C3A6] px-5 py-3 text-sm font-semibold tracking-[0.015em] text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
              >
                Protect my rating
              </Link>
              <Link
                href="/product"
                className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-transparent px-5 py-3 text-sm font-semibold tracking-[0.015em] text-[#0B1220] transition hover:border-[#22C3A6] hover:text-[#17A98F]"
              >
                See how it works <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 right-8 h-24 w-24 rounded-full bg-[#22C3A6]/30 blur-2xl" />
            <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_20px_50px_rgba(11,18,32,0.12)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Overview insights</h3>
                <span className="rounded-full bg-[#F9FBFC] px-2 py-1 text-[10px] font-semibold text-[#94A3B8]">
                  This week
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {proofCards.slice(0, 3).map((card, idx) => (
                  <div
                    key={card.title}
                    className={`animate-card-in rounded-2xl px-4 py-3 ${toneClass(
                      card.tone
                    )}`}
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <p className="text-xs font-semibold">{card.title}</p>
                    <p className="mt-1 text-xs text-[#94A3B8]">{card.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-[#F9FBFC] lp-card-soft px-4 py-3">
                <p className="text-xs font-semibold text-[#0B1220]">
                  Competitor benchmark ready
                </p>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  Nearby cafes average 4.3 stars across 210 reviews.
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
              What it does
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Protection first, insights second.
            </h2>
          </div>
          <p className="max-w-lg text-sm text-[#94A3B8]">
            LocalPulse creates a private checkpoint between customer emotion and
            Google, routing feedback the right way before reviews go public.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {pillars.map((pillar, idx) => (
            <div
              key={pillar.title}
              className="animate-card-slide-up rounded-2xl bg-white lp-card p-6 shadow-[0_16px_40px_rgba(11,18,32,0.08)]"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#F9FBFC] text-xs font-semibold text-[#22C3A6] flex items-center justify-center md:h-10 md:w-10">
                  {idx + 1}
                </div>
                <h3 className="text-base font-semibold md:text-lg">
                  {pillar.title}
                </h3>
              </div>
              <p className="mt-2 text-sm text-[#94A3B8]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-white lp-card px-6 py-10 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
                Proof
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Proof the protection is working.
              </h2>
            </div>
            <p className="max-w-md text-sm text-[#94A3B8]">
              Evidence of prevented issues, early warning signals, and confirmation
              of what improved.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {proofCards.map((card, idx) => (
              <div
                key={card.title}
                className={`animate-card-scale-in rounded-2xl px-4 py-4 ${
                  idx >= 5 ? "hidden md:block" : ""
                } ${toneClass(card.tone)}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="mt-2 text-xs text-[#94A3B8]">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22C3A6]">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              A simple checkpoint that protects your rating.
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#94A3B8]">
            You stay focused on the cafe. We handle the routing and guidance.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className="animate-card-slide-up rounded-2xl bg-white lp-card p-6 shadow-[0_14px_36px_rgba(11,18,32,0.08)]"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="text-xs font-semibold text-[#94A3B8]">
                Step {idx + 1}
              </div>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28 motion-safe:animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl bg-[#0B1220] px-8 py-12 text-white shadow-[0_20px_50px_rgba(11,18,32,0.2)]">
          <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-[#22C3A6]/30 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">
                Inviting a small number of cafes to protect their rating.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-[#94A3B8]">
                Get early access, shape the product, and put a calm checkpoint
                between customer emotion and Google.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/contact"
                className="flex items-center justify-center rounded-full bg-[#22C3A6] px-6 py-3 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
              >
                Apply for early access
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/50"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}






