import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(req: NextRequest) {
  if (!CLIENT_ID || !CLIENT_SECRET || !APP_URL) {
    return NextResponse.json(
      { error: "Missing GOOGLE_OAUTH_* or NEXT_PUBLIC_APP_URL env vars" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?gbp=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // verify user session (so we know which cafe to attach tokens to)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login?next=/dashboard/settings&gbp=auth_required`);
  }

  // find cafe for this user
  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (cafeError || !cafe) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?gbp=error&reason=cafe_not_found`);
  }

  // exchange code -> tokens
  const redirectUri = `${APP_URL}/api/google/gbp/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("GBP token exchange failed:", tokenJson);
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?gbp=error&reason=token_exchange_failed`);
  }

  const expiresIn = Number(tokenJson.expires_in ?? 0);
  const expiry = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  // store tokens
  const { error: upsertErr } = await supabaseAdmin
    .from("google_oauth_tokens")
    .upsert(
      {
        cafe_id: cafe.id,
        provider: "google",
        access_token: tokenJson.access_token ?? null,
        refresh_token: tokenJson.refresh_token ?? null,
        scope: tokenJson.scope ?? null,
        token_type: tokenJson.token_type ?? null,
        expiry_date: expiry,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cafe_id,provider" }
    );

  if (upsertErr) {
    console.error("GBP token upsert failed:", upsertErr);
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?gbp=error&reason=db_upsert_failed`);
  }

  // done
  const redirectCookie = req.cookies.get("gbp_redirect_to")?.value;
  const redirectTo =
    redirectCookie && redirectCookie.startsWith(APP_URL)
      ? redirectCookie
      : `${APP_URL}/dashboard/settings?gbp=connected`;

  const res = NextResponse.redirect(redirectTo);
  res.cookies.delete("gbp_redirect_to");
  res.cookies.delete("gbp_oauth_state");
  return res;
}
