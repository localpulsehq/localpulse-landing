import OpenAI from "openai";

export type ReviewSentiment = {
  score: number; // -1..+1
  label: "positive" | "neutral" | "negative";
  topics: string[];
  version: "v1";
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clampScore(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(-1, Math.min(1, x));
}

function normalizeLabel(x: any): ReviewSentiment["label"] {
  if (x === "positive" || x === "neutral" || x === "negative") return x;
  return "neutral";
}

export async function analyseReview(text: string, rating?: number): Promise<ReviewSentiment> {
  const trimmed = (text ?? "").trim();

  // Empty / no-text reviews: treat as neutral
  if (!trimmed) {
    return { score: 0, label: "neutral", topics: [], version: "v1" };
  }

  const prompt = `
You are a sentiment analyser for café reviews.

Return ONLY valid JSON with keys:
- score: number from -1 to +1
- label: "positive" | "neutral" | "negative"
- topics: array of 0-5 short topics (1-2 words each), lowercase

Rules:
- If the review is mixed, use label "neutral" and score near 0.
- Topics should be general: e.g. "coffee", "service", "pricing", "wait time", "food".
- Do not include any extra keys or text.
Review:
"""${trimmed}"""
`.trim();

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback if model ever returns non-json
      parsed = {};
    }

    const score = clampScore(Number(parsed.score));
    const label = normalizeLabel(parsed.label);
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics
          .map((t: any) => String(t).toLowerCase().trim())
          .filter((t: string) => t && t.length <= 24)
          .slice(0, 5)
      : [];

    // If label/score mismatch, normalize lightly
    const finalLabel =
      score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";

    return {
      score,
      label: label ?? finalLabel,
      topics,
      version: "v1",
    };
  } catch (err) {
    console.error("analyzeReview: OpenAI error", err);
    // Fail safe: don’t break sync
    return { score: 0, label: "neutral", topics: [], version: "v1" };
  }
}
