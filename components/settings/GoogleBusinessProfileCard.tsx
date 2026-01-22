"use client";

import { useEffect, useState } from "react";
import AnimatedCard from "@/components/ui/AnimatedCard";

type GbpStatusResponse =
  | { ok: true; connected: boolean; token: any | null }
  | { error: string };

export function GoogleBusinessProfileCard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Optional: quick sanity check action
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/google/gbp/status");
      const json = (await res.json()) as GbpStatusResponse;

      if (!res.ok) throw new Error(("error" in json && json.error) || "Failed to load GBP status");

      if ("ok" in json) {
        setConnected(Boolean(json.connected));
      } else {
        setConnected(false);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load GBP status");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleTestLocations() {
    setChecking(true);
    setCheckResult(null);
    setError(null);

    try {
      const res = await fetch("/api/google/gbp/locations");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch locations");
      }

      const count = Array.isArray(json?.locations) ? json.locations.length : 0;
      if (count === 0) {
        setCheckResult("No GBP locations found for this Google account.");
      } else {
        setCheckResult(`Success - found ${count} location(s).`);
      }
    } catch (e: any) {
      setError(e?.message ?? "GBP test failed");
    } finally {
      setChecking(false);
    }
  }

  async function handleDisconnect() {
    if (!connected || disconnecting) return;
    const confirmed = window.confirm(
      "Disconnect Google Business Profile and remove all synced Google reviews?"
    );
    if (!confirmed) return;

    setDisconnecting(true);
    setError(null);
    setCheckResult(null);

    try {
      const res = await fetch("/api/google/gbp/disconnect", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to disconnect GBP");
      }
      setConnected(false);
      setCheckResult("Disconnected and cleared Google reviews.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to disconnect GBP");
    } finally {
      setDisconnecting(false);
    }
  }

  const badge = loading
    ? { text: "Checking...", cls: "border-[#E2E8F0] bg-[#F9FBFC] text-[#94A3B8]" }
    : connected
      ? { text: "Connected", cls: "border-[#22C3A6]/40 bg-[#22C3A6]/10 text-[#22C3A6]" }
      : { text: "Not connected", cls: "border-[#E2E8F0] bg-[#F9FBFC] text-[#94A3B8]" };

  return (
    <AnimatedCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0B1220] mb-1">
            Google Business Profile
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#F9FBFC] lp-card-soft text-[#94A3B8]">
              Beta
            </span>
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Connect your GBP to pull listings, locations, and (later) richer review + business insights.
          </p>
        </div>

        <span
          className={`shrink-0 text-[11px] px-2 py-1 rounded-full border ${badge.cls}`}
        >
          {badge.text}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-xs text-[#94A3B8]">
        <p className="text-[#94A3B8] text-xs font-medium">What this enables</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Fetch GBP accounts → locations</li>
          <li>Match your cafe to the right listing</li>
          <li>Unlock review sync via GBP (later)</li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!connected ? (
          <button
            type="button"
            onClick={() => (window.location.href = "/api/google/gbp/start")}
            className="px-4 py-2 rounded-md bg-[#22C3A6] hover:bg-[#17A98F] text-sm font-medium text-[#0B1220]"
          >
            Connect GBP
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={loadStatus}
              className="px-4 py-2 rounded-md bg-[#F9FBFC] lp-card-soft hover:bg-[#F9FBFC] text-sm text-[#0B1220]"
            >
              Refresh status
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 rounded-md border border-[#FEE2E2] text-sm font-medium text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-60"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect & clear reviews"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleTestLocations}
          disabled={!connected || checking}
          className="px-4 py-2 rounded-md bg-[#F9FBFC] lp-card-soft hover:bg-[#F9FBFC] text-sm text-[#0B1220] disabled:opacity-60"
          title={!connected ? "Connect first" : "Test the GBP API"}
        >
          {checking ? "Checking..." : "Test locations"}
        </button>
      </div>

      {checkResult && (
        <p className="mt-3 text-xs text-[#22C3A6]">{checkResult}</p>
      )}

      {error && (
        <p className="mt-3 text-xs text-[#EF4444]">{error}</p>
      )}

      <p className="mt-3 text-[11px] text-[#94A3B8]">
        Disconnecting removes GBP access and deletes synced Google reviews for this cafe.
      </p>
    </AnimatedCard>
  );
}







