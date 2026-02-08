import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function getIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const businessId = String(body?.businessId ?? "").trim();
  const rating = clampRating(Number(body?.rating));
  const message = typeof body?.message === "string" ? body.message.trim() : null;
  const contact = typeof body?.contact === "string" ? body.contact.trim() : null;
  const source = typeof body?.source === "string" ? body.source.trim() : null;
  const meta = typeof body?.meta === "object" && body?.meta ? body.meta : null;
  const honeypot = String(body?.company ?? "").trim();

  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!businessId || rating === null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: gate, error: gateError } = await supabaseAdmin
    .from("feedback_gate_configs")
    .select("cafe_id,business_name,notify_email,threshold,active")
    .eq("cafe_id", businessId)
    .maybeSingle();

  if (gateError || !gate || gate.active === false) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }

  const threshold = typeof gate.threshold === "number" ? gate.threshold : 4;
  const status = rating < threshold ? "new" : "resolved";

  const { error: insertError } = await supabaseAdmin
    .from("feedback_submissions")
    .insert({
      business_id: businessId,
      rating,
      message,
      contact,
      status,
      source,
      meta,
    });

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to store feedback", detail: insertError },
      { status: 500 }
    );
  }

  if (rating < threshold && gate.notify_email) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ ok: true, email: "skipped_missing_key" });
    }

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const dashboardUrl = new URL("/dashboard/feedback", baseUrl).toString();

    const { render } = await import("@react-email/render");
    const { default: PrivateFeedbackEmail } = await import(
      "@/emails/PrivateFeedbackEmail"
    );

    let html = await render(
      PrivateFeedbackEmail({
        cafeName: gate.business_name,
        rating,
        message,
        contact,
        dashboardUrl,
      })
    );
    if (typeof html !== "string") {
      html = String(html ?? "");
    }

    const text = [
      `New private feedback (${rating}\u2605)`,
      "",
      `Cafe: ${gate.business_name}`,
      `Rating: ${rating} out of 5`,
      message ? `Message: ${message}` : "Message: (none)",
      contact ? `Contact: ${contact}` : "Contact: (not provided)",
      "",
      `View in LocalPulse: ${dashboardUrl}`,
    ].join("\n");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "contact@localpulsehq.com",
        to: gate.notify_email,
        subject: `New private feedback (${rating}\u2605) - ${gate.business_name}`,
        html,
        text,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.json().catch(() => null);
      return NextResponse.json({ ok: true, email: "failed", detail });
    }
  }

  return NextResponse.json({ ok: true });
}
