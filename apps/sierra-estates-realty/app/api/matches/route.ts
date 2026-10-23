/**
 * POST /api/matches
 *   { budget, beds, type, mode, preferredZone? }
 *   → MatchResult[] (top 3 listings with score + reasons)
 *
 * Pure scoring — no DB writes. Reads live listings from Supabase only,
 * ranks by composite score: budget fit + beds fit + type match +
 * zone match + AI score weight. Never falls back to hardcoded data.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { listRecords } from "@sierra-estates/db";
import { toListingRecord } from "@/lib/server/listing-columns";
import { rankMatches } from "@/lib/server/match-scoring";
import type { Listing, MatchAnswers, MatchResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The body was previously cast straight to MatchAnswers with no validation, so a
 * missing `budget` made every budget score NaN (`|l.usd - undefined| / undefined`)
 * and the whole response serialized as null scores. `type` and `preferredZone` stay
 * plain bounded strings — they are only ever compared with === against listing
 * fields, so restating the unions here would just be a second copy to drift.
 */
const matchAnswersSchema = z.object({
  budget: z.number().positive().finite(),
  beds: z.number().int().min(0).max(20),
  type: z.string().min(1).max(80),
  mode: z.enum(["sale", "rent"]),
  preferredZone: z.string().min(1).max(120).optional(),
});

async function loadListings(): Promise<Listing[]> {
  try {
    // PUBLISH GATE (activation plan Phase D): the query itself filters to
    // on-market statuses AND publish_status = 'PUBLISHABLE' — the live table
    // buries ~9.7k archived rows above the active ones, and unverified rows
    // (public submissions land as REVIEW_REQUIRED) must never reach a public
    // match response regardless of their status.
    const rows = await listRecords<Record<string, unknown>>("listings", {
      where: [
        { column: "status", op: "in", value: ["active", "available"] },
        { column: "publish_status", op: "eq", value: "PUBLISHABLE" },
      ],
      limit: 500,
    });
    if (rows.length > 0) {
      // toListingRecord restores the app vocabulary (beds / bath / area /
      // type / mode) the scorer below reads.
      return rows.map((row) => toListingRecord(row)) as unknown as Listing[];
    }
  } catch (err) {
    console.warn("[matches] Supabase read failed — returning empty set, never fabricated data:", err);
  }
  // ANTI-FABRICATION (Master Rule 5): no hardcoded fallback. An empty or
  // unreachable DB yields an honest "no matches" response, not stale seeds.
  return [];
}

/**
 * The seed data and the legacy Firestore documents call an on-market unit
 * 'available'; public.listings defaults to 'active'. Both mean the same thing
 * here, so matching only one of them would silently return no matches.
 */
function isOnMarket(status?: string | null): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "available" || normalized === "active";
}

export async function POST(req: Request) {
  const parsed = matchAnswersSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid match criteria", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const answers = parsed.data as MatchAnswers;
  const listings = await loadListings();

  // Deterministic engine (lib/server/match-scoring): hard constraints first
  // (budget cap, minimum bedrooms; mode filtered above), then soft ranking
  // (budget 40 / beds 20 / type 15 / zone 15 / AI 10). Violators can only
  // surface as explicitly flagged alternatives when compliant results < 3.
  const onMarket = listings.filter((l) => isOnMarket(l.status) && l.mode === answers.mode);

  const results: MatchResult[] = rankMatches(onMarket, answers).map((m) => ({
    listing: m.listing,
    score: m.score,
    reasons: m.reasons,
    ...(m.alternative
      ? { alternative: true, hardConstraintViolations: m.hardConstraintViolations }
      : { hardConstraintViolations: [] }),
  }));

  return NextResponse.json(results);
}
