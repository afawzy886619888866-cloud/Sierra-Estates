/**
 * POST /api/admin/bots/run — manual workflow execution for the AI COO &
 * 10-Bot Operations Desk (/admin/bots).
 *
 * The desk's Scribe / Curator / Stage-9 Closer / Matchmaker buttons land here.
 * Unlike /api/admin/bots (which only relays commands into system_status docs
 * for externally hosted workers), this endpoint EXECUTES the workflow
 * server-side against Supabase, so the operators get real work done from the
 * console even when the external agent fleet is idle:
 *
 *   scribe      — drains unreviewed public.raw_feed rows: neural parse via
 *                 WhatsAppParserService when GOOGLE_AI_API_KEY is configured,
 *                 deterministic regex extraction otherwise (only what the
 *                 message actually carries — §21 no-fabrication). Marks rows
 *                 reviewed and stores extracted_data.
 *   curator     — runs the public.refresh_all_listing_freshness() RPC
 *                 (migration 037): freshness recompute + 30-day stale SLA.
 *   closer      — Stage-9 closer: finds late-pipeline leads gone quiet,
 *                 creates high-priority followups and queues the WhatsApp
 *                 nudge through the production dispatch queue (capped at 10
 *                 messages per run so a button click can never blast the
 *                 whole book).
 *   matchmaker  — bulk-runs the AI matching engine (lib/services/matching-
 *                 engine) over the newest new/contacted leads.
 *
 * Every run is ledgered in public.bot_runs, heartbeats public.system_status
 * for the matching agent id (so the desk's fleet cards stay truthful) and
 * appends to the public.activities feed the overview dashboard renders.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getRecord,
  getSupabaseAdmin,
  insertRecord,
  listRecords,
  updateRecord,
  upsertRecord,
} from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';
import { LATE_STAGES } from '@/lib/crm-stages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const runSchema = z.object({
  workflow: z.enum([
    'scribe',
    'curator',
    'closer',
    'matchmaker',
    'engine1_partition',
    'engine2_harvester',
    'engine3_valuation',
    'engine4_outreach',
  ]),
});

/** Bot ids match /api/admin/bots' KNOWN_BOTS so fleet status stays unified. */
const BOT_IDS = {
  scribe: 'scribe-agent',
  curator: 'curator-agent',
  closer: 'closer-agent',
  matchmaker: 'matchmaker-agent',
  engine1_partition: 'memory-engine-bot',
  engine2_harvester: 'harvester-gis-bot',
  engine3_valuation: 'valuation-harness-bot',
  engine4_outreach: 'openclaw-closer-bot',
} as const;

type WorkflowName = keyof typeof BOT_IDS;

const DAY_MS = 86_400_000;

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function toMillis(v: unknown): number | null {
  if (!v) return null;
  const t = typeof v === 'string' ? Date.parse(v) : Number(v);
  return Number.isFinite(t) ? t : null;
}

// ─── Deterministic extraction fallback (no AI key required) ────────────────
/** Egyptian real-estate message patterns — extracts ONLY what is present. */
function regexExtract(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = { isListing: false, needsReview: true, via: 'regex-fallback' };

  const price = raw.match(/(?:EGP\s*)?([0-9][0-9,.]*)\s*(مليون|m\b|M\b|million)/i);
  if (price) {
    const millions = parseFloat(price[1].replace(/,/g, ''));
    if (Number.isFinite(millions)) out.price = millions >= 1000 ? millions : millions * 1_000_000;
  } else {
    const direct = raw.match(/([0-9][0-9,.]{5,})/);
    if (direct) out.price = parseFloat(direct[1].replace(/,/g, '')) || undefined;
  }

  const beds = raw.match(/(\d)\s*(?:bed|bd|br|غرف|غرفه|sleeps)/i);
  if (beds) out.bedrooms = parseInt(beds[1], 10);

  const area = raw.match(/([0-9]{2,4})\s*(sqm|m2|m²|متر|م²)/i);
  if (area) out.area = parseInt(area[1], 10);

  const phone = raw.match(/(\+?2?01[0-9]{9})/);
  if (phone) out.phone = phone[1];

  const type = raw.match(/\b(villa|apartment|duplex|penthouse|townhouse|studio|chalet|office|land)\b/i);
  if (type) out.type = type[1].toLowerCase();

  const compound = raw.match(/\b(?:in|at|في)\s+([A-Z][A-Za-z'’]+(?:\s[A-Z][A-Za-z'’]+)?)/);
  if (compound) out.compound = compound[1];

  if (out.price !== undefined || out.bedrooms !== undefined || out.area !== undefined) {
    out.isListing = true;
  }
  return out;
}

