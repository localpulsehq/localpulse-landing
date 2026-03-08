import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Comments to CSV Exporter Privacy Policy",
  description:
    "Privacy policy for the LinkedIn Comments to CSV Exporter Chrome extension.",
};

const sections = [
  {
    title: "Overview",
    body: [
      'This Privacy Policy explains how the "LinkedIn Comments to CSV Exporter" Chrome extension processes information when you use it.',
      "The extension is designed to export visible LinkedIn post comments from an individual LinkedIn post page into a CSV file for personal analysis or record-keeping.",
      "The extension only processes comment data that is already visible on the LinkedIn page in your browser at the time you run the export.",
      "All core processing occurs locally in your browser. The extension only accesses LinkedIn pages when the user explicitly clicks the export button. The extension does not run background scans or automatically visit other LinkedIn pages.",
    ],
  },
  {
    title: "Information Processed by the Extension",
    body: [
      "When activated on a LinkedIn post page, the extension may read visible comment information including commenter name, LinkedIn profile link, headline or job title if visible, comment text, and comment timestamp.",
      "This information is processed solely to generate a CSV file for download by the user.",
      "The CSV file is generated locally in your browser. LinkedIn comment data is not transmitted to LocalPulse servers or external analytics systems.",
    ],
  },
  {
    title: "License Verification",
    body: [
      "The extension includes an optional Plus license activation feature.",
      "When a user enters a license key, the key may be stored locally in the browser's extension storage and the extension may contact Gumroad's API to verify the license status.",
      "This verification request is used only to confirm license activation and does not include exported LinkedIn comment data.",
    ],
  },
  {
    title: "Data Storage",
    body: [
      "Exported comment data exists only temporarily during processing in the user's browser.",
      "The extension does not store exported comment data on external servers.",
      "The only persistent data stored locally is license activation status and extension configuration settings.",
      "These values are stored in the browser's extension storage and remain on the user's device.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "LocalPulse does not sell, rent, or share user data collected through the extension with third parties.",
      "LinkedIn comment data processed by the extension is not transmitted to any external service.",
      "The only external request that may occur is a license verification request to Gumroad when activating the Plus version.",
    ],
  },
  {
    title: "Security",
    body: [
      "The extension is designed to minimize exposure of user data by keeping processing local to the browser.",
      "No comment export data is transmitted to external services.",
      "While no software environment can be guaranteed to be completely secure, LocalPulse takes reasonable steps to minimize data access and avoid unnecessary transmission of information.",
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
      "If you have questions about this Privacy Policy or the LinkedIn Comments to CSV Exporter extension, contact support@localpulsehq.com.",
    ],
  },
];

export default function LinkedInCommentsToCsvExporterPrivacyPolicyPage() {
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
                  LinkedIn Comments to CSV Exporter Privacy Policy
                </h1>
                <p className="max-w-3xl text-base text-[#94A3B8] opacity-80 md:text-lg">
                  This policy explains what the extension processes, how license
                  verification works, and why exported data stays local to your
                  browser.
                </p>
                <p className="text-sm text-[#94A3B8]">
                  Effective date: 2026-03-08
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
