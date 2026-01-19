import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getValidGoogleAccessToken } from "@/src/lib/google/gbpTokens";

export const runtime = "nodejs";

const cache = new Map<string, { ts: number; data: any}>();
const TTL_MS = 60_000;

// helper to get Cache Key from Cafe 
function getCacheKey(cafeId: string) {
    return `gbp_locations:${cafeId}`;
}

// helper to call Google APIs
async function googleGet(url: string, accessToken: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (cafeError || !cafe) {
    return NextResponse.json({ error: "Cafe not found" }, { status: 400 });
  }

  const accessToken = await getValidGoogleAccessToken(cafe.id);
  // add cache
  const key = getCacheKey(cafe.id);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return NextResponse.json({ ok: true, ...hit.data, cached: true });
  }

  // 1) List accounts
  const accountsRes = await googleGet(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken
  );

  if (!accountsRes.ok) {
    return NextResponse.json(
      { error: "Failed to list accounts", details: accountsRes.json },
      { status: 502 }
    );
  }

  const accounts = accountsRes.json?.accounts ?? [];
  if (accounts.length === 0) {
    return NextResponse.json({ ok: true, accounts: [], locations: [] });
  }

  // pick first account for v1 (later you can let user choose)
  const accountName = accounts[0]?.name as string | undefined; // "accounts/123..."
  if (!accountName) {
    return NextResponse.json({ error: "Malformed accounts response" }, { status: 502 });
  }

  // 2) List locations (GBP Business Info API)
  const locationsRes = await googleGet(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata,languageCode`,
    accessToken
  );

  if (!locationsRes.ok) {
    return NextResponse.json(
      { error: "Failed to list locations", details: locationsRes.json },
      { status: 502 }
    );
  }
  const payload = {
    accounts,
    accountName,
    locations: locationsRes.json?.locations ?? [],
  };

  cache.set(getCacheKey(cafe.id), { ts: Date.now(), data: payload });

  return NextResponse.json({
    ok: true,
    accounts,
    accountName,
    locations: locationsRes.json?.locations ?? [],
  });
}
