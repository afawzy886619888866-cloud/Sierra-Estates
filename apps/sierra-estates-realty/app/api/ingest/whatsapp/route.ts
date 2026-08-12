import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { BrokerListing } from '@/lib/models/schema';
import { COLLECTIONS } from '@/lib/models/schema';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { GoogleSheetsSync } from '@/lib/services/sheets-sync';
import { GoogleAIService } from '@/lib/server/google-ai';
import { LEILA_PROMPT } from '@/lib/prompts';
import { logger } from '@/lib/logger';

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

async function verifyWebhookSecret(req: NextRequest): Promise<boolean> {
  if (!SECRET_KEY) return true;
  const secretHeader = req.headers.get('x-sbr-secret-key');
  return secretHeader === SECRET_KEY;
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
): Omit<BrokerListing, 'id'> => {
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
    sourcePlatform: 'whatsapp',
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
      lastUpdatedAt: Timestamp.now(),
    },
    status: isListing ? 'parsed' : 'new',
    isVerified: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    orchestrationState: {
      stage: isListing ? 'S2' : 'S1',
      status: isListing ? 'completed' : 'pending',
      engineVersion: 'whatsapp-ingest/v2-unified',
      lastTriggeredAt: Timestamp.now() as any,
    },
  };
};

export async function POST(req: NextRequest) {
  if (!await verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const existing = await adminDb
      .collection(COLLECTIONS.brokerListings)
      .where('dedupeHash', '==', dedupeHash)
      .limit(1)
      .get();
    if (!existing.empty) {
      return NextResponse.json({
        success: true,
        deduped: true,
        id: existing.docs[0].id,
        orchestration: 'Duplicate ignored',
      });
    }

    const parsed = await WhatsAppParserService.parseMessage(rawMessage);
    
    let leilaReply = null;
    if (parsed && !parsed.isListing) {
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
      } catch (err) {
        logger.warn('[WhatsApp Ingest] Leila response generation failed:', err);
      }
    }

    const listing = buildListingDocument(rawMessage, sender, group, parsed);
    const docRef = await adminDb.collection(COLLECTIONS.brokerListings).add({ ...listing, dedupeHash });

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
      orchestration: parsed?.isListing === true ? 'S1-S2 completed' : 'Stored for manual review',
      leilaReply
    });
  } catch (error: any) {
    logger.error('[WhatsApp Ingest Error]:', error);
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
