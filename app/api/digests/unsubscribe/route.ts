import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/digestTokens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await supabaseAdmin
    .from("user_preferences")
    .upsert({
      user_id: payload.userId,
      digest_enabled: false,
      unsubscribed_at: new Date().toISOString(),
    });

  return new NextResponse(
    "<html><body style=\"font-family:Arial,Helvetica,sans-serif;padding:32px;\">You are unsubscribed from weekly digests.</body></html>",
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
