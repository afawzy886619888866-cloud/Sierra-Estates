/**
 * POST /api/openclaw-terminal
 * ─────────────────────────────────────────────────────────────────
 * AI Architect backend for the OpenClaw terminal tab.
 *
 * Accepts natural-language change requests and returns a JSON
 * response with a conversational reply + optional unified diff.
 *
 * Request:  { prompt: string }
 * Response: { reply: string, diff?: string }
 *
 * Environment variables (.env.local):
 *   OPENCLAW_PROVIDER  = "openai" | "openrouter" | "gemini"
 *   OPENCLAW_API_KEY   = your LLM API key
 *   OPENCLAW_MODEL     = model slug (defaults below)
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheck } from "@/lib/server/app-check";
import { applyRateLimit, publicEndpointLimiter } from "@/lib/server/rate-limit";

/** Longest prompt we will forward to the LLM provider. */
const MAX_PROMPT_CHARS = 4000;

/* ── Sierra-specific system prompt ──────────────────────────────────────── */

const SYSTEM_PROMPT = `You are OpenClaw — the AI architect embedded inside the Sierra Estates admin dashboard.

Sierra Estates is a luxury real estate portal for New Cairo (Egypt).
Stack: Next.js 16 App Router · TypeScript (strict) · Tailwind CSS v4 · Firebase/Firestore
Design language: Premium Lime — OLED black #020617, electric lime #84CC16, Plus Jakarta Sans
Key files: app/(client)/page.tsx (client home), components/admin/ (admin UI), public/client-page/ (legacy vanilla JS assets)

Rules you MUST follow:
1. When the user asks to change something, output BOTH a "reply" and a "diff".
2. The "diff" must be a valid unified diff (--- a/ +++ b/ @@ format).
3. Never claim you have deployed, pushed, or applied anything.
4. Keep diffs minimal — surgical edits only.
5. If the request is unclear or too complex for a single diff, explain why and ask a clarifying question (no diff).
6. If the request is a question (not a change), just answer in "reply" (no diff).

Always respond with valid JSON:
{
  "reply": "Short conversational explanation (2-4 sentences).",
  "diff": "--- a/path/to/file\\n+++ b/path/to/file\\n@@ -N,M +N,M @@\\n context\\n+addition\\n-removal"
}`;

/* ── Provider routing ────────────────────────────────────────────────────── */

const DEFAULT_MODELS: Record<string, string> = {
  openai:     "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
  gemini:     "gemini-2.0-flash",
};

const BASE_URLS: Record<string, string> = {
  openai:     "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini:     "https://generativelanguage.googleapis.com/v1beta/openai",
};

async function callLLM(prompt: string): Promise<{ reply: string; diff?: string }> {
  const provider = (process.env.OPENCLAW_PROVIDER ?? "openai").toLowerCase();
  const apiKey   = process.env.OPENCLAW_API_KEY;
  const model    = process.env.OPENCLAW_MODEL ?? DEFAULT_MODELS[provider] ?? "gpt-4o-mini";

  if (!apiKey) {
    return {
      reply:
        "⚠️ **OpenClaw is not configured.** Add these to your `.env.local` then restart the dev server:\n\n" +
        "```\nOPENCLAW_PROVIDER=openai\nOPENCLAW_API_KEY=sk-...\nOPENCLAW_MODEL=gpt-4o-mini\n```\n\n" +
        "Supported providers: `openai`, `openrouter`, `gemini`.",
    };
  }

  const baseUrl = BASE_URLS[provider] ?? BASE_URLS.openai;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(provider === "openrouter" && {
        "HTTP-Referer": process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://sierra-estates.net",
        "X-Title": "Sierra Estates — OpenClaw Terminal",
      }),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: prompt },
      ],
      temperature: 0.25,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM API returned ${res.status}${detail ? ": " + detail.slice(0, 200) : ""}`);
  }

  const json  = await res.json();
  const raw   = json.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as { reply?: string; diff?: string };
    return {
      reply: parsed.reply ?? "Done.",
      diff:  parsed.diff  ?? undefined,
    };
  } catch {
    // Model returned plain text instead of JSON — wrap it
    return { reply: String(raw) };
  }
}

/* ── Route handler ───────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  // 1. Verify App Check Attestation (same gate as /api/openclaw) — without it
  //    any anonymous caller can spend the LLM budget on this endpoint.
  const { isValid, errorResponse } = await verifyAppCheck(request);
  if (!isValid) {
    return errorResponse;
  }

  // 2. Rate limit per IP on top of attestation.
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json() as { prompt?: string };

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `prompt exceeds ${MAX_PROMPT_CHARS} characters` },
        { status: 400 }
      );
    }

    const result = await callLLM(prompt);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[OpenClaw Terminal]", err);
    return NextResponse.json(
      { reply: `Error: ${msg}`, diff: undefined },
      { status: 500 }
    );
  }
}
