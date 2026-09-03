 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { insertRecord, listRecords } from '@sierra-estates/db';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { WhatsAppConversationalService } from '@/lib/services/WhatsAppConversationalService';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { GoogleSheetsSync } from '@/lib/services/sheets-sync';
import { GoogleAIService } from '@/lib/server/google-ai';
import { LEILA_PROMPT } from '../../../../lib/prompts';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

function verifyWebhookSecret(req) {
  return verifySharedSecret(req, {
    header: 'x-sbr-secret-key',
    secret: process.env.SBR_SECRET_KEY,
    name: 'SBR_SECRET_KEY',
  });
}

const extractRawMessage = (body) =>
  body.message ||
  body.text ||
  _optionalChain([body, 'access', _ => _.data, 'optionalAccess', _2 => _2.message, 'optionalAccess', _3 => _3.text]) ||
  _optionalChain([body, 'access', _4 => _4.data, 'optionalAccess', _5 => _5.text]) ||
  body.Body ||
  body.content ||
  _optionalChain([body, 'access', _6 => _6.payload, 'optionalAccess', _7 => _7.message]) ||
  '';

const extractSender = (body) =>
  body.sender ||
  body.from ||
  body.From ||
  body.senderName ||
  _optionalChain([body, 'access', _8 => _8.data, 'optionalAccess', _9 => _9.sender]) ||
  'Unknown';

const extractGroup = (body) =>
  body.groupName ||
  body.group ||
  body.chatName ||
  _optionalChain([body, 'access', _10 => _10.data, 'optionalAccess', _11 => _11.groupName]) ||
  body.To ||
  'Direct Message';

const buildListingDocument = (
  rawMessage,
  sender,
  group,
  parsed
) => {
  const isListing = _optionalChain([parsed, 'optionalAccess', _12 => _12.isListing]) === true;
  
  // Use the pre-calculated sierraCode if available, else build it
  const metadata = isListing && _optionalChain([parsed, 'optionalAccess', _13 => _13.price])
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
    sourcePlatform: 'whatsapp' ,
    senderInfo: sender,
    extractedData: {
      compound: _optionalChain([parsed, 'optionalAccess', _14 => _14.compound]),
      propertyType: _optionalChain([parsed, 'optionalAccess', _15 => _15.type]) || _optionalChain([parsed, 'optionalAccess', _16 => _16.propertyType]),
      bedrooms: _optionalChain([parsed, 'optionalAccess', _17 => _17.bedrooms]),
      price: _optionalChain([parsed, 'optionalAccess', _18 => _18.price]),
      currency: _optionalChain([parsed, 'optionalAccess', _19 => _19.currency]) || 'EGP',
      area: _optionalChain([parsed, 'optionalAccess', _20 => _20.area]),
      finishingType: _optionalChain([parsed, 'optionalAccess', _21 => _21.finishing]) || _optionalChain([parsed, 'optionalAccess', _22 => _22.finishingType]),
      furnishingStatus: _optionalChain([metadata, 'optionalAccess', _23 => _23.furnishingStatus]) || _optionalChain([parsed, 'optionalAccess', _24 => _24.furnishingStatus]),
      phoneNumber: _optionalChain([parsed, 'optionalAccess', _25 => _25.phoneNumber]),
      urgencyScore: _optionalChain([parsed, 'optionalAccess', _26 => _26.urgencyScore]),
      sentiment: _optionalChain([parsed, 'optionalAccess', _27 => _27.sentiment]),
      matchingKeywords: _optionalChain([parsed, 'optionalAccess', _28 => _28.matchingKeywords]) || [],
      features: _optionalChain([metadata, 'optionalAccess', _29 => _29.featureCodes]) || [],
      sierraCode: _optionalChain([parsed, 'optionalAccess', _30 => _30.sierraCode]) || _optionalChain([metadata, 'optionalAccess', _31 => _31.code]),
    },
    intelligence: {
      code: _optionalChain([parsed, 'optionalAccess', _32 => _32.sierraCode]) || _optionalChain([metadata, 'optionalAccess', _33 => _33.code]) || '',
      locationCode: _optionalChain([metadata, 'optionalAccess', _34 => _34.locationCode]) || _optionalChain([parsed, 'optionalAccess', _35 => _35.compound]) || '',
      furnishingStatus: _optionalChain([metadata, 'optionalAccess', _36 => _36.furnishingStatus]) || 'U',
      normalizedPrice: _optionalChain([metadata, 'optionalAccess', _37 => _37.normalizedPrice]) || _optionalChain([parsed, 'optionalAccess', _38 => _38.price]) || 0,
      currency: _optionalChain([metadata, 'optionalAccess', _39 => _39.currency]) || 'EGP',
      featureCodes: _optionalChain([metadata, 'optionalAccess', _40 => _40.featureCodes]) || [],
      urgencyScore: _optionalChain([parsed, 'optionalAccess', _41 => _41.urgencyScore]) || 0,
      sentiment: _optionalChain([parsed, 'optionalAccess', _42 => _42.sentiment]) || 'neutral',
      matchingKeywords: _optionalChain([parsed, 'optionalAccess', _43 => _43.matchingKeywords]) || [],
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

export async function POST(req) {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;

  try {
    const body = await req.json() ;
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
    const existing = await listRecords('broker_listings', {
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

    const parsed = await WhatsAppParserService.parseMessage(rawMessage);
    
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
    const docRef = await insertRecord('broker_listings', { ...listing, dedupeHash });

    // Dual-Ingestion: Also append to Google Sheets Master Log
    try {
      await GoogleSheetsSync.appendRow('Leads', {
        id: docRef.id,
        sender,
        group,
        isListing: _optionalChain([parsed, 'optionalAccess', _44 => _44.isListing]) ? 'YES' : 'NO',
        content: rawMessage,
        date: new Date().toISOString()
      });
    } catch (e) {
      logger.warn('[WhatsApp Ingest] Google Sheets Dual-Ingest fell back to retry queue', e);
    }

    // Trigger the orchestration pipeline relay in the background
    OrchestratorService.runPipeline(docRef.id, 'brokerListings')
      .then(() => logger.info(`[WhatsApp Ingest] Triggered pipeline for ${docRef.id}`))
      .catch((err) => logger.error(`[WhatsApp Ingest] Pipeline error for ${docRef.id}`, err));

    return NextResponse.json({
      success: true,
      id: docRef.id,
      isListing: _optionalChain([parsed, 'optionalAccess', _45 => _45.isListing]) === true,
      sierraCode: _optionalChain([listing, 'access', _46 => _46.extractedData, 'optionalAccess', _47 => _47.sierraCode]) || null,
      orchestration: _optionalChain([parsed, 'optionalAccess', _48 => _48.isListing]) === true ? 'S1-S2 completed' : 'Stored for manual review',
      leilaReply
    });
  } catch (error) {
    logger.error('[WhatsApp Ingest Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: _optionalChain([error, 'optionalAccess', _49 => _49.message]),
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
