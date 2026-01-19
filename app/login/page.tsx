"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Check your email to confirm your account");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      const user = data?.user;
      if (user) {
        const { data: cafe } = await supabase
          .from("cafes")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!cafe) {
          router.push("/onboarding");
          router.refresh();
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen lp-light-app-bg text-[#0B1220]">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden bg-[#0B1220] px-8 py-12 text-center text-white lg:min-h-screen lg:px-12"
          style={{
            backgroundImage:
              "radial-gradient(900px 700px at 20% 20%, rgba(45, 212, 191, 0.25), transparent 60%), radial-gradient(800px 600px at 80% 80%, rgba(59, 130, 246, 0.20), transparent 65%), #0B1220",
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center">
                <img
                  src="/localpulse-logo-icon-teal.svg"
                  alt="LocalPulse"
                  className="h-10 w-10"
                />
              </span>
              <span className="text-lg font-semibold tracking-wide">
                LocalPulse Analytics
              </span>
            </div>
            <p className="mx-auto max-w-sm text-base text-white/75">
              Execution-first insights for cafe owners. Simple, focused, and built to
              move quickly.
            </p>
            <p className="text-xs text-white/55">
              Secure access for your team and locations.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),_0_8px_24px_rgba(15,23,42,0.06)] sm:p-10">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </p>
              <h1 className="text-2xl font-semibold">
                {mode === "signin"
                  ? "Sign in to LocalPulse"
                  : "Start with LocalPulse"}
              </h1>
              <p className="text-sm text-[#94A3B8]">
                {mode === "signin"
                  ? "Access your dashboard and weekly insights."
                  : "Join the early access group for LocalPulse."}
              </p>
            </div>

            <form
              key={mode}
              className="mt-6 space-y-4 motion-safe:animate-card-in"
              onSubmit={handleSubmit}
            >
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8]">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8]">
                  Password
                </label>
                <input
                  className="mt-2 w-full rounded-xl bg-[#F9FBFC] lp-card-soft px-3 py-2 text-sm outline-none focus:border-[#22C3A6] focus:ring-2 focus:ring-[rgba(34,195,166,0.35)]"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#22C3A6] px-4 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.3)] transition hover:bg-[#17A98F]"
              >
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </button>
            </form>

            <button
              className="mt-5 w-full text-xs text-[#94A3B8] hover:text-[#0B1220]"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>

            {message && (
              <p className="mt-3 text-xs text-center text-[#94A3B8]">
                {message}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}



