/**
 * /api/admin/search-insights — analytics for the AI semantic search
 *
 * Aggregates data from the `search_queries` collection (populated by
 * /api/search/semantic) to give admins visibility into:
 *   - Top queries
 *   - Top no-result queries (inventory gaps)
 *   - Locale split (EN vs AR)
 *   - Rent vs Sale split
 *   - Top compounds/districts searched
 *   - Extraction method split (AI vs regex fallback)
 *   - Time-series (queries per day)
 *
 * Security: admin-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

interface SearchQueryRecord {
  query: string;
  locale: 'en' | 'ar';
  intent?: {
    offerType: string;
    propertyType: string;
    districts: string[];
    compounds: string[];
    priceMax?: number;
    bedsMin?: number;
    currency: string;
  };
  extractionMethod: 'ai' | 'regex-fallback';
  total: number;
  timestamp: FirebaseFirestore.Timestamp;
  userAgent?: string;
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceTs = Timestamp.fromDate(since);

    const snap = await adminDb
      .collection('search_queries')
      .where('timestamp', '>=', sinceTs)
      .orderBy('timestamp', 'desc')
      .limit(5000)
      .get();

    const records = snap.docs.map(
      (d: FirebaseFirestore.QueryDocumentSnapshot) => d.data() as SearchQueryRecord
    );

    // Aggregate
    const totalQueries = records.length;
    const queriesByLocale = { en: 0, ar: 0 };
    const queriesByOfferType: Record<string, number> = {};
    const queriesByExtraction: Record<string, number> = {};
    const topQueries: Record<string, number> = {};
    const noResultQueries: Record<string, number> = {};
    const topDistricts: Record<string, number> = {};
    const topCompounds: Record<string, number> = {};
    const queriesByDay: Record<string, number> = {};

    for (const r of records) {
      const localeKey = r.locale === 'ar' ? 'ar' : 'en';
      queriesByLocale[localeKey]++;
      const offerType = r.intent?.offerType ?? 'unknown';
      queriesByOfferType[offerType] = (queriesByOfferType[offerType] ?? 0) + 1;
      queriesByExtraction[r.extractionMethod] = (queriesByExtraction[r.extractionMethod] ?? 0) + 1;

      const q = r.query.toLowerCase().trim();
      topQueries[q] = (topQueries[q] ?? 0) + 1;

      if (r.total === 0) {
        noResultQueries[q] = (noResultQueries[q] ?? 0) + 1;
      }

      for (const d of r.intent?.districts ?? []) {
        topDistricts[d] = (topDistricts[d] ?? 0) + 1;
      }
      for (const c of r.intent?.compounds ?? []) {
        topCompounds[c] = (topCompounds[c] ?? 0) + 1;
      }

      const day = r.timestamp.toDate().toISOString().slice(0, 10);
      queriesByDay[day] = (queriesByDay[day] ?? 0) + 1;
    }

    const topQueriesArray = Object.entries(topQueries)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const noResultQueriesArray = Object.entries(noResultQueries)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const topDistrictsArray = Object.entries(topDistricts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const topCompoundsArray = Object.entries(topCompounds)
      .map(([compound, count]) => ({ compound, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const timeSeries = Object.entries(queriesByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate averages
    const avgResultsPerQuery =
      totalQueries > 0
        ? records.reduce((sum: number, r: SearchQueryRecord) => sum + (r.total ?? 0), 0) / totalQueries
        : 0;
    const noResultRate =
      totalQueries > 0
        ? records.filter((r: SearchQueryRecord) => r.total === 0).length / totalQueries
        : 0;

    return NextResponse.json({
      success: true,
      range: { days, since: since.toISOString(), until: new Date().toISOString() },
      summary: {
        totalQueries,
        avgResultsPerQuery: Math.round(avgResultsPerQuery * 10) / 10,
        noResultRate: Math.round(noResultRate * 1000) / 10, // percentage, 1 decimal
      },
      queriesByLocale,
      queriesByOfferType,
      queriesByExtraction,
      topQueries: topQueriesArray,
      noResultQueries: noResultQueriesArray,
      topDistricts: topDistrictsArray,
      topCompounds: topCompoundsArray,
      timeSeries,
    });
  } catch (err) {
    logger.error('[search-insights] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch search insights', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
