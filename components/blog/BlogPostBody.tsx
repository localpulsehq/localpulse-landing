"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const postComponents: Record<string, ComponentType<any>> = {
  "turn-customer-feedback-into-weekly-fixes": dynamic(
    () => import("@/content/blog/customer-feedback-snapshot.mdx")
  ),
  "interpret-competitor-rating-gap": dynamic(
    () => import("@/content/blog/competitor-gaps.mdx")
  ),
};

export function BlogPostBody({ slug }: { slug: string }) {
  const Component = postComponents[slug];

  if (!Component) {
    return <p>Post not found.</p>;
  }

  return (
    <div className="text-base leading-relaxed text-[#0B1220]">
      <div className="space-y-6 [&>h2]:mt-8 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-[#0B1220] [&>p]:text-base [&>p]:leading-relaxed [&>p]:text-[#5B6475] [&>ol]:ml-6 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:text-[#5B6475] [&>ul]:ml-6 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:text-[#5B6475]">
        <Component />
      </div>
    </div>
  );
}
