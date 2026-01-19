"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AnimatedCard from "@/components/ui/AnimatedCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

type ReviewSource = {
  id: string;
  cafe_id: string;
  platform: string;
  external_place_id: string;
  display_name: string | null;
  url: string | null;
  last_synced_at: string | null;
};


function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hr${diffH === 1 ? "" : "s"} ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
}

function extractPlaceId(input: string): string | null {
  const trimmed = input.trim();

  // Google Place IDs always start with "Ch"
  if (!trimmed.startsWith("Ch")) return null;

  // defensive: reject obvious URLs
  if (trimmed.includes("http")) return null;

  return trimmed;
}

export function ReviewsIntegrationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [source, setSource] = useState<ReviewSource | null>(null);

  const [input, setInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------- initial load ----------
    async function load() {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setErrorMessage("You must be logged in to manage reviews.");
        setLoading(false);
        return;
      }

      const { data: cafe, error: cafeError } = await supabase
        .from("cafes")
        .select("id")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (cafeError || !cafe) {
        setErrorMessage("Could not load your cafe.");
        setLoading(false);
        return;
      }

      setCafeId(cafe.id);

      const { data: src, error: srcError } = await supabase
        .from("review_sources")
        .select("*")
        .eq("cafe_id", cafe.id)
        .eq("platform", "google")
        .maybeSingle();

      if (srcError && srcError.code !== "PGRST116") {
        console.error("Failed to load review source:", srcError);
        setErrorMessage("Could not load Google Reviews connection.");
        setLoading(false);
        return;
      }

      if (src) {
        setSource(src as ReviewSource);
        setInput(src.external_place_id ?? "");
      }

      setLoading(false);
    }
    
  useEffect(() => {
    load();
  }, []);

  // ---------- handlers ----------

async function handleSave() {
  if (!cafeId) return;

  setErrorMessage(null);
  setStatusMessage(null);

  const placeId = extractPlaceId(input);

  if (!placeId) {
    setErrorMessage(
      "Please paste a valid Google Place ID (starts with ChIJ...)."
    );
    return;
  }

  setSaving(true);

  const payload = {
    cafe_id: cafeId,
    platform: "google",
    external_place_id: placeId,
    url: null,
    display_name: source?.display_name ?? null,
  };

  const { data, error } = await supabase
    .from("review_sources")
    .upsert(payload, {
      onConflict: "cafe_id,platform",
    })
    .select("*")
    .maybeSingle();

  setSaving(false);

  if (error) {
    console.error("Failed to save review source:", error);
    setErrorMessage("Failed to save Google Reviews connection.");
    return;
  }

  if (data) {
    setSource(data as ReviewSource);
    setStatusMessage("Google Place ID saved.");
    setTimeout(() => setStatusMessage(null), 2500);
  }
}



  // This will be fully wired in Task 3.
async function handleSyncNow() {
  if (!source) return;

  setErrorMessage(null);
  setStatusMessage(null);
  setSyncing(true);

  try {
    const res = await fetch("/api/reviews/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "google" }),
    });

    // Always try to read JSON error message
    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : { error: await res.text() };

    if (!res.ok) {
      throw new Error(payload?.error || "Sync failed");
    }

    if (!payload?.ok) {
      throw new Error(payload?.error || "Sync failed");
    }

    // refresh from DB so last_synced_at + url/display_name update properly
    await load(); // if load() is inside useEffect, lift it out so you can call it here
    setStatusMessage("Reviews synced successfully.");
    setTimeout(() => setStatusMessage(null), 2500);
  } catch (err: any) {
    console.error("Sync error:", err);
    setErrorMessage(err?.message ?? "Sync failed - check server logs.");
  } finally {
    setSyncing(false);
  }
}


  const connected = !!source?.external_place_id;
  const lastSyncedLabel = connected
    ? `Last synced ${formatRelativeTime(source?.last_synced_at ?? null)}`
    : "Not synced yet";

  // ---------- render ----------

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <AnimatedCard>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0B1220]">
            Reviews integration
          </h3>
          <p className="mt-1 text-xs text-[#94A3B8] max-w-xl">
            Connect your cafe&apos;s Google Reviews so LocalPulse can show your
            average rating, review count, and recent comments.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#94A3B8]">
            Google Place ID
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your Google Place ID (ChIJ...)"
            className="w-full rounded-md bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm text-[#0B1220] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[rgba(34,195,166,0.35)] focus:border-[#22C3A6]"
          />
          <p className="text-[11px] text-[#94A3B8]">
            Paste your cafe's Google Place ID (starts with{" "}
            <code className="mx-1 rounded bg-[#F9FBFC] px-1 py-0.5 text-[10px]">
              ChIJ...
            </code>
            ).
            <br />
            <a
              href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
              target="_blank"
              className="text-[#22C3A6] underline"
            >
              Open Google Place ID Finder
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !input.trim()}
            className="inline-flex items-center justify-center rounded-md bg-[#22C3A6] px-4 py-2 text-xs font-medium text-[#0B1220] hover:bg-[#17A98F] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : connected ? "Update Place ID" : "Save & connect"}
          </button>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={!connected || syncing}
            className="inline-flex items-center justify-center rounded-md border border-[#E2E8F0] px-4 py-2 text-xs font-medium text-[#0B1220] hover:bg-[#F9FBFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? "Syncing..." : "Sync now"}
          </button>

          <span className="text-[11px] text-[#94A3B8] ml-auto">
            {connected ? `Connected · ${lastSyncedLabel}` : "Not connected yet"}
          </span>
        </div>

        {statusMessage && (
          <p className="text-[11px] text-[#22C3A6]">{statusMessage}</p>
        )}
        {errorMessage && (
          <p className="text-[11px] text-[#EF4444]">{errorMessage}</p>
        )}
      </div>
    </AnimatedCard>
  );
}






