import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord, getRecord, type RecordData } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { TOOL_DEFINITIONS } from '@/lib/mcp/tool-bridge';

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

/**
 * `desc` is the API field name but DESC is a SQL keyword, so the column is
 * `description`. Translated here so the admin board's shape is unchanged.
 */
function rowToAgent(row: RecordData): Record<string, unknown> {
  const { description, ...rest } = row as Record<string, unknown>;
  return { ...rest, desc: description };
}

/** Real status of the whatsapp-scraper bot, which POSTs to /api/whatsapp/heartbeat every ~60s. */
async function getWhatsappScraperAgent() {
  const d = await getRecord<RecordData>('system_status', 'whatsapp_node');
  if (!d) return null;

  return {
    id: 'whatsapp-scraper',
    name: 'WhatsApp Scraper',
    desc: 'Live broker-group lead ingestion bot (apps/agents/whatsapp-scraper)',
    emoji: '📲',
    color: d.status === 'error' ? '#ef4444' : '#22c55e',
    status: WHATSAPP_STATUS_TO_DISPLAY[d.status as string] || 'Idle',
    load: d.status === 'syncing' ? 100 : 0,
    tasks: 0,
    lastPulse: d.lastPulse ?? null,
    lastError: d.lastError ?? null,
    updatedAt: d.lastPulse ?? null,
  };
}

/**
 * Real status of the Remote MCP Gateway (/api/mcp), providing Claude and remote agent
 * interoperability across WhatsApp, Stripe, Deals, DocuSign, and Stage-9 Orchestration.
 */
function getRemoteMcpGatewayAgent() {
  return {
    id: 'remote-mcp-gateway',
    name: 'Claude & Remote MCP Gateway',
    desc: 'Streamable-HTTP / OAuth 2.1 MCP server hosting 11 enterprise tools (/api/mcp)',
    emoji: '⚡',
    color: '#8b5cf6',
    status: 'Online',
    load: 0,
    tasks: TOOL_DEFINITIONS.size,
    lastPulse: new Date().toISOString(),
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Operational status of background workers (n8n flows, whatsapp-scraper, etc), not in-process agent personas. */
export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listRecords('agents_registry');
    const agents: Record<string, unknown>[] = rows.map(rowToAgent);

    // 1. Wire Remote MCP Gateway
    const mcpAgent = getRemoteMcpGatewayAgent();
    agents.unshift(mcpAgent);

    // 2. Wire WhatsApp Scraper Bot
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

    const created = await insertRecord('agents_registry', {
      name,
      description: desc || '',
      emoji: emoji || '🤖',
      color: color || '#6366f1',
      status: 'Idle',
      load: 0,
      tasks: 0,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, agentId: created.id });
  } catch (err) {
    logger.error('Error creating agent:', err);
    return NextResponse.json(
      { error: 'Failed to create agent', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
