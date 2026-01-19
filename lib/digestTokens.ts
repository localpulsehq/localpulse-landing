import crypto from "crypto";

type UnsubscribeTokenPayload = {
  userId: string;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input + "=".repeat(padLength);
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function sign(payload: UnsubscribeTokenPayload, secret: string) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const sigUrl = sig.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${body}.${sigUrl}`;
}

function verify(token: string, secret: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body)) as UnsubscribeTokenPayload;
    if (!payload.userId || !payload.exp) return null;
    if (Date.now() > payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createUnsubscribeToken(userId: string, daysValid = 14) {
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("Missing DIGEST_UNSUBSCRIBE_SECRET");
  }
  const exp = Math.floor(Date.now() / 1000) + daysValid * 24 * 60 * 60;
  return sign({ userId, exp }, secret);
}

export function verifyUnsubscribeToken(token: string) {
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("Missing DIGEST_UNSUBSCRIBE_SECRET");
  }
  return verify(token, secret);
}
