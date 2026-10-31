/**
 * GET /api/admin/overview  (staff — ADMIN_CONSOLE_ROLES)
 *
 * Single aggregate endpoint behind the Unified Admin Command Center's main
 * dashboard (/admin). Returns the five headline KPI widgets plus the supporting
 * context they link into, all computed from real Supabase rows (anti-fabrication:
 * an empty database renders honest zeros, never seeded demo numbers):
 *
 *   1. Total Deals Value      — SUM(deals.deal_value) over non-closed deals
 *   2. Active Leads           — leads not archived / won / lost
 *   3. Verified Properties    — PUBLISHABLE, non-stale public inventory
 *   4. Inventory Freshness %  — AVG(listings.freshness_score) (migration 037)
 *   5. Active Bot Status      — system_status heartbeat roll-up (10-bot fleet)
 *
 * Plus: pipeline value by deal stage (feeds the overview's pipeline strip),
 * the recent operational activity feed (public.activities) and the 24h inbound
 * webhook ledger stats (public.webhook_logs — migration 037).
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import { DEAL_STAGES, CLOSED_STAGES } from '@/lib/server/deal-stages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

/** numeric columns come back from Postgres as strings — normalize to number. */
function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function toMillis(v: unknown): number | null {
  if (!v) return null;
  const t = typeof v === 'string' ? Date.parse(v) : Number(v);
  return Number.isFinite(t) ? t : null;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    // Heavy columns (pgvector embeddings, photo arrays) are never selected —
    // same optimization contract as /api/admin/dashboard. Every read is also
    // fail-soft: a pending migration degrades that widget to zero instead of
    // taking the whole dashboard down (the Phase 12 degradation contract).
    const [dealsRows, leadsRows, listingsRows, botsRows, activityRows, webhookRows] =
      await Promise.all([
        listRecords('deals', {
          select: 'id,stage,dealValue,commissionAmount,updatedAt',
          limit: 5000,
          orderBy: { column: 'updatedAt', ascending: false },
        }).catch(() => [] as Record<string, unknown>[]),
        listRecords('leads', {
          select: 'id,status,archived,leadScore,pipelineStage,createdAt',
          limit: 5000,
        }).catch(() => [] as Record<string, unknown>[]),
        listRecords('listings', {
          select: 'id,status,publishStatus,stale,freshnessScore,verified',
          limit: 20000,
        }).catch(() => [] as Record<string, unknown>[]),
        listRecords('system_status', {
          select: 'id,status,lastPulse,enabled,stats',
          limit: 100,
        }).catch(() => [] as Record<string, unknown>[]),
        listRecords('activities', {
          select: 'id,type,actorName,description,text,color,relatedId,relatedType,createdAt',
          limit: 10,
          orderBy: { column: 'createdAt', ascending: false },
        }).catch(() => [] as Record<string, unknown>[]),
        listRecords('webhook_logs', {
          select: 'id,source,status,createdAt',
          limit: 5000,
          orderBy: { column: 'createdAt', ascending: false },
        }).catch(() => [] as Record<string, unknown>[]),
      ]);

    // ── KPI 1: Total deals value (active pipeline) ─────────────────────────
    let totalDealsValue = 0;
    let closedWonValue = 0;
    let activeDealsCount = 0;
    const pipelineByStage: Record<string, { value: number; count: number }> = {};
    for (const stage of DEAL_STAGES) pipelineByStage[stage] = { value: 0, count: 0 };

    for (const row of dealsRows) {
      const stage = String(row.stage ?? 'proposal');
      const value = num(row.dealValue);
      const bucket = pipelineByStage[stage] ?? (pipelineByStage[stage] = { value: 0, count: 0 });
      bucket.value += value;
      bucket.count += 1;
      if ((CLOSED_STAGES as readonly string[]).includes(stage)) {
        if (stage === 'closed_won') closedWonValue += value;
      } else {
        totalDealsValue += value;
        activeDealsCount += 1;
      }
    }

    // ── KPI 2: Active leads ────────────────────────────────────────────────
    const now = Date.now();
    let activeLeads = 0;
    let newLeads7d = 0;
    let hotLeads = 0;
    for (const row of leadsRows) {
      const status = String(row.status ?? 'new');
      if (row.archived === true) continue;
      if (status === 'won' || status === 'lost') continue;
      activeLeads += 1;
      if (num(row.leadScore) >= 80) hotLeads += 1;
      const created = toMillis(row.createdAt);
      if (created !== null && now - created <= 7 * DAY_MS) newLeads7d += 1;
    }

    // ── KPI 3 + 4: Verified properties & inventory freshness ────────────────
    let verifiedProperties = 0;
    let staleListings = 0;
    let freshnessSum = 0;
    let freshnessCount = 0;
    let freshOver90 = 0;
    for (const row of listingsRows) {
      const publishable = String(row.publishStatus ?? '') === 'PUBLISHABLE';
      const status = String(row.status ?? '');
      if (publishable && !row.stale && (status === 'active' || status === 'available')) {
        verifiedProperties += 1;
      }
      if (row.stale === true) staleListings += 1;
      const score = row.freshnessScore;
      if (typeof score === 'number' && Number.isFinite(score)) {
        freshnessSum += score;
        freshnessCount += 1;
        if (score >= 90) freshOver90 += 1;
      }
    }
    const inventoryFreshnessScore = freshnessCount
      ? Math.round(freshnessSum / freshnessCount)
      : 0;

    // ── KPI 5: Bot fleet status ────────────────────────────────────────────
    let botsActive = 0;
    let botsErroring = 0;
    let botsEnabled = 0;
    const botStatuses = botsRows.map((row) => {
      const status = String(row.status ?? 'idle');
      if (row.enabled !== false) {
        botsEnabled += 1;
        if (status === 'active' || status === 'syncing') botsActive += 1;
        if (status === 'error') botsErroring += 1;
      }
      return {
        id: String(row.id ?? ''),
        status,
        enabled: row.enabled !== false,
        lastPulse: toMillis(row.lastPulse),
      };
    });

    // ── Webhook ledger (24h) ────────────────────────────────────────────────
    let webhookTotal24h = 0;
    let webhookWhatsapp24h = 0;
    let webhookTelegram24h = 0;
    let webhookErrors24h = 0;
    for (const row of webhookRows) {
      const created = toMillis(row.createdAt);
      if (created === null || now - created > DAY_MS) continue;
      webhookTotal24h += 1;
      const source = String(row.source ?? '');
      if (source === 'whatsapp') webhookWhatsapp24h += 1;
      if (source === 'telegram') webhookTelegram24h += 1;
      if (String(row.status ?? '') === 'error') webhookErrors24h += 1;
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      kpis: {
        totalDealsValue,
        activeDealsCount,
        closedWonValue,
        activeLeads,
        newLeads7d,
        hotLeads,
        verifiedProperties,
        totalListings: listingsRows.length,
        staleListings,
        inventoryFreshnessScore,
        freshOver90,
        bots: {
          total: botStatuses.length,
          enabled: botsEnabled,
          active: botsActive,
          erroring: botsErroring,
        },
      },
      pipelineByStage: DEAL_STAGES.map((stage) => ({ stage, ...pipelineByStage[stage] })),
      botStatuses,
      recentActivity: activityRows,
      webhookStats: {
        last24h: {
          total: webhookTotal24h,
          whatsapp: webhookWhatsapp24h,
          telegram: webhookTelegram24h,
          errors: webhookErrors24h,
        },
      },
    });
  } catch (error) {
    logger.error('[ADMIN_OVERVIEW_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to compute command center overview.' },
      { status: 500 },
    );
  }
}
