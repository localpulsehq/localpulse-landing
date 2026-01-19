"use client";

import { useEffect, useState } from "react";
import AnimatedCard from "@/components/ui/AnimatedCard";
import { ReviewsIntegrationCard } from "@/components/settings/ReviewsIntegrationCard";
import { GoogleBusinessProfileCard } from "@/components/settings/GoogleBusinessProfileCard";
import { supabase } from "@/lib/supabaseClient";

const SETTINGS_STORAGE_KEY = "lp:settings:v1";
const CAFE_NAME_STORAGE_KEY = "lp:cafe_name";

const DEFAULT_SETTINGS = {
  timezone: "Australia/Melbourne",
  currency: "AUD",
  insightPrefs: {
    highConfidenceOnly: false,
    includeCompetitors: true,
    highlightOpportunities: true,
    weeklyFocusAuto: true,
  },
  notifications: {
    weeklySummary: true,
    onlyWhenChanges: false,
    deliveryDay: "Mon",
    showAlerts: true,
  },
};

type LocalSettings = typeof DEFAULT_SETTINGS;

type SavedFlags = {
  identity?: boolean;
  insights?: boolean;
  notifications?: boolean;
  reviews?: boolean;
  account?: boolean;
};

function markSaved(setFlags: React.Dispatch<React.SetStateAction<SavedFlags>>, key: keyof SavedFlags) {
  setFlags((prev) => ({ ...prev, [key]: true }));
  window.setTimeout(() => {
    setFlags((prev) => ({ ...prev, [key]: false }));
  }, 1500);
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <div className={disabled ? "opacity-60" : ""}>
        <div className="text-sm font-medium text-[#0B1220]">{label}</div>
        {description && (
          <p className="mt-1 text-xs text-[#94A3B8]">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[#22C3A6]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFlags, setSaveFlags] = useState<SavedFlags>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState("My cafe");
  const [location, setLocation] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_SETTINGS.timezone);
  const [currency, setCurrency] = useState(DEFAULT_SETTINGS.currency);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [reviewsConnected, setReviewsConnected] = useState(false);
  const [salesConnected, setSalesConnected] = useState(false);

  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LocalSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.currency) setCurrency(parsed.currency);
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setLoading(false);
        return;
      }

      setUserEmail(userData.user.email ?? null);

      const { data: cafeData, error: cafeError } = await supabase
        .from("cafes")
        .select("id,name,address")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (!cafeError && cafeData) {
        setCafeId(cafeData.id);
        setCafeName(cafeData.name ?? "My cafe");
        setLocation(cafeData.address ?? "");

        const { data: reviewSource } = await supabase
          .from("review_sources")
          .select("id")
          .eq("cafe_id", cafeData.id)
          .eq("platform", "google")
          .maybeSingle();
        setReviewsConnected(Boolean(reviewSource?.id));

        const { data: salesRow } = await supabase
          .from("sales")
          .select("id")
          .eq("cafe_id", cafeData.id)
          .limit(1)
          .maybeSingle();
        setSalesConnected(Boolean(salesRow?.id));
      }

      setLoading(false);
    }

    load();
  }, []);

  function persistSettings(next: LocalSettings, section: keyof SavedFlags) {
    setSettings(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
    markSaved(setSaveFlags, section);
  }

  async function handleSaveIdentity() {
    if (!cafeId) return;
    setSaving(true);
    setStatusMessage(null);

    const name = cafeName.trim() || "My cafe";
    const address = location.trim() || null;

    const { error } = await supabase
      .from("cafes")
      .update({ name, address })
      .eq("id", cafeId);

    if (error) {
      setStatusMessage("Could not save cafe identity.");
    } else {
      setCafeName(name);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CAFE_NAME_STORAGE_KEY, name);
        window.dispatchEvent(new Event("lp:cafe_name_updated"));
      }
      markSaved(setSaveFlags, "identity");
      setStatusMessage("Saved.");
    }

    setSaving(false);
  }

  async function handlePasswordReset() {
    if (!userEmail) return;
    setStatusMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setStatusMessage("Could not send reset email.");
    } else {
      markSaved(setSaveFlags, "account");
      setStatusMessage("Password reset email sent.");
    }
  }

  async function handleSignOutEverywhere() {
    setStatusMessage(null);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setStatusMessage("Could not sign out everywhere.");
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-[#94A3B8] text-sm">Loading settings...</p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-[#94A3B8] text-sm">
          Manage your cafe identity, preferences, and notifications.
        </p>
      </header>

      <AnimatedCard>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0B1220]">Cafe identity</h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Used in the sidebar, header, emails, and exports.
            </p>
          </div>
          {saveFlags.identity && (
            <span className="text-xs text-[#22C3A6]">Saved</span>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-[#94A3B8]">Cafe name</label>
            <input
              value={cafeName}
              onChange={(e) => setCafeName(e.target.value)}
              placeholder="My cafe"
              className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220] outline-none focus:border-[#22C3A6]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#94A3B8]">Trading name (optional, later)</label>
            <input
              value={tradingName}
              onChange={(e) => setTradingName(e.target.value)}
              placeholder="Coming soon"
              disabled
              className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F9FBFC] px-3 py-2 text-sm text-[#94A3B8]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#94A3B8]">Location (suburb + city)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Fitzroy, Melbourne"
              className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220] outline-none focus:border-[#22C3A6]"
            />
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              Auto-filled from Google Places.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#94A3B8]">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => {
                const next = e.target.value;
                setTimezone(next);
                persistSettings(
                  {
                    ...settings,
                    timezone: next,
                  },
                  "identity"
                );
              }}
              className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
            >
              <option value="Australia/Melbourne">Australia/Melbourne</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="Australia/Brisbane">Australia/Brisbane</option>
              <option value="Australia/Perth">Australia/Perth</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#94A3B8]">Currency</label>
            <select
              value={currency}
              onChange={(e) => {
                const next = e.target.value;
                setCurrency(next);
                persistSettings(
                  {
                    ...settings,
                    currency: next,
                  },
                  "identity"
                );
              }}
              className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
            >
              <option value="AUD">AUD</option>
              <option value="NZD">NZD</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveIdentity}
            disabled={saving}
            className="rounded-full bg-[#22C3A6] px-4 py-2 text-xs font-semibold text-[#0B1220] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save cafe identity"}
          </button>
          {statusMessage && (
            <span className="text-xs text-[#94A3B8]">{statusMessage}</span>
          )}
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.4fr] gap-4">
        <AnimatedCard>
          <h3 className="text-sm font-semibold text-[#0B1220] mb-1">Insights & focus</h3>
          <p className="text-xs text-[#94A3B8] mb-1">
            Control how LocalPulse surfaces insights and weekly focus.
          </p>
          <p className="text-[11px] text-[#94A3B8] mb-4">
            Applies to this browser only (for now).
          </p>
          <div className="space-y-4">
            <ToggleRow
              label="Show only high-confidence insights"
              description="Hide insights when review or sales data is limited."
              checked={settings.insightPrefs.highConfidenceOnly}
              onChange={(next) =>
                persistSettings(
                  {
                    ...settings,
                    insightPrefs: { ...settings.insightPrefs, highConfidenceOnly: next },
                  },
                  "insights"
                )
              }
            />
            <p className="text-[11px] text-[#94A3B8]">
              When on, low-confidence signals are removed from Insights.
            </p>
            <ToggleRow
              label="Include competitor benchmarks"
              description="Show competitor comparisons in Signals."
              checked={settings.insightPrefs.includeCompetitors}
              onChange={(next) =>
                persistSettings(
                  {
                    ...settings,
                    insightPrefs: { ...settings.insightPrefs, includeCompetitors: next },
                  },
                  "insights"
                )
              }
            />
            <p className="text-[11px] text-[#94A3B8]">
              When off, competitor comparisons are hidden.
            </p>
            <ToggleRow
              label="Highlight positive opportunities"
              description="Surface what is going well."
              checked={settings.insightPrefs.highlightOpportunities}
              onChange={(next) =>
                persistSettings(
                  {
                    ...settings,
                    insightPrefs: { ...settings.insightPrefs, highlightOpportunities: next },
                  },
                  "insights"
                )
              }
            />
            <p className="text-[11px] text-[#94A3B8]">
              When off, Opportunities are hidden from the overview.
            </p>
            <ToggleRow
              label="Manual weekly focus coming soon"
              description="Weekly focus is auto-generated for now."
              checked={settings.insightPrefs.weeklyFocusAuto}
              onChange={() => {}}
              disabled
            />
            <p className="text-[11px] text-[#94A3B8]">
              Manual weekly focus will arrive in a future update.
            </p>
            {saveFlags.insights && (
              <span className="text-xs text-[#22C3A6]">Saved</span>
            )}
          </div>
        </AnimatedCard>

        <AnimatedCard>
          <h3 className="text-sm font-semibold text-[#0B1220] mb-1">Notifications</h3>
          <p className="text-xs text-[#94A3B8] mb-1">
            Control when and how you receive weekly updates.
          </p>
          <p className="text-[11px] text-[#94A3B8] mb-4">
            Applies to this browser only (for now).
          </p>
          <div className="space-y-4">
            <ToggleRow
              label="Weekly insights summary"
              description="Send a weekly digest email."
              checked={settings.notifications.weeklySummary}
              onChange={(next) =>
                persistSettings(
                  {
                    ...settings,
                    notifications: { ...settings.notifications, weeklySummary: next },
                  },
                  "notifications"
                )
              }
            />
            <ToggleRow
              label="Only send when something changes"
              description="Skip weeks with no meaningful movement."
              checked={settings.notifications.onlyWhenChanges}
              onChange={(next) =>
                persistSettings(
                  {
                    ...settings,
                    notifications: { ...settings.notifications, onlyWhenChanges: next },
                  },
                  "notifications"
                )
              }
            />
            <div>
              <label className="text-xs font-semibold text-[#94A3B8]">Delivery day</label>
              <select
                value={settings.notifications.deliveryDay}
                onChange={(e) =>
                  persistSettings(
                    {
                      ...settings,
                      notifications: { ...settings.notifications, deliveryDay: e.target.value },
                    },
                    "notifications"
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0B1220]"
              >
                <option value="Mon">Mon</option>
                <option value="Tue">Tue</option>
                <option value="Wed">Wed</option>
              </select>
            </div>
            <ToggleRow
              label="Show alerts in Overview"
              description="Display alert summaries inside the dashboard."
              checked={settings.notifications.showAlerts}
              onChange={(next) =>
                persistSettings(
                  {
                    ...settings,
                    notifications: { ...settings.notifications, showAlerts: next },
                  },
                  "notifications"
                )
              }
            />
            {saveFlags.notifications && (
              <span className="text-xs text-[#22C3A6]">Saved</span>
            )}
          </div>
        </AnimatedCard>
      </div>

      <AnimatedCard>
        <h3 className="text-sm font-semibold text-[#0B1220] mb-1">Account & access</h3>
        <p className="text-xs text-[#94A3B8] mb-4">
          Keep account settings simple and secure.
        </p>
        <div className="space-y-3 text-sm text-[#0B1220]">
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#94A3B8]">
            Email: <span className="text-[#0B1220]">{userEmail ?? ""}</span>
          </div>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#0B1220] hover:bg-[#F9FBFC]"
          >
            Send password reset email
          </button>
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#0B1220] hover:bg-[#F9FBFC]"
          >
            Sign out everywhere
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626] opacity-60"
            title="Contact support to delete your account"
          >
            Delete account
          </button>
          <p className="text-[11px] text-[#94A3B8]">
            Contact support to delete your account.
          </p>
          {saveFlags.account && (
            <span className="text-xs text-[#22C3A6]">Saved</span>
          )}
        </div>
      </AnimatedCard>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0B1220]">Data & integrations</h3>
            <p className="text-xs text-[#94A3B8]">
              Connect reviews and business profile sources.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.4fr] gap-4">
          <ReviewsIntegrationCard />
          <GoogleBusinessProfileCard />
        </div>
      </section>

      <p className="text-[11px] text-[#94A3B8]">
        LocalPulse status · Reviews: {reviewsConnected ? "Connected" : "Not connected"} · Sales:{" "}
        {salesConnected ? "Connected" : "Not connected"} · Insights:{" "}
        {reviewsConnected || salesConnected ? "Active" : "Waiting on data"}
      </p>
    </section>
  );
}
