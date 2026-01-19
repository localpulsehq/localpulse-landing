import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const s1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * R * Math.asin(Math.sqrt(s1));
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // optional knobs
  const body = await req.json().catch(() => ({}));
  const radiusMeters = Number(body?.radiusMeters ?? 1500); // 1.5km default
  const maxResults = Math.min(Number(body?.maxResults ?? 10), 20);

  const supabase = await createSupabaseServerClient();

  // 1) Auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) Load cafe + lat/lng
  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("id,lat,lng")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (cafeError || !cafe) {
    return NextResponse.json(
      { error: "Could not find café for this account" },
      { status: 400 }
    );
  }

  if (typeof cafe.lat !== "number" || typeof cafe.lng !== "number") {
    return NextResponse.json(
      { error: "Cafe lat/lng missing. Sync reviews once to populate it." },
      { status: 400 }
    );
  }

  const cafeLat = cafe.lat;
  const cafeLng = cafe.lng

  // 3) Your own google place id (exclude yourself from results)
  const { data: src, error: srcError } = await supabase
    .from("review_sources")
    .select("external_place_id")
    .eq("cafe_id", cafe.id)
    .eq("platform", "google")
    .maybeSingle();

  if (srcError || !src?.external_place_id) {
    return NextResponse.json(
      { error: "No Google review source connected for this cafe" },
      { status: 400 }
    );
  }

  const yourPlaceId = src.external_place_id;

  // 4) Places Nearby Search (New)
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      includedTypes: ["cafe"],
      maxResultCount: maxResults,
      locationRestriction: {
        circle: {
          center: { latitude: cafe.lat, longitude: cafe.lng },
          radius: radiusMeters,
        },
      },
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("competitors/snapshot Places error", json);
    return NextResponse.json(
      { error: "Places API error", details: json },
      { status: 502 }
    );
  }

  const places: any[] = json?.places ?? [];

  // 5) Map -> competitor_snapshots rows
  const rows = places
    .filter((p) => p?.id && p.id !== yourPlaceId)
    .map((p) => {
      const lat = p?.location?.latitude;
      const lng = p?.location?.longitude;

      const distance_m =
        typeof lat === "number" && typeof lng === "number"
          ? haversineMeters(cafeLat, cafeLng, lat, lng)
          : null;

      return {
        cafe_id: cafe.id,
        name: p?.displayName?.text ?? "Unknown",
        place_id: String(p.id),
        rating: typeof p?.rating === "number" ? p.rating : null,
        total_reviews:
          typeof p?.userRatingCount === "number" ? p.userRatingCount : null,
        distance_m,
        snapshot_date: new Date().toISOString(),
      };
    });

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  // 6) Insert snapshots (append-only)
  const { error: insertError } = await supabaseAdmin
    .from("competitor_snapshots")
    .insert(rows);

  if (insertError) {
    console.error("competitors/snapshot insert error", insertError);
    return NextResponse.json(
      { error: "Failed to store competitor snapshots" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
