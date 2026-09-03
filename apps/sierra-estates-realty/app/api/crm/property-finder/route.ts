import { NextRequest, NextResponse } from 'next/server';
import { getRecord, insertRecord, updateRecord, upsertRecord } from '@sierra-estates/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * CRM spreadsheet import (Property Finder export rows) → public.listings.
 *
 * The sha256 dedupe fingerprint is the listing's primary key, exactly as it was
 * the Firestore document id, so re-importing the same row still updates rather
 * than duplicates.
 *
 * Firestore → Postgres field mapping. Every field is preserved; those with a
 * canonical column are written there rather than duplicated:
 *   currency → price_currency     area   → area_sqm
 *   status   → status, with 'available' written as 'active' (the value the
 *              public listings read filters on) and the original kept in
 *              raw_data.crmStatus so the translation is reversible.
 */

export async function POST(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const payload = await request.json();
    const { rows } = payload;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'No rows provided' }, { status: 400 });
    }

    const migrationSummaryLogs: Array<{ sync_hash: string; state: string }> = [];

    for (const row of rows) {
      // Phone number sanitization — normalize to 11-digit Egyptian format
      let cleanMobileId = String(row.Mobile || '').replace(/[\s\-\+\(\)]/g, '').trim();
      if (cleanMobileId.startsWith('20')) cleanMobileId = cleanMobileId.substring(2);
      if (cleanMobileId.startsWith('0020')) cleanMobileId = cleanMobileId.substring(4);
      if (!cleanMobileId.startsWith('0') && cleanMobileId.length === 10) cleanMobileId = '0' + cleanMobileId;

      // Deduplication: SHA256(Location + BUA Area + Code + Owner)
      const location = String(row.Location || 'New Cairo').trim();
      const spaceBua = String(row.RentPeriodType || '150').trim();
      const codeField = String(row.Code || '0').trim();
      const ownerField = String(row.Owner || 'Direct Investor').trim();

      const rawTokenSignature = `${location}-${spaceBua}-${codeField}-${ownerField}`.toLowerCase().trim();
      const computedSyncHash = crypto.createHash('sha256').update(rawTokenSignature).digest('hex');

      const existing = await getRecord('listings', computedSyncHash);

      // SBR uniform tracking code: Prefix-Rooms[Furnish]-Price
      const compPrefix = location.substring(0, 3).toUpperCase();
      const furnishTag =
        row.Furniture === 'Fully Finished with Furniture' || row.Furniture === 'Furnished' ? 'F' : 'U';
      const parsedPrice =
        typeof row.UnitPrice === 'number'
          ? row.UnitPrice
          : parseFloat(String(row.UnitPrice || '0').replace(/[^0-9]/g, ''));
      const priceAbbrev =
        parsedPrice >= 1000000
          ? `${(parsedPrice / 1000000).toFixed(0)}M`
          : `${(parsedPrice / 1000).toFixed(0)}K`;
      const sbrUniformCode = `${compPrefix}-${row.BedRooms || '3'}${furnishTag}-${priceAbbrev}`;

      const now = new Date().toISOString();
      const crmStatus = String(row.Availability || '').toUpperCase() === 'RESALE' ? 'available' : 'rented';

      const unitPayload = {
        id: computedSyncHash,
        code: sbrUniformCode,
        pfReferenceNumber: codeField || `SBR-AUTO-${computedSyncHash.substring(0, 5).toUpperCase()}`,
        compound: location,
        title: row.Name || `Luxury Property in ${location}`,
        price: parsedPrice,
        priceCurrency: 'EGP',
        status: crmStatus === 'available' ? 'active' : 'rented',
        bedrooms: parseInt(String(row.BedRooms || '3')),
        areaSqm: parseFloat(spaceBua),
        furnishingStatus: furnishTag,
        syncHash: computedSyncHash,
        propertyType: String(row.PropertyType || 'apartment').toLowerCase(),
        ownerPhone: cleanMobileId,
        agentName: row.AgentName || 'Ahmed Fawzy',
        syncSource: 'crm-pf-import',
        rawData: { crmStatus },
        updatedAt: now,
      };

      if (existing) {
        await updateRecord('listings', computedSyncHash, { price: unitPayload.price, updatedAt: now });
        migrationSummaryLogs.push({ sync_hash: computedSyncHash, state: 'DEDUPLICATION_PRICE_UPDATED' });
      } else {
        await insertRecord('listings', { ...unitPayload, createdAt: now });

        // Upsert owner record — keyed on the phone, which was the document id
        // in Firestore and is the natural key (primary_mobile) in Postgres.
        if (cleanMobileId) {
          await upsertRecord(
            'owners',
            {
              ownerName: ownerField,
              primaryMobile: cleanMobileId,
              lastSyncAt: now,
            },
            'primary_mobile',
          );
        }

        migrationSummaryLogs.push({ sync_hash: computedSyncHash, state: 'NEW_RECORD_COMMITTED' });
      }

      // Short-lived 7-day TTL buffer log. Firestore expired these itself; in
      // Postgres expire_at is recorded but nothing reaps it yet.
      const sessionLogId = `LOG-BUF-${computedSyncHash}-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await insertRecord('session_buffer_logs', {
        id: sessionLogId,
        targetSyncHash: computedSyncHash,
        eventType: 'SPREADSHEET_ROW_INGESTION',
        agentIdentity: 'Sierra AI Ingestion Pipeline',
        createdAt: now,
        expireAt: expiresAt,
      });
    }

    return NextResponse.json({ success: true, tracking_summary: migrationSummaryLogs });
  } catch (error: any) {
    logger.error('[CRM/PF] Import failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
