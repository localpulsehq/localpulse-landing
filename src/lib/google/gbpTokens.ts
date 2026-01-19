import { supabaseAdmin } from "@/lib/supabaseAdmin";

type TokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: string | null; // timestamptz
  scope: string | null;
  token_type: string | null;
};

const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;

function isExpiringSoon(expiryIso: string | null, bufferSeconds = 120) {
  if (!expiryIso) return true;
  const exp = new Date(expiryIso).getTime();
  const now = Date.now();
  return exp - now <= bufferSeconds * 1000;
}

/**
 * Returns a valid access token for a cafe (refreshes if needed).
 * Stores refreshed token back in DB.
 */
export async function getValidGoogleAccessToken(cafeId: string) {
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID/SECRET env vars");
  }

  const { data: row, error } = await supabaseAdmin
    .from("google_oauth_tokens")
    .select("access_token,refresh_token,expiry_date,scope,token_type")
    .eq("cafe_id", cafeId)
    .eq("provider", "google")
    .maybeSingle<TokenRow>();

  if (error) throw new Error("Failed to load google_oauth_tokens");
  if (!row?.refresh_token) throw new Error("No refresh_token stored (reconnect GBP)");

  // If current access token exists and not expiring, use it
  if (row.access_token && !isExpiringSoon(row.expiry_date)) {
    return row.access_token;
  }

  // Refresh token flow
  const form = new URLSearchParams();
  form.set("client_id", GOOGLE_OAUTH_CLIENT_ID);
  form.set("client_secret", GOOGLE_OAUTH_CLIENT_SECRET);
  form.set("refresh_token", row.refresh_token);
  form.set("grant_type", "refresh_token");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const json = await resp.json().catch(() => null);

  if (!resp.ok) {
    console.error("Token refresh failed", json);
    throw new Error("Google token refresh failed");
  }

  const accessToken = json?.access_token as string | undefined;
  const expiresIn = json?.expires_in as number | undefined;
  const tokenType = json?.token_type as string | undefined;
  const scope = json?.scope as string | undefined;

  if (!accessToken || !expiresIn) {
    throw new Error("Refresh response missing access_token/expires_in");
  }

  const expiryDate = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: upsertError } = await supabaseAdmin
    .from("google_oauth_tokens")
    .update({
      access_token: accessToken,
      expiry_date: expiryDate,
      token_type: tokenType ?? row.token_type ?? null,
      scope: scope ?? row.scope ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("cafe_id", cafeId)
    .eq("provider", "google");

  if (upsertError) {
    console.error("Failed saving refreshed token", upsertError);
    // still return token so app works, but log the issue
  }

  return accessToken;
}
