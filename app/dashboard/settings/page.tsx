"use client";

import AnimatedCard from "@/components/ui/AnimatedCard";
import { ReviewsIntegrationCard } from "@/components/settings/ReviewsIntegrationCard";

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-slate-300 text-sm">
          Manage café details, integrations, and account preferences.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.4fr] gap-4">
        {/* Left: general / future sections */}
        <AnimatedCard>
          <h3 className="text-sm font-semibold text-slate-100 mb-1">
            General
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            These settings are coming soon as we grow Local Pulse.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
            <li>Café name and profile</li>
            <li>Google Reviews / platform connections</li>
            <li>POS integration configuration</li>
            <li>Account and notification settings</li>
          </ul>
        </AnimatedCard>

        {/* Right: actual working integration */}
        <ReviewsIntegrationCard />
      </div>
    </section>
  );
}
