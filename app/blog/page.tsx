import Link from "next/link";
import { posts } from "@/content/blog";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

const categories = [
  "Customer feedback",
  "Local competition",
  "Cafe operations",
  "Product updates",
];

export default function BlogPage() {
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
                  Practical insights for cafe owners.
                </h1>
                <p className="text-base text-[#94A3B8] opacity-80 md:text-lg">
                  LocalPulse articles explain review insights and local competition in
                  owner language. Short, useful, and built for local SEO.
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-16 motion-safe:animate-fade-in">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-white lp-card px-3 py-1 text-xs font-semibold text-[#94A3B8]"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28 motion-safe:animate-fade-in">
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-3xl bg-white lp-card p-6 shadow-[0_16px_40px_rgba(11,18,32,0.08)] transition hover:-translate-y-1 hover:border-[#22C3A6]/50 motion-safe:animate-card-in"
            >
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="rounded-full border border-[#E2E8F0] px-2 py-0.5">
                  {post.category}
                </span>
                <span>{post.readingTime}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm text-[#94A3B8]">{post.excerpt}</p>
              <p className="mt-4 text-xs font-semibold text-[#22C3A6]">
                Read article
              </p>
            </Link>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}






