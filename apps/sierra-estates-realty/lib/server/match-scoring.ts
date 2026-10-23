/**
 * Deterministic match scoring — the single engine behind /api/matches.
 *
 * Master-spec contract (Phase 5/6):
 *  - HARD constraints: deal type (rent vs sale, filtered upstream), budget cap,
 *    minimum bedrooms, target zone. A listing that violates any of these can
 *    NEVER appear as a normal result — only as an explicitly flagged
 *    "alternative" (and only when not enough compliant results exist).
 *  - SOFT ranking (configurable weights, current defaults): budget fit 40,
 *    bedrooms fit 20, property type 15, zone 15, AI score 10.
 *
 * Pure functions — no I/O, fully unit-testable. The route layer only loads
 * rows and formats the response; every scoring decision lives here.
 */
import type { Listing, MatchAnswers } from "@/lib/types";

/** Max results /api/matches returns. */
export const MATCH_RESULT_LIMIT = 3;

export interface ScoredMatch {
  score: number; // 0-100
  reasons: string[];
  /** Non-empty ⇒ the listing violates at least one hard constraint. */
  hardConstraintViolations: string[];
}

/**
 * Hard-constraint gate. A violation makes the listing ineligible for normal
 * results; it may only surface as a flagged alternative.
 */
export function hardConstraintViolations(listing: Listing, answers: MatchAnswers): string[] {
  const violations: string[] = [];

  // Budget cap (master spec: "budget max"). The client's figure is the
  // ceiling — anything above it is unaffordable, not "slightly over".
  if (Number.isFinite(listing.usd) && listing.usd > answers.budget) {
    const overPct = Math.round(((listing.usd - answers.budget) / answers.budget) * 100);
    violations.push(`Over budget by ${overPct}% (${fmtUsd(listing.usd)} vs ${fmtUsd(answers.budget)} cap)`);
  }

  // Minimum bedrooms: a family needing 4 rooms cannot move into a 2-bedroom.
  if (Number.isFinite(listing.beds) && listing.beds < answers.beds) {
    violations.push(`${listing.beds} bedrooms < ${answers.beds} requested`);
  }

  return violations;
}

/**
 * Soft score for a compliant listing (callers must gate on
 * hardConstraintViolations() first for normal results).
 */
export function scoreMatch(listing: Listing, answers: MatchAnswers): ScoredMatch {
  const reasons: string[] = [];
  let score = 0;

  // 1. Budget fit — 40 pts. Within 10% of the cap: full marks (using most of
  // the budget usually reflects the segment the client is shopping in);
  // further below decays linearly to 0 at ≤50% of budget.
  const ratio = answers.budget > 0 ? listing.usd / answers.budget : 0;
  if (ratio >= 0.9 && ratio <= 1) {
    score += 40;
    reasons.push("Within budget");
  } else if (ratio < 0.9) {
    score += Math.max(0, Math.round(40 * (ratio / 0.9)));
    if (ratio >= 0.75) reasons.push("Comfortably under budget");
    else reasons.push("Well under the stated budget");
  }
  // ratio > 1 is a hard violation; budget contributes 0 points here and the
  // listing is only eligible as a flagged alternative.

  // 2. Bedrooms fit — 20 pts. At or above the requested count: exact match
  // scores highest, extra bedrooms decay gently (heating/price, not
  // deal-breakers). Below the requested count is a hard violation upstream.
  const bedDiff = listing.beds - answers.beds;
  if (bedDiff === 0) {
    score += 20;
    reasons.push(`${listing.beds} bedrooms — exact match`);
  } else if (bedDiff === 1) {
    score += 14;
    reasons.push(`${listing.beds} bedrooms — one above the request`);
  } else if (bedDiff === 2) {
    score += 8;
  } else if (bedDiff >= 3) {
    score += 4;
  }

  // 3. Property type — 15 pts (soft preference).
  if (listing.type === answers.type) {
    score += 15;
    reasons.push(`${listing.type} matches preference`);
  }

  // 4. Zone — 15 pts for the preferred zone, 5 for any other (soft).
  if (answers.preferredZone) {
    if (listing.zone === answers.preferredZone) {
      score += 15;
      reasons.push(`In ${listing.zone}`);
    } else {
      score += 5;
    }
  } else {
    score += 10; // no preference stated — neutral half-weight
  }

  // 5. AI quality score — up to 10 pts (normalized 0..10).
  const ai = Number.isFinite(listing.aiScore) ? Math.max(0, Math.min(10, listing.aiScore)) : 0;
  score += Math.round(ai);
  if (ai > 0) reasons.push(`AI score ${ai.toFixed(1)}/10`);

  return {
    score: Math.min(100, Math.round(score)),
    reasons,
    hardConstraintViolations: hardConstraintViolations(listing, answers),
  };
}

/**
 * Rank listings for the answers: compliant results first (by score); only
 * when fewer than `limit` compliant listings exist are the best violating
 * listings appended, each explicitly flagged as an alternative.
 */
export function rankMatches(
  listings: Listing[],
  answers: MatchAnswers,
  limit: number = MATCH_RESULT_LIMIT
): Array<ScoredMatch & { listing: Listing; alternative: boolean }> {
  const scored = listings.map((listing) => ({
    listing,
    ...scoreMatch(listing, answers),
  }));

  const compliant = scored
    .filter((m) => m.hardConstraintViolations.length === 0)
    .sort((a, b) => b.score - a.score);

  if (compliant.length >= limit) {
    return compliant.slice(0, limit).map((m) => ({ ...m, alternative: false }));
  }

  // Fill the remainder with the closest violations, explicitly flagged.
  const alternatives = scored
    .filter((m) => m.hardConstraintViolations.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit - compliant.length)
    .map((m) => ({ ...m, alternative: true }));

  return [...compliant.map((m) => ({ ...m, alternative: false })), ...alternatives];
}

function fmtUsd(v: number): string {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}