// ─── Workflow implementations ──────────────────────────────────────────────

async function runScribe(): Promise<Record<string, number>> {
  const rows = (await listRecords('raw_feed', {
    select: 'id,rawText,extractedData',
    where: [{ column: 'isReviewed', value: false }],
    limit: 20,
    orderBy: { column: 'createdAt', ascending: true },
  })) as Record<string, unknown>[];

  let processed = 0;
  let listings = 0;
  let errors = 0;
  let neural = 0;

  for (const row of rows) {
    try {
      let extracted: Record<string, unknown>;
      try {
        const { WhatsAppParserService } = await import('@/lib/services/WhatsAppParserService');
        extracted = (await WhatsAppParserService.parseMessage(String(row.rawText ?? ''))) as Record<
          string,
          unknown
        >;
        neural += 1;
      } catch {
        // No GOOGLE_AI_API_KEY (or provider error) — deterministic extraction.
        extracted = regexExtract(String(row.rawText ?? ''));
      }
      if (extracted?.isListing === true) listings += 1;
      await updateRecord('raw_feed', String(row.id), {
        extractedData: extracted,
        isReviewed: true,
      });
      processed += 1;
    } catch (err) {
      errors += 1;
      logger.warn('[SCRIBE_ROW_FAILED]', err instanceof Error ? err.message : err);
    }
  }

  return { processed, listings, errors, neuralParses: neural, regexParses: processed - neural };
}

async function runCurator(): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseAdmin().rpc('refresh_all_listing_freshness');
  if (error) throw new Error(`Curator RPC failed: ${error.message}`);
  const stats = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    refreshed: num(stats?.refreshed),
    avgFreshness: num(stats?.avg_freshness),
    freshOver90: num(stats?.fresh_over_90),
    staleFlagged: num(stats?.stale_flagged),
  };
}

async function runCloser(): Promise<Record<string, number>> {
  const STALE_AFTER_MS = 3 * DAY_MS;
  const MAX_MESSAGES = 10;

  const rows = (await listRecords('leads', {
    select: 'id,fullName,phone,pipelineStage,status,updatedAt,summaryNotes',
    where: [
      { column: 'pipelineStage', op: 'in', value: [...LATE_STAGES] },
      { column: 'archived', value: false },
    ],
    limit: 200,
    orderBy: { column: 'updatedAt', ascending: true },
  })) as Record<string, unknown>[];

  const now = Date.now();
  const quiet = rows.filter((row) => {
    const updated = toMillis(row.updatedAt);
    return updated !== null && now - updated >= STALE_AFTER_MS && row.status !== 'won';
  });

  let followupsCreated = 0;
  let messagesQueued = 0;

  for (const row of quiet.slice(0, MAX_MESSAGES)) {
    const leadId = String(row.id);
    const name = String(row.fullName ?? 'client');
    const phone = String(row.phone ?? '').trim();

    try {
      await insertRecord('followups', {
        leadId,
        type: 'whatsapp',
        title: `Stage-9 closer follow-up — ${name}`,
        notes:
          'Auto-created by the Stage-9 Closer workflow: late-pipeline lead quiet for 3+ days. ' +
          'Confirm outstanding paperwork, payment or registration blockers and drive to handover.',
        dueAt: new Date(now + DAY_MS).toISOString(),
        status: 'pending',
        priority: 'high',
        createdBy: 'closer-agent',
      });
      followupsCreated += 1;

      if (phone) {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: phone,
          toName: name,
          body:
            `Good news, ${name.split(' ')[0] || 'there'} — your Sierra Estates file is at the final stage. ` +
            'Your consultant is ready to complete the paperwork and schedule your key handover. ' +
            'Reply here to pick a time this week.',
          leadId,
          metadata: { flow: 'stage9-closer', pipelineStage: row.pipelineStage },
        });
        messagesQueued += 1;
      }
    } catch (err) {
      logger.warn('[CLOSER_LEAD_FAILED]', err instanceof Error ? err.message : err);
    }
  }

  return { leadsExamined: rows.length, quietLateStage: quiet.length, followupsCreated, messagesQueued };
}

