/**
 * The canonical deal pipeline stages — mirrors the CHECK constraint on
 * public.deals (supabase/schema.sql):
 *
 *   stage TEXT DEFAULT 'proposal' CHECK (stage IN
 *     ('proposal','viewing','offer_made','under_contract',
 *      'closing','closed_won','closed_lost'))
 *
 * Kept in a lib module (not the route file) because Next.js route files
 * may only export handlers + route config — the SPA and the zod schemas
 * in both /api/admin/deals routes import from here.
 */
export const DEAL_STAGES = [
  'proposal',
  'viewing',
  'offer_made',
  'under_contract',
  'closing',
  'closed_won',
  'closed_lost',
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

/** Stages that end the pipeline — excluded from "active pipeline value". */
export const CLOSED_STAGES: readonly DealStage[] = ['closed_won', 'closed_lost'];

export function isDealStage(value: unknown): value is DealStage {
  return typeof value === 'string' && (DEAL_STAGES as readonly string[]).includes(value);
}
