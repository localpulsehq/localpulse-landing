import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const from = process.env.RESEND_FROM ?? "contact@localpulsehq.com";
  const to = process.env.CONTACT_EMAIL_TO ?? "contact@localpulsehq.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "LocalPulse test email",
      text: "If you received this, Resend is wired up.",
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    return NextResponse.json({ error }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, data });
}
