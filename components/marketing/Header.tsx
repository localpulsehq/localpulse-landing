"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Login", href: "/login" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/blog") return pathname.startsWith("/blog");
  return pathname === href;
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E2E8F0] bg-[#F6F9FA]/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 md:py-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#0B1220]">
            <img
              src="/localpulse-logo-icon.svg"
              alt="LocalPulse"
              className="h-10 w-10"
            />
          </span>
          <span className="text-sm font-semibold tracking-wide">LocalPulse Analytics</span>
        </div>

        <div className="hidden items-center gap-6 text-sm font-medium text-[#94A3B8] md:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const isLogin = item.label === "Login";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "text-[#0B1220] border-b border-[#22C3A6]/50 pb-1"
                    : isLogin
                      ? "text-[#94A3B8] hover:text-[#0B1220]"
                      : "hover:text-[#0B1220]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden rounded-full bg-[#22C3A6] px-4 py-2.5 text-sm font-semibold text-[#0B1220] shadow-[0_8px_24px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F] md:inline-flex"
          >
            Request early access
          </Link>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white lp-card text-[#0B1220] shadow-sm md:hidden"
          >
            <span className="relative h-4 w-4">
              <span
                className={`absolute left-0 top-0 h-0.5 w-4 bg-[#0B1220] transition-transform ${
                  open ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-4 bg-[#0B1220] transition-opacity ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-3 h-0.5 w-4 bg-[#0B1220] transition-transform ${
                  open ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-x-0 bottom-0 top-16 z-40 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-transparent"
        />
        <div
          className={`absolute left-0 right-0 top-0 origin-top transform transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 pb-6 pt-3 sm:px-6">
            <div className="mt-2 rounded-2xl bg-white lp-card px-4 pb-5 pt-4 shadow-[0_20px_50px_rgba(11,18,32,0.12)]">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
                Menu
              </div>
              <div className="mt-4 space-y-3 text-sm text-[#94A3B8]">
                {navItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={
                        active
                          ? "block text-base font-semibold text-[#0B1220]"
                          : "block text-base hover:text-[#0B1220]"
                      }
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#22C3A6] px-4 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_8px_24px_rgba(34,195,166,0.35)] transition hover:bg-[#17A98F]"
            >
              Request early access
            </Link>
            </div>
          </div>
        </div>
      </div>
      </header>
      <div className="h-16 md:h-20" aria-hidden="true" />
    </>
  );
}
