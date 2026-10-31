/**
 * The canonical 10-stage CRM lead pipeline — mirrors `leads.pipeline_stage`,
 * the vocabulary migration 016 (Phase 10 CRM pipeline unification) declared
 * canonical. `leads.status` is a DERIVED coarse projection of this field,
 * kept in sync by the `trigger_leads_status_sync` BEFORE UPDATE trigger.
 *
 * Kept in a lib module (not a route or component file) so the pipeline board
 * (app/admin/pipeline), the leads console (app/admin/leads) and the API
 * routes all share ONE definition, the same way lib/server/deal-stages.ts
 * serves the 7-stage deals kanban.
 *
 * Stage order is the array order — the board renders columns from it and
 * drag-and-drop computes forward/backward moves against it.
 */

export const CRM_PIPELINE_STAGES = [
  'inbound',
  'qualify',
  'engage',
  'proposal',
  'viewing',
  'negotiate',
  'reserve',
  'contract',
  'handover',
  'closed-won',
] as const;

export type CrmPipelineStage = (typeof CRM_PIPELINE_STAGES)[number];

/** Stages past which a lead is committed revenue motion, not intake. */
export const LATE_STAGES: readonly CrmPipelineStage[] = [
  'negotiate',
  'reserve',
  'contract',
  'handover',
  'closed-won',
];

export function isCrmPipelineStage(value: unknown): value is CrmPipelineStage {
  return (
    typeof value === 'string' &&
    (CRM_PIPELINE_STAGES as readonly string[]).includes(value)
  );
}

/** 1-based board position of a stage ('inbound' → 1 … 'closed-won' → 10). */
export function stagePosition(stage: string): number {
  const idx = (CRM_PIPELINE_STAGES as readonly string[]).indexOf(stage);
  return idx === -1 ? 0 : idx + 1;
}

/** Presentation metadata for the pipeline board columns. */
export interface StageMeta {
  id: CrmPipelineStage;
  label: string;
  short: string;
  /** Accent hue token — matches the command-center CSS stage palette. */
  tone: 'neutral' | 'cool' | 'warm' | 'gold' | 'green';
  blurb: string;
}

export const CRM_STAGE_META: readonly StageMeta[] = [
  {
    id: 'inbound',
    label: 'Inbound',
    short: 'S1',
    tone: 'neutral',
    blurb: 'New demand captured by web, WhatsApp, Telegram or Property Finder.',
  },
  {
    id: 'qualify',
    label: 'Qualify',
    short: 'S2',
    tone: 'cool',
    blurb: 'Budget, intent and timeline confirmed by the concierge desk.',
  },
  {
    id: 'engage',
    label: 'Engage',
    short: 'S3',
    tone: 'cool',
    blurb: 'Active two-way conversation with an assigned consultant.',
  },
  {
    id: 'proposal',
    label: 'Proposal',
    short: 'S4',
    tone: 'warm',
    blurb: 'Curated shortlist or formal proposal delivered to the client.',
  },
  {
    id: 'viewing',
    label: 'Viewing',
    short: 'S5',
    tone: 'warm',
    blurb: 'Site inspection scheduled or completed.',
  },
  {
    id: 'negotiate',
    label: 'Negotiate',
    short: 'S6',
    tone: 'gold',
    blurb: 'Offer and terms under negotiation.',
  },
  {
    id: 'reserve',
    label: 'Reserve',
    short: 'S7',
    tone: 'gold',
    blurb: 'Unit reserved; reservation fee and paperwork in motion.',
  },
  {
    id: 'contract',
    label: 'Contract',
    short: 'S8',
    tone: 'gold',
    blurb: 'Contract drafted, signed or with legal review.',
  },
  {
    id: 'handover',
    label: 'Handover',
    short: 'S9',
    tone: 'green',
    blurb: 'Stage-9 closer territory: payment, registration and key handover.',
  },
  {
    id: 'closed-won',
    label: 'Closed Won',
    short: 'S10',
    tone: 'green',
    blurb: 'Deal completed and revenue recognized.',
  },
];
