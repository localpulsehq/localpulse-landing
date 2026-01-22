import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!; // e.g. https://yourapp.vercel.app

function makeState() {
  return crypto.randomUUID();
}

export async function GET(req: NextRequest) {
  if (!CLIENT_ID || !REDIRECT_URI || !APP_URL) {
    return NextResponse.json(
      { error: "Missing GOOGLE_OAUTH_* or NEXT_PUBLIC_APP_URL env vars" },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Optional: store state in a cookie (simple CSRF protection)
  const state = makeState();

  // GBP / Business Profile scopes (we can adjust later)
  const scopes = ["https://www.googleapis.com/auth/business.manage"];

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline"); // IMPORTANT for refresh_token
  url.searchParams.set("prompt", "consent");      // IMPORTANT first time to force refresh_token
  url.searchParams.set("state", state);

  // where to return after callback
  const next = req.nextUrl.searchParams.get("next");
  const safeNext =
    next && next.startsWith("/") ? `${APP_URL}${next}` : `${APP_URL}/dashboard/settings?gbp=connected`;
  url.searchParams.set("redirect_to", safeNext);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("gbp_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 10 * 60,
  });
  res.cookies.set("gbp_redirect_to", safeNext, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}
