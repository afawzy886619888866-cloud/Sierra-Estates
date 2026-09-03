 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { insertRecord } from '@sierra-estates/db';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { GoogleSheetsSync } from '@/lib/services/sheets-sync';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';

/**
 * sierra estates — CRON: INGEST FROM GOOGLE SHEETS BUFFER
 *
 * Architecture: WhatsApp Scraper → Google Sheets (raw_messages tab) → this cron → Pipeline
 *
 * The scraper is fully decoupled from the website. It writes rows to Google Sheets.
 * This cron polls for PENDING rows every 5 minutes and processes them.
 *
 * Sheet columns (raw_messages tab):
 *   A: timestamp  |  B: from  |  C: groupName  |  D: body  |  E: hasMedia  |  F: status
 */

const SHEET_TAB = 'raw_messages';
const STATUS_COL_INDEX = 5; // F column (0-based index)
const HEADER_ROWS = 1;       // Row 1 is header

function getSheetsClient() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (keyRaw) {
    const credentials = JSON.parse(keyRaw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  }

  // Local dev fallback: use keyFile
  const auth = new google.auth.GoogleAuth({
    keyFile: './config/service_account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function buildListingDocument(rawMessage, sender, group, parsed) {
  const isListing = _optionalChain([parsed, 'optionalAccess', _ => _.isListing]) === true;

  const metadata = isListing && _optionalChain([parsed, 'optionalAccess', _2 => _2.price])
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
      compound: _optionalChain([parsed, 'optionalAccess', _3 => _3.compound]),
      propertyType: _optionalChain([parsed, 'optionalAccess', _4 => _4.type]) || _optionalChain([parsed, 'optionalAccess', _5 => _5.propertyType]),
      bedrooms: _optionalChain([parsed, 'optionalAccess', _6 => _6.bedrooms]),
      price: _optionalChain([parsed, 'optionalAccess', _7 => _7.price]),
      currency: _optionalChain([parsed, 'optionalAccess', _8 => _8.currency]) || 'EGP',
      area: _optionalChain([parsed, 'optionalAccess', _9 => _9.area]),
      finishingType: _optionalChain([parsed, 'optionalAccess', _10 => _10.finishing]) || _optionalChain([parsed, 'optionalAccess', _11 => _11.finishingType]),
      furnishingStatus: _optionalChain([metadata, 'optionalAccess', _12 => _12.furnishingStatus]) || _optionalChain([parsed, 'optionalAccess', _13 => _13.furnishingStatus]),
      phoneNumber: _optionalChain([parsed, 'optionalAccess', _14 => _14.phoneNumber]),
      urgencyScore: _optionalChain([parsed, 'optionalAccess', _15 => _15.urgencyScore]),
      sentiment: _optionalChain([parsed, 'optionalAccess', _16 => _16.sentiment]),
      matchingKeywords: _optionalChain([parsed, 'optionalAccess', _17 => _17.matchingKeywords]) || [],
      features: _optionalChain([metadata, 'optionalAccess', _18 => _18.featureCodes]) || [],
      sierraCode: _optionalChain([parsed, 'optionalAccess', _19 => _19.sierraCode]) || _optionalChain([metadata, 'optionalAccess', _20 => _20.code]),
    },
    intelligence: {
      code: _optionalChain([parsed, 'optionalAccess', _21 => _21.sierraCode]) || _optionalChain([metadata, 'optionalAccess', _22 => _22.code]) || '',
      locationCode: _optionalChain([metadata, 'optionalAccess', _23 => _23.locationCode]) || _optionalChain([parsed, 'optionalAccess', _24 => _24.compound]) || '',
      furnishingStatus: _optionalChain([metadata, 'optionalAccess', _25 => _25.furnishingStatus]) || 'U',
      normalizedPrice: _optionalChain([metadata, 'optionalAccess', _26 => _26.normalizedPrice]) || _optionalChain([parsed, 'optionalAccess', _27 => _27.price]) || 0,
      currency: _optionalChain([metadata, 'optionalAccess', _28 => _28.currency]) || 'EGP',
      featureCodes: _optionalChain([metadata, 'optionalAccess', _29 => _29.featureCodes]) || [],
      urgencyScore: _optionalChain([parsed, 'optionalAccess', _30 => _30.urgencyScore]) || 0,
      sentiment: _optionalChain([parsed, 'optionalAccess', _31 => _31.sentiment]) || 'neutral',
      matchingKeywords: _optionalChain([parsed, 'optionalAccess', _32 => _32.matchingKeywords]) || [],
      parserVersion: 'sheets-cron/v1',
      lastUpdatedAt: new Date().toISOString(),
    },
    status: isListing ? 'parsed' : 'new',
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orchestrationState: {
      stage: isListing ? 'S2' : 'S1',
      status: isListing ? 'completed' : 'pending',
      engineVersion: 'sheets-cron/v1',
      lastTriggeredAt: new Date().toISOString(),
    },
  };
}

