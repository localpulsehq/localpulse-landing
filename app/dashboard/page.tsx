'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        // no user → kick back to login
        router.push('/login');
        return;
      }
      setUserEmail(data.user.email ?? null);
      setLoading(false);
    }
    loadUser();
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
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Local Pulse Dashboard</h1>
          <p className="text-sm text-slate-400">
            Signed in as {userEmail}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-600 hover:bg-slate-800"
        >
          Sign out
        </button>
      </header>

      <section className="border border-dashed border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Analytics coming soon</h2>
        <p className="text-slate-300 text-sm">
          This is the skeleton for your future Local Pulse analytics dashboard.
          We&apos;ll plug in Google Reviews, POS data, and more in later weeks.
        </p>
      </section>
    </main>
  );
}
