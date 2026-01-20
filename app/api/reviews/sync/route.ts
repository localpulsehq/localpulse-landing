import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { analyseReview } from "@/src/lib/sentiment/analyseReview";

export const runtime = "nodejs";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;


// For Places API (New) reviews, publishTime is an ISO string.
// Use publishTime+author as a stable-ish external id.
function makeExternalReviewId(r: any) {
  if (r.publishTime) return String(r.publishTime);
  const author = r?.authorAttribution?.displayName ?? "anon";
  const text = r?.text?.text ?? "";
  return `${author}-${text}`.slice(0, 255);
}

export async function POST(_req: NextRequest) {
  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // 1) Auth – get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) Find the cafe for this user
  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (cafeError || !cafe) {
    console.error("reviews/sync: cafe lookup error", cafeError);
    return NextResponse.json(
      { error: "Could not find café for this account" },
      { status: 400 }
    );
  }

  const cafeId = cafe.id;

  // 3) Find Google review source for this cafe
  const { data: source, error: sourceError } = await supabase
    .from("review_sources")
    .select("id, external_place_id")
    .eq("cafe_id", cafeId)
    .eq("platform", "google")
    .maybeSingle();

  if (sourceError || !source) {
    return NextResponse.json(
      {
        error:
          "No Google review source found. Please connect Google Reviews in Settings first.",
      },
      { status: 400 }
    );
  }

  const placeId = source.external_place_id;
  if (!placeId) {
    return NextResponse.json(
      { error: "Google Place ID is missing for this café" },
      { status: 400 }
    );
  }

  // 4) Call Places API (New)
  const googleUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(
    placeId
  )}`;

  // FieldMask controls what is returned (required on v1)
  const fieldMask =
    "id,displayName,rating,userRatingCount,googleMapsUri,reviews,location,formattedAddress";

  const googleRes = await fetch(googleUrl, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  const result = await googleRes.json().catch(() => null);
  const loc = result?.location; // { latitude, longitude }
  const formattedAddress: string | null = result?.formattedAddress ?? null;

  if (loc?.latitude != null && loc?.longitude != null) {
    await supabaseAdmin
      .from("cafes")
      .update({
        lat: loc.latitude,
        lng: loc.longitude,
        address: formattedAddress,
      })
      .eq("id", cafeId);
  }

  if (!googleRes.ok) {
    console.error("reviews/sync: Places API (New) error", result);
    return NextResponse.json(
      {
        error: "Google Places API (New) error",
        details: result,
      },
      { status: 502 }
    );
  }

  // Places API (New) response shape (no data.status, no data.result)
  const googleReviews: any[] = result?.reviews ?? [];

  const placeName: string | null = result?.displayName?.text ?? null;
  const placeUrl: string | null = result?.googleMapsUri ?? null;
  const rating: number | null =
    typeof result?.rating === "number" ? result.rating : null;
  const totalRatings: number | null =
    typeof result?.userRatingCount === "number" ? result.userRatingCount : null;

  // 5) Map into our reviews table payload
  const rowsToUpsert = googleReviews.map((r) => ({
    cafe_id: cafeId,
    review_source_id: source.id,
    external_review_id: makeExternalReviewId(r),
    rating: r?.rating ?? 0,
    author_name: r?.authorAttribution?.displayName ?? null,
    text: r?.text?.text ?? null,
    language: r?.text?.languageCode ?? null,
    review_created_at: r?.publishTime ?? null, // ISO string
  }));

  // 6) Upsert rows into reviews table with service-role client (bypass RLS)
  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("reviews")
      .upsert(rowsToUpsert, {
        onConflict: "review_source_id,external_review_id",
      });

    if (upsertError) {
      console.error("reviews/sync: upsert error", upsertError);
      return NextResponse.json(
        { error: "Failed to store reviews in database" },
        { status: 500 }
      );
    }
  }

// 6-7 filter new rows to update to avoid parsing repeat cells to sentiment
// analyser. 
const needsSentiment = rowsToUpsert.filter(r => r.text);

// 7) Run sentiment only on reviews missing sentiment
for (const review of needsSentiment) {
  const sentiment = await analyseReview(review.text, review.rating);

  await supabaseAdmin
    .from("reviews")
    .update({
      sentiment_score: sentiment.score,
      sentiment_label: sentiment.label,
      sentiment_topics: sentiment.topics,
      sentiment_version: sentiment.version,
    })
    .eq("external_review_id", review.external_review_id)
    .eq("review_source_id", review.review_source_id);
}


  // 8) Update review_sources metadata & last_synced_at
  const { error: sourceUpdateError } = await supabaseAdmin
    .from("review_sources")
    .update({
      last_synced_at: new Date().toISOString(),
      display_name: placeName,
      url: placeUrl,
    })
    .eq("id", source.id);

  if (sourceUpdateError) {
    console.error("reviews/sync: source update error", sourceUpdateError);
  }

  return NextResponse.json({
    ok: true,
    placeId,
    cafeId,
    inserted_or_updated: rowsToUpsert.length,
    rating,
    total_ratings: totalRatings,
  });
}
