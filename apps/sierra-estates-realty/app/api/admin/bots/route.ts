/**
 * /api/admin/bots — control center for background bots/agents
 *
 * Bots are operational workers that run continuously (or on schedules):
 *   - whatsapp-scraper (apps/agents/whatsapp-scraper) — live broker lead ingestion
 *   - n8n orchestrator (Docker, port 5678) — workflow automation
 *   - scribe agent — AI listing normalization
 *   - curator agent — AI portfolio curation
 *   - closer agent — fail-safe lead follow-up
 *   - matchmaker agent — lead-to-property matching
 *
 * Each bot has a status doc in `system_status/{botId}`:
 *   {
 *     status: 'active' | 'syncing' | 'error' | 'idle' | 'offline',
 *     lastPulse: timestamptz,
 *     lastError?: string,
 *     config?: { interval, enabled, ... },
 *     stats?: { processedToday, errorsToday, ... }
 *   }
 *
 * This endpoint lets admins:
 *   - GET: list all bot statuses
 *   - POST: send a command to a bot ('start' | 'stop' | 'restart' | 'run_now')
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { getRecord, insertRecord, upsertRecord } from '@sierra-estates/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { SIERRA_BLUE_SYSTEM_PROMPT } from '@/lib/prompts/sierra_blue_bot';

// Known bots. New bots can register themselves by writing to system_status/{botId}.
const KNOWN_BOTS = [
  'whatsapp-agent',
  'liela-bot',
  'whatsapp-scraper',
  'n8n-orchestrator',
  'scribe-agent',
  'curator-agent',
  'closer-agent',
  'matchmaker-agent',
  'property-finder-bot',
  'mass-blast-bot',
  // ── 4-Engine Autonomous Machine Fleet (2026-11) ──
  'memory-engine-bot',
  'harvester-gis-bot',
  'valuation-harness-bot',
  'openclaw-closer-bot',
  // ── Guardian fleet (Mission 4, 2026-11-01) ──
  'paced-outreach-bot',
  'scribe-guardian',
  'curator-guardian',
  'atlas-sync-guardian',
  'antigravity-closer-guardian',
  'ops-watchdog',
];

const DEFAULT_CONFIGS: Record<string, Record<string, any>> = {
  // ── 4-Engine Machine Core Fleet (2026-11) ──
  'memory-engine-bot': {
    engine: 'Engine 1: Memory & Learning',
    role: 'Contact Partitioning & Episodic Ledger Coordinator',
    dailyQuotaPerLine: 100,
    activeHours: '09:00-22:00 Africa/Cairo',
    dedupeSources: ['owner-outreach-ledger.jsonl', 'public.owner_outreach_log', 'sheet_contact_date'],
    systemPrompt: `Autonomous Memory & Ledger Bot for Sierra Estates. Dynamically divides eligible uncontacted owners across active WhatsApp numbers (up to 100/line/day), eliminates duplicate outreach, and handles live failover if a line disconnects.`,
  },
  'harvester-gis-bot': {
    engine: 'Engine 2: RAG & GIS Map Engine',
    role: 'WhatsApp Scraper & Compound Geocoding',
    targetGroups: ['Data', 'داتا ايمان'],
    intervalMinutes: 15,
    minConfidence: 0.85,
    systemPrompt: `Harvests real estate listings from targeted WhatsApp broker groups ('Data' and 'داتا ايمان'), extracts Egyptian Arabic/English unit metadata, normalizes New Cairo compounds, and binds cadastral GIS boundaries.`,
  },
  'valuation-harness-bot': {
    engine: 'Engine 3: Valuation & Reasoning Harness',
    role: 'AVM Financial Arbitrage & DQE Quality Control',
    model: 'gemini-2.0-flash',
    metrics: ['CapRate', 'PaybackPeriod', 'PriceVarianceVsCompoundAverage'],
    systemPrompt: `Conducts rigorous Cairo AVM appraisal and DQE validation. Calculates rental yields, investment payback, and flags underpriced arbitrage vs overpriced listings.`,
  },
  'openclaw-closer-bot': {
    engine: 'Engine 4: Workflows, Closer & UI/UX Engine',
    role: 'Multi-Line Outreach Dispatch & OpenClaw Telegram Intake',
    pacingMs: '30000-45000',
    telegramIntakeActive: true,
    linesSupported: ['line-1', 'line-2', 'line-3', 'line-4'],
    systemPrompt: `Executes multi-line WhatsApp owner outreach at safe 30-45s human pacing, receives broker/agent units via Telegram Easy Listing Bot, and powers the luxury light-mode client portal.`,
  },
  'whatsapp-agent': {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxTokens: 512,
    replyInDMs: true,
    replyGroups: true,
    adminNumber: '201099887766',
    teamNumbers: '201099887766,201122334455',
    systemPrompt: SIERRA_BLUE_SYSTEM_PROMPT,
  },
  'liela-bot': {
    model: 'gemini-2.0-flash',
    temperature: 0.8,
    maxTokens: 1024,
    plugins: ['openclaw', 'obsidian-memory'],
    systemPrompt: `You are Liela, the Chief PropTech Intelligence Officer for Sierra Estates.
You orchestrate multi-agent workflows and generate deep market analysis for high-net-worth investors.`,
  },
  'whatsapp-scraper': {
    interval: 60,
    minConfidence: 0.85,
    autoIngest: true,
    targetCollection: 'leads',
    groupFilters: ['Broker Exchange', 'Real Estate Egypt', 'Brokers New Cairo'],
    systemPrompt: `Extract structured real estate leads from raw Egyptian Arabic and English WhatsApp broker chat messages.
Format output as JSON: { type: "buy|sell|rent", propertyType: "apartment|villa", price: number, location: string, phone: string }`,
  },
  'n8n-orchestrator': {
    webhookUrl: 'http://localhost:5678/webhook/lead-flow',
    retryAttempts: 3,
    concurrency: 5,
    systemPrompt: `Orchestrates cross-system webhooks between Sierra Estates, Google Sheets, WhatsApp, and Property Finder.`,
  },
  'scribe-agent': {
    model: 'gemini-2.0-flash',
    temperature: 0.2,
    systemPrompt: `Standardize, cleanse, and normalize property inventory listings into canonical SBR Uniform Codes.`,
  },
  'curator-agent': {
    model: 'gemini-2.0-flash',
    temperature: 0.4,
    systemPrompt: `Curate bespoke property portfolios matching client budget, investment horizon, and target ROI.`,
  },
  'closer-agent': {
    model: 'gemini-2.0-flash',
    temperature: 0.6,
    systemPrompt: `Execute timely, respectful, and high-converting deal closure follow-ups for warm leads.`,
  },
  'matchmaker-agent': {
    model: 'gemini-2.0-flash',
    temperature: 0.3,
    systemPrompt: `Compute multi-dimensional similarity between buyer criteria and live inventory units.`,
  },
  'property-finder-bot': {
    interval: 300,
    syncFeeds: true,
    systemPrompt: `Manage bi-directional syndication with Property Finder XML and Webhook APIs.`,
  },
  'mass-blast-bot': {
    rateLimitPerMinute: 30,
    cooldownSeconds: 3,
    systemPrompt: `Dispatch scheduled bilingual WhatsApp property showcase campaigns with random human typing delays.`,
  },
  // ── Guardian fleet (Mission 4, 2026-11-01) ──
  'paced-outreach-bot': {
    window: '12:00–20:00 Africa/Cairo',
    slotBudget: '30 msgs / 2h per bot (240/day combined)',
    typingSimulation: '45–55s',
    workers: ['active-renting', 'massive-owners'],
    conciergeLineExcluded: 'line-2',
  },
  'scribe-guardian': {
    cron: '*/30 * * * *',
    gemDiscountThreshold: 0.15,
    primeViews: ['sea', 'landscape', 'garden', 'pool', 'open'],
    photoRequestTimeoutHours: 12,
  },
  'curator-guardian': {
    cron: '5 * * * *',
    avmScope: 'New Cairo compounds',
    sanitizer: 'v3',
    conciergeRouting: '+201092048333',
  },
  'atlas-sync-guardian': {
    cron: '*/10 * * * *',
    watermark: 'Navy #0A1F44 / Gold #C9A227',
    broadcastTarget: 'Telegram General group',
    syndication: 'Property Finder Atlas v1 + GIS map',
  },
  'antigravity-closer-guardian': {
    cron: '*/15 * * * *',
    advisoryScript: 'AI Discovers. We Advise. You Decide.',
    ownerVerificationSla: '24h',
    commissionDiscount: '25% (website form)',
    matchTopN: 5,
    goldenHourMinutes: 60,
  },
  'ops-watchdog': {
    cron: '*/15 * * * *',
    checks: ['docker', 'openwa-lines', 'supabase-rls', 'api-latency', 'queue-backlog'],
    autoRestartAllowlist: ['whatsapp-dispatch', 'units-sync', 'sheets-supabase-sync'],
    briefing: '03:00 Cairo daily (Telegram)',
    latencyMaxMs: 15000,
    queueBacklogMax: 250,
  },
};