async function runMatchmaker(): Promise<Record<string, number>> {
  const { runMatchingForLead } = await import('@/lib/services/matching-engine');
  const rows = (await listRecords('leads', {
    select: 'id',
    where: [{ column: 'status', op: 'in', value: ['new', 'contacted'] }],
    limit: 5,
    orderBy: { column: 'createdAt', ascending: false },
  })) as Record<string, unknown>[];

  let processed = 0;
  let matched = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const matches = await runMatchingForLead(String(row.id));
      processed += 1;
      if (matches.length > 0) matched += 1;
    } catch (err) {
      errors += 1;
      logger.warn('[MATCHMAKER_LEAD_FAILED]', err instanceof Error ? err.message : err);
    }
  }

  return { leadsPicked: rows.length, processed, withMatches: matched, errors };
}

async function triggerRunnerWorkflow(slug: string): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  const runnerUrl = (process.env.WORKFLOW_OPS_URL || 'http://127.0.0.1:2786').replace(/\/+$/, '');
  const apiKey = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
  try {
    const res = await fetch(`${runnerUrl}/api/workflows/${encodeURIComponent(slug)}/run`, {
      method: 'POST',
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false };
  }
}

async function runEngine1Partition(): Promise<Record<string, number>> {
  try {
    const runnerRes = await triggerRunnerWorkflow('contact-partitioner');
    if (runnerRes.ok) {
      return {
        runnerDispatched: 1,
        status: 1,
      };
    }
    const pathMod = await import('node:path');
    const fsMod = await import('node:fs');
    const candidates = [
      pathMod.resolve(process.cwd(), '../../workflows/09-owner-outreach/contact-partitioner.js'),
      pathMod.resolve(process.cwd(), 'workflows/09-owner-outreach/contact-partitioner.js'),
    ];
    const targetScript = candidates.find((p) => fsMod.existsSync(p));
    if (!targetScript) {
      return { totalAssigned: 0, error: 1 };
    }
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    const { partitionOwnerContacts } = req(targetScript) as {
      partitionOwnerContacts: () => Promise<{ totalAssigned?: number; totalReadyLines?: number; targetDailyCap?: number }>;
    };
    const res = await partitionOwnerContacts();
    return {
      totalAssigned: res.totalAssigned ?? 0,
      readyLines: res.totalReadyLines ?? 0,
      targetDailyCap: res.targetDailyCap ?? 0,
    };
  } catch (err) {
    logger.warn('[ENGINE1_PARTITION_FAILED]', err);
    return { totalAssigned: 0, error: 1 };
  }
}

