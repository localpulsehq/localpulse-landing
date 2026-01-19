import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getSecret(req: NextRequest) {
  const url = new URL(req.url);
  return req.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }

  const provided = getSecret(req);
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cafeId = body?.cafeId;

  if (!cafeId || typeof cafeId !== "string") {
    return NextResponse.json({ error: "Missing cafeId" }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const url = new URL("/api/digests/weekly", baseUrl);
  url.searchParams.set("secret", secret);
  url.searchParams.set("cafeId", cafeId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-cron-secret": secret,
    },
  });

  const payload = await res.json().catch(() => ({}));
  return NextResponse.json(payload, { status: res.status });
}
