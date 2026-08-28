import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { verifyHmacSignature } from '@/lib/server/webhook-auth';

const WEBHOOK_SECRET = process.env.PF_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature') || '';

  const denied = verifyHmacSignature(rawBody, signature, {
    secret: WEBHOOK_SECRET,
    name: 'PF_WEBHOOK_SECRET',
  });
  if (denied) return denied;

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

        const clientName = lead.sender?.name || lead.name || 'Client';
        const clientPhone = lead.sender?.phone || lead.phone || '';
        const listingRef = lead.listing?.reference || lead.property?.reference || '';

        const payload = {
          name: clientName,
          phone: clientPhone,
          email: lead.sender?.email || lead.email || '',
          source: 'property_finder',
          status: 'new',
          stage: 'inbound',
          mode: 'sale',
          pfLeadId: lead.id,
          notes: `PF Listing Ref: ${listingRef}`,
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

        // Automated WhatsApp Response Queue:
        // When client submits inquiry on Property Finder, queue an immediate tailored greeting
        if (clientPhone) {
          const autoMessage = `مرحباً بك يا ${clientName} في سييرا إستيتس! 🌟\nوصلنا استفسارك عبر Property Finder بخصوص العقار (مرجع: ${listingRef || 'المميز'}).\nيسعدنا تزويدك بكافة تفاصيل الوحدة، المخططات الهندسية، وخطط السداد المتاحة.\n\nهل تود التواصل هنا عبر واتساب أو تحديد موعد لزيارة ومعاينة العقار؟\n\n*Sierra Estates — Beyond Brokerage*`;

          await adminDb.collection('whatsapp_queue').add({
            phone: clientPhone,
            clientName,
            source: 'property_finder',
            propertyRef: listingRef,
            text: autoMessage,
            status: 'pending',
            createdAt: Timestamp.now(),
          });
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
