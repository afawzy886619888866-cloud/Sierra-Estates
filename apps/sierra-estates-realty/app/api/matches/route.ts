/**
 * POST /api/matches
 *   { budget, beds, type, mode, preferredZone? }
 *   → MatchResult[] (top 3 listings with score + reasons)
 *
 * Pure scoring — no DB writes. Reads listings (seed or Firestore),
 * ranks by composite score: budget fit + beds fit + type match +
 * zone match + AI score weight.
 */
import { NextResponse } from "next/server";
import { SEED_LISTINGS } from "@/lib/seed";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Listing, MatchAnswers, MatchResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadListings(): Promise<Listing[]> {
  const db = await getAdminDb();
  if (db) {
    try {
      const snap = await db.collection("listings").get();
      if (!snap.empty)
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Listing[];
    } catch (err) {
      console.warn("[matches] Firestore read failed, using seed:", err);
    }
  }
  return SEED_LISTINGS;
}

export async function POST(req: Request) {
  const answers = (await req.json().catch(() => ({}))) as MatchAnswers;
  const listings = await loadListings();

  const results: MatchResult[] = listings
    .filter((l) => l.status === "available" && l.mode === answers.mode)
    .map((l) => {
      const reasons: string[] = [];
      let score = 0;

      // Budget fit (40 pts max) — within ±25% of budget is full score
      const budgetDiff = Math.abs(l.usd - answers.budget) / answers.budget;
      const budgetScore = Math.max(0, 40 - budgetDiff * 80);
      score += budgetScore;
      if (budgetDiff < 0.1) reasons.push("Exactly on budget");
      else if (budgetDiff < 0.25) reasons.push("Within budget range");
      else reasons.push(`${budgetDiff < 0.5 ? "Slightly over" : "Higher than"} budget`);

      // Beds fit (20 pts) — exact match = 20, ±1 = 10
      const bedDiff = Math.abs(l.beds - answers.beds);
      score += bedDiff === 0 ? 20 : bedDiff === 1 ? 10 : 0;
      if (bedDiff === 0) reasons.push(`${l.beds} bedrooms matches`);

      // Type match (15 pts)
      if (l.type === answers.type) {
        score += 15;
        reasons.push(`${l.type} matches preference`);
      }

      // Zone match (15 pts)
      if (answers.preferredZone && l.zone === answers.preferredZone) {
        score += 15;
        reasons.push(`In ${l.zone}`);
      } else if (answers.preferredZone) {
        score += 5;
      }

      // AI score weight (10 pts) — normalized 0..10
      score += l.aiScore;
      reasons.push(`AI score ${l.aiScore.toFixed(1)}/10`);

      return {
        listing: l,
        score: Math.round(Math.min(100, score)),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return NextResponse.json(results);
}
