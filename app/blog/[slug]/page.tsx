import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "@/content/blog";
import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/Header";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">

        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-16 motion-safe:animate-fade-in">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#22C3A6]"
              >
                <span aria-hidden="true">←</span>
                Back to blog
              </Link>
              <p className="inline-flex items-center gap-2 rounded-full bg-white lp-card px-3 py-1 text-xs font-medium text-[#94A3B8] shadow-sm">
                {post.category}
              </p>
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              {post.title}
            </h1>
            <div className="text-sm text-[#94A3B8]">
              {post.date} - {post.readingTime}
            </div>
          </div>
        </section>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>

      <article className="mx-auto max-w-4xl px-5 pb-20 sm:px-6 sm:pb-24 motion-safe:animate-fade-in">
        <div className="space-y-6 rounded-3xl bg-white lp-card p-8 text-lg text-[#0B1220] shadow-[0_20px_50px_rgba(11,18,32,0.1)]">
          <BlogPostBody slug={post.slug} />
        </div>
      </article>

      <section className="mx-auto max-w-4xl px-5 pb-24 sm:px-6 sm:pb-28 motion-safe:animate-fade-in">
        <div className="rounded-3xl bg-[#0B1220] p-6 text-white shadow-[0_20px_50px_rgba(11,18,32,0.2)]">
          <h2 className="text-2xl font-semibold">
            Want this in your cafe automatically?
          </h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            LocalPulse turns reviews and sales into weekly, action-ready insights.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex rounded-full bg-[#22C3A6] px-5 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
          >
            Request early access
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}





