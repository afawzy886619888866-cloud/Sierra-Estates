/**
 * Phase 10 (CRM PIPELINE) — lead automation timers.
 *
 * Pure decision logic (unit-testable, no I/O) + the cron entry point lives at
 * app/api/cron/lead-timers/route.ts.
 *
 * Rules:
 *   1. A lead parked in a pre-handover stage longer than that stage's SLA
 *      gets a REAL followups row (call before viewing, WhatsApp after) —
 *      only when it has no open followup already (no duplicate nagging).
 *   2. followups that are still 'pending' past their due date flip to
 *      'overdue' so the board reflects reality.
 *   3. Every run writes ONE summary activity into the admin feed (activities)
 *      — the same honest pattern as the reservation-expiry cron.
 *
 * No fabricated data: every created followup quotes the REAL stage and the
 * REAL days-since-touch; if there is nothing to do the run says so with a
 * zero count.
 */

/** Days a lead may sit in a stage before the timer fires (per stage). */
export const STALE_STAGE_DAYS: Record<string, number> = {
  inbound: 5,
  qualify: 5,
  engage: 3,
  proposal: 5,
  viewing: 2,
  negotiate: 7,
  reserve: 7,
  contract: 14,
  handover: 14,
};

/** Followup cadence per stage: calls early, WhatsApp once viewings happen. */
const STAGE_FOLLOWUP_TYPE: Record<string, 'call' | 'whatsapp'> = {
  inbound: 'call',
  qualify: 'call',
  engage: 'call',
  proposal: 'call',
  viewing: 'whatsapp',
  negotiate: 'whatsapp',
  reserve: 'whatsapp',
  contract: 'whatsapp',
  handover: 'whatsapp',
};

const STAGE_PRIORITY: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
  inbound: 'medium',
  qualify: 'medium',
  engage: 'high',
  proposal: 'high',
  viewing: 'urgent', // viewing is the hottest pre-offer moment
  negotiate: 'high',
  reserve: 'medium',
  contract: 'medium',
  handover: 'low',
};

export interface LeadLike {
  id: string;
  pipelineStage?: string | null;
  archived?: boolean | null;
  hot?: boolean | null;
  fullName?: string | null;
  name?: string | null;
  updatedAt?: string | null;
}

export interface FollowupLike {
  leadId?: string | null;
  status?: string | null;
  dueAt?: string | null;
}

/** Days (fractional ok) since the lead's last touch, or +∞ when unknown. */
export function daysSinceTouch(lead: LeadLike, now: Date): number {
  if (!lead.updatedAt) return Number.POSITIVE_INFINITY;
  const t = Date.parse(lead.updatedAt);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - t) / 86_400_000;
}

export function isLeadStale(lead: LeadLike, now: Date): { stale: boolean; stage: string; staleDays: number } {
  const stage = lead.pipelineStage ?? 'inbound';
  const threshold = STALE_STAGE_DAYS[stage];
  if (threshold === undefined) return { stale: false, stage, staleDays: 0 };
  if (lead.archived) return { stale: false, stage, staleDays: 0 };
  const days = daysSinceTouch(lead, now);
  return { stale: days > threshold, stage, staleDays: Math.floor(days) };
}

/** Leads with an open followup must not get a second timer row. */
export function hasOpenFollowup(leadId: string, followups: FollowupLike[]): boolean {
  return followups.some(
    (f) => String(f.leadId ?? '') === leadId && (f.status === 'pending' || f.status === 'in_progress' || f.status === 'overdue')
  );
}

export interface TimerFollowupDraft {
  leadId: string;
  type: 'call' | 'whatsapp';
  title: string;
  notes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueAt: string;
}

export function buildTimerFollowup(lead: LeadLike, staleDays: number, stage: string, dueInHours = 24): TimerFollowupDraft | null {
  if (STALE_STAGE_DAYS[stage] === undefined) return null;
  const name = (lead.fullName ?? lead.name ?? 'Lead').toString().trim() || 'Lead';
  const type = STAGE_FOLLOWUP_TYPE[stage];
  const priority = STAGE_PRIORITY[stage];
  const dueAt = new Date(Date.now() + dueInHours * 3_600_000).toISOString();
  return {
    leadId: lead.id,
    type,
    title: `Auto-timer: ${name} parked in "${stage}" for ${staleDays} day${staleDays === 1 ? '' : 's'}`,
    notes: `Lead-timers automation: last activity ${staleDays} day(s) ago while in stage "${stage}" (SLA ${STALE_STAGE_DAYS[stage]} day(s)). Real data from leads.updatedAt — take action or advance the stage.`,
    priority,
    dueAt,
  };
}

/** Select the leads that need a timer followup this run. */
export function selectStaleLeads(leads: LeadLike[], followups: FollowupLike[], now: Date): TimerFollowupDraft[] {
  const drafts: TimerFollowupDraft[] = [];
  for (const lead of leads) {
    const { stale, stage, staleDays } = isLeadStale(lead, now);
    if (!stale) continue;
    if (hasOpenFollowup(lead.id, followups)) continue;
    const draft = buildTimerFollowup(lead, staleDays, stage);
    if (draft) drafts.push(draft);
  }
  return drafts;
}

/** followups rows that must flip pending → overdue this run. */
export function selectOverdueFollowups(followups: FollowupLike[], now: Date): string[] {
  const nowMs = now.getTime();
  return followups
    .filter((f) => f.status === 'pending' && f.dueAt && !Number.isNaN(Date.parse(f.dueAt)) && Date.parse(f.dueAt) < nowMs)
    .map((f) => String((f as { id?: string }).id ?? ''))
    .filter(Boolean);
}
