import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

export default function TermsPage() {
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
              Terms
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Terms of Service
            </h1>
            <p className="text-sm text-[#94A3B8]">
              Last updated: 2026-01-06
            </p>
          </div>

          <div className="mt-8 space-y-8 rounded-3xl bg-white lp-card p-6 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Use of the service</h2>
              <p className="text-sm text-[#94A3B8]">
                LocalPulse provides analytics and insights for cafe owners. You agree to
                use the service only for lawful business purposes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Data you provide</h2>
              <p className="text-sm text-[#94A3B8]">
                You grant LocalPulse permission to process review text, ratings, and
                timestamps that you connect for the purpose of generating insights.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">What we do not do</h2>
              <p className="text-sm text-[#94A3B8]">
                We do not sell your data or use it to advertise to your customers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Service availability</h2>
              <p className="text-sm text-[#94A3B8]">
                We aim for high uptime but do not guarantee uninterrupted access during
                the preview phase.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Termination and deletion</h2>
              <p className="text-sm text-[#94A3B8]">
                You can request account deletion at any time by emailing
                contact@localpulsehq.com. We will remove your data within 30 days.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Contact</h2>
              <p className="text-sm text-[#94A3B8]">
                Questions about these terms? Reach us at contact@localpulsehq.com.
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





