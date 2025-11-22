'use client';

export default function SettingsPage() {
  return (
    <section className="border border-slate-800 rounded-xl bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold mb-2">Settings</h2>
      <p className="text-slate-300 text-sm mb-4">
        This page will let you manage café details, integrations, and account
        preferences.
      </p>

      <div className="text-sm text-slate-400">
        Planned sections:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Café name and profile</li>
          <li>Google Reviews / platform connections</li>
          <li>POS integration configuration</li>
          <li>Account and notification settings</li>
        </ul>
      </div>
    </section>
  );
}
