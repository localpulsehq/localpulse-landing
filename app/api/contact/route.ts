import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function POST(req: Request) {
  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const cafe = String(body?.cafe ?? "").trim();
  const suburb = String(body?.suburb ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!name || !email || !cafe || !suburb || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contact_requests").insert({
    name,
    email,
    cafe_name: cafe,
    suburb,
    message,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to store message", detail: error },
      { status: 500 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const from = process.env.RESEND_FROM ?? "contact@localpulsehq.com";
  const to = process.env.CONTACT_EMAIL_TO ?? "contact@localpulsehq.com";
  const subject = `New cafe contact: ${cafe}`;
  const text = [
    "New cafe contact request",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Cafe: ${cafe}`,
    `Suburb: ${suburb}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const emailRes = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      reply_to: email,
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.json().catch(() => null);
    return NextResponse.json(
      { error: "Failed to send email", detail },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
