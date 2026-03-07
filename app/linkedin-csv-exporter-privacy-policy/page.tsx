import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Search to CSV Exporter Privacy Policy",
  description:
    "Privacy policy for the LinkedIn Search to CSV Exporter Chrome extension.",
};

const sections = [
  {
    title: "Overview",
    body: [
      'This Privacy Policy explains how the "LinkedIn Search to CSV Exporter" Chrome extension processes information when you use it. The extension is designed to export visible LinkedIn People search results into a CSV file for your own use.',
      "The extension only processes data that is visible on LinkedIn People search result pages at the time you use the extension. All core processing takes place locally in your browser. The extension only accesses LinkedIn pages when the user explicitly runs a scan.",
    ],
  },
  {
    title: "Information Processed by the Extension",
    body: [
      "When activated on a LinkedIn People search results page, the extension may read visible profile details including name, job title, company, location, and profile URL.",
      "This information is processed solely to generate a CSV file for download by the user. The CSV file is generated locally in the user's browser and no LinkedIn profile data is transmitted to LocalPulse or any other external server as part of the export process.",
    ],
  },
  {
    title: "License Verification",
    body: [
      "The extension stores a license key locally in the user's browser or extension storage to verify whether the extension has been activated.",
      "To confirm license status, the extension may contact Gumroad's API. This verification is limited to license activation and validation purposes and is not used to transmit exported LinkedIn search result data.",
    ],
  },
  {
    title: "Data Storage",
    body: [
      "Exported search result data stays in the user's browser during processing and is used to create the CSV file requested by the user.",
      "License keys are stored locally so the extension can remember activation status. LocalPulse does not store exported LinkedIn People search result data on its own servers.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "LocalPulse does not sell, rent, or share user data collected through the extension with third parties.",
      "LinkedIn search result data processed by the extension is not shared with third parties. The only external request that may occur is a license verification request to Gumroad for activation validation.",
    ],
  },
  {
    title: "Security",
    body: [
      "The extension is designed to minimize data exposure by keeping processing local to the browser wherever possible.",
      "While no software environment can be guaranteed to be completely secure, LocalPulse takes reasonable steps to limit data collection and avoid unnecessary transmission of user data.",
      "The extension does not track browsing activity outside LinkedIn search result pages.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "This Privacy Policy may be updated from time to time to reflect changes to the extension, legal requirements, or operational practices.",
      "Any updates will be posted on this page with a revised effective date.",
    ],
  },
  {
    title: "Contact",
    body: [
      "If you have questions about this Privacy Policy or the LinkedIn Search to CSV Exporter extension, contact support@localpulsehq.com.",
    ],
  },
];

export default function LinkedInCsvExporterPrivacyPolicyPage() {
  return (
    <main
      className="min-h-screen lp-light-marketing-bg text-[#0B1220]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="relative overflow-hidden">
        <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 motion-safe:animate-fade-in">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white lp-card px-3 py-1 text-xs font-medium text-[#94A3B8] shadow-sm">
              Chrome Extension Privacy
            </p>
            <div className="flex gap-4">
              <span
                className="mt-2 h-16 w-1.5 rounded-full bg-[#22C3A6]"
                aria-hidden="true"
              />
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                  LinkedIn Search to CSV Exporter Privacy Policy
                </h1>
                <p className="max-w-3xl text-base text-[#94A3B8] opacity-80 md:text-lg">
                  This policy explains what the extension processes, how license
                  verification works, and why export data stays local to your
                  browser.
                </p>
                <p className="text-sm text-[#94A3B8]">
                  Effective date: 2026-03-07
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-white lp-card p-6 shadow-[0_20px_50px_rgba(11,18,32,0.1)] sm:p-8">
            <div className="space-y-8">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <div className="space-y-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-[#526072]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F6F9FA]" />
      </div>
    </main>
  );
}
