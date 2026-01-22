import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: cafe } = await supabase
    .from("cafes")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!cafe?.id) return NextResponse.json({ error: "Cafe not found" }, { status: 400 });

  const { data: sources, error: sourceError } = await supabaseAdmin
    .from("review_sources")
    .select("id")
    .eq("cafe_id", cafe.id)
    .eq("platform", "google");

  if (sourceError) {
    return NextResponse.json({ error: "Failed to load review sources" }, { status: 500 });
  }

  const sourceIds = (sources ?? []).map((s) => s.id);

  if (sourceIds.length > 0) {
    const { error: deleteReviewsError } = await supabaseAdmin
      .from("reviews")
      .delete()
      .in("review_source_id", sourceIds);

    if (deleteReviewsError) {
      return NextResponse.json({ error: "Failed to delete reviews" }, { status: 500 });
    }

    const { error: deleteSourcesError } = await supabaseAdmin
      .from("review_sources")
      .delete()
      .in("id", sourceIds);

    if (deleteSourcesError) {
      return NextResponse.json({ error: "Failed to delete review sources" }, { status: 500 });
    }
  }

  const { error } = await supabaseAdmin
    .from("google_oauth_tokens")
    .delete()
    .eq("cafe_id", cafe.id)
    .eq("provider", "google");

  if (error) return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
