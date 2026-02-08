"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDateAU } from "@/lib/date";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { SkeletonChart } from "@/components/ui/SkeletonChart";

type FeedbackGateConfig = {
  id: string;
  cafe_id: string;
  slug: string;
  business_name: string;
  google_review_url: string;
  notify_email: string | null;
  threshold: number;
  active: boolean | null;
};

type FeedbackSubmission = {
  id: string;
  business_id: string;
  rating: number;
  message: string | null;
  contact: string | null;
  created_at: string | null;
  status: string;
  internal_note: string | null;
};

function safeDateLabel(iso: string | null) {
  if (!iso) return "-";
  try {
    return formatDateAU(iso);
  } catch {
    return new Date(iso).toLocaleDateString("en-AU");
  }
}

function snippet(text: string | null, max = 90) {
  const s = (text ?? "").trim();
  if (!s) return "-";
  return s.length > max ? s.slice(0, max) + "..." : s;
}

export default function FeedbackInboxPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [config, setConfig] = useState<FeedbackGateConfig | null>(null);
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    unhappy7: number;
    happy7: number;
    total7: number;
    avgRating7: number;
    acknowledged7: number;
    resolved7: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [noteSavingId, setNoteSavingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    slug: "",
    google_review_url: "",
    notify_email: "",
    threshold: 4,
  });

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) ?? null,
    [submissions, selectedId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError("You must be logged in to view feedback.");
        setLoading(false);
        return;
      }

      const { data: cafe, error: cafeError } = await supabase
        .from("cafes")
        .select("id,name")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (cafeError || !cafe) {
        setError("Could not load your cafe.");
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setCafeId(cafe.id);

      const { data: gate } = await supabase
        .from("feedback_gate_configs")
        .select(
          "id,cafe_id,slug,business_name,google_review_url,notify_email,threshold,active"
        )
        .eq("cafe_id", cafe.id)
        .maybeSingle();

      const { data: reviewSource } = await supabase
        .from("review_sources")
        .select("external_place_id")
        .eq("cafe_id", cafe.id)
        .eq("platform", "google")
        .maybeSingle();

      const loadedPlaceId =
        (reviewSource?.external_place_id ?? null) as string | null;
      setPlaceId(loadedPlaceId);

      if (gate) {
        setConfig(gate as FeedbackGateConfig);
        setForm({
          business_name: gate.business_name ?? cafe.name ?? "",
          slug: gate.slug ?? "",
          google_review_url: gate.google_review_url ?? "",
          notify_email: gate.notify_email ?? "",
          threshold: gate.threshold ?? 4,
        });
        setSetupOpen(!gate.active);
      } else {
        setForm((prev) => ({
          ...prev,
          business_name: cafe.name ?? "",
          google_review_url: loadedPlaceId
            ? `https://search.google.com/local/writereview?placeid=${loadedPlaceId}`
            : prev.google_review_url,
        }));
        setSetupOpen(true);
      }

      await loadSubmissions(cafe.id, gate?.threshold ?? 4);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadSubmissions(cafeId: string, threshold: number) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data, error } = await supabase
      .from("feedback_submissions")
      .select(
        "id,business_id,rating,message,contact,created_at,status,internal_note"
      )
      .eq("business_id", cafeId)
      .lt("rating", threshold)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load submissions:", error);
      return;
    }

    setSubmissions((data ?? []) as FeedbackSubmission[]);
    if ((data ?? []).length && !selectedId) {
      setSelectedId((data ?? [])[0]?.id ?? null);
    }

    const { data: recentRows } = await supabase
      .from("feedback_submissions")
      .select("rating,created_at,status")
      .eq("business_id", cafeId)
      .gte("created_at", since.toISOString());

    const rows = (recentRows ?? []) as Array<{
      rating: number;
      created_at: string | null;
      status: string | null;
    }>;

    const unhappy7 = rows.filter((r) => r.rating < threshold).length;
    const happy7 = rows.filter((r) => r.rating >= threshold).length;
    const avgRating7 =
      rows.length > 0
        ? rows.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rows.length
        : 0;
    const acknowledged7 = rows.filter((r) => r.status === "acknowledged").length;
    const resolved7 = rows.filter((r) => r.status === "resolved").length;

    setStats({
      unhappy7,
      happy7,
      total7: rows.length,
      avgRating7,
      acknowledged7,
      resolved7,
    });
  }

  async function saveConfig() {
    if (!cafeId) return;
    setSaving(true);
    setError(null);

    try {
      const placeIdUrl = placeId
        ? `https://search.google.com/local/writereview?placeid=${placeId}`
        : "";

      const payload = {
        cafe_id: cafeId,
        business_name: form.business_name.trim(),
        slug: form.slug.trim(),
        google_review_url: placeIdUrl || form.google_review_url.trim(),
        notify_email: form.notify_email.trim() || null,
        threshold: Number(form.threshold) || 4,
        active: true,
      };

      if (!payload.business_name || !payload.slug || !payload.google_review_url) {
        throw new Error("Business name, slug, and Google review link are required.");
      }

      const { data, error: upsertError } = await supabase
        .from("feedback_gate_configs")
        .upsert(payload, { onConflict: "cafe_id" })
        .select(
          "id,cafe_id,slug,business_name,google_review_url,notify_email,threshold,active"
        )
        .maybeSingle();

      if (upsertError || !data) {
        throw new Error(upsertError?.message ?? "Failed to save config.");
      }

      setConfig(data as FeedbackGateConfig);
      await loadSubmissions(cafeId, data.threshold ?? 4);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save config.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setStatusSavingId(id);
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ status })
      .eq("id", id);

    if (error) {
      setError("Failed to update status.");
      setStatusSavingId(null);
      return;
    }

    setSubmissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setStatusSavingId(null);
  }

  async function saveNote(id: string, note: string) {
    setNoteSavingId(id);
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ internal_note: note })
      .eq("id", id);

    if (error) {
      setError("Failed to save note.");
      setNoteSavingId(null);
      return;
    }

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, internal_note: note } : item
      )
    );
    setNoteSavingId(null);
  }

  async function deleteSubmission(id: string) {
    if (!confirm("Delete this hidden feedback? This cannot be undone.")) return;
    const { error } = await supabase
      .from("feedback_submissions")
      .delete()
      .eq("id", id)
      .eq("status", "archived");

    if (error) {
      setError("Failed to delete feedback.");
      return;
    }

    setSubmissions((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feedbackBase =
    process.env.NEXT_PUBLIC_FEEDBACK_BASE_URL ?? origin;
  const gateUrl = config?.slug ? `${feedbackBase}/r/${config.slug}` : "";
  const qrUrl = gateUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(
        gateUrl
      )}`
    : "";

  async function handleCopyLink() {
    if (!gateUrl) return;
    try {
      await navigator.clipboard.writeText(gateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-white rounded animate-pulse" />
          <div className="h-3 w-72 bg-white rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <SkeletonChart height={260} />
      </section>
    );
  }

  return (
      <section className="space-y-6">
        <header>
          <h2 className="text-lg font-semibold">Private feedback</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Review private feedback before it reaches Google.
          </p>
        </header>

      {stats && (
        <section className="grid gap-3 md:grid-cols-3">
          <div
            className="rounded-2xl bg-white lp-card p-4 motion-safe:animate-card-slide-up animate-micro-pulse transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            style={{ animationDelay: "0.02s" }}
          >
            <p className="text-[11px] text-[#94A3B8]">Total check-ins (7 days)</p>
            <p className="text-xl font-semibold text-[#0B1220]">{stats.total7}</p>
          </div>
          <div
            className="rounded-2xl bg-white lp-card p-4 motion-safe:animate-card-slide-up animate-micro-pulse transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            style={{ animationDelay: "0.04s" }}
          >
            <p className="text-[11px] text-[#94A3B8]">Unhappy routed (7 days)</p>
            <p className="text-xl font-semibold text-[#0B1220]">{stats.unhappy7}</p>
          </div>
          <div
            className="rounded-2xl bg-white lp-card p-4 motion-safe:animate-card-slide-up animate-micro-pulse transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            style={{ animationDelay: "0.06s" }}
          >
            <p className="text-[11px] text-[#94A3B8]">Happy to Google (7 days)</p>
            <p className="text-xl font-semibold text-[#0B1220]">{stats.happy7}</p>
          </div>
          <div
            className="rounded-2xl bg-white lp-card p-4 motion-safe:animate-card-slide-up animate-micro-pulse transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            style={{ animationDelay: "0.08s" }}
          >
            <p className="text-[11px] text-[#94A3B8]">Average rating (7 days)</p>
            <p className="text-xl font-semibold text-[#0B1220]">
              {stats.avgRating7 ? stats.avgRating7.toFixed(1) : "0.0"}
            </p>
          </div>
          <div
            className="rounded-2xl bg-white lp-card p-4 motion-safe:animate-card-slide-up animate-micro-pulse transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            style={{ animationDelay: "0.1s" }}
          >
            <p className="text-[11px] text-[#94A3B8]">Acknowledged (7 days)</p>
            <p className="text-xl font-semibold text-[#0B1220]">{stats.acknowledged7}</p>
          </div>
          <div
            className="rounded-2xl bg-white lp-card p-4 motion-safe:animate-card-slide-up animate-micro-pulse transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            style={{ animationDelay: "0.12s" }}
          >
            <p className="text-[11px] text-[#94A3B8]">Resolved (7 days)</p>
            <p className="text-xl font-semibold text-[#0B1220]">{stats.resolved7}</p>
          </div>
        </section>
      )}

      {(() => {
        const showSetupFirst = !config || submissions.length === 0;

        const inboxSection = (
          <section className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl bg-white lp-card p-5 motion-safe:animate-card-slide-up transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#0B1220]">
                        Private feedback inbox
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowArchived((prev) => !prev)}
                          className="text-xs text-[#94A3B8] underline decoration-dotted"
                        >
                          {showArchived ? "Hide archived" : "Show archived"}
                        </button>
                        <span className="text-xs text-[#94A3B8]">
                          {submissions.length} items
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 max-h-[420px] overflow-y-auto divide-y divide-[#E2E8F0] pr-1">
                      {submissions.length === 0 && (
                        <div className="py-8 text-center text-sm text-[#94A3B8]">
                          No private feedback yet.
                        </div>
                      )}

                      {(showArchived ? submissions : submissions.filter((s) => s.status !== "archived")).map((item) => {
                        const active = item.id === selectedId;
                        return (
                          <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={[
                        "w-full text-left px-3 py-3 transition transform-gpu hover:-translate-y-0.5",
                        active ? "bg-[#F9FBFC]" : "hover:bg-[#F9FBFC]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0B1220]">
                            {item.rating} / 5
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            {snippet(item.message)}
                          </p>
                        </div>
                        <div className="text-right text-xs text-[#94A3B8]">
                          <div>{safeDateLabel(item.created_at)}</div>
                          <div
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] capitalize",
                              item.status === "resolved"
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : item.status === "acknowledged"
                                  ? "bg-[#FEF9C3] text-[#854D0E]"
                                  : item.status === "archived"
                                    ? "bg-[#E2E8F0] text-[#475569]"
                                    : "bg-[#F1F5F9] text-[#64748B]",
                            ].join(" ")}
                          >
                            {item.status}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white lp-card p-5 motion-safe:animate-card-slide-up transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]">
              <h3 className="text-sm font-semibold text-[#0B1220]">Details</h3>

              {!selected && (
                <p className="mt-4 text-sm text-[#94A3B8]">
                  Select a feedback item to view details.
                </p>
              )}

              {selected && (
                <div className="mt-4 space-y-4 text-sm text-[#0B1220]">
                  <div>
                    <p className="text-xs text-[#94A3B8]">Rating</p>
                    <p className="font-semibold">{selected.rating} / 5</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8]">Message</p>
                    <p>{selected.message || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8]">Contact</p>
                    <p>{selected.contact || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8]">Status</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(selected.id, "acknowledged")}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold transition",
                          selected.status === "acknowledged"
                            ? "bg-[#FDE68A] text-[#854D0E]"
                            : "border border-[#E2E8F0] text-[#0B1220] hover:bg-[#F9FBFC]",
                          statusSavingId === selected.id
                            ? "opacity-60"
                            : "",
                        ].join(" ")}
                        disabled={statusSavingId === selected.id}
                      >
                        {statusSavingId === selected.id ? "Saving..." : "Acknowledge"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(selected.id, "resolved")}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold transition",
                          selected.status === "resolved"
                            ? "bg-[#BBF7D0] text-[#166534]"
                            : "border border-[#E2E8F0] text-[#0B1220] hover:bg-[#F9FBFC]",
                          statusSavingId === selected.id
                            ? "opacity-60"
                            : "",
                        ].join(" ")}
                        disabled={statusSavingId === selected.id}
                      >
                        {statusSavingId === selected.id ? "Saving..." : "Resolve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(selected.id, "archived")}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold transition",
                          selected.status === "archived"
                            ? "bg-[#E2E8F0] text-[#475569]"
                            : "border border-[#E2E8F0] text-[#0B1220] hover:bg-[#F9FBFC]",
                          statusSavingId === selected.id
                            ? "opacity-60"
                            : "",
                        ].join(" ")}
                        disabled={statusSavingId === selected.id}
                      >
                        {statusSavingId === selected.id ? "Saving..." : "Hide"}
                      </button>
                    </div>
                  </div>

                  {selected.status === "archived" && (
                    <div>
                      <p className="text-xs text-[#94A3B8]">Hidden actions</p>
                      <button
                        type="button"
                        onClick={() => deleteSubmission(selected.id)}
                        className="mt-2 rounded-full border border-[#FEE2E2] px-3 py-1 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
                      >
                        Delete permanently
                      </button>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-[#94A3B8]">Internal note</p>
                <textarea
                  value={selected.internal_note ?? ""}
                  onChange={(e) =>
                    setSubmissions((prev) =>
                          prev.map((item) =>
                            item.id === selected.id
                              ? { ...item, internal_note: e.target.value }
                              : item
                          )
                        )
                      }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
                  placeholder="Add a quick note for your team."
                />
                <button
                  type="button"
                  onClick={() =>
                    saveNote(selected.id, selected.internal_note ?? "")
                  }
                  className="mt-2 rounded-full bg-[#F3F6F9] px-3 py-1 text-xs font-semibold text-[#0B1220] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_24px_rgba(11,18,32,0.12)]"
                  disabled={noteSavingId === selected.id}
                >
                  {noteSavingId === selected.id ? "Saving..." : "Save note"}
                </button>
              </div>
            </div>
          )}
        </div>
          </section>
        );

        const setupSection = (
          <section
            className="rounded-2xl bg-white lp-card p-5 space-y-4 motion-safe:animate-card-in transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,18,32,0.12)]"
            onClick={() => {
              if (!setupOpen) setSetupOpen(true);
            }}
          >
            <div
              className="flex cursor-pointer list-none items-center justify-between"
              onClick={() => setSetupOpen((prev) => !prev)}
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-[#0B1220]">
                  Gate setup
                </h3>
                {config?.active && (
                  <span className="text-xs text-[#22C3A6]">Active</span>
                )}
              </div>
              <span className="text-xs text-[#94A3B8]">
                {setupOpen ? "Hide" : "Edit"}
              </span>
            </div>

            <div
              className={[
                "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                setupOpen ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0",
              ].join(" ")}
            >
              <div className="mt-4 space-y-4">
                {stats && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F9FBFC] px-3 py-2 text-xs text-[#0B1220]">
                      <div className="text-[11px] text-[#94A3B8]">
                        Unhappy routed (7 days)
                      </div>
                      <div className="text-sm font-semibold">{stats.unhappy7}</div>
                    </div>
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F9FBFC] px-3 py-2 text-xs text-[#0B1220]">
                      <div className="text-[11px] text-[#94A3B8]">
                        Happy to Google (7 days)
                      </div>
                      <div className="text-sm font-semibold">{stats.happy7}</div>
                    </div>
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F9FBFC] px-3 py-2 text-xs text-[#0B1220]">
                      <div className="text-[11px] text-[#94A3B8]">
                        Total check-ins (7 days)
                      </div>
                      <div className="text-sm font-semibold">{stats.total7}</div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-[#94A3B8]">
                      Business name
                    </label>
                    <input
                      value={form.business_name}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          business_name: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#94A3B8]">
                      Checkpoint link
                    </label>
                    <input
                      value={form.slug}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
                      placeholder="e.g. nine-grams"
                    />
                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      Used in the link customers scan (for example: /r/nine-grams).
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-[#94A3B8]">
                      Google review link
                    </label>
                    <input
                      value={
                        placeId
                          ? `https://search.google.com/local/writereview?placeid=${placeId}`
                          : form.google_review_url
                      }
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          google_review_url: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
                      placeholder="https://search.google.com/local/writereview?placeid=..."
                      disabled={Boolean(placeId)}
                    />
                    {placeId && (
                      <p className="mt-1 text-[11px] text-[#94A3B8]">
                        Auto-filled from your Google Place ID in Settings.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#94A3B8]">
                      Notify email (optional)
                    </label>
                    <input
                      value={form.notify_email}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          notify_email: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
                      placeholder="owner@cafe.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#94A3B8]">
                      Happy threshold
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.threshold}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          threshold: Number(e.target.value),
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
                    />
                  </div>
                </div>

        {gateUrl && (
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F9FBFC] px-4 py-4 space-y-3">
            <div className="text-xs text-[#0B1220]">
              Gate URL:{" "}
              <span className="font-semibold break-all">{gateUrl}</span>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <img
                  src={qrUrl}
                  alt={`QR code for ${form.business_name}`}
                  className="h-28 w-28 rounded-lg border border-[#E2E8F0] bg-white"
                />
                <div className="text-xs text-[#94A3B8]">
                  This link opens a feedback page for{" "}
                  <span className="text-[#0B1220] font-semibold">
                    {form.business_name || "your cafe"}
                  </span>
                  .
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#0B1220] hover:bg-[#F9FBFC]"
                >
                  {copied ? "Link copied" : "Copy link"}
                </button>
                <a
                  href={qrUrl}
                  download={`localpulse-${config?.slug ?? "gate"}-qr.png`}
                  className="rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#0B1220] hover:bg-[#F9FBFC]"
                >
                  Download PNG
                </a>
                <a
                  href="/dashboard/feedback/print"
                  className="rounded-full bg-[#22C3A6] px-3 py-2 text-xs font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
                >
                  Download print-ready PDF
                </a>
              </div>
            </div>
          </div>
        )}

                {error && <p className="text-xs text-[#EF4444]">{error}</p>}

                <button
                  type="button"
                  onClick={saveConfig}
                  disabled={saving}
                  className="rounded-full bg-[#22C3A6] px-4 py-2 text-xs font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save gate setup"}
                </button>
              </div>
            </div>
          </section>
        );

        return showSetupFirst ? (
          <>
            {setupSection}
            {inboxSection}
          </>
        ) : (
          <>
            {inboxSection}
            {setupSection}
          </>
        );
      })()}
    </section>
  );
}
