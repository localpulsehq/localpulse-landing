'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import "@/app/globals.css"
import { ToastProvider } from "@/components/ui/toast";

type CafeRow = {
  name: string;
};

const CAFE_NAME_STORAGE_KEY = "lp:cafe_name";

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/reviews', label: 'Reviews' },
  { href: '/dashboard/feedback', label: 'Feedback' },
  { href: '/dashboard/sales-analytics', label: 'Analytics' }, 
  { href: '/dashboard/sales', label: 'Sales' },
  { href: '/dashboard/settings', label: 'Settings' },
];



function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screenshotMode = searchParams?.get('screenshot') === '1';

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.push('/login');
        return;
      }

      const user = userData.user;
      setUserEmail(user.email ?? null);

      const { data: cafeData, error: cafeError } = await supabase
        .from('cafes')
        .select('id,name')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!cafeError && cafeData) {
        setCafeName(cafeData.name);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CAFE_NAME_STORAGE_KEY, cafeData.name);
        }
      } else {
        router.push("/onboarding");
        return;
      }

      const onboardingComplete =
        user.user_metadata?.onboarding_complete === true;
      if (!onboardingComplete) {
        const [{ data: reviewSource }, { data: feedbackGate }] = await Promise.all(
          [
            supabase
              .from("review_sources")
              .select("id")
              .eq("cafe_id", cafeData?.id)
              .limit(1)
              .maybeSingle(),
            supabase
              .from("feedback_gate_configs")
              .select("id")
              .eq("cafe_id", cafeData?.id)
              .limit(1)
              .maybeSingle(),
          ]
        );

        const hasOnboardingSignals = Boolean(reviewSource || feedbackGate);
        if (!hasOnboardingSignals) {
          router.push("/onboarding");
          return;
        }

        if (user.user_metadata?.onboarding_complete !== true) {
          await supabase.auth.updateUser({
            data: { onboarding_complete: true },
          });
        }
      }

      setLoading(false);
    }

    load();
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(CAFE_NAME_STORAGE_KEY);
    if (stored) setCafeName(stored);

    const handleUpdate = () => {
      const next = window.localStorage.getItem(CAFE_NAME_STORAGE_KEY);
      if (next) setCafeName(next);
    };

    window.addEventListener("lp:cafe_name_updated", handleUpdate);
    return () => window.removeEventListener("lp:cafe_name_updated", handleUpdate);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const title = cafeName
      ? `${cafeName} - LocalPulse Dashboard`
      : "LocalPulse Dashboard";
    document.title = title;
  }, [cafeName]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F3F6F9] text-[#0B1220]">
        <p>Loading your dashboard…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen lp-light-app-bg text-[#0B1220] flex">
      {/* Sidebar (desktop) */}
      {!screenshotMode && (
        <aside className="hidden md:flex md:w-64 border-r border-[rgba(255,255,255,0.06)] bg-[#0E1627] text-[#CBD5E1] flex-col px-4 py-6 gap-6">
        <div>
          <div className="text-sm font-semibold tracking-tight text-[#94A3B8]">
            LOCAL PULSE
          </div>
          <div className="text-lg font-bold text-white">
            {cafeName ?? 'My Cafe'}
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 text-sm">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'rounded-lg px-3 py-2 transition-colors',
                  active
                    ? 'bg-[rgba(255,255,255,0.06)] text-white'
                    : 'text-[#CBD5E1] hover:bg-[rgba(255,255,255,0.06)] hover:text-white',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-xs text-[#94A3B8]">
          Signed in as
          <div className="truncate text-[#94A3B8]">
            {userEmail}
          </div>
        </div>
        </aside>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        {!screenshotMode && (
          <header className="h-14 border-b border-[#E2E8F0] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#0B1220]">
              {cafeName ?? 'My Cafe'}
            </span>
            <span className="hidden sm:inline text-xs text-[#94A3B8]">
              • Local Pulse Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-[#94A3B8]">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs rounded-md border border-[#E2E8F0] text-[#0B1220] hover:bg-[#F3F6F9]"
            >
              Sign out
            </button>
          </div>
          </header>
        )}

        {/* Mobile nav (under header) */}
        {!screenshotMode && (
          <nav className="md:hidden border-b border-[#E2E8F0] bg-[#0E1627] px-3 py-2 overflow-x-auto">
          <div className="flex gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-1 text-[11px] transition-colors",
                    active
                      ? "bg-[#22C3A6] text-[#0B1220]"
                      : "bg-[rgba(255,255,255,0.06)] text-[#CBD5E1] hover:bg-[rgba(255,255,255,0.06)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          </nav>
        )}

        {/* Page content */}
        <main className={screenshotMode ? "flex-1 px-0 py-0" : "flex-1 px-4 md:px-6 py-6"}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#F3F6F9] text-[#0B1220]">
          <p>Loading your dashboard...</p>
        </main>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}


