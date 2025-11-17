import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50 px-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Local Pulse Analytics
      </h1>

      <p className="text-lg md:text-xl text-slate-300 max-w-xl text-center mb-8">
        Insightful dashboards for local businesses — powered by customer reviews, 
        POS data, and actionable metrics. Launching soon.
      </p>

      <a
        href="mailto:hello@localpulsehq.com"
        className="px-5 py-3 rounded-lg border border-slate-600 hover:bg-slate-800 transition"
      >
        Contact Us
      </a>
    </main>
  );
}
