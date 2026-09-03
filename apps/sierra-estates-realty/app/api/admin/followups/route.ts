/**
 * /api/admin/followups — task management for agent follow-ups with leads
 *
 * Schema (public.followups in Supabase; camelCase here, snake_case in Postgres):
 *   {
 *     leadId: string,           // FK to public.leads
 *     agentId: string,          // FK to public.profiles
 *     type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'viewing' | 'other',
 *     title: string,
 *     notes?: string,
 *     dueAt: timestamptz,
 *     completedAt?: timestamptz,
 *     status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue',
 *     priority: 'low' | 'medium' | 'high' | 'urgent',
 *     createdAt, updatedAt, createdBy
 *   }
 *
 * Security: admin-only. Each agent can see their own follow-ups; admins
 * can see all.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord, getRecord, type WhereClause } from '@sierra-estates/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const followupSchema = z.object({
  leadId: z.string().min(1).max(128),
  agentId: z.string().min(1).max(128).optional(),
  type: z.enum(['call', 'whatsapp', 'email', 'meeting', 'viewing', 'other']).default('call'),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  dueAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid ISO date'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const where: WhereClause[] = [];

    // Non-admins (regular agents) only see their own follow-ups.
    if (authResult.uid) {
      const caller = await getRecord<{ role?: string }>('profiles', authResult.uid);
      if (caller?.role === 'agent' && !agentId) {
        where.push({ column: 'agentId', value: authResult.uid });
      }
    }

    if (agentId) where.push({ column: 'agentId', value: agentId });
    if (leadId) where.push({ column: 'leadId', value: leadId });
    if (status) where.push({ column: 'status', value: status });
    if (priority) where.push({ column: 'priority', value: priority });

    const followups = await listRecords('followups', {
      where,
      orderBy: { column: 'dueAt', ascending: true },
      limit: 200,
    });

    return NextResponse.json({ success: true, followups, count: followups.length });
  } catch (err) {
    logger.error('[followups] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups', details: err instanceof Error ? err.message : 'Unknown' },
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
    const parsed = followupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Default agentId to the caller if not specified
    const agentId = parsed.data.agentId ?? authResult.uid ?? 'system';

    const created = await insertRecord<{ id: string }>('followups', {
      ...parsed.data,
      agentId,
      dueAt: new Date(parsed.data.dueAt).toISOString(),
      status: 'pending',
      createdBy: authResult.uid ?? 'system',
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (err) {
    logger.error('[followups] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to create follow-up', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
