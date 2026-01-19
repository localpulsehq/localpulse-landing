import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // find cafe
  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (cafeError || !cafe) {
    return NextResponse.json({ error: "Cafe not found" }, { status: 400 });
  }

  // check token row exists
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("google_oauth_tokens")
    .select("id, provider, expiry_date, scope, updated_at")
    .eq("cafe_id", cafe.id)
    .eq("provider", "google")
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json({ error: "Failed to check token status" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    connected: Boolean(tokenRow?.id),
    token: tokenRow ?? null,
  });
}
