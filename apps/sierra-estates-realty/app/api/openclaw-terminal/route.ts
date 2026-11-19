/**
 * GET & POST /api/openclaw-terminal
 * ─────────────────────────────────────────────────────────────────
 * AI Architect & 4-Engine Brain backend for the OpenClaw terminal tab.
 *
 * GET:  Returns non-secret brain wiring & domain readiness status.
 * POST: Accepts natural-language requests ({ prompt: string }) and
 *       returns { reply: string, diff?: string }.
 *
 * Environment variables (Cloudflare Worker secrets / .env.local):
 *   OPENCLAW_PROVIDER  = "gemini" | "openai" | "openrouter" (auto-selects gemini if GEMINI_API_KEY is set)
 *   OPENCLAW_API_KEY   = optional override LLM API key (falls back to GEMINI_API_KEY / GOOGLE_AI_API_KEY)
 *   OPENCLAW_MODEL     = model slug (defaults below)
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheck } from "@/lib/server/app-check";
import { applyRateLimit, publicEndpointLimiter } from "@/lib/server/rate-limit";

/** Longest prompt we will forward to the LLM provider. */
const MAX_PROMPT_CHARS = 4000;

/* ── Sierra-specific 4-Engine Brain system prompt ───────────────────────── */

const SYSTEM_PROMPT = `You are OpenClaw — the autonomous AI architect & executive twin embedded inside Sierra Estates Intelligence OS.

Sierra Estates is a luxury real estate brokerage & PropTech portal for New Cairo, Egypt (Mivida, Hyde Park, Eastown, Villette, Palm Hills, Mountain View iCity, Fifth Square, Madinaty, Al Rehab).
Production Hosting: Unified Cloudflare Worker (\`sierra-estates\`) via @opennextjs/cloudflare serving:
  - https://sierra-estates.net & https://www.sierra-estates.net (Public Client Portal)
  - https://admin.sierra-estates.net (Admin Intelligence OS via host rewrite to /admin + Cloudflare Zero Trust Access)
Stack: Next.js 16 App Router · TypeScript (strict) · Supabase PostgreSQL + pgvector (sole system of record)
Design language: Obsidian Deep Navy (#061122 / #0A1628), Signature Metallic Gold (#C9A84C / #D4AF37), Luxury Alabaster (#FAF8F5), Playfair/Cinzel + Plus Jakarta Sans + Cairo (AR) + JetBrains Mono
4-Engine Brain:
  - Engine 1 (Memory): ECC Memory Engine + Obsidian shared store + OpenClaw episodic ledger
  - Engine 2 (RAG & GIS): Supabase listings/real_available_units + pgvector + New Cairo GIS masterplan
  - Engine 3 (Valuation & Harness): Cairo AVM + DeepSeek/invariant harness (rent ceiling <= 400,000 EGP/mo)
  - Engine 4 (Workflows & Closer): Stage-9 Closer, WhatsApp multi-line outreach, Telegram 3-way dispatch
Key files: app/(site)/ (client portal), app/admin/ (admin Intelligence OS), app/site-styles/shared.css, components/site/, lib/services/

Non-Negotiable Invariants:
1. Public Group Privacy Lock: NEVER expose owner or broker phone numbers in public/group replies (route privately only to 01092048333).
2. Supabase is the sole system of record; never fabricate prices, units, or AVM scores.
3. When asked to change code, output BOTH a "reply" and a minimal unified "diff" (--- a/ +++ b/ @@ format).
4. Never claim you have deployed, pushed, or mutated secrets without verification.
5. If the request is a question, answer concisely in "reply" (no diff).

Always respond with valid JSON:
{
  "reply": "Short conversational explanation (2-4 sentences).",
  "diff": "--- a/path/to/file\\n+++ b/path/to/file\\n@@ -N,M +N,M @@\\n context\\n+addition\\n-removal"
}`;

/* ── Provider routing ────────────────────────────────────────────────────── */

const DEFAULT_MODELS: Record<string, string> = {
  gemini:     "gemini-2.5-flash",
  openai:     "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
};

const BASE_URLS: Record<string, string> = {
  gemini:     "https://generativelanguage.googleapis.com/v1beta/openai",
  openai:     "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

function resolveProviderConfig() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const openclawKey = process.env.OPENCLAW_API_KEY;
  const explicitProvider = process.env.OPENCLAW_PROVIDER?.toLowerCase();

  const provider =
    explicitProvider ||
    (geminiKey ? "gemini" : "openai");

  const apiKey =
    openclawKey ||
    (provider === "gemini" ? geminiKey : process.env.OPENAI_API_KEY) ||
    geminiKey ||
    "";

  const model = process.env.OPENCLAW_MODEL || DEFAULT_MODELS[provider] || "gemini-2.5-flash";
  const baseUrl = BASE_URLS[provider] || BASE_URLS.gemini;

  return { provider, apiKey, model, baseUrl };
}

async function callLLM(prompt: string): Promise<{ reply: string; diff?: string }> {
  const { provider, apiKey, model, baseUrl } = resolveProviderConfig();

  if (!apiKey) {
    return {
      reply:
        "OpenClaw LLM key is not configured in this environment. Bind `GEMINI_API_KEY` (recommended) or `OPENCLAW_API_KEY` in Cloudflare Worker secrets / `.env.local`.",
    };
  }

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
    return { reply: String(raw) };
  }
}

/* ── Route handlers ──────────────────────────────────────────────────────── */

export async function GET() {
  const { provider, apiKey, model } = resolveProviderConfig();
  return NextResponse.json({
    status: "wired",
    worker: "sierra-estates",
    domains: ["sierra-estates.net", "www.sierra-estates.net", "admin.sierra-estates.net"],
    brain: {
      provider,
      model,
      configured: Boolean(apiKey),
      engines: {
        memory: true,
        ragAndGis: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
        valuationHarness: true,
        workflowsAndCloser: true,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const { isValid, errorResponse } = await verifyAppCheck(request);
  if (!isValid) {
    return errorResponse;
  }

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
