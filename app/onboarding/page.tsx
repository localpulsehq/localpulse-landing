
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";

type OnboardingStatus =
  | "account_created"
  | "location_connected"
  | "data_fetching"
  | "first_insight_ready"
  | "digest_confirmed"
  | "preferences_set"
  | "onboarding_complete";

type LocationChoice = {
  source: "gbp" | "manual";
  name?: string;
  address?: string;
  placeId?: string;
};

type InsightCard = {
  title: string;
  why: string;
  severity?: "info" | "warn" | "error" | "success";
  action?: string[];
};

type OnboardingState = {
  status: OnboardingStatus;
  step: number;
  location?: LocationChoice;
  digestEnabled: boolean;
  email?: string;
  firstInsight?: InsightCard | null;
  updatedAt: string;
};

type GbpLocation = {
  name: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
  metadata?: {
    placeId?: string;
  };
};

type WarmupStep = {
  id: "reviews" | "competitors" | "insights";
  label: string;
  status: "pending" | "running" | "done" | "failed";
  detail?: string | null;
};

const STORAGE_KEY = "lp:onboarding:v1";
const DEV_ONBOARDING_BYPASS =
  process.env.NEXT_PUBLIC_DEV_ONBOARDING_BYPASS === "1";
const DEV_ONBOARDING_EMAIL =
  process.env.NEXT_PUBLIC_DEV_ONBOARDING_EMAIL ??
  "contact@localpulsehq.com";

const DEFAULT_STATE: OnboardingState = {
  status: "account_created",
  step: 0,
  digestEnabled: true,
  updatedAt: new Date().toISOString(),
};

const steps = [
  { id: "connect", label: "Connect a location", eta: "~1 min" },
  { id: "warmup", label: "Data warm-up", eta: "~1-2 min" },
  { id: "insight", label: "First insight", eta: "instant" },
  { id: "value", label: "Weekly value loop", eta: "~1 min" },
  { id: "prefs", label: "Preferences", eta: "~1 min" },
  { id: "launch", label: "Launch", eta: "instant" },
];

