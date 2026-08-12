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

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Known bots. New bots can register themselves by writing to system_status/{botId}.
const KNOWN_BOTS = [
  'whatsapp-scraper',
  'n8n-orchestrator',
  'scribe-agent',
  'curator-agent',
  'closer-agent',
  'matchmaker-agent',
];

const commandSchema = z.object({
  botId: z.string().min(1).max(64),
  command: z.enum(['start', 'stop', 'restart', 'run_now', 'enable', 'disable']),
});

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch status docs for all known bots
    const statusPromises = KNOWN_BOTS.map(async (botId) => {
      const doc = await adminDb.doc(`system_status/${botId}`).get();
      return {
        id: botId,
        ...doc.data(),
        // If no status doc exists, mark as offline
        status: doc.exists ? doc.data()?.status ?? 'offline' : 'offline',
        lastPulse: doc.data()?.lastPulse ?? null,
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
    const cmdRef = await adminDb.collection('bot_commands').add({
      botId,
      command,
      status: 'pending',
      issuedBy: authResult.uid ?? 'system',
      issuedAt: Timestamp.now(),
    });

    // Also update the bot's status doc to reflect the command
    const statusRef = adminDb.doc(`system_status/${botId}`);
    const statusDoc = await statusRef.get();
    const update: Record<string, unknown> = {
      lastCommand: command,
      lastCommandAt: Timestamp.now(),
      lastCommandBy: authResult.uid ?? 'system',
    };

    if (command === 'enable') update.enabled = true;
    if (command === 'disable') update.enabled = false;
    if (command === 'stop') update.status = 'idle';
    if (command === 'restart') update.status = 'syncing';

    if (statusDoc.exists) {
      await statusRef.update(update);
    } else {
      await statusRef.set({
        ...update,
        status: 'idle',
        createdAt: Timestamp.now(),
      });
    }

    return NextResponse.json({
      success: true,
      commandId: cmdRef.id,
      botId,
      command,
      message: `Command '${command}' queued for ${botId}. Bot will pick it up on next pulse.`,
    });
  } catch (err) {
    logger.error('[bots] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to send command', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
