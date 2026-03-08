import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Likes to CSV Exporter Privacy Policy",
  description:
    "Privacy policy for the LinkedIn Likes to CSV Exporter Chrome extension.",
};

const sections = [
  {
    title: "Overview",
    body: [
      'This Privacy Policy explains how the "LinkedIn Likes to CSV Exporter" Chrome extension processes information when you use it.',
      "The extension is designed to export visible LinkedIn reaction data from an individual LinkedIn page into a CSV file for the user's own analysis, workflow, or record-keeping.",
      "The extension only processes data that is already visible on the LinkedIn page in the user's browser at the time the export is run.",
      "All core processing occurs locally in the browser. The extension does not collect personal user data, and the export is initiated only when the user clicks the export button.",
    ],
  },
  {
    title: "Information Processed by the Extension",
    body: [
      "When activated on a supported LinkedIn page, the extension may read visible LinkedIn data shown on that page, including name, LinkedIn profile link, profile headline, and reaction type.",
      "This information is processed solely to generate a CSV file for download by the user.",
      "The extension only reads visible content from the page. The generated CSV file is created locally in the browser, and the data is not stored externally.",
    ],
  },
  {
    title: "License Verification",
    body: [
      "The extension includes an optional Plus license activation feature.",
      "Users may enter a Gumroad license key to activate paid functionality.",
      "The license key may be stored locally in Chrome extension storage so the extension can remember activation status.",
      "The extension may contact the Gumroad API to verify the validity of the license key.",
      "No LinkedIn data is transmitted during license verification.",
    ],
  },
  {
    title: "Data Storage",
    body: [
      "Exported LinkedIn data exists only temporarily during processing in the user's browser.",
      "The CSV file is generated locally in the browser.",
      "The extension does not store LinkedIn data on external servers.",
      "The only persistent data stored locally may include license activation status and extension configuration settings.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "The extension does not sell, rent, or share user data.",
      "LinkedIn data processed by the extension is not transmitted to external services.",
      "The only external request that may occur is a license verification request to Gumroad.",
    ],
  },
  {
    title: "Security",
    body: [
      "All processing occurs locally in the browser.",
      "The extension minimizes exposure of user data by avoiding unnecessary external transmission.",
      "No LinkedIn export data is sent to external systems.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "This Privacy Policy may be updated from time to time to reflect changes to the extension, changes in legal requirements, or changes in operational practices.",
      "Any updates will be published on this page with a revised effective date.",
    ],
  },
  {
    title: "Contact",
    body: [
      "If you have questions about this Privacy Policy or the extension, contact support@localpulsehq.com.",
    ],
  },
];

export default function LinkedInLikesToCsvExporterPrivacyPolicyPage() {
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
                  LinkedIn Likes to CSV Exporter Privacy Policy
                </h1>
                <p className="max-w-3xl text-base text-[#94A3B8] opacity-80 md:text-lg">
                  This policy explains what the extension processes, how license
                  verification works, and why exported data stays local to your
                  browser.
                </p>
                <p className="text-sm text-[#94A3B8]">
                  Effective date: 2026-03-09
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
