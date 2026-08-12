/**
 * /api/admin/followups — task management for agent follow-ups with leads
 *
 * Schema (per followup doc):
 *   {
 *     leadId: string,           // FK to stakeholders
 *     agentId: string,          // FK to users (uid)
 *     type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'viewing' | 'other',
 *     title: string,
 *     notes?: string,
 *     dueAt: Timestamp,
 *     completedAt?: Timestamp,
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
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
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

    let query: FirebaseFirestore.Query = adminDb.collection('followups');

    // Non-admins (regular agents) only see their own follow-ups
    if (authResult.method === 'firebase' && authResult.uid) {
      const callerDoc = await adminDb.collection('users').doc(authResult.uid).get();
      const role = callerDoc.data()?.role;
      if (role === 'agent' && !agentId) {
        query = query.where('agentId', '==', authResult.uid);
      }
    }

    if (agentId) query = query.where('agentId', '==', agentId);
    if (leadId) query = query.where('leadId', '==', leadId);
    if (status) query = query.where('status', '==', status);
    if (priority) query = query.where('priority', '==', priority);

    query = query.orderBy('dueAt', 'asc').limit(200);

    const snap = await query.get();
    const followups = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

    const ref = await adminDb.collection('followups').add({
      ...parsed.data,
      agentId,
      dueAt: Timestamp.fromDate(new Date(parsed.data.dueAt)),
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: authResult.uid ?? 'system',
    });

    return NextResponse.json({ success: true, id: ref.id }, { status: 201 });
  } catch (err) {
    logger.error('[followups] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to create follow-up', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
