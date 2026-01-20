import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const recipientId = url.searchParams.get("rid");
  const baseUrl = process.env.APP_BASE_URL ?? url.origin;

  if (recipientId) {
    await supabaseAdmin
      .from("digest_recipients")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", recipientId);
  }

  if (!next) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  if (!next.startsWith(baseUrl)) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  return NextResponse.redirect(next);
}
