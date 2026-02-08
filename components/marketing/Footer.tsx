import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F6F9FA]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="flex flex-col gap-8 md:grid md:grid-cols-4 md:gap-10">
          <div className="space-y-3 md:col-span-2">
            <h3 className="text-sm font-semibold">LocalPulse</h3>
            <p className="text-sm text-[#94A3B8]">
              Proactive protection for your Google rating.
            </p>
            <p className="text-xs text-[#94A3B8]">
              LocalPulse uses a private feedback link and does not modify or intercept Google reviews.
            </p>
            <p className="text-xs text-[#94A3B8]">(c) 2026 LocalPulse</p>
          </div>

          <div className="md:col-span-2">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
                  Product
                </h4>
                <div className="space-y-2 text-sm text-[#94A3B8]">
                  <Link href="/product" className="block hover:text-[#0B1220]">
                    Product
                  </Link>
                  <Link href="/pricing" className="block hover:text-[#0B1220]">
                    Pricing
                  </Link>
                  <Link href="/blog" className="block hover:text-[#0B1220]">
                    Blog
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
                  Company
                </h4>
                <div className="space-y-2 text-sm text-[#94A3B8]">
                  <Link href="/contact" className="block hover:text-[#0B1220]">
                    Contact
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
                  Legal
                </h4>
                <div className="space-y-2 text-sm text-[#94A3B8]">
                  <Link href="/privacy" className="block hover:text-[#0B1220]">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="block hover:text-[#0B1220]">
                    Terms & Conditions
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


