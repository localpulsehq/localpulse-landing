'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import "@/app/globals.css"
import { ToastProvider } from "@/components/ui/toast";

type CafeRow = {
  name: string;
};

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/reviews', label: 'Reviews' },
  { href: '/dashboard/sales-analytics', label: 'Analytics' }, 
  { href: '/dashboard/sales', label: 'Sales' },
  { href: '/dashboard/settings', label: 'Settings' },
];



export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

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
        .select('name')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!cafeError && cafeData) {
        setCafeName(cafeData.name);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <p>Loading your dashboard…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 border-r border-slate-800 flex-col px-4 py-6 gap-6">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-400">
            LOCAL PULSE
          </div>
          <div className="text-lg font-bold">
            {cafeName ?? 'My Café'}
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
                    ? 'bg-slate-800 text-slate-50'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-xs text-slate-500">
          Signed in as
          <div className="truncate text-slate-300">
            {userEmail}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">
              {cafeName ?? 'My Café'}
            </span>
            <span className="hidden sm:inline text-xs text-slate-500">
              • Local Pulse Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-400">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-600 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Mobile nav (under header) */}
        <nav className="md:hidden border-b border-slate-800 bg-slate-950/95 px-3 py-2 overflow-x-auto">
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
                      ? "bg-sky-600 text-slate-50"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}