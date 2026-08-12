import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

const WEBHOOK_SECRET = process.env.PF_WEBHOOK_SECRET || '';

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    logger.error('[PF Webhook] PF_WEBHOOK_SECRET is not configured — rejecting all requests');
    return false;
  }
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature') || '';

  if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = event.type || event.eventId;

    switch (eventType) {
      case 'lead.created':
      case 'lead.updated':
      case 'lead.assigned': {
        const lead = event.data || event.payload;
        const existing = await adminDb.collection('leads')
          .where('pfLeadId', '==', lead.id)
          .get();

        const payload = {
          name: lead.sender?.name || lead.name || 'PF Lead',
          phone: lead.sender?.phone || lead.phone || '',
          email: lead.sender?.email || lead.email || '',
          source: 'property_finder',
          status: 'new',
          mode: 'sale', // default assumption
          pfLeadId: lead.id,
          notes: `PF Listing Ref: ${lead.listing?.reference || ''}`,
          updatedAt: new Date().toISOString(),
        };

        if (existing.empty) {
          await adminDb.collection('leads').add({
            ...payload,
            createdAt: new Date().toISOString(),
          });
        } else {
          await existing.docs[0].ref.update(payload);
        }
        break;
      }

      case 'listing.published':
      case 'listing.unpublished':
      case 'listing.action': {
        const listing = event.data || event.payload;
        const ref = listing.reference || String(listing.id);
        const units = await adminDb.collection(COLLECTIONS.units)
          .where('pfReferenceNumber', '==', ref)
          .get();

        if (!units.empty) {
          await units.docs[0].ref.update({
            'automation.isPublishedToPF': eventType === 'listing.published',
            pfStatus: eventType === 'listing.published' ? 'published' : 'unpublished',
            updatedAt: Timestamp.now(),
          });
        }
        break;
      }

      default:
        logger.info(`[PF Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error('[PF Webhook]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
