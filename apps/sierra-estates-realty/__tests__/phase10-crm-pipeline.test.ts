/**
 * Phase 10 (CRM PIPELINE UNIFICATION) — contracts & behaviour.
 *
 * Covers:
 *   · stage-SLA staleness math (lead timers);
 *   · followup dedupe (never double-nag a lead);
 *   · overdue flip selection;
 *   · migration 016 contract: the pipeline_stage → status mapping in SQL
 *     matches the intended canonical vocabulary, legacy 'Viewing Requested'
 *     is normalized BEFORE the CHECK swap, and both triggers exist;
 *   · every writer of leads.status now uses canonical values only.
 */
import {
  STALE_STAGE_DAYS,
  isLeadStale,
  hasOpenFollowup,
  selectStaleLeads,
  selectOverdueFollowups,
  buildTimerFollowup,
  daysSinceTouch,
  type LeadLike,
  type FollowupLike,
} from '@/lib/server/lead-timers';

const NOW = new Date('2026-10-01T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('lead timers — staleness math', () => {
  test('viewing stage has the tightest SLA (2 days)', () => {
    expect(STALE_STAGE_DAYS.viewing).toBe(2);
    expect(STALE_STAGE_DAYS.engage).toBe(3);
    expect(STALE_STAGE_DAYS.handover).toBe(14);
  });

  test('a lead idle past its stage SLA is stale', () => {
    const lead: LeadLike = { id: 'l1', pipelineStage: 'engage', updatedAt: daysAgo(4) };
    expect(isLeadStale(lead, NOW).stale).toBe(true);
  });

  test('a lead inside its SLA is not stale', () => {
    const lead: LeadLike = { id: 'l1', pipelineStage: 'engage', updatedAt: daysAgo(1) };
    expect(isLeadStale(lead, NOW).stale).toBe(false);
  });

  test('archived leads never fire', () => {
    const lead: LeadLike = { id: 'l1', pipelineStage: 'engage', updatedAt: daysAgo(30), archived: true };
    expect(isLeadStale(lead, NOW).stale).toBe(false);
  });

  test('closed-won leads have no timer (no SLA entry)', () => {
    const lead: LeadLike = { id: 'l1', pipelineStage: 'closed-won', updatedAt: daysAgo(90) };
    expect(isLeadStale(lead, NOW).stale).toBe(false);
    expect(STALE_STAGE_DAYS['closed-won']).toBeUndefined();
  });

  test('missing updatedAt counts as infinitely stale (old rows need a look)', () => {
    expect(daysSinceTouch({ id: 'l1' }, NOW)).toBe(Number.POSITIVE_INFINITY);
    expect(isLeadStale({ id: 'l1', pipelineStage: 'inbound' }, NOW).stale).toBe(true);
  });
});

describe('lead timers — dedupe & drafts', () => {
  const staleLead: LeadLike = { id: 'l1', pipelineStage: 'negotiate', fullName: 'Ahmed Al-Rashid', updatedAt: daysAgo(10) };
  const freshLead: LeadLike = { id: 'l2', pipelineStage: 'inbound', fullName: 'Sara', updatedAt: daysAgo(1) };

  test('lead with an open followup is skipped', () => {
    const followups: FollowupLike[] = [{ leadId: 'l1', status: 'pending', dueAt: daysAgo(-1) }];
    expect(hasOpenFollowup('l1', followups)).toBe(true);
    expect(selectStaleLeads([staleLead], followups, NOW)).toEqual([]);
  });

  test('completed/cancelled followups do not block a new timer', () => {
    const followups: FollowupLike[] = [{ leadId: 'l1', status: 'completed' }, { leadId: 'l1', status: 'cancelled' }];
    const drafts = selectStaleLeads([staleLead], followups, NOW);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].leadId).toBe('l1');
  });

  test('draft quotes the REAL stage and REAL days (no invented urgency)', () => {
    const drafts = selectStaleLeads([staleLead, freshLead], [], NOW);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toContain('Ahmed Al-Rashid');
    expect(drafts[0].title).toContain('"negotiate"');
    expect(drafts[0].title).toContain('10 day');
    expect(drafts[0].notes).toContain('SLA 7 day');
    expect(drafts[0].type).toBe('whatsapp'); // negotiate → WhatsApp cadence
  });

  test('pre-viewing stages create call followups; viewing is urgent priority', () => {
    const call = buildTimerFollowup({ id: 'l1', pipelineStage: 'qualify', updatedAt: daysAgo(6) }, 6, 'qualify')!;
    expect(call.type).toBe('call');
    const viewing = buildTimerFollowup({ id: 'l2', pipelineStage: 'viewing', updatedAt: daysAgo(3) }, 3, 'viewing')!;
    expect(viewing.priority).toBe('urgent');
  });

  test('unknown stages produce no draft', () => {
    expect(buildTimerFollowup({ id: 'l1', pipelineStage: 'closed-won' }, 9, 'closed-won')).toBeNull();
  });
});

