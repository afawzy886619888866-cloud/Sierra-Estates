import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Validates the SPA lead shape; passthrough keeps any extra fields the mapper reads.
const leadCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    phone: z.string().min(1).max(50),
    interest: z.string().max(1000).optional(),
    stage: z.string().max(100).optional(),
    hot: z.boolean().optional(),
    color: z.string().max(32).optional(),
    budget: z.number().optional(),
    ownerId: z.string().max(128).optional(),
  })
  .passthrough();

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '500', 10);
    const snap = await adminDb.collection(COLLECTIONS.stakeholders).limit(limit).get();
    const leads = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => mapLeadToSpa(doc.id, doc.data()));

    return NextResponse.json({ success: true, leads });
  } catch (err) {
    logger.error('Error fetching leads:', err);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: err instanceof Error ? err.message : 'Unknown error' },
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
    const parsed = leadCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid lead payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const patch = mapSpaToLeadPatch(parsed.data);
    const leadRef = await adminDb.collection(COLLECTIONS.stakeholders).add({
      ...patch,
      stage: patch.stage || 'inbound',
      source: 'website',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const created = await leadRef.get();
    return NextResponse.json({ success: true, lead: mapLeadToSpa(leadRef.id, created.data()) });
  } catch (err) {
    logger.error('Error creating lead:', err);
    return NextResponse.json(
      { error: 'Failed to create lead', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
