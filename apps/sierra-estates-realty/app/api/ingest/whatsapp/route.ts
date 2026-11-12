import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { insertRecord, listRecords } from '@sierra-estates/db';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { WhatsAppConversationalService } from '@/lib/services/WhatsAppConversationalService';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { GoogleSheetsSync } from '@/lib/services/sheets-sync';
import { GoogleAIService } from '@/lib/server/google-ai';
import { LEILA_PROMPT } from '@/lib/prompts';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';
import {
  buildCanonicalPayloadFromParsed,
  upsertCanonicalListing,
  type UpsertResult,
} from '@/lib/services/inventory/ingest-bridge';
import { mempalace } from '@sierra-estates/memory-engine';
import { eccMemory } from '@/lib/eccMemoryEngine';
import { evaluatePropertyValuation } from '@/lib/valuationArbitrageEngine';
import { sharedPubSub } from '@/lib/pubsub';
import { NEW_CAIRO_COMPOUNDS } from '@/components/Maps/compounds-data';

import { AugustOwnersAgentService } from '@/lib/services/AugustOwnersAgentService';

function verifyWebhookSecret(req: NextRequest) {
  return verifySharedSecret(req, {
    header: 'x-sbr-secret-key',
    secret: process.env.SBR_SECRET_KEY,
    name: 'SBR_SECRET_KEY',
  });
}

const extractRawMessage = (body: Record<string, any>) =>
  body.message ||
  body.text ||
  body.data?.message?.text ||
  body.data?.text ||
  body.Body ||
  body.content ||
  body.payload?.message ||
  '';

const extractSender = (body: Record<string, any>) =>
  body.sender ||
  body.from ||
  body.From ||
  body.senderName ||
  body.data?.sender ||
  'Unknown';

const extractGroup = (body: Record<string, any>) =>
  body.groupName ||
  body.group ||
  body.chatName ||
  body.data?.groupName ||
  body.To ||
  'Direct Message';

const buildListingDocument = (
  rawMessage: string,
  sender: string,
  group: string,
  parsed: any
) => {
  const isListing = parsed?.isListing === true;
  
  // Use the pre-calculated sierraCode if available, else build it
  const metadata = isListing && parsed?.price
    ? buildSierraCodeMetadata({
        compound: parsed.compound,
        locationCode: parsed.compound,
        rooms: parsed.bedrooms,
        furnishingStatus: parsed.finishing || parsed.furnishingStatus,
        price: parsed.price,
        currency: parsed.currency || 'EGP',
        features: parsed.matchingKeywords,
      })
    : null;

  return {
    rawMessage,
    sourceGroup: group,
    sourcePlatform: 'whatsapp' as const,
    senderInfo: sender,
    extractedData: {
      compound: parsed?.compound,
      propertyType: parsed?.type || parsed?.propertyType,
      bedrooms: parsed?.bedrooms,
      price: parsed?.price,
      currency: parsed?.currency || 'EGP',
      area: parsed?.area,
      finishingType: parsed?.finishing || parsed?.finishingType,
      furnishingStatus: metadata?.furnishingStatus || parsed?.furnishingStatus,
      phoneNumber: parsed?.phoneNumber,
      urgencyScore: parsed?.urgencyScore,
      sentiment: parsed?.sentiment,
      matchingKeywords: parsed?.matchingKeywords || [],
      features: metadata?.featureCodes || [],
      sierraCode: parsed?.sierraCode || metadata?.code,
    },
    intelligence: {
      code: parsed?.sierraCode || metadata?.code || '',
      locationCode: metadata?.locationCode || parsed?.compound || '',
      furnishingStatus: metadata?.furnishingStatus || 'U',
      normalizedPrice: metadata?.normalizedPrice || parsed?.price || 0,
      currency: metadata?.currency || 'EGP',
      featureCodes: metadata?.featureCodes || [],
      urgencyScore: parsed?.urgencyScore || 0,
      sentiment: parsed?.sentiment || 'neutral',
      matchingKeywords: parsed?.matchingKeywords || [],
      parserVersion: 'whatsapp-ingest/v2-unified',
      lastUpdatedAt: new Date().toISOString(),
    },
    status: isListing ? 'parsed' : 'new',
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orchestrationState: {
      stage: isListing ? 'S2' : 'S1',
      status: isListing ? 'completed' : 'pending',
      engineVersion: 'whatsapp-ingest/v2-unified',
      lastTriggeredAt: new Date().toISOString(),
    },
  };
};

