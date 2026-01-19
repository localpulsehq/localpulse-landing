"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

type FormState = {
  name: string;
  email: string;
  cafe: string;
  suburb: string;
  message: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  cafe: "",
  suburb: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      setForm(initialState);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">

        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14 motion-safe:animate-fade-in">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="flex gap-4">
                <span className="mt-2 h-14 w-1.5 rounded-full bg-[#22C3A6]" aria-hidden="true" />
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                    Tell us about your cafe.
                  </h1>
                  <p className="text-base text-[#94A3B8] opacity-80 md:text-lg">
                    We will review your details and follow up with the next steps for early
                    access.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white lp-card p-5 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
                <p className="text-sm font-semibold">Contact</p>
                <p className="mt-2 text-sm text-[#94A3B8]">
                  contact@localpulsehq.com
                </p>
                <p className="mt-3 text-xs text-[#94A3B8]">
                  We reply within 1-2 business days.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white lp-card p-6 shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8]">
                    Name
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8]">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-2 w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-[#94A3B8]">
                      Cafe name
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                      value={form.cafe}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, cafe: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#94A3B8]">
                      Suburb
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                      value={form.suburb}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, suburb: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8]">
                    Message
                  </label>
                  <textarea
                    className="mt-2 min-h-[120px] w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                    value={form.message}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, message: e.target.value }))
                    }
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[#22C3A6] px-4 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Sending..." : "Submit"}
                </button>

                {status === "success" ? (
                  <p className="text-xs text-[#22C3A6]">
                    Thanks - we will be in touch shortly.
                  </p>
                ) : null}
                {status === "error" ? (
                  <p className="text-xs text-[#EF4444]">
                    Something went wrong. Please email us directly.
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>
      <MarketingFooter />
    </main>
  );
}










