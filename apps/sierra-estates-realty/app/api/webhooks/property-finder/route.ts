import { NextRequest, NextResponse } from 'next/server';
import { listRecords, updateRecord, upsertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyHmacSignature } from '@/lib/server/webhook-auth';
import { enqueueWhatsAppJob, claimEligibleNumber, DEFAULT_OUTREACH_CONFIG } from '@/lib/server/whatsapp-queue';
import { sendWhatsApp, getTwilioStatusCallbackUrl } from '@/lib/server/twilio-client';
import { generateLeadGreeting } from '@/lib/server/pf-lead-greeting';
import { resolveGreetingLanguage } from '@/lib/server/whatsapp-language';

/**
 * Property Finder Enterprise (Atlas OpenAPI 3.1.0) outbound webhook.
 *
 * Supports both OpenAPI 3.1.0 `WHBaseEvent` envelopes:
 *   `{ id, type, timestamp, entity: { id, type }, payload: { ... } }`
 * and legacy `{ eventId, data: { ... } }` shapes.
 */

const WEBHOOK_SECRET = process.env.PF_WEBHOOK_SECRET || '';
const RECENT_EVENT_IDS = new Map<string, number>();
const EVENT_DEDUPE_TTL_MS = 10 * 60 * 1000;
const MAX_RECENT_EVENTS = 1000;

function isDuplicateDelivery(eventId: unknown): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  if (typeof eventId !== 'string' || !eventId.trim()) return false;
  const now = Date.now();
  const prev = RECENT_EVENT_IDS.get(eventId);
  if (prev && now - prev < EVENT_DEDUPE_TTL_MS) {
    return true;
  }
  if (RECENT_EVENT_IDS.size >= MAX_RECENT_EVENTS) {
    for (const [k, ts] of RECENT_EVENT_IDS.entries()) {
      if (now - ts >= EVENT_DEDUPE_TTL_MS) RECENT_EVENT_IDS.delete(k);
    }
    if (RECENT_EVENT_IDS.size >= MAX_RECENT_EVENTS) {
      const oldestKey = RECENT_EVENT_IDS.keys().next().value;
      if (oldestKey) RECENT_EVENT_IDS.delete(oldestKey);
    }
  }
  RECENT_EVENT_IDS.set(eventId, now);
  return false;
}

interface SenderContactEntry {
  type?: string;
  value?: string;
}