export async function POST(req: NextRequest) {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, any>;
    const rawMessage = extractRawMessage(body);
    const sender = extractSender(body);
    const group = extractGroup(body);

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json({ success: false, error: 'No valid message content found.' }, { status: 400 });
    }

    // Idempotency: webhook providers retry on timeout, which would otherwise
    // create duplicate broker_listings and re-run the pipeline. Short-circuit
    // on an exact (sender + message) repeat before spending an AI parse call.
    const dedupeHash = createHash('sha1').update(`${sender}|${rawMessage}`).digest('hex');
    const existing = await listRecords<{ id: string }>('broker_listings', {
      where: [{ column: 'dedupeHash', value: dedupeHash }],
      limit: 1,
    });
    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        deduped: true,
        id: existing[0].id,
        orchestration: 'Duplicate ignored',
      });
    }

    // Check if the message is from the August Owners group
    if (AugustOwnersAgentService.isAugustOwnersGroup(group) || body.isAugustGroup === true) {
      const augustResult = await AugustOwnersAgentService.processGroupMessage({
        rawMessage,
        sender,
        group,
        groupId: body.groupId || body.chatId,
        media: body.media,
      });

      return NextResponse.json({
        success: true,
        channel: 'august_owners_group',
        result: augustResult,
      });
    }

    const parsed = await WhatsAppParserService.parseMessage(rawMessage);

    // ── Canonical inventory (G2 wiring, 2026-10-19) ─────────────────────────────
    // Every parsed listing whose §21 mandatory fields are complete enters the
    // canonical `listings` table through InventoryDomainService — fingerprinted
    // (dupe_check_hash), lifecycle-tracked (draft for scrapes) and DB-minted
    // code (migration 031 trigger). Runs BEFORE the staging insert so a DB
    // failure here fails the request (500 → provider retry) instead of leaving
    // canonical inventory silently missing. Incomplete listings are skipped
    // honestly: the broker_listings staging row below keeps the raw evidence.
    let canonical: UpsertResult | null = null;
    if (parsed?.isListing === true) {
      const payload = buildCanonicalPayloadFromParsed(parsed, rawMessage, `whatsapp:${sender}`);
      if (payload) {
        canonical = await upsertCanonicalListing('whatsapp_scrape', payload);
        logger.info(
          `[WhatsApp Ingest] Canonical ${canonical.action} for fingerprint ${canonical.fingerprint}`,
        );
      }
    }
    
    let leilaReply = null;
    if (parsed && !parsed.isListing) {
      try {
        const conversationalResponse = await WhatsAppConversationalService.processDirectMessage(rawMessage, sender);
        leilaReply = {
          text: conversationalResponse.trim(),
          isVIP: conversationalResponse.includes('VIP') || conversationalResponse.includes('Portfolio Manager')
        };
      } catch (err) {
        logger.warn('[WhatsApp Ingest] Hermes conversational response generation failed, falling back to scribe:', err);
        try {
          const responseText = await GoogleAIService.generateContent(
            'SCRIBE', 'S1-WhatsApp-Intake',
            {
              system: LEILA_PROMPT.system,
              user: rawMessage
            },
            { model: 'gemini-1.5-flash', temperature: 0.3 }
          );
          
          leilaReply = {
            text: responseText.replace('[VIP_ALERT_TRIGGER]', '').trim(),
            isVIP: responseText.includes('[VIP_ALERT_TRIGGER]')
          };
        } catch (fallbackErr) {
          logger.warn('[WhatsApp Ingest] Leila response generation fallback failed:', fallbackErr);
        }
      }
    }

    const listing = buildListingDocument(rawMessage, sender, group, parsed);
    const docRef = await insertRecord<{ id: string }>('broker_listings', { ...listing, dedupeHash });

    // Index into MemPalace listings room
    try {
      if (parsed?.isListing === true) {
        const compoundName = parsed.compound ? String(parsed.compound) : 'unspecified';
        mempalace.store({
          id: `listing-${docRef.id}`,
          room: 'listings',
          drawer: compoundName,
          content: `[${listing.extractedData?.sierraCode || 'SE-UNIT'}] ${compoundName} - ${parsed.bedrooms || 0}BR ${parsed.finishing || ''} | ${parsed.price || 0} ${parsed.currency || 'EGP'} | Sender: ${sender}`,
          metadata: {
            docId: docRef.id,
            compound: parsed.compound || null,
            price: parsed.price,
            bedrooms: parsed.bedrooms,
            sierraCode: listing.extractedData?.sierraCode || null,
            sourceGroup: group,
            sender,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (memErr) {
      logger.warn('[WhatsApp Ingest] MemPalace store error:', memErr);
    }

    // ── ECC Memory & Broker Intelligence (HARV-030-002) ─────────────────────────
    let isHotDeal = false;
    let priceDropResult: { dropPct: number; isHotDeal: boolean } | null = null;
    try {
      if (parsed?.isListing === true) {
        const sierraCode = listing.extractedData?.sierraCode || null;
        const brokerContact = parsed.brokerPhone || (sender.startsWith('20') ? sender : undefined);

        // 1. Maintain entity graph profile for listing broker
        if (brokerContact) {
          eccMemory.upsertEntity({
            id: brokerContact,
            type: 'broker',
            name: parsed.brokerName || 'WhatsApp Broker',
            contact: brokerContact,
            compound: parsed.compound || undefined,
            tags: ['whatsapp_broker', parsed.compound ? `compound:${parsed.compound}` : ''].filter(Boolean),
            lastUpdated: new Date().toISOString(),
          });
        }

        // 2. Automated price-reduction & historical tracking
        if (sierraCode && parsed.price) {
          const currentPrice = Number(parsed.price);
          const existingEntity = eccMemory.getEntity(sierraCode);
          const previousPrice = existingEntity?.historicalPrices?.length
            ? existingEntity.historicalPrices[existingEntity.historicalPrices.length - 1].price
            : null;

          if (previousPrice && previousPrice > currentPrice) {
            priceDropResult = eccMemory.trackPriceReduction(
              sierraCode,
              previousPrice,
              currentPrice,
              group || 'WhatsApp Broker Group',
              brokerContact || sender
            );
            isHotDeal = priceDropResult.isHotDeal;
            if (isHotDeal) {
              logger.info(`🔥 [ECC Memory] Hot deal detected on ${sierraCode}: ${priceDropResult.dropPct}% reduction!`);
            }
          }

          // Record unit in entity graph with historical price tracking
          eccMemory.upsertEntity({
            id: sierraCode,
            type: 'property',
            compound: parsed.compound || undefined,
            historicalPrices: [{
              price: currentPrice,
              timestamp: new Date().toISOString(),
              source: group || 'WhatsApp Harvester',
            }],
            tags: ['harvested_listing', parsed.dealType || 'Sale'],
            lastUpdated: new Date().toISOString(),
          });
        }

        // 3. Valuation & Arbitrage Comps Analyzer
        if (parsed.price) {
          try {
            const valuation = evaluatePropertyValuation({
              property_type: parsed.unitType || 'residential',
              transaction_type: parsed.dealType === 'Rent' ? 'Rent' : 'Sale',
              offered_purchase_price: parsed.dealType !== 'Rent' ? Number(parsed.price) : undefined,
              offered_rent: parsed.dealType === 'Rent' ? Number(parsed.price) : undefined,
              size_sqm: parsed.areaSqm ? Number(parsed.areaSqm) : undefined,
              location: parsed.compound || undefined,
            });

            if (valuation.investment_metrics?.is_arbitrage_play) {
              eccMemory.recordEpisode({
                type: 'arbitrage_detected',
                entityId: sierraCode || `unit-${docRef.id}`,
                actor: 'Sierra Valuation Engine',
                summary: `Arbitrage opportunity: ${valuation.verdict} (${valuation.investment_metrics.arbitrage_alert || 'High yield'})`,
                data: {
                  verdict: valuation.verdict,
                  metrics: valuation.investment_metrics,
                  price: parsed.price,
                },
              });
            }
          } catch (valErr) {
            logger.warn('[WhatsApp Ingest] Valuation analysis warning:', valErr);
          }
        }

        // 4. Publish sanitized real-time opportunity event to SSE stream (HARV-030-003)
        try {
          const matchedCompound = parsed.compound
            ? NEW_CAIRO_COMPOUNDS.find(
                (c) =>
                  c.nameEn.toLowerCase() === String(parsed.compound).toLowerCase() ||
                  c.nameAr === parsed.compound ||
                  c.code.toLowerCase() === String(parsed.compound).toLowerCase() ||
                  String(parsed.compound).toLowerCase().includes(c.nameEn.toLowerCase())
              )
            : null;

          // Zero PII: Strictly omit sender phone, personal broker name, or phone numbers
          await sharedPubSub.publishHarvesterEvent({
            id: sierraCode || `unit-${docRef.id}`,
            compound: parsed.compound ? String(parsed.compound) : 'Unspecified Compound',
            type: parsed.unitType || 'Property',
            price: Number(parsed.price) || 0,
            areaSqm: parsed.areaSqm ? Number(parsed.areaSqm) : undefined,
            pricePerSqm:
              parsed.areaSqm && parsed.price
                ? Math.round(Number(parsed.price) / Number(parsed.areaSqm))
                : undefined,
            mode: parsed.dealType === 'Rent' ? 'rent' : 'sale',
            discountPct: priceDropResult?.dropPct,
            hotDeal: isHotDeal,
            lat: matchedCompound?.lat,
            lng: matchedCompound?.lng,
          });
        } catch (pubErr) {
          logger.warn('[WhatsApp Ingest] Failed to publish harvester opportunity event:', pubErr);
        }
      }
    } catch (eccErr) {
      logger.warn('[WhatsApp Ingest] ECC intelligence error:', eccErr);
    }

    // Dual-Ingestion: Also append to Google Sheets Master Log
    try {
      await GoogleSheetsSync.appendRow('Leads', {
        id: docRef.id,
        sender,
        group,
        isListing: parsed?.isListing ? 'YES' : 'NO',
        content: rawMessage,
        date: new Date().toISOString()
      });
    } catch (e) {
      logger.warn('[WhatsApp Ingest] Google Sheets Dual-Ingest fell back to retry queue', e);
    }

    // Trigger the orchestration pipeline relay in the background
    OrchestratorService.runPipeline(docRef.id, 'brokerListings')
      .then(() => logger.info(`[WhatsApp Ingest] Triggered pipeline for ${docRef.id}`))
      .catch((err: any) => logger.error(`[WhatsApp Ingest] Pipeline error for ${docRef.id}`, err));

    return NextResponse.json({
      success: true,
      id: docRef.id,
      isListing: parsed?.isListing === true,
      sierraCode: listing.extractedData?.sierraCode || null,
      canonical: canonical ? { id: canonical.id, action: canonical.action, fingerprint: canonical.fingerprint } : null,
      isHotDeal,
      priceDrop: priceDropResult,
      orchestration: parsed?.isListing === true ? 'S1-S2 completed' : 'Stored for manual review',
      leilaReply
    });
  } catch (error: any) {
    logger.error(`[WhatsApp Ingest Error]: ${error?.message || error}\n${error?.stack || ''}`);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Sierra Estates WhatsApp Ingest Gateway',
  });
}
