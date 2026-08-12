import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';

const agentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  desc: z.string().max(1000).optional(),
  emoji: z.string().max(16).optional(),
  color: z.string().max(32).optional(),
});

const WHATSAPP_STATUS_TO_DISPLAY: Record<string, string> = {
  active: 'Online',
  syncing: 'Running',
  error: 'Idle',
};

/** Real status of the whatsapp-scraper bot, which already POSTs to /api/whatsapp/heartbeat every ~60s. */
async function getWhatsappScraperAgent() {
  const doc = await adminDb.doc('system_status/whatsapp_node').get();
  if (!doc.exists) return null;

  const d = doc.data() || {};
  return {
    id: 'whatsapp-scraper',
    name: 'WhatsApp Scraper',
    desc: 'Live broker-group lead ingestion bot (apps/agents/whatsapp-scraper)',
    emoji: '📲',
    color: d.status === 'error' ? '#ef4444' : '#22c55e',
    status: WHATSAPP_STATUS_TO_DISPLAY[d.status as string] || 'Idle',
    load: d.status === 'syncing' ? 100 : 0,
    tasks: 0,
    lastPulse: d.lastPulse?.toDate?.() ?? null,
    lastError: d.lastError ?? null,
    updatedAt: d.lastPulse?.toDate?.() ?? null,
  };
}

/** Operational status of background workers (n8n flows, whatsapp-scraper, etc), not in-process agent personas. */
export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection(COLLECTIONS.agentStatus).get();
    const agents = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));

    const whatsappAgent = await getWhatsappScraperAgent();
    if (whatsappAgent) agents.unshift(whatsappAgent);

    return NextResponse.json({ success: true, agents });
  } catch (err) {
    logger.error('Error fetching agents:', err);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: err instanceof Error ? err.message : 'Unknown error' },
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
    const parsed = agentCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid agent payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, desc, emoji, color } = parsed.data;

    const ref = await adminDb.collection(COLLECTIONS.agentStatus).add({
      name,
      desc: desc || '',
      emoji: emoji || '🤖',
      color: color || '#6366f1',
      status: 'Idle',
      load: 0,
      tasks: 0,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, agentId: ref.id });
  } catch (err) {
    logger.error('Error creating agent:', err);
    return NextResponse.json(
      { error: 'Failed to create agent', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
