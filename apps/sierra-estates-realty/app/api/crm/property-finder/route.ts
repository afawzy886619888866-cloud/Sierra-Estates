import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/models/schema';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

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

      const propertyRef = adminDb.collection(COLLECTIONS.units).doc(computedSyncHash);
      const existingSnap = await propertyRef.get();

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

      const now = Timestamp.now();

      const unitPayload = {
        id: computedSyncHash,
        code: sbrUniformCode,
        pfReferenceNumber: codeField || `SBR-AUTO-${computedSyncHash.substring(0, 5).toUpperCase()}`,
        compound: location,
        title: row.Name || `Luxury Property in ${location}`,
        price: parsedPrice,
        currency: 'EGP',
        status: String(row.Availability || '').toUpperCase() === 'RESALE' ? 'available' : 'rented',
        bedrooms: parseInt(String(row.BedRooms || '3')),
        area: parseFloat(spaceBua),
        furnishingStatus: furnishTag,
        syncHash: computedSyncHash,
        propertyType: String(row.PropertyType || 'apartment').toLowerCase(),
        ownerPhone: cleanMobileId,
        agentName: row.AgentName || 'Ahmed Fawzy',
        syncSource: 'crm-pf-import',
        updatedAt: now,
      };

      if (existingSnap.exists) {
        await propertyRef.update({ price: unitPayload.price, updatedAt: now });
        migrationSummaryLogs.push({ sync_hash: computedSyncHash, state: 'DEDUPLICATION_PRICE_UPDATED' });
      } else {
        await propertyRef.set({ ...unitPayload, createdAt: now });

        // Upsert owner record
        if (cleanMobileId) {
          await adminDb.collection('owners').doc(cleanMobileId).set(
            {
              ownerName: ownerField,
              primaryMobile: cleanMobileId,
              lastSyncAt: now,
            },
            { merge: true },
          );
        }

        migrationSummaryLogs.push({ sync_hash: computedSyncHash, state: 'NEW_RECORD_COMMITTED' });
      }

      // Short-lived 7-day TTL buffer log
      const sessionLogId = `LOG-BUF-${computedSyncHash}-${Date.now()}`;
      const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await adminDb.collection('SessionBufferLogs').doc(sessionLogId).set({
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
