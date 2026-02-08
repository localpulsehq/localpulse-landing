import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FeedbackGate } from "@/components/feedback/FeedbackGate";

type GateConfig = {
  cafe_id: string;
  business_name: string;
  google_review_url: string;
  threshold: number | null;
  slug: string;
  active: boolean | null;
};

export default async function FeedbackGatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ source?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const source = resolvedSearch?.source ?? null;

  const { data: gate, error } = await supabaseAdmin
    .from("feedback_gate_configs")
    .select(
      "cafe_id,business_name,google_review_url,threshold,slug,active"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !gate || gate.active === false) {
    notFound();
  }

  const threshold = typeof gate.threshold === "number" ? gate.threshold : 4;

  return (
    <main className="min-h-screen bg-[#F6F9FA] text-[#0B1220]">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <FeedbackGate
          businessId={gate.cafe_id}
          businessName={gate.business_name}
          googleReviewUrl={gate.google_review_url}
          threshold={threshold}
          source={source}
          slug={gate.slug}
        />
      </div>
    </main>
  );
}
