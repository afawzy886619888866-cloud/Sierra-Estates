/**
 * Phase 9 (POST-VIEWING FEEDBACK) — shared vocabulary, schemas and rules.
 *
 * Single source of truth for the three feedback sides (sales report, client
 * survey, manager review) used by the admin API routes, the public survey
 * endpoint, the admin UI and the tests. Mirrors the SQL CHECK constraints in
 * supabase/migrations/20261001_015_viewing_feedback.sql — keep both in sync.
 */
import { z } from 'zod';

// ─── Viewings lifecycle (migration 014) ─────────────────────────────────────
export const VIEWING_STATUSES = [
  'pending_approval',
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type ViewingStatus = (typeof VIEWING_STATUSES)[number];

/**
 * Legal status transitions for the canonical viewing lifecycle.
 * pending_approval → scheduled | cancelled
 * scheduled        → completed | cancelled | no_show
 * completed / cancelled / no_show are terminal (an admin corrects mistakes by
 * editing notes, not by un-completing — keeps the audit trail honest).
 */
export const VIEWING_TRANSITIONS: Record<ViewingStatus, readonly ViewingStatus[]> = {
  pending_approval: ['scheduled', 'cancelled'],
  scheduled: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function isViewingTransitionAllowed(from: string, to: string): boolean {
  const allowed = VIEWING_TRANSITIONS[from as ViewingStatus];
  return !!allowed && allowed.includes(to as ViewingStatus);
}

// ─── Sales-side post-viewing report ─────────────────────────────────────────
export const UNIT_ACCURACY = ['exact', 'minor_diff', 'major_diff', 'misrepresented'] as const;
export const CLIENT_REACTION = ['very_positive', 'positive', 'neutral', 'negative'] as const;
export const PRICE_REACTION = ['accepted', 'slightly_high', 'too_high', 'not_discussed'] as const;
export const INTEREST_LEVEL = ['hot', 'warm', 'cold', 'lost'] as const;
export const NEXT_ACTIONS = [
  'second_viewing',
  'offer',
  'renegotiate_price',
  'follow_up',
  'nurture',
  'archive',
] as const;

const objectionSchema = z.object({
  category: z.string().min(1).max(64),
  note: z.string().max(500).optional(),
});

export const salesReportSchema = z.object({
  unitAccuracy: z.enum(UNIT_ACCURACY),
  clientReaction: z.enum(CLIENT_REACTION),
  priceReaction: z.enum(PRICE_REACTION),
  objections: z.array(objectionSchema).max(20).default([]),
  interestLevel: z.enum(INTEREST_LEVEL),
  nextAction: z.enum(NEXT_ACTIONS),
  notes: z.string().max(4000).optional(),
});

export type SalesReport = z.infer<typeof salesReportSchema>;

// ─── Manager review ──────────────────────────────────────────────────────────
export const REVIEW_STATUSES = ['pending_review', 'approved', 'needs_changes'] as const;

export const managerReviewSchema = z.object({
  reviewStatus: z.enum(['approved', 'needs_changes']),
  managerNotes: z.string().max(4000).optional(),
});

// ─── Client survey (public, token-gated) ─────────────────────────────────────
export const clientSurveySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{48}$/, 'invalid survey token'),
  clientRating: z.number().int().min(1).max(5),
  clientComment: z.string().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
});

export type ClientSurvey = z.infer<typeof clientSurveySchema>;

/**
 * Survey tokens are 48 hex chars (24 bytes of entropy) — the client's only
 * capability. Minted server-side when an agent completes a viewing.
 */
export function mintSurveyToken(randomBytes: Buffer | Uint8Array): string {
  const hex = Buffer.from(randomBytes).toString('hex');
  if (!/^[0-9a-f]{48}$/.test(hex)) {
    throw new Error('mintSurveyToken: expected 24 bytes of entropy');
  }
  return hex;
}

/** Human labels for the admin UI (single mapping, no per-view re-definitions). */
export const FEEDBACK_LABELS: Record<string, string> = {
  // unit accuracy
  exact: 'Matches listing exactly',
  minor_diff: 'Minor differences',
  major_diff: 'Major differences',
  misrepresented: 'Misrepresented',
  // client reaction
  very_positive: 'Very positive',
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  // price reaction
  accepted: 'Price accepted',
  slightly_high: 'Slightly high',
  too_high: 'Too high',
  not_discussed: 'Not discussed',
  // interest
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  lost: 'Lost',
  // next action
  second_viewing: 'Book second viewing',
  offer: 'Prepare offer',
  renegotiate_price: 'Renegotiate price',
  follow_up: 'Follow up',
  nurture: 'Nurture',
  archive: 'Archive lead',
};

// ─── CRM wiring: next_action → pipeline_stage / hot flag ────────────────────
// Phase 10 tie-in: submitting the sales report nudges the lead's CRM state so
// the board reflects what actually happened on the ground. Only unambiguous
// mappings move the stage; 'follow_up'/'nurture'/'archive' leave it alone
// (they are cadence decisions, not funnel moves).
export const NEXT_ACTION_STAGE_EFFECT: Partial<
  Record<(typeof NEXT_ACTIONS)[number], { pipelineStage?: string; hot?: boolean }>
> = {
  second_viewing: { pipelineStage: 'viewing' },
  offer: { pipelineStage: 'negotiate' },
  renegotiate_price: { pipelineStage: 'negotiate' },
};

export const INTEREST_HOT_EFFECT: Partial<Record<(typeof INTEREST_LEVEL)[number], { hot?: boolean }>> = {
  hot: { hot: true },
  lost: { hot: false },
};
