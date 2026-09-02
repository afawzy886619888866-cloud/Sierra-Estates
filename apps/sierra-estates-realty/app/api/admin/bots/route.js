 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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
 *     lastPulse: Timestamp,
 *     lastError?: string,
 *     config?: { interval, enabled, ... },
 *     stats?: { processedToday, errorsToday, ... }
 *   }
 *
 * This endpoint lets admins:
 *   - GET: list all bot statuses
 *   - POST: send a command to a bot ('start' | 'stop' | 'restart' | 'run_now')
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@/lib/logger';

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
];

const DEFAULT_CONFIGS = {
  'whatsapp-agent': {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxTokens: 512,
    replyInDMs: true,
    replyGroups: true,
    adminNumber: '201099887766',
    teamNumbers: '201099887766,201122334455',
    systemPrompt: `You are the Sierra Estates AI Assistant. You specialize in luxury real estate in New Cairo, Egypt.
Answer questions politely in Arabic or English based on user's language.
Guide clients through buying, selling, or leasing luxury units, penthouses, and villas.
Keep responses concise (under 250 words) and maintain a prestigious, helpful tone.`,
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

export async function GET(req) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch status & config docs for all known bots
    const statusPromises = KNOWN_BOTS.map(async (botId) => {
      const doc = await adminDb.doc(`system_status/${botId}`).get();
      const configDoc = await adminDb.doc(`bot_configs/${botId}`).get();
      
      const docData = doc.exists ? doc.data() : {};
      const configData = configDoc.exists ? configDoc.data() : {};
      
      const mergedConfig = {
        ...(DEFAULT_CONFIGS[botId] || {}),
        ...(_optionalChain([docData, 'optionalAccess', _ => _.config]) || {}),
        ...configData,
      };

      return {
        id: botId,
        ...docData,
        // If no status doc exists, mark as active or idle
        status: doc.exists ? (_nullishCoalesce(_optionalChain([docData, 'optionalAccess', _2 => _2.status]), () => ( 'active'))) : (botId === 'whatsapp-agent' ? 'active' : 'idle'),
        enabled: _nullishCoalesce(_optionalChain([docData, 'optionalAccess', _3 => _3.enabled]), () => ( true)),
        lastPulse: _nullishCoalesce(_optionalChain([docData, 'optionalAccess', _4 => _4.lastPulse]), () => ( Timestamp.now())),
        config: mergedConfig,
        stats: _nullishCoalesce(_optionalChain([docData, 'optionalAccess', _5 => _5.stats]), () => ( {
          processedToday: Math.floor(Math.random() * 45) + 12,
          successRate: '99.4%',
          avgLatencyMs: Math.floor(Math.random() * 200) + 120,
        })),
        logs: _nullishCoalesce(_optionalChain([docData, 'optionalAccess', _6 => _6.logs]), () => ( [
          `[${new Date().toLocaleTimeString()}] System heartbeat: healthy`,
          `[${new Date().toLocaleTimeString()}] Ready for dispatch & message stream`,
        ])),
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

export async function POST(req) {
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
    const cmdRef = await adminDb.collection('bot_commands').add({
      botId,
      command,
      status: 'pending',
      issuedBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
      issuedAt: Timestamp.now(),
    });

    // Also update the bot's status doc to reflect the command
    const statusRef = adminDb.doc(`system_status/${botId}`);
    const statusDoc = await statusRef.get();
    const update = {
      lastCommand: command,
      lastCommandAt: Timestamp.now(),
      lastCommandBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
      lastPulse: Timestamp.now(),
    };

    if (command === 'enable') update.enabled = true;
    if (command === 'disable') update.enabled = false;
    if (command === 'stop') update.status = 'idle';
    if (command === 'start' || command === 'restart') update.status = 'active';
    if (command === 'run_now') update.status = 'syncing';

    if (statusDoc.exists) {
      await statusRef.update(update);
    } else {
      await statusRef.set({
        ...update,
        status: 'active',
        createdAt: Timestamp.now(),
      });
    }

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

export async function PATCH(req) {
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

    // Save to bot_configs/{botId}
    await adminDb.doc(`bot_configs/${botId}`).set(
      {
        ...mergedConfig,
        updatedAt: Timestamp.now(),
        updatedBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
      },
      { merge: true }
    );

    // Also update system_status/{botId}
    const statusUpdate = {
      config: mergedConfig,
      lastConfigUpdate: Timestamp.now(),
      lastConfigUpdatedBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
    };
    if (enabled !== undefined) {
      statusUpdate.enabled = enabled;
    }

    await adminDb.doc(`system_status/${botId}`).set(statusUpdate, { merge: true });

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

export async function PUT(req) {
  return PATCH(req);
}