export async function GET(req) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  const spreadsheetId = process.env.BROKER_INBOX_SHEET_ID;
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'BROKER_INBOX_SHEET_ID is not configured.' },
      { status: 500 }
    );
  }

  const results = { processed: 0, skipped: 0, failed: 0 };

  try {
    logger.info('[CRON:ingest-from-sheets] Starting — reading Sheets buffer...');
    const sheets = getSheetsClient();

    // Read all rows from the raw_messages tab
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TAB}!A:F`,
    });

    const rows = readRes.data.values || [];
    const dataRows = rows.slice(HEADER_ROWS); // skip header row

    const pendingRows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row[STATUS_COL_INDEX] === 'PENDING') {
        pendingRows.push({ rowIndex: i + HEADER_ROWS + 1, row }); // 1-based sheet row number
      }
    }

    logger.info(`[CRON:ingest-from-sheets] Found ${pendingRows.length} PENDING rows`);

    for (const { rowIndex, row } of pendingRows) {
      const [, from, groupName, body] = row;
      const rawMessage = (body || '').trim();

      if (!rawMessage) {
        // Update status to SKIPPED so we don't retry empty rows
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TAB}!F${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['SKIPPED']] },
        });
        results.skipped++;
        continue;
      }

      try {
        const parsed = await WhatsAppParserService.parseMessage(rawMessage);
        const listing = buildListingDocument(rawMessage, from || 'Unknown', groupName || 'Unknown', parsed);
        const docRef = await insertRecord('broker_listings', listing);

        // Dual-ingest: append to master Sheets log (non-blocking)
        GoogleSheetsSync.appendRow('Leads', {
          id: docRef.id,
          sender: from || 'Unknown',
          group: groupName || 'Unknown',
          isListing: _optionalChain([parsed, 'optionalAccess', _33 => _33.isListing]) ? 'YES' : 'NO',
          content: rawMessage,
          date: new Date().toISOString(),
        }).catch((e) => logger.warn('[CRON:ingest-from-sheets] Sheets dual-ingest failed', e));

        // Trigger orchestration pipeline (non-blocking)
        OrchestratorService.runPipeline(docRef.id, 'brokerListings')
          .then(() => logger.info(`[CRON:ingest-from-sheets] Pipeline triggered for ${docRef.id}`))
          .catch((err) => logger.error(`[CRON:ingest-from-sheets] Pipeline error for ${docRef.id}`, err));

        // Mark row as PROCESSED
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TAB}!F${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['PROCESSED']] },
        });

        results.processed++;
        logger.info(`[CRON:ingest-from-sheets] ✅ Row ${rowIndex} → ${docRef.id}`);
      } catch (rowErr) {
        logger.error(`[CRON:ingest-from-sheets] ❌ Row ${rowIndex} failed:`, rowErr.message);

        // Mark row as FAILED so it's not retried indefinitely
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TAB}!F${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['FAILED']] },
        }).catch((sheetErr) => logger.error(`[CRON:ingest-from-sheets] Failed to mark row ${rowIndex} as FAILED:`, sheetErr));

        results.failed++;
      }
    }

    // Log to the activity feed if anything was processed
    if (results.processed > 0) {
      await insertRecord('activities', {
        type: 'sheets_ingest_completed',
        actorId: 'system',
        actorName: 'Sheets Ingest Cron',
        description: `Sheets buffer: **${results.processed} messages** ingested, **${results.failed}** failed.`,
        text: `Sheets buffer: **${results.processed} messages** ingested, **${results.failed}** failed.`,
        color: 'var(--green-light)',
        createdAt: new Date().toISOString(),
      });
    }

    logger.info(`[CRON:ingest-from-sheets] Done — processed: ${results.processed}, skipped: ${results.skipped}, failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[CRON:ingest-from-sheets] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
