import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/models/schema';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { GoogleSheetsSync } from '@/lib/services/sheets-sync';
import { logger } from '@/lib/logger';

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

function buildListingDocument(rawMessage: string, sender: string, group: string, parsed: any) {
  const isListing = parsed?.isListing === true;

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
      parserVersion: 'sheets-cron/v1',
      lastUpdatedAt: Timestamp.now(),
    },
    status: isListing ? 'parsed' : 'new',
    isVerified: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    orchestrationState: {
      stage: isListing ? 'S2' : 'S1',
      status: isListing ? 'completed' : 'pending',
      engineVersion: 'sheets-cron/v1',
      lastTriggeredAt: Timestamp.now() as any,
    },
  };
}

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this automatically in production)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    const pendingRows: Array<{ rowIndex: number; row: string[] }> = [];
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
        const docRef = await adminDb.collection(COLLECTIONS.brokerListings).add(listing);

        // Dual-ingest: append to master Sheets log (non-blocking)
        GoogleSheetsSync.appendRow('Leads', {
          id: docRef.id,
          sender: from || 'Unknown',
          group: groupName || 'Unknown',
          isListing: parsed?.isListing ? 'YES' : 'NO',
          content: rawMessage,
          date: new Date().toISOString(),
        }).catch((e: any) => logger.warn('[CRON:ingest-from-sheets] Sheets dual-ingest failed', e));

        // Trigger orchestration pipeline (non-blocking)
        OrchestratorService.runPipeline(docRef.id, 'brokerListings')
          .then(() => logger.info(`[CRON:ingest-from-sheets] Pipeline triggered for ${docRef.id}`))
          .catch((err: any) => logger.error(`[CRON:ingest-from-sheets] Pipeline error for ${docRef.id}`, err));

        // Mark row as PROCESSED
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TAB}!F${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['PROCESSED']] },
        });

        results.processed++;
        logger.info(`[CRON:ingest-from-sheets] ✅ Row ${rowIndex} → ${docRef.id}`);
      } catch (rowErr: any) {
        logger.error(`[CRON:ingest-from-sheets] ❌ Row ${rowIndex} failed:`, rowErr.message);

        // Mark row as FAILED so it's not retried indefinitely
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TAB}!F${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['FAILED']] },
        }).catch(() => {});

        results.failed++;
      }
    }

    // Log to Firestore activities if anything was processed
    if (results.processed > 0) {
      await adminDb.collection(COLLECTIONS.activities).add({
        type: 'sheets_ingest_completed',
        actorId: 'system',
        actorName: 'Sheets Ingest Cron',
        description: `Sheets buffer: **${results.processed} messages** ingested, **${results.failed}** failed.`,
        text: `Sheets buffer: **${results.processed} messages** ingested, **${results.failed}** failed.`,
        color: 'var(--green-light)',
        createdAt: Timestamp.now(),
      });
    }

    logger.info(`[CRON:ingest-from-sheets] Done — processed: ${results.processed}, skipped: ${results.skipped}, failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[CRON:ingest-from-sheets] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