function readStoredState(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    if (!parsed?.status) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatAddress(addr?: GbpLocation["storefrontAddress"]): string | null {
  if (!addr) return null;
  const parts = [
    ...(addr.addressLines ?? []),
    addr.locality,
    addr.administrativeArea,
    addr.postalCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function extractPlaceId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const directMatch = trimmed.match(/ChIJ[a-zA-Z0-9_-]+/);
  if (directMatch) return directMatch[0];
  if (trimmed.startsWith("ChIJ")) return trimmed;
  return null;
}

function nextMondayLabel() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilMonday);
  return target.toLocaleDateString("en-AU", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [gbpConnected, setGbpConnected] = useState<boolean | null>(null);
  const [gbpLocations, setGbpLocations] = useState<GbpLocation[]>([]);
  const [gbpLoading, setGbpLoading] = useState(false);
  const [selectedGbpName, setSelectedGbpName] = useState<string | null>(null);

  const [manualInput, setManualInput] = useState("");
  const [manualName, setManualName] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);

  const [warmupSteps, setWarmupSteps] = useState<WarmupStep[]>([
    { id: "reviews", label: "Analyzing recent reviews", status: "pending" },
    { id: "competitors", label: "Comparing nearby cafes", status: "pending" },
    { id: "insights", label: "Preparing your first insights", status: "pending" },
  ]);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) {
      setState(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [hydrated, state]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      if (DEV_ONBOARDING_BYPASS) {
        setState((prev) => ({ ...prev, email: DEV_ONBOARDING_EMAIL }));
        setCafeId("dev-cafe");
        setLoading(false);
        return;
      }
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.push("/login?next=/onboarding");
        return;
      }

      const user = userData.user;

      if (!state.email && user.email) {
        setState((prev) => ({ ...prev, email: user.email ?? undefined }));
      }

      const { data: cafe, error: cafeError } = await supabase
        .from("cafes")
        .select("id,name")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!cafeError && cafe?.id) {
        setCafeId(cafe.id);
      } else {
        const { data: created } = await supabase
          .from("cafes")
          .insert({
            owner_id: user.id,
            name: "Your cafe",
          })
          .select("id")
          .maybeSingle();
        if (created?.id) {
          setCafeId(created.id);
        }
      }

      setLoading(false);
    }

    bootstrap();
  }, [router, state.email]);

  useEffect(() => {
    async function checkGbp() {
      if (!cafeId) return;
      if (DEV_ONBOARDING_BYPASS) {
        setGbpConnected(false);
        return;
      }
      try {
        const res = await fetch("/api/google/gbp/status");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setGbpConnected(false);
          return;
        }
        setGbpConnected(Boolean(json?.connected));
      } catch {
        setGbpConnected(false);
      }
    }

    checkGbp();
  }, [cafeId]);

  const stepIndex = Math.min(Math.max(state.step, 0), steps.length - 1);

  const warmupComplete = warmupSteps.every(
    (step) => step.status === "done" || step.status === "failed"
  );

  const hasInsight = Boolean(state.firstInsight?.title);

  const primaryInsight: InsightCard = useMemo(() => {
    return (
      state.firstInsight ?? {
        title: "We are still waiting on review data",
        why: "Once reviews sync, your first insight will appear here automatically.",
        severity: "info",
        action: ["Ask staff to prompt reviews at checkout."],
      }
    );
  }, [state.firstInsight]);

  function updateState(patch: Partial<OnboardingState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  async function handleLoadGbpLocations() {
    if (DEV_ONBOARDING_BYPASS) {
      setGbpConnected(true);
      setGbpLocations([
        {
          name: "dev-location-1",
          title: "LocalPulse Demo Cafe",
          storefrontAddress: {
            addressLines: ["123 Demo St"],
            locality: "Fitzroy",
            administrativeArea: "VIC",
            postalCode: "3065",
          },
          metadata: { placeId: "ChIJDEVPLACEID" },
        },
      ]);
      return;
    }
    setGbpLoading(true);
    setLocationError(null);
    try {
      const res = await fetch("/api/google/gbp/locations");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load locations.");
      }
      setGbpLocations(Array.isArray(json?.locations) ? json.locations : []);
    } catch (err: any) {
      setLocationError(err?.message ?? "Failed to load locations.");
    } finally {
      setGbpLoading(false);
    }
  }

  async function handleConfirmGbpLocation() {
    if (!cafeId) return;
    if (DEV_ONBOARDING_BYPASS) {
      updateState({
        status: "location_connected",
        step: 1,
        location: {
          source: "gbp",
          name: "LocalPulse Demo Cafe",
          address: "Fitzroy, Melbourne",
          placeId: "ChIJDEVPLACEID",
        },
      });
      setLocationBusy(false);
      return;
    }
    const selected = gbpLocations.find((loc) => loc.name === selectedGbpName);
    if (!selected) {
      setLocationError("Select a location to continue.");
      return;
    }

    setLocationBusy(true);
    setLocationError(null);

    const placeId = selected?.metadata?.placeId ?? undefined;
    const name = selected.title ?? "Your cafe";
    const address = formatAddress(selected.storefrontAddress ?? undefined) ?? undefined;

    const { error: cafeError } = await supabase
      .from("cafes")
      .update({ name, address })
      .eq("id", cafeId);

    if (cafeError) {
      setLocationError("Could not save your location. Try again.");
      setLocationBusy(false);
      return;
    }

    if (placeId) {
      await supabase.from("review_sources").upsert(
        {
          cafe_id: cafeId,
          platform: "google",
          external_place_id: placeId,
          url: null,
          display_name: name,
        },
        { onConflict: "cafe_id,platform" }
      );
    }

    updateState({
      status: "location_connected",
      step: 1,
      location: {
        source: "gbp",
        name,
        address,
        placeId,
      },
    });
    setLocationBusy(false);
  }

  async function handleManualConnect() {
    if (!cafeId) return;
    if (DEV_ONBOARDING_BYPASS) {
      updateState({
        status: "location_connected",
        step: 1,
        location: {
          source: "manual",
          name: manualName.trim() || "LocalPulse Demo Cafe",
          placeId: "ChIJDEVPLACEID",
        },
      });
      setLocationBusy(false);
      return;
    }
    setLocationBusy(true);
    setLocationError(null);

    const placeId = extractPlaceId(manualInput);
    if (!placeId) {
      setLocationError("Paste a valid Google Place ID or Maps URL.");
      setLocationBusy(false);
      return;
    }

    const displayName = manualName.trim() || "Your cafe";

    const { error: sourceError } = await supabase
      .from("review_sources")
      .upsert(
        {
          cafe_id: cafeId,
          platform: "google",
          external_place_id: placeId,
          url: null,
          display_name: displayName,
        },
        { onConflict: "cafe_id,platform" }
      );

    if (sourceError) {
      setLocationError("Could not save your Google Place ID.");
      setLocationBusy(false);
      return;
    }

    const { error: cafeError } = await supabase
      .from("cafes")
      .update({ name: displayName })
      .eq("id", cafeId);

    if (cafeError) {
      setLocationError("Could not update your cafe details.");
      setLocationBusy(false);
      return;
    }

    updateState({
      status: "location_connected",
      step: 1,
      location: {
        source: "manual",
        name: displayName,
        placeId,
      },
    });
    setLocationBusy(false);
  }

  function updateWarmup(id: WarmupStep["id"], patch: Partial<WarmupStep>) {
    setWarmupSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step))
    );
  }

  async function handleWarmup() {
    if (DEV_ONBOARDING_BYPASS) {
      updateWarmup("reviews", { status: "done", detail: null });
      updateWarmup("competitors", { status: "done", detail: null });
      updateWarmup("insights", { status: "done", detail: null });
      updateState({
        status: "first_insight_ready",
        step: 2,
        firstInsight: {
          title: "Nearby cafes are rated 0.3 stars higher than you",
          why: "This often affects first-time customer choice on Google.",
          severity: "info",
          action: ["Review recent feedback patterns this week."],
        },
      });
      return;
    }
    updateState({ status: "data_fetching" });
    updateWarmup("reviews", { status: "running", detail: null });
    updateWarmup("competitors", { status: "pending", detail: null });
    updateWarmup("insights", { status: "pending", detail: null });

    try {
      const res = await fetch("/api/reviews/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Reviews sync failed.");
      }
      updateWarmup("reviews", { status: "done" });
    } catch (err: any) {
      updateWarmup("reviews", {
        status: "failed",
        detail: err?.message ?? "Reviews sync failed.",
      });
    }

    updateWarmup("competitors", { status: "running" });
    try {
      const res = await fetch("/api/competitors/snapshot", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Competitor snapshot failed.");
      }
      updateWarmup("competitors", { status: "done" });
    } catch (err: any) {
      updateWarmup("competitors", {
        status: "failed",
        detail: err?.message ?? "Competitor snapshot failed.",
      });
    }

    updateWarmup("insights", { status: "running" });
    let firstInsight: InsightCard | null = null;
    try {
      const res = await fetch("/api/insights/overview", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Insights fetch failed.");
      }
      const cards = Array.isArray(json?.insightCards) ? json.insightCards : [];
      firstInsight = cards[0] ?? null;
      updateWarmup("insights", { status: "done" });
    } catch (err: any) {
      updateWarmup("insights", {
        status: "failed",
        detail: err?.message ?? "Insights fetch failed.",
      });
    }

    updateState({
      status: "first_insight_ready",
      step: 2,
      firstInsight,
    });
  }

  function handleContinueFromInsight() {
    updateState({ step: 3 });
  }

  function handleConfirmValueLoop() {
    updateState({ status: "digest_confirmed", step: 4 });
  }

  function handleConfirmPreferences() {
    updateState({ status: "preferences_set", step: 5 });
  }

  function handleLaunch() {
    updateState({ status: "onboarding_complete" });
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <main className="min-h-screen lp-light-app-bg text-[#0B1220] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-6 py-8 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
          Preparing your onboarding...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen lp-light-app-bg text-[#0B1220]">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94A3B8]">
                LocalPulse Onboarding
              </p>
              <h1 className="text-3xl font-semibold">
                Set up your cafe in under 10 minutes.
              </h1>
              <p className="max-w-xl text-sm text-[#94A3B8]">
                We will connect your location, warm up your data, and deliver your first
                insight so you see value fast.
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-xs text-[#94A3B8] shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
              Signed in as <span className="font-semibold">{state.email ?? "account"}</span>
            </div>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-6">
              <div className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                  Progress
                </p>
                <ul className="mt-4 space-y-3">
                  {steps.map((step, idx) => {
                    const isDone = idx < stepIndex;
                    const isCurrent = idx === stepIndex;
                    const statusIcon = isDone ? "✓" : isCurrent ? "●" : "○";
                    const statusLabel = isDone
                      ? "Completed"
                      : isCurrent
                      ? "Current"
                      : "Upcoming";
                    return (
                      <li
                        key={step.id}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl px-3 py-2 motion-safe:transition-all motion-safe:duration-300",
                          isCurrent
                            ? "bg-[#0E1627] text-white"
                            : "bg-[#F9FBFC] text-[#94A3B8]"
                        )}
                      >
                        <span
                          className={clsx(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold motion-safe:transition-transform motion-safe:duration-300",
                            isDone
                              ? "bg-[#22C3A6] text-[#0B1220] motion-safe:animate-pop-in motion-safe:scale-105"
                              : isCurrent
                              ? "bg-white text-[#0B1220] motion-safe:scale-105"
                              : "bg-white text-[#94A3B8]"
                          )}
                        >
                          {statusIcon}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{step.label}</div>
                          <div
                            className={clsx(
                              "mt-1 flex items-center gap-2 text-[11px]",
                              isCurrent ? "text-white/70" : "text-[#94A3B8]"
                            )}
                          >
                            <span>{statusLabel}</span>
                            <span>·</span>
                            <span>{step.eta}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-3xl bg-[#0E1627] p-5 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  What you&apos;ll see today
                </p>
                <div className="mt-4 grid gap-2 text-xs text-white/80">
                  <div>Your cafe&apos;s Google reviews analyzed</div>
                  <div>How you compare to nearby cafes</div>
                  <div>One clear action to focus on this week</div>
                </div>
              </div>
            </aside>

            <section className="rounded-3xl bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:p-8">
              {stepIndex === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Step 1
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Connect your cafe location.
                    </h2>
                    <p className="text-sm text-[#94A3B8]">
                      Attach one real location so we can analyze reviews and nearby competitors.
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#22C3A6]/40 bg-[#ECFDF5] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[#0B1220]">
                          Connect Google Business Profile
                        </h3>
                        <span className="rounded-full bg-[#22C3A6]/15 px-2 py-1 text-[10px] font-semibold uppercase text-[#0B1220]">
                          Recommended
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#94A3B8]">
                        Select your location with a single click.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => (window.location.href = "/api/google/gbp/start")}
                          className="rounded-full bg-[#22C3A6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#17A98F]"
                        >
                          Connect GBP
                        </button>
                        <button
                          type="button"
                          onClick={handleLoadGbpLocations}
                          disabled={!gbpConnected || gbpLoading}
                          className="rounded-full border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0B1220] hover:bg-white disabled:opacity-50"
                        >
                          {gbpLoading ? "Loading..." : "Load locations"}
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {!gbpConnected && (
                          <p className="text-xs text-[#9CA3AF]">
                            Connect your GBP account to load locations.
                          </p>
                        )}
                        {gbpLocations.length > 0 && (
                          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-3">
                            {gbpLocations.map((loc) => {
                              const address = formatAddress(loc.storefrontAddress ?? undefined);
                              return (
                                <label
                                  key={loc.name}
                                  className={clsx(
                                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-xs transition",
                                    selectedGbpName === loc.name
                                      ? "border-[#22C3A6] bg-[#ECFDF5]"
                                      : "border-transparent hover:border-[#22C3A6]"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name="gbp-location"
                                    className="mt-1"
                                    checked={selectedGbpName === loc.name}
                                    onChange={() => setSelectedGbpName(loc.name)}
                                  />
                                  <div>
                                    <div className="font-semibold text-[#0B1220]">
                                      {loc.title ?? "Cafe location"}
                                    </div>
                                    <div className="text-[11px] text-[#94A3B8]">
                                      {address ?? "Address unavailable"}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleConfirmGbpLocation}
                          disabled={!selectedGbpName || locationBusy}
                          className="mt-2 w-full rounded-xl bg-[#22C3A6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#17A98F] disabled:opacity-50"
                        >
                          {locationBusy ? "Saving..." : "Use this location"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F9FBFC] p-5">
                      <h3 className="text-sm font-semibold text-[#0B1220]">
                        Manual connection
                      </h3>
                      <p className="mt-2 text-xs text-[#94A3B8]">
                        Paste a Google Place ID or a Maps URL. We will validate it and sync
                        reviews.
                      </p>
                      <p className="mt-2 text-xs text-[#94A3B8]">
                        We only use your location to analyze public reviews and nearby competitors.
                      </p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-[#94A3B8]">
                            Cafe name (optional)
                          </label>
                          <input
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            placeholder="Example: Lonsdale Espresso"
                            className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0B1220] outline-none focus:border-[#22C3A6]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#94A3B8]">
                            Google Place ID or Maps URL
                          </label>
                          <input
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="Paste your Place ID or Maps URL"
                            className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0B1220] outline-none focus:border-[#22C3A6]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleManualConnect}
                          disabled={locationBusy || !manualInput.trim()}
                          className="w-full rounded-xl bg-[#22C3A6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#17A98F] disabled:opacity-50"
                        >
                          {locationBusy ? "Saving..." : "Save and connect"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {locationError && (
                    <p className="text-xs text-[#EF4444]">{locationError}</p>
                  )}

                  {state.location && (
                    <div className="rounded-2xl border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-3 text-xs text-[#166534]">
                      Location connected: {state.location.name ?? "Your cafe"}.
                    </div>
                  )}
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Step 2
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Warming up your data.
                    </h2>
                    <p className="text-sm text-[#94A3B8]">
                      We are pulling reviews, competitor snapshots, and preparing your first
                      insight. This can take a minute.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {warmupSteps.map((item) => (
                      <div
                        key={item.id}
                        className={clsx(
                          "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm motion-safe:transition-colors motion-safe:duration-300",
                          item.status === "done"
                            ? "border-[#DCFCE7] bg-[#F0FDF4] motion-safe:animate-fade-in"
                            : item.status === "failed"
                            ? "border-[#FEE2E2] bg-[#FEF2F2] motion-safe:animate-fade-in"
                            : "border-[#E2E8F0] bg-[#F9FBFC]"
                        )}
                      >
                        <span
                          className={clsx(
                            "mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                            item.status === "done"
                              ? "bg-[#22C3A6] text-[#0B1220]"
                              : item.status === "failed"
                              ? "bg-[#EF4444] text-white"
                              : item.status === "running"
                              ? "bg-[#22C3A6] text-white animate-pulse"
                              : "bg-white text-[#94A3B8]"
                          )}
                        >
                          {item.status === "done"
                            ? "OK"
                            : item.status === "failed"
                            ? "!"
                            : "~"}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-[#0B1220]">{item.label}</div>
                          <div className="text-xs text-[#94A3B8]">
                            {item.status === "running" && "Working on it now."}
                            {item.status === "pending" && "Ready to run."}
                            {item.status === "done" && "Completed."}
                            {item.status === "failed" && (item.detail ?? "Needs attention.")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleWarmup}
                      disabled={state.status === "data_fetching"}
                      className="rounded-full bg-[#22C3A6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#17A98F] disabled:opacity-50"
                    >
                      {state.status === "data_fetching" ? "Running..." : "Start warm-up"}
                    </button>

                    {warmupComplete && (
                      <button
                        type="button"
                        onClick={() => updateState({ step: 2 })}
                        className="rounded-full border border-[#E2E8F0] px-5 py-2 text-xs font-semibold text-[#0B1220] hover:bg-[#F9FBFC]"
                      >
                        Continue
                      </button>
                    )}
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Step 3
                    </p>
                    <h2 className="text-2xl font-semibold">Your first insight.</h2>
                    <p className="text-sm text-[#94A3B8]">
                      This is the moment we want you to feel the value.
                    </p>
                  </div>

                  <div
                    className={clsx(
                      "rounded-3xl border p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]",
                      primaryInsight.severity === "success"
                        ? "border-[#DCFCE7] bg-[#F0FDF4]"
                        : primaryInsight.severity === "warn"
                        ? "border-[#FEF9C3] bg-[#FFFBEB]"
                        : "border-[#E2E8F0] bg-[#F9FBFC]"
                    )}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Insight
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#0B1220]">
                      {primaryInsight.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#94A3B8]">{primaryInsight.why}</p>
                    {primaryInsight.action && primaryInsight.action.length > 0 && (
                      <div className="mt-4 text-xs text-[#94A3B8]">
                        Focus: {primaryInsight.action[0]}
                      </div>
                    )}
                  </div>

                  {!hasInsight && (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F9FBFC] px-4 py-3 text-xs text-[#94A3B8]">
                      We do not have enough reviews yet to detect trends. We will notify you
                      as soon as we do.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleContinueFromInsight}
                      className="rounded-full bg-[#22C3A6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#17A98F]"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="rounded-full border border-[#E2E8F0] px-5 py-2 text-xs font-semibold text-[#0B1220] hover:bg-[#F9FBFC]"
                    >
                      See more insights
                    </button>
                  </div>
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Step 4
                    </p>
                    <h2 className="text-2xl font-semibold">
                      How LocalPulse helps you every week.
                    </h2>
                    <p className="text-sm text-[#94A3B8]">
                      Each week, LocalPulse scans your reviews and competitors, then sends
                      you a short digest with what changed and what to do next.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-[#E2E8F0] bg-[#F9FBFC] p-5">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span className="font-semibold uppercase tracking-[0.2em]">
                        Weekly Digest
                      </span>
                      <span>Preview</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                        <h3 className="text-sm font-semibold text-[#0B1220]">
                          This week at {state.location?.name ?? "your cafe"}
                        </h3>
                        <p className="mt-1 text-xs text-[#94A3B8]">
                          Ratings held steady, but review volume slowed compared to last week.
                        </p>
                        <div className="mt-3 grid gap-2 text-[11px] text-[#94A3B8]">
                          <div>Top theme: friendly service</div>
                          <div>Competitor gap: +0.2 stars</div>
                          <div>Action: prompt reviews at checkout</div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-dashed border-[#E2E8F0] px-4 py-3 text-xs text-[#94A3B8]">
                        Your first weekly digest arrives on {nextMondayLabel()}.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmValueLoop}
                    className="rounded-full bg-[#22C3A6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#17A98F]"
                  >
                    Looks good
                  </button>
                </div>
              )}

              {stepIndex === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Step 5
                    </p>
                    <h2 className="text-2xl font-semibold">Set your preferences.</h2>
                    <p className="text-sm text-[#94A3B8]">
                      Keep this lightweight. You can refine settings later.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F9FBFC] p-5">
                    <div className="flex items-center justify-between">
                      <div className="opacity-80">
                        <p className="text-sm font-semibold text-[#0B1220]">
                          Weekly digest
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          Automated insights every week.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateState({ digestEnabled: !state.digestEnabled })
                        }
                        className={clsx(
                          "rounded-full px-4 py-1 text-xs font-semibold",
                          state.digestEnabled
                            ? "bg-[#22C3A6] text-[#0B1220]"
                            : "bg-white text-[#0B1220] border border-[#E2E8F0]"
                        )}
                      >
                        {state.digestEnabled ? "On" : "Off"}
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-xs text-[#94A3B8]">
                      Digest email: {" "}
                      <span className="font-semibold text-[#0B1220]">
                        {state.email ?? "your email"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPreferences}
                    className="rounded-full bg-[#22C3A6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#17A98F]"
                  >
                    Save preferences
                  </button>
                </div>
              )}

              {stepIndex === 5 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                      Ready
                    </p>
                    <h2 className="text-2xl font-semibold">You are all set.</h2>
                    <p className="text-sm text-[#94A3B8]">
                      You can now explore insights for {state.location?.name ?? "your cafe"}.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-3 text-xs text-[#166534]">
                    Location connected. First insight generated. Weekly digest scheduled.
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Your first insight is already live.
                  </p>

                  <button
                    type="button"
                    onClick={handleLaunch}
                    className="rounded-full bg-[#22C3A6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#17A98F]"
                  >
                    Open dashboard
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