describe('lead timers — overdue flip', () => {
  test('only pending followups past due flip', () => {
    const followups: (FollowupLike & { id: string })[] = [
      { id: 'f1', leadId: 'l1', status: 'pending', dueAt: daysAgo(2) }, // overdue
      { id: 'f2', leadId: 'l1', status: 'pending', dueAt: daysAgo(-2) }, // future due
      { id: 'f3', leadId: 'l1', status: 'completed', dueAt: daysAgo(5) }, // already done
      { id: 'f4', leadId: 'l1', status: 'overdue', dueAt: daysAgo(5) }, // already flipped
    ];
    expect(selectOverdueFollowups(followups, NOW)).toEqual(['f1']);
  });
});

describe('migration 016 contract (CRM unification)', () => {
  const fs = require('fs');
  const path = require('path');
  let sql: string;

  beforeAll(() => {
    sql = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20261001_016_crm_pipeline_unification.sql'), 'utf8');
  });

  test('pipeline_stage → status mapping covers the canonical 10 stages', () => {
    const pairs: Record<string, string> = {
      inbound: 'new',
      qualify: 'qualified',
      engage: 'contacted',
      proposal: 'contacted',
      viewing: 'viewing_scheduled',
      negotiate: 'negotiating',
      reserve: 'negotiating',
      contract: 'negotiating',
      handover: 'negotiating',
      'closed-won': 'won',
    };
    for (const [stage, status] of Object.entries(pairs)) {
      expect(sql).toMatch(new RegExp(`WHEN '${stage}'\\s+THEN '${status}'`));
    }
  });

  test("legacy 'Viewing Requested' is normalized BEFORE the CHECK is swapped", () => {
    const normalizeIdx = sql.indexOf("WHERE status = 'Viewing Requested'");
    const checkIdx = sql.indexOf('ADD CONSTRAINT leads_status_check');
    expect(normalizeIdx).toBeGreaterThan(-1);
    expect(checkIdx).toBeGreaterThan(normalizeIdx);
  });

  test('narrowed CHECK drops the free-form value', () => {
    const checkBlock = sql.slice(sql.indexOf('ADD CONSTRAINT leads_status_check'));
    expect(checkBlock).toContain("'viewing_scheduled'");
    expect(checkBlock).not.toContain("'Viewing Requested'");
  });

  test('both triggers exist and the audit trigger is SECURITY DEFINER with pinned search_path', () => {
    expect(sql).toMatch(/CREATE TRIGGER trigger_leads_status_sync/);
    expect(sql).toMatch(/CREATE TRIGGER trigger_leads_stage_audit/);
    const auditFn = sql.slice(sql.indexOf('audit_lead_stage_transition'));
    expect(auditFn).toMatch(/SECURITY DEFINER/);
    expect(auditFn).toMatch(/SET search_path = public/);
  });

  test('the audit trigger reuses orchestration_history (no new table)', () => {
    expect(sql).toMatch(/INSERT INTO public\.orchestration_history/);
    expect(sql).not.toMatch(/CREATE TABLE/);
  });

  test('migration 016 app mirror is byte-identical (add-both rule)', () => {
    const mirror = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20261001_016_crm_pipeline_unification.sql'));
    expect(Buffer.from(sql).equals(mirror)).toBe(true);
  });
});

describe('canonical status writers', () => {
  const fs = require('fs');
  const path = require('path');

  test("no app code writes the legacy 'Viewing Requested' status anymore", () => {
    const appDir = path.resolve(__dirname, '../app');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const src = fs.readFileSync(p, 'utf8');
          if (src.includes("'Viewing Requested'") && !p.includes('__tests__')) offenders.push(p);
        }
      }
    };
    walk(appDir);
    expect(offenders).toEqual([]);
  });

  test('lead PATCH handler records the actor on stage changes (audit_logs)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/api/admin/leads/[id]/route.ts'), 'utf8');
    expect(src).toMatch(/lead\.stage_change/);
    expect(src).toMatch(/actorUid/);
  });
});