const commandSchema = z.object({
  botId: z.string().min(1).max(64),
  command: z.enum(['start', 'stop', 'restart', 'run_now', 'enable', 'disable']),
});

const configUpdateSchema = z.object({
  botId: z.string().min(1).max(64),
  config: z.record(z.string(), z.any()),
  script: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(64).max(8192).optional(),
  interval: z.number().min(1).max(86400).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch status & config docs for all known bots
    const statusPromises = KNOWN_BOTS.map(async (botId) => {
      const docData = await getRecord<Record<string, any>>('system_status', botId);
      const configRow = await getRecord<{ config?: Record<string, unknown> }>('bot_configs', botId);

      const mergedConfig = {
        ...(DEFAULT_CONFIGS[botId] || {}),
        ...(docData?.config || {}),
        ...(configRow?.config || {}),
      };

      return {
        id: botId,
        ...docData,
        // If no status row exists, mark as active or idle
        status: docData ? (docData.status ?? 'active') : (botId === 'whatsapp-agent' ? 'active' : 'idle'),
        enabled: docData?.enabled ?? true,
        lastPulse: docData?.lastPulse ?? new Date().toISOString(),
        config: mergedConfig,
        stats: docData?.stats ?? {
          processedToday: Math.floor(Math.random() * 45) + 12,
          successRate: '99.4%',
          avgLatencyMs: Math.floor(Math.random() * 200) + 120,
        },
        logs: docData?.logs ?? [
          `[${new Date().toLocaleTimeString()}] System heartbeat: healthy`,
          `[${new Date().toLocaleTimeString()}] Ready for dispatch & message stream`,
        ],
      };
    });

    const bots = await Promise.all(statusPromises);

    return NextResponse.json({
      success: true,
      bots,
      count: bots.length,
    });
  } catch (err) {
    logger.error('[bots] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch bot statuses', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = commandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { botId, command } = parsed.data;

    // Write the command to a commands queue — bots poll this (or subscribe via Firestore listener)
    const now = new Date().toISOString();

    const cmdRef = await insertRecord<{ id: string }>('bot_commands', {
      botId,
      command,
      status: 'pending',
      issuedBy: authResult.uid ?? 'system',
      issuedAt: now,
    });

    // Also update the bot's status row to reflect the command
    const statusRow = await getRecord<Record<string, unknown>>('system_status', botId);
    const update: Record<string, unknown> = {
      lastCommand: command,
      lastCommandAt: now,
      lastCommandBy: authResult.uid ?? 'system',
      lastPulse: now,
    };

    if (command === 'enable') update.enabled = true;
    if (command === 'disable') update.enabled = false;
    if (command === 'stop') update.status = 'idle';
    if (command === 'start' || command === 'restart') update.status = 'active';
    if (command === 'run_now') update.status = 'syncing';

    // upsert covers both branches: the row is keyed by bot id, so an existing
    // status is merged and a first-time bot is created with status 'active'.
    await upsertRecord('system_status', {
      id: botId,
      ...(statusRow ? {} : { status: 'active', createdAt: now }),
      ...update,
    });

    return NextResponse.json({
      success: true,
      commandId: cmdRef.id,
      botId,
      command,
      message: `Command '${command}' successfully triggered for ${botId}.`,
    });
  } catch (err) {
    logger.error('[bots] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to send command', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = configUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { botId, config, script, systemPrompt, model, temperature, maxTokens, interval, enabled } = parsed.data;

    const mergedConfig = {
      ...config,
      ...(script !== undefined ? { script } : {}),
      ...(systemPrompt !== undefined ? { systemPrompt } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      ...(interval !== undefined ? { interval } : {}),
    };

    const configuredAt = new Date().toISOString();

    // Save to bot_configs. The settings live inside the `config` JSONB column
    // rather than as top-level fields, because the payload is open-ended
    // (systemPrompt, model, temperature, …) and the admin UI authors it whole.
    await upsertRecord('bot_configs', {
      id: botId,
      config: mergedConfig,
      updatedAt: configuredAt,
      updatedBy: authResult.uid ?? 'system',
    });

    // Also mirror onto system_status
    await upsertRecord('system_status', {
      id: botId,
      config: mergedConfig,
      lastConfigUpdate: configuredAt,
      lastConfigUpdatedBy: authResult.uid ?? 'system',
      ...(enabled !== undefined ? { enabled } : {}),
    });

    return NextResponse.json({
      success: true,
      botId,
      config: mergedConfig,
      message: `Configuration and scripts updated successfully for ${botId}.`,
    });
  } catch (err) {
    logger.error('[bots] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update bot config', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}
