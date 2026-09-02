 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';



















export async function GET(req) {
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
      (d) => d.data() 
    );

    // Aggregate
    const totalQueries = records.length;
    const queriesByLocale = { en: 0, ar: 0 };
    const queriesByOfferType = {};
    const queriesByExtraction = {};
    const topQueries = {};
    const noResultQueries = {};
    const topDistricts = {};
    const topCompounds = {};
    const queriesByDay = {};

    for (const r of records) {
      const localeKey = r.locale === 'ar' ? 'ar' : 'en';
      queriesByLocale[localeKey]++;
      const offerType = _nullishCoalesce(_optionalChain([r, 'access', _ => _.intent, 'optionalAccess', _2 => _2.offerType]), () => ( 'unknown'));
      queriesByOfferType[offerType] = (_nullishCoalesce(queriesByOfferType[offerType], () => ( 0))) + 1;
      queriesByExtraction[r.extractionMethod] = (_nullishCoalesce(queriesByExtraction[r.extractionMethod], () => ( 0))) + 1;

      const q = r.query.toLowerCase().trim();
      topQueries[q] = (_nullishCoalesce(topQueries[q], () => ( 0))) + 1;

      if (r.total === 0) {
        noResultQueries[q] = (_nullishCoalesce(noResultQueries[q], () => ( 0))) + 1;
      }

      for (const d of _nullishCoalesce(_optionalChain([r, 'access', _3 => _3.intent, 'optionalAccess', _4 => _4.districts]), () => ( []))) {
        topDistricts[d] = (_nullishCoalesce(topDistricts[d], () => ( 0))) + 1;
      }
      for (const c of _nullishCoalesce(_optionalChain([r, 'access', _5 => _5.intent, 'optionalAccess', _6 => _6.compounds]), () => ( []))) {
        topCompounds[c] = (_nullishCoalesce(topCompounds[c], () => ( 0))) + 1;
      }

      const day = r.timestamp.toDate().toISOString().slice(0, 10);
      queriesByDay[day] = (_nullishCoalesce(queriesByDay[day], () => ( 0))) + 1;
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
        ? records.reduce((sum, r) => sum + (_nullishCoalesce(r.total, () => ( 0))), 0) / totalQueries
        : 0;
    const noResultRate =
      totalQueries > 0
        ? records.filter((r) => r.total === 0).length / totalQueries
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
