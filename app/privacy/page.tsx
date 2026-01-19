import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">

        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14 motion-safe:animate-fade-in">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white lp-card px-3 py-1 text-xs font-medium text-[#94A3B8] shadow-sm">
              Privacy
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Privacy Policy
            </h1>
            <p className="text-sm text-[#94A3B8]">
              Last updated: 2026-01-06
            </p>
          </div>

          <div className="mt-8 space-y-8 rounded-3xl bg-white lp-card p-6 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">What we store</h2>
              <p className="text-sm text-[#94A3B8]">
                LocalPulse stores the data required to provide insights. This includes
                review text, ratings, and timestamps, along with basic cafe profile
                details that you submit.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">How we handle tokens</h2>
              <p className="text-sm text-[#94A3B8]">
                OAuth tokens are stored server-side and are never exposed to other
                customers. We use them only to sync the data you authorize.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">What we do not do</h2>
              <p className="text-sm text-[#94A3B8]">
                We do not sell your data or share it with third parties for advertising.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Deletion requests</h2>
              <p className="text-sm text-[#94A3B8]">
                You can request deletion of your data at any time. Email
                contact@localpulsehq.com and we will remove your data within 30 days.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Contact</h2>
              <p className="text-sm text-[#94A3B8]">
                Questions about privacy? Reach us at contact@localpulsehq.com.
              </p>
            </section>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>
      <MarketingFooter />
    </main>
  );
}





