import { NextRequest, NextResponse } from 'next/server';
import { listRecords, updateRecord, upsertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyHmacSignature } from '@/lib/server/webhook-auth';
import { enqueueWhatsAppJob, claimEligibleNumber, DEFAULT_OUTREACH_CONFIG } from '@/lib/server/whatsapp-queue';
import { sendWhatsApp, getTwilioStatusCallbackUrl } from '@/lib/server/twilio-client';
import { generateLeadGreeting } from '@/lib/server/pf-lead-greeting';
import { resolveGreetingLanguage } from '@/lib/server/whatsapp-language';

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
  // Property Finder has used both header spellings across API versions; accept
  // either so a platform-side rename can never break lead ingestion.
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
    const event = JSON.parse(rawBody);
    const eventType = event.type || event.eventId;

    switch (eventType) {
      case 'lead.created':
      case 'lead.updated':
      case 'lead.assigned': {
        const lead = event.data || event.payload;

        // PF payloads vary across Atlas API versions and webhook event types —
        // the live 'JAWA' delivery (2026-09-20) arrived with contact info
        // nowhere near lead.sender. Try every observed shape before giving up:
        // sender / client / customer / contact objects, then flat fields, then
        // a phone anywhere in the payload (first E.164-looking string).
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

        const contact = pickContact(
          lead.sender as Record<string, unknown> | undefined,
          lead.client as Record<string, unknown> | undefined,
          lead.customer as Record<string, unknown> | undefined,
          lead.contact as Record<string, unknown> | undefined,
        );

        const clientName = (contact.name as string) || lead.name || 'Client';
        const clientPhone =
          (contact.phone as string) ||
          lead.phone ||
          findPhone(lead) ||
          '';
        const listingRef = lead.listing?.reference || lead.property?.reference || '';

        // Compact diagnostic for payload shapes we still fail to extract a
        // phone from — the bot cannot greet a lead it cannot reach.
        if (!clientPhone) {
          logger.warn(`[pf-webhook] lead event without extractable phone: eventType=${eventType} topKeys=${JSON.stringify(Object.keys(lead))}`);
        }

        // One upsert on pf_lead_id replaces the previous read-then-branch: the
        // same fields are written whether the lead is new or already known, so
        // there is nothing for the insert path to add beyond created_at, which
        // the column default supplies.
        await upsertRecord(
          'leads',
          {
            fullName: clientName,
            phone: clientPhone,
            email: (contact.email as string) || lead.email || '',
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
        // When a client submits an inquiry on Property Finder, the bot queues an
        // immediate tailored greeting. Language routing (owner rule): Egyptian
        // (+20) and Saudi (+966) numbers are greeted in ARABIC, every other
        // country code in ENGLISH. enqueueWhatsAppJob inserts with status
        // 'queued' — the only status the dispatch worker drains — so the reply
        // actually goes out (a manual insert with status 'pending' would sit
        // in the table forever, which is exactly what the previous code did).
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
              pfLeadId: lead.id ?? null,
            },
          });

          // Hot-lead fast path: attempt to send the greeting IMMEDIATELY so a
          // PF lead gets an instant bot reply, instead of waiting for the
          // dispatch cron (GitHub Actions are currently disabled by the
          // account spending limit, and Vercel Hobby crons cannot run hourly).
          // A greeting is a direct reply to an inbound inquiry, so it
          // intentionally bypasses the bulk-outreach operating-hours window;
          // sender rotation still goes through claimEligibleNumber so quota
          // bookkeeping stays in one place. Any failure rolls the job back to
          // 'queued' — the regular dispatch worker (/api/cron/whatsapp-dispatch)
          // picks it up later, so a message can never be lost or doubled.
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
                logger.info(`[pf-webhook] greeting sent inline for lead ${lead.id} (job ${jobId}, sid ${result.sid})`);
              } catch (sendErr: any) {
                await updateRecord('whatsapp_queue', jobId, {
                  status: 'queued',
                  errorMessage: sendErr?.message || String(sendErr),
                  updatedAt: new Date().toISOString(),
                });
                logger.warn(`[pf-webhook] inline send failed for lead ${lead.id}; job ${jobId} requeued: ${sendErr?.message}`);
              }
            }
            // No claimable sender (quota exhausted) → job simply stays 'queued'.
          } catch (dispatchErr: any) {
            logger.warn(`[pf-webhook] inline dispatch skipped for job ${jobId}: ${dispatchErr?.message}`);
          }
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
