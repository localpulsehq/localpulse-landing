"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type GateConfig = {
  cafe_id: string;
  business_name: string;
  slug: string;
};

export default function FeedbackPrintPage() {
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState<GateConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError("You must be logged in to print assets.");
        setLoading(false);
        return;
      }

      const { data: cafe, error: cafeError } = await supabase
        .from("cafes")
        .select("id")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (cafeError || !cafe) {
        setError("Could not load your cafe.");
        setLoading(false);
        return;
      }

      const { data: gateRow } = await supabase
        .from("feedback_gate_configs")
        .select("cafe_id,business_name,slug")
        .eq("cafe_id", cafe.id)
        .maybeSingle();

      if (!gateRow) {
        setError("Gate setup is missing.");
        setLoading(false);
        return;
      }

      if (!cancelled) {
        setGate(gateRow as GateConfig);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const feedbackBase =
    process.env.NEXT_PUBLIC_FEEDBACK_BASE_URL ?? origin;
  const gateUrl = gate?.slug ? `${feedbackBase}/r/${gate.slug}` : "";
  const qrUrl = useMemo(() => {
    if (!gateUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${encodeURIComponent(
      gateUrl
    )}`;
  }, [gateUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F6F9] flex items-center justify-center text-sm text-[#94A3B8]">
        Loading print assets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F6F9] flex items-center justify-center text-sm text-[#EF4444]">
        {error}
      </div>
    );
  }

  return (
    <div className="print-root bg-white text-[#0B1220]">
        <div className="print-toolbar">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#22C3A6] px-4 py-2 text-xs font-semibold text-[#0B1220] shadow-[0_10px_30px_rgba(34,195,166,0.35)] transition hover:-translate-y-0.5 hover:bg-[#17A98F]"
          >
          Print
        </button>
        <div className="text-xs text-[#94A3B8]">
          Print on A4. Two A6 table tents + one sticker sheet.
        </div>
      </div>

      <div className="page a4">
        <div className="tent-grid">
          {[0, 1].map((idx) => (
            <div key={idx} className="tent-card">
              <div className="tent-header">
                <div className="tent-title">How was your visit?</div>
                <div className="tent-subtitle">
                  Takes 10 seconds - your feedback goes straight to us.
                </div>
              </div>
              <div className="tent-body">
                <img src={qrUrl} alt="Feedback QR" className="tent-qr" />
                <div className="tent-cafe">{gate?.business_name}</div>
                <div className="tent-footer">
                  <span className="tent-url">{gateUrl}</span>
                  <span className="tent-powered">Powered by LocalPulse</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page a4 page-compact page-break">
        <div className="sticker-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="sticker">
              <div className="sticker-title">Quick feedback</div>
              <img src={qrUrl} alt="Feedback QR" className="sticker-qr" />
              <div className="sticker-url">{gate?.business_name}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .print-root {
          min-height: 100vh;
        }

        .print-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f6f9fa;
        }

        .page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 10mm;
          box-sizing: border-box;
          display: grid;
          align-content: start;
        }

        .page-compact {
          align-content: start;
          padding-top: 6mm;
        }

        .page-break {
          page-break-before: always;
        }

        .tent-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8mm;
          height: 100%;
        }

        .tent-card {
          border: 1px solid #d9e7ee;
          border-radius: 12mm;
          padding: 9mm;
          display: flex;
          flex-direction: column;
          gap: 6mm;
          height: 135mm;
        }

        .tent-header {
          display: grid;
          gap: 5mm;
        }

        .tent-title {
          font-size: 20pt;
          font-weight: 700;
          color: #0b1220;
        }

        .tent-subtitle {
          font-size: 11pt;
          color: #148a7a;
        }

        .tent-body {
          display: grid;
          gap: 10mm;
          justify-items: center;
          text-align: center;
          flex: 1;
        }

        .tent-qr {
          width: 62mm;
          height: 62mm;
          margin-top: 2mm;
        }

        .tent-cafe {
          font-size: 12pt;
          font-weight: 600;
          color: #0b1220;
        }

        .tent-url {
          font-size: 9pt;
          color: #64748b;
          word-break: break-all;
        }

        .tent-footer {
          display: grid;
          gap: 2mm;
          border-top: 1px solid #d9e7ee;
          padding-top: 4mm;
          margin-top: 2mm;
          text-align: center;
          width: 100%;
        }

        .tent-url {
          font-size: 9pt;
          color: #64748b;
          word-break: break-all;
        }

        .tent-powered {
          font-size: 8pt;
          color: #94a3b8;
        }

        .sticker-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5mm;
          margin-top: 0;
        }

        @media screen {
          .page {
            height: auto;
            min-height: 0;
            margin-bottom: 6mm;
          }
        }

        .sticker {
          border: 1px dashed #a9d7cc;
          border-radius: 8mm;
          padding: 6mm;
          display: grid;
          gap: 4mm;
          justify-items: center;
          text-align: center;
        }

        .sticker-title {
          font-size: 12pt;
          font-weight: 600;
          color: #148a7a;
        }

        .sticker-qr {
          width: 45mm;
          height: 45mm;
        }

        .sticker-url {
          font-size: 9pt;
          color: #64748b;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html, body {
            width: 210mm;
            margin: 0;
            padding: 0;
          }

          .print-toolbar {
            display: none;
          }

          .page {
            width: 210mm;
            height: auto;
            min-height: 0;
            padding: 8mm;
            page-break-after: auto;
            break-after: auto;
          }

          .page-compact {
            padding-top: 6mm;
          }

          .page-break {
            page-break-before: always;
            break-before: page;
          }
        }
      `}</style>
    </div>
  );
}