async function runEngine2Harvester(): Promise<Record<string, number>> {
  const gwUrl = (process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785').replace(/\/+$/, '');
  const gwKey = process.env.OPENWA_ADMIN_API_KEY || process.env.WHATSAPP_API_KEY || '';
  let scrapedMessages = 0;
  let unitsHarvested = 0;
  let matchedGroups = 0;

  try {
    const scrapeRes = await fetch(`${gwUrl}/api/scrape-named-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gwKey ? { 'x-api-key': gwKey } : {}),
      },
      body: JSON.stringify({ queries: ['data', 'داتا ايمان', 'ايمان'], limit: 500 }),
      signal: AbortSignal.timeout(25000),
    });
    if (scrapeRes.ok) {
      const json = (await scrapeRes.json().catch(() => ({}))) as {
        results?: { matchedGroups?: unknown[]; totalMessagesScraped?: number; unitsHarvested?: number };
      };
      matchedGroups = Array.isArray(json.results?.matchedGroups) ? json.results.matchedGroups.length : 0;
      scrapedMessages = num(json.results?.totalMessagesScraped);
      unitsHarvested = num(json.results?.unitsHarvested);
    }
  } catch (err) {
    logger.warn('[ENGINE2_SCRAPE_WARN]', err instanceof Error ? err.message : err);
  }

  await triggerRunnerWorkflow('whatsapp-scraper');
  const scribeStats = await runScribe();

  return {
    matchedGroups,
    scrapedMessages,
    unitsHarvested,
    rawFeedProcessed: scribeStats.processed ?? 0,
  };
}

async function runEngine3Valuation(): Promise<Record<string, number>> {
  const { evaluatePropertyValuation } = await import('@/lib/valuationArbitrageEngine');
  const listings = (await listRecords('listings', {
    select: 'id, price, bedrooms, areaSqm, compound, propertyType, dealType',
    limit: 100,
  })) as Record<string, unknown>[];

  let evaluated = 0;
  let arbitrageGems = 0;
  const supabase = getSupabaseAdmin();

  for (const row of listings) {
    const price = num(row.price);
    if (price <= 0) continue;
    try {
      const dealType = String(row.dealType ?? 'sale').toLowerCase() === 'rent' ? 'Rent' : 'Sale';
      const val = evaluatePropertyValuation({
        property_type: String(row.propertyType || 'residential'),
        transaction_type: dealType,
        offered_purchase_price: dealType === 'Sale' ? price : undefined,
        offered_rent: dealType === 'Rent' ? price : undefined,
        size_sqm: num(row.areaSqm) || undefined,
        location: String(row.compound || row.locationArea || 'Unspecified'),
      });
      evaluated += 1;
      const isGem = Boolean(val.investment_metrics?.is_arbitrage_play);
      if (isGem) arbitrageGems += 1;
      const fairPrice = Math.round(
        ((val.calculated_fair_value_range?.premium_adjusted_conservative || 0) +
          (val.calculated_fair_value_range?.premium_adjusted_optimistic || 0)) / 2,
      );
      if (fairPrice > 0 && row.id) {
        await supabase
          .from('listings')
          .update({
            ai_fair_price: fairPrice,
            is_featured_gem: isGem,
          })
          .eq('id', String(row.id));
      }
    } catch (_) {}
  }

  return { evaluatedListings: evaluated, arbitrageGemsFound: arbitrageGems, totalScanned: listings.length };
}

async function runEngine4Outreach(): Promise<Record<string, number>> {
  const gwUrl = (process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785').replace(/\/+$/, '');
  let readyLines = 0;
  try {
    const res = await fetch(`${gwUrl}/api/sessions`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const sess = await res.json();
      readyLines = Array.isArray(sess) ? sess.filter((s: { status?: string }) => s.status === 'ready').length : 0;
    }
  } catch (_) {}

  let enqueuedCount = 0;
  try {
    const { OwnerOutreachService } = await import('@/lib/services/OwnerOutreachService');
    const batch = await OwnerOutreachService.enqueueBatch({ batchSize: Math.max(25, readyLines * 25) });
    enqueuedCount = batch.enqueuedCount;
  } catch (err) {
    logger.warn('[ENGINE4_ENQUEUE_WARN]', err instanceof Error ? err.message : err);
  }

  const runnerOutreach = await triggerRunnerWorkflow('owner-outreach');

  return {
    readyLines,
    enqueuedOwners: enqueuedCount,
    runnerDispatched: runnerOutreach.ok ? 1 : 0,
  };
}

const WORKFLOWS: Record<WorkflowName, () => Promise<Record<string, number>>> = {
  scribe: runScribe,
  curator: runCurator,
  closer: runCloser,
  matchmaker: runMatchmaker,
  engine1_partition: runEngine1Partition,
  engine2_harvester: runEngine2Harvester,
  engine3_valuation: runEngine3Valuation,
  engine4_outreach: runEngine4Outreach,
};

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  let workflow: WorkflowName;
  try {
    const parsed = runSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid workflow.' },
        { status: 400 },
      );
    }
    workflow = parsed.data.workflow;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const startedAt = Date.now();
  let runId: string | null = null;

  // Ledger the run before executing — the desk shows 'running' truthfully.
  try {
    const run = await insertRecord<{ id: string }>('bot_runs', {
      botName: BOT_IDS[workflow],
      status: 'running',
      taskType: `manual:${workflow}`,
    });
    runId = run?.id ?? null;
  } catch (err) {
    logger.warn('[BOT_RUN_LEDGER_FAILED]', err instanceof Error ? err.message : err);
  }

  try {
    const metrics = await WORKFLOWS[workflow]();
    const durationMs = Date.now() - startedAt;

    if (runId) {
      await updateRecord('bot_runs', runId, {
        status: 'completed',
        metrics: { ...metrics, durationMs },
        lastRunAt: new Date().toISOString(),
      }).catch(() => undefined);
    }

    // Heartbeat the fleet card so /admin/bots and /api/admin/bots agree.
    const botId = BOT_IDS[workflow];
    try {
      const statusRow = await getRecord<Record<string, unknown>>('system_status', botId);
      const stats = (statusRow?.stats as Record<string, unknown> | undefined) ?? {};
      await upsertRecord('system_status', {
        id: botId,
        status: 'active',
        lastPulse: new Date().toISOString(),
        lastCommand: `run_now:${workflow}`,
        lastCommandAt: new Date().toISOString(),
        lastCommandBy: auth.email ?? auth.uid ?? 'command-center',
        stats: {
          ...stats,
          processedToday: num(stats.processedToday) + (metrics.processed ?? metrics.refreshed ?? metrics.followupsCreated ?? 0),
          lastWorkflow: workflow,
          lastWorkflowAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.warn('[BOT_HEARTBEAT_FAILED]', err instanceof Error ? err.message : err);
    }

    try {
      await insertRecord('activities', {
        type: `bot_${workflow}_run`,
        actorId: auth.uid ?? 'system',
        actorName: auth.email ?? 'Command Center',
        description: `${botId} manual run completed in ${durationMs}ms — ${JSON.stringify(metrics)}`,
        relatedType: 'bot',
        relatedId: botId,
        text: `${botId} run · ${Object.entries(metrics)
          .map(([k, v]) => `${k}:${v}`)
          .join(' · ')}`,
        color: 'var(--gold-luxury)',
      });
    } catch {
      // Activity feed is best-effort.
    }

    return NextResponse.json({
      success: true,
      workflow,
      botId,
      durationMs,
      metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[ADMIN_BOT_RUN_ERROR]', error);
    if (runId) {
      await updateRecord('bot_runs', runId, {
        status: 'error',
        metrics: { error: message.slice(0, 500), durationMs: Date.now() - startedAt },
        lastRunAt: new Date().toISOString(),
      }).catch(() => undefined);
    }
    return NextResponse.json(
      { error: `Workflow ${workflow} failed: ${message}` },
      { status: 500 },
    );
  }
}
