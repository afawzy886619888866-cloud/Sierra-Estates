import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { insertRecords, listRecords } from '@sierra-estates/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

interface IngestProperty {
  compound: string;
  bua: number; // Built-up area
  floorLevel: string;
  unitNumber: string;
  bedrooms: number;
  furnished: 'F' | 'U' | 'S'; // Furnished, Unfurnished, Semi
  price: number;
  [key: string]: any;
}

/**
 * Compute SHA256 hash for deduplication
 */
function computeSyncHash(property: IngestProperty): string {
  const key = `${property.compound}|${property.bua}|${property.floorLevel}|${property.unitNumber}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate SBR Code: [Compound]-[Bedrooms][Furnishing]-[PriceAbbr]
 * Example: MVD-3F-85K (Mountain View Desert, 3 bed, Furnished, 85K EGP)
 */
function generateSBRCode(property: IngestProperty): string {
  const compoundAbbr = property.compound.split(' ').map((w) => w[0]).join('').toUpperCase();
  const furnishingTag = property.furnished === 'F' ? 'F' : property.furnished === 'S' ? 'S' : 'U';
  const priceAbbr = Math.round(property.price / 1000) + 'K';
  return `${compoundAbbr}-${property.bedrooms}${furnishingTag}-${priceAbbr}`;
}

/**
 * POST /api/admin/ingest
 * Ingest landlord Google Sheet, deduplicate, and stamp SBR codes
 * Requires a Supabase Auth token or the SBR_SECRET_KEY header
 * Accepts: Supabase access token OR X-SBR-SECRET-KEY header
 */
export async function POST(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { properties } = body;

    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty properties array' }, { status: 400 });
    }

    // Hash the incoming batch first, then ask only about those hashes. The
    // Firestore version pulled every listing that had a syncHash and built the
    // set in memory, which grew with the whole inventory rather than the batch.
    const hashed = properties.map((property: IngestProperty) => ({
      property,
      syncHash: computeSyncHash(property),
    }));

    const known = await listRecords<{ syncHash: string }>('listings', {
      where: [{ column: 'syncHash', op: 'in', value: hashed.map((h) => h.syncHash) }],
      select: 'sync_hash',
    });
    const existingHashes = new Set(known.map((row) => row.syncHash));

    const rows: Record<string, unknown>[] = [];
    let deduplicated = 0;

    for (const { property, syncHash } of hashed) {
      // Deduplication check
      if (existingHashes.has(syncHash)) {
        deduplicated++;
        continue;
      }
      // A batch can also repeat a unit against itself.
      existingHashes.add(syncHash);

      const sbrCode = generateSBRCode(property);

      // Flattened onto real columns: Firestore took the nested `specs` and
      // `location` objects, but those are columns here, and `status` is a
      // CHECK-constrained enum whose member is lowercase 'available'.
      rows.push({
        sbrCode,
        syncHash,
        compound: property.compound,
        title: `${sbrCode} - ${property.compound}`,
        bedrooms: property.bedrooms,
        bathrooms: Math.floor(property.bedrooms * 0.75),
        areaSqm: property.bua,
        finishingType:
          property.furnished === 'F'
            ? 'furnished'
            : property.furnished === 'S'
              ? 'semi-furnished'
              : 'unfurnished',
        price: property.price,
        pricePerSqm: Math.round(property.price / property.bua),
        dealType: 'resale',
        latitude: 30.0131,
        longitude: 31.4453,
        locationArea: property.compound,
        tags: ['ingested', property.furnished === 'F' ? 'furnished' : 'unfurnished'],
        status: 'available',
        syncSource: 'google-sheets-ingest',
      });
    }

    if (rows.length > 0) {
      await insertRecords('listings', rows);
    }

    return NextResponse.json({
      success: true,
      ingested: rows.length,
      deduplicated,
      totalProcessed: rows.length + deduplicated,
    });
  } catch (error) {
    logger.error('[Ingest] Error:', error);
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(error) },
      { status: 500 }
    );
  }
}
