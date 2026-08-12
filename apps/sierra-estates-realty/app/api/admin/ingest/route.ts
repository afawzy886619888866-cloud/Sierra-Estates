import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
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
 * Requires Firebase Auth token or SBR_SECRET_KEY header
 * Accepts: Firebase ID token OR X-SBR-SECRET-KEY header
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

    const batch = writeBatch(db);
    let ingested = 0;
    let deduplicated = 0;

    // Query existing sync hashes
    const existingQ = query(collection(db, 'properties'), where('syncHash', '!=', null));
    const existingSnap = await getDocs(existingQ);
    const existingHashes = new Set(existingSnap.docs.map((d) => d.data().syncHash));

    for (const property of properties) {
      const syncHash = computeSyncHash(property);

      // Deduplication check
      if (existingHashes.has(syncHash)) {
        deduplicated++;
        continue;
      }

      const sbrCode = generateSBRCode(property);
      const docRef = doc(collection(db, 'properties'));

      batch.set(docRef, {
        sbrCode,
        syncHash,
        compound: property.compound,
        name: `${sbrCode} - ${property.compound}`,
        specs: {
          bedrooms: property.bedrooms,
          bathrooms: Math.floor(property.bedrooms * 0.75),
          squareMeters: property.bua,
          furnished:
            property.furnished === 'F'
              ? 'furnished'
              : property.furnished === 'S'
                ? 'semi-furnished'
                : 'unfurnished',
        },
        price: property.price,
        pricePerSqm: Math.round(property.price / property.bua),
        type: 'Resale',
        location: {
          lat: 30.0131,
          lng: 31.4453,
          address: property.compound,
        },
        tags: ['ingested', property.furnished === 'F' ? 'furnished' : 'unfurnished'],
        status: 'Available',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'google-sheets-ingest',
      });

      ingested++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      ingested,
      deduplicated,
      totalProcessed: ingested + deduplicated,
    });
  } catch (error) {
    logger.error('[Ingest] Error:', error);
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(error) },
      { status: 500 }
    );
  }
}