function extractSenderContacts(contacts: unknown): { phone: string; email: string } {
  if (!Array.isArray(contacts)) return { phone: '', email: '' };
  let phone = '';
  let email = '';
  for (const item of contacts as SenderContactEntry[]) {
    if (!item || typeof item !== 'object') continue;
    const t = String(item.type || '').toLowerCase();
    const val = typeof item.value === 'string' ? item.value.trim() : '';
    if (!val) continue;
    if (!phone && (t === 'phone' || t === 'whatsappusername' || t === 'mobile')) {
      phone = val;
    } else if (!email && t === 'email') {
      email = val;
    }
  }
  return { phone, email };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature =
    request.headers.get('X-Signature') ||
    request.headers.get('X-PF-Signature') ||
    '';

  const denied = verifyHmacSignature(rawBody, signature, {
    secret: WEBHOOK_SECRET,
    name: 'PF_WEBHOOK_SECRET',
  });
  if (denied) return denied;

  try {
    const event = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = String(event.type || event.eventId || '');
    const entity = (event.entity as { id?: string | number; type?: string } | undefined) || undefined;

    if (isDuplicateDelivery(event.id)) {
      return NextResponse.json({ received: true, deduplicated: true });
    }

    switch (eventType) {
      case 'lead.created':
      case 'lead.updated':
      case 'lead.assigned': {
        const lead = ((event.data || event.payload || {}) as Record<string, unknown>);
        const pfLeadId = String(entity?.id || lead.id || '');

        const findPhone = (obj: unknown, depth = 0): string => {
          if (depth > 4 || obj === null || typeof obj !== 'object') return '';
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (typeof v === 'string' && /phone|mobile|whatsapp/i.test(k) && /^\+?[0-9][0-9\s-]{6,19}$/.test(v.trim())) {
              return v.trim();
            }
          }
          for (const v of Object.values(obj as Record<string, unknown>)) {
            if (v && typeof v === 'object') {
              const found = findPhone(v, depth + 1);
              if (found) return found;
            }
          }
          return '';
        };

        const pickContact = (...objs: Array<Record<string, unknown> | undefined>): Record<string, unknown> => {
          for (const o of objs) if (o && typeof o === 'object' && Object.keys(o).length > 0) return o;
          return {};
        };

        const senderObj = lead.sender as Record<string, unknown> | undefined;
        const senderArrayContacts = extractSenderContacts(senderObj?.contacts);

        const contact = pickContact(
          senderObj,
          lead.client as Record<string, unknown> | undefined,
          lead.customer as Record<string, unknown> | undefined,
          lead.contact as Record<string, unknown> | undefined,
        );

        const clientName = (contact.name as string) || (lead.name as string) || 'Client';
        const clientPhone =
          senderArrayContacts.phone ||
          (contact.phone as string) ||
          (lead.phone as string) ||
          findPhone(lead) ||
          '';
        const clientEmail =
          senderArrayContacts.email ||
          (contact.email as string) ||
          (lead.email as string) ||
          '';

        const listingObj = lead.listing as { id?: string; reference?: string } | undefined;
        const propertyObj = lead.property as { reference?: string } | undefined;
        const sellerProperty = lead.sellerProperty as {
          bedrooms?: string;
          offeringType?: string;
          propertyType?: string;
          price?: number;
          location?: { id?: number };
        } | undefined;

        const isSellerLead = String(lead.entityType || '').toLowerCase() === 'seller' || Boolean(sellerProperty);
        const listingRef =
          listingObj?.reference ||
          propertyObj?.reference ||
          listingObj?.id ||
          '';

        const summaryNotes = isSellerLead && sellerProperty
          ? `PF Seller Lead: ${sellerProperty.propertyType || 'property'} (${sellerProperty.offeringType || 'sale'}) beds=${sellerProperty.bedrooms || 'n/a'} price=${sellerProperty.price || 0} loc=${sellerProperty.location?.id || 'n/a'}`
          : `PF Listing Ref: ${listingRef}`;

        if (!clientPhone) {
          logger.warn(`[pf-webhook] lead event without extractable phone: eventType=${eventType} topKeys=${JSON.stringify(Object.keys(lead))}`);
        }

        await upsertRecord(
          'leads',
          {
            fullName: clientName,
            phone: clientPhone,
            email: clientEmail,
            channel: 'property_finder',
            source: 'property-finder',
            status: 'new',
            stage: 'inbound',
            mode: isSellerLead && sellerProperty?.offeringType === 'rent' ? 'rent' : 'sale',
            ...(isSellerLead ? { leadType: 'seller' } : {}),
            pfLeadId: pfLeadId || undefined,
            summaryNotes,
            updatedAt: new Date().toISOString(),
          },
          'pf_lead_id',
        );

        if (clientPhone) {
          const greetingLanguage = resolveGreetingLanguage(clientPhone);
          const inquiry = lead.message || lead.inquiry || lead.notes || '';
          const greeting = await generateLeadGreeting({
            clientName,
            listingRef,
            message: typeof inquiry === 'string' ? inquiry : '',
            language: greetingLanguage,
          });

          const jobId = await enqueueWhatsAppJob({
            purpose: 'general-outreach',
            toPhone: clientPhone,
            toName: clientName,
            body: greeting.body,
            metadata: {
              source: 'property-finder',
              propertyRef: listingRef,
              language: greetingLanguage,
              greetingSource: greeting.source,
              pfLeadId: pfLeadId || null,
            },
          });

          try {
            const claim = await claimEligibleNumber(DEFAULT_OUTREACH_CONFIG);
            if (claim) {
              const nowIso = new Date().toISOString();
              await updateRecord('whatsapp_queue', jobId, {
                status: 'sending',
                assignedNumberId: claim.id,
                updatedAt: nowIso,
              });
              try {
                const result = await sendWhatsApp(
                  claim.e164Phone,
                  clientPhone,
                  greeting.body,
                  getTwilioStatusCallbackUrl(),
                );
                await updateRecord('whatsapp_queue', jobId, {
                  status: 'sent',
                  twilioMessageSid: result.sid,
                  sentAt: new Date().toISOString(),
                  attempts: 1,
                  updatedAt: new Date().toISOString(),
                });
                logger.info(`[pf-webhook] greeting sent inline for lead ${pfLeadId} (job ${jobId}, sid ${result.sid})`);
              } catch (sendErr: unknown) {
                const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
                await updateRecord('whatsapp_queue', jobId, {
                  status: 'queued',
                  errorMessage: errMsg,
                  updatedAt: new Date().toISOString(),
                });
                logger.warn(`[pf-webhook] inline send failed for lead ${pfLeadId}; job ${jobId} requeued: ${errMsg}`);
              }
            }
          } catch (dispatchErr: unknown) {
            const errMsg = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
            logger.warn(`[pf-webhook] inline dispatch skipped for job ${jobId}: ${errMsg}`);
          }
        }
        break;
      }

      case 'listing.published':
      case 'listing.unpublished':
      case 'listing.action':
      case 'listing.publishFailed':
      case 'listing.systemUpdated': {
        const listing = ((event.data || event.payload || {}) as Record<string, unknown>);
        const refCandidate =
          (typeof listing.reference === 'string' && listing.reference) ||
          (listing.id ? String(listing.id) : '') ||
          (entity?.id ? String(entity.id) : '');

        if (!refCandidate) break;

        const units = await listRecords<{ id: string; automation?: Record<string, unknown> }>('listings', {
          where: [{ column: 'pfReferenceNumber', value: refCandidate }],
          limit: 1,
        });

        if (units.length > 0) {
          const prevAuto = units[0].automation ?? {};
          const nowIso = new Date().toISOString();

          if (eventType === 'listing.publishFailed') {
            const reason = typeof listing.reason === 'string' ? listing.reason : 'publish_failed';
            await updateRecord('listings', units[0].id, {
              automation: {
                ...prevAuto,
                isPublishedToPF: false,
                pfPendingPublish: false,
                pfPublishFailureReason: reason,
              },
              pfStatus: 'publish_failed',
              updatedAt: nowIso,
            });
          } else if (eventType === 'listing.systemUpdated') {
            await updateRecord('listings', units[0].id, {
              automation: {
                ...prevAuto,
                pfLastSystemOperation: listing.operation ?? 'updated',
              },
              updatedAt: nowIso,
            });
          } else {
            await updateRecord('listings', units[0].id, {
              automation: { ...prevAuto, isPublishedToPF: eventType === 'listing.published' },
              pfStatus: eventType === 'listing.published' ? 'published' : 'unpublished',
              updatedAt: nowIso,
            });
          }
        }
        break;
      }

      default:
        logger.info(`[PF Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('[PF Webhook]', errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
