import { NextRequest, NextResponse } from 'next/server';
import { insertRecord, listRecords, updateRecord, upsertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyHmacSignature } from '@/lib/server/webhook-auth';

/**
 * Property Finder outbound webhook.
 *
 * Firestore → Postgres field mapping (nothing is dropped):
 *   leads.name   → leads.full_name       leads.notes → leads.summary_notes
 *   the PF lead id keeps its own indexed column, leads.pf_lead_id, because the
 *   upsert below matches on it.
 *   The auto-reply job's `source`/`propertyRef` live in whatsapp_queue.metadata;
 *   `phone`/`clientName`/`text` map onto recipient_phone/recipient_name/message_body.
 */

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

        const clientName = lead.sender?.name || lead.name || 'Client';
        const clientPhone = lead.sender?.phone || lead.phone || '';
        const listingRef = lead.listing?.reference || lead.property?.reference || '';

        // One upsert on pf_lead_id replaces the previous read-then-branch: the
        // same fields are written whether the lead is new or already known, so
        // there is nothing for the insert path to add beyond created_at, which
        // the column default supplies.
        await upsertRecord(
          'leads',
          {
            fullName: clientName,
            phone: clientPhone,
            email: lead.sender?.email || lead.email || '',
            channel: 'property_finder',
            source: 'property-finder',
            status: 'new',
            stage: 'inbound',
            mode: 'sale',
            pfLeadId: lead.id,
            summaryNotes: `PF Listing Ref: ${listingRef}`,
            updatedAt: new Date().toISOString(),
          },
          'pf_lead_id',
        );

        // Automated WhatsApp Response Queue:
        // When client submits inquiry on Property Finder, queue an immediate tailored greeting
        if (clientPhone) {
          const autoMessage = `مرحباً بك يا ${clientName} في سييرا إستيتس! 🌟\nوصلنا استفسارك عبر Property Finder بخصوص العقار (مرجع: ${listingRef || 'المميز'}).\nيسعدنا تزويدك بكافة تفاصيل الوحدة، المخططات الهندسية، وخطط السداد المتاحة.\n\nهل تود التواصل هنا عبر واتساب أو تحديد موعد لزيارة ومعاينة العقار؟\n\n*Sierra Estates — Beyond Brokerage*`;

          await insertRecord('whatsapp_queue', {
            recipientPhone: clientPhone,
            recipientName: clientName,
            messageBody: autoMessage,
            status: 'pending',
            metadata: { source: 'property-finder', propertyRef: listingRef },
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'listing.published':
      case 'listing.unpublished':
      case 'listing.action': {
        const listing = event.data || event.payload;
        const ref = listing.reference || String(listing.id);
        const units = await listRecords<{ id: string; automation?: Record<string, unknown> }>('listings', {
          where: [{ column: 'pfReferenceNumber', value: ref }],
          limit: 1,
        });

        if (units.length > 0) {
          // Firestore's dotted 'automation.isPublishedToPF' path merged into the
          // existing map; a JSONB column is replaced wholesale, so merge here to
          // keep any other automation flags on the row.
          await updateRecord('listings', units[0].id, {
            automation: { ...(units[0].automation ?? {}), isPublishedToPF: eventType === 'listing.published' },
            pfStatus: eventType === 'listing.published' ? 'published' : 'unpublished',
            updatedAt: new Date().toISOString(),
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
