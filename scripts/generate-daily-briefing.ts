#!/usr/bin/env tsx
/**
 * Sierra Estates Executive Intelligence Briefing Dispatcher
 * Aggregates daily inventory signals directly from the authoritative
 * Supabase PostgreSQL database engine. §21 no-fabrication: every figure
 * printed is derived from real rows — nothing is estimated, defaulted, or
 * invented when the data is missing.
 *
 * H1 TRUTHFULNESS CONTRACT (execution order 2026-10-27):
 * A failed mandatory inventory query is NOT a factual zero, and an
 * unavailable database is NOT an empty healthy inventory. The briefing now
 * classifies its own data health BEFORE claiming readiness:
 *   · OK       — both mandatory queries succeeded (a genuine zero-row
 *                result is OK: the query succeeded and the table truly
 *                has no matching records). Ready for broadcast, exit 0.
 *   · DEGRADED — one mandatory query failed (missing metric named).
 *                Document is created but NOT ready for broadcast, exit 2.
 *   · BLOCKED  — both mandatory queries failed (DB unavailable / query
 *                errors). Nothing is ready for broadcast, exit 1.
 * Any downstream "sender" MUST gate on `readyForBroadcast` (or the final
 * BRIEFING_RESULT JSON line / the exit code) before distributing a
 * briefing as verified intelligence.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL — refusing to fall back to a hardcoded Supabase project.');
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

export type BriefingQueryOutcome = 'ok' | 'error';
export type BriefingDataStatus = 'OK' | 'DEGRADED' | 'BLOCKED';

export interface BriefingQueryResults {
  /** active-listings count query (mandatory) */
  activeListingsCount: BriefingQueryOutcome;
  /** inventory sample query (mandatory) */
  inventorySample: BriefingQueryOutcome;
}

/** Exit codes: non-zero for DEGRADED/BLOCKED so CI/fleet badges tell the
 * truth — a "successful" Actions result must never again coexist with an
 * unavailable inventory query (observed in run 40332038097). */
export const BRIEFING_EXIT_CODE: Record<BriefingDataStatus, number> = {
  OK: 0,
  DEGRADED: 2,
  BLOCKED: 1,
};

/** Pure classification of data health from per-query outcomes. */
export function computeBriefingStatus(
  q: BriefingQueryResults,
): { status: BriefingDataStatus; missingMetrics: string[]; readyForBroadcast: boolean } {
  const missingMetrics: string[] = [];
  if (q.activeListingsCount === 'error') missingMetrics.push('activeListingsCount');
  if (q.inventorySample === 'error') missingMetrics.push('inventorySample');
  if (missingMetrics.length === 0) {
    return { status: 'OK', missingMetrics: [], readyForBroadcast: true };
  }
  if (missingMetrics.length === 2) {
    return { status: 'BLOCKED', missingMetrics, readyForBroadcast: false };
  }
  return { status: 'DEGRADED', missingMetrics, readyForBroadcast: false };
}

interface DailyBriefingStats {
  date: string;
  dataStatus: BriefingDataStatus;
  missingMetrics: string[];
  readyForBroadcast: boolean;
  totalActiveListings: number | null;
  totalMarketVolumeEGP: number | null;
  compoundDistribution: { compound: string; count: number; avgPriceEGP: number }[];
  arbitrageOpportunities: {
    compound: string;
    unitType: string;
    askingPriceEGP: number;
    tag?: string;
  }[];
}

export async function generateDailyDigest(): Promise<DailyBriefingStats> {
  const dateStr = new Date().toISOString().split('T')[0];
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // §21 no-fabrication: no invented 9,534 fallback count — when the count
  // query fails the briefing says so instead of quoting a made-up number.
  let totalCount: number | null = null;
  let rawListings: any[] = [];
  let countOutcome: BriefingQueryOutcome = 'error';
  let fetchOutcome: BriefingQueryOutcome = 'error';

  // Each mandatory query is tracked independently so a partial outage is
  // DEGRADED (named missing metric), never a fabricated healthy empty set.
  try {
    const { count, error: countErr } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (!countErr && typeof count === 'number') {
      totalCount = count;
      countOutcome = 'ok';
    }
  } catch (err) {
    console.warn('[Briefing] count query failed:', (err as Error).message);
  }

  try {
    const { data, error: fetchErr } = await supabase
      .from('listings')
      .select('id, compound, property_type, price, deal_type, featured, is_hot_deal, area_sqm, bedrooms')
      .limit(500);

    if (!fetchErr && Array.isArray(data)) {
      rawListings = data;
      fetchOutcome = 'ok'; // a successful query with zero rows is a genuine empty
    }
  } catch (err) {
    console.warn('[Briefing] inventory sample query failed:', (err as Error).message);
  }

  const { status, missingMetrics, readyForBroadcast } = computeBriefingStatus({
    activeListingsCount: countOutcome,
    inventorySample: fetchOutcome,
  });

  // Calculate volume & compound stats
  let totalSamplePrice = 0;
  let validPriceCount = 0;
  const compoundCounts: Record<string, { count: number; totalPrice: number }> = {};

  for (const item of rawListings) {
    const price = Number(item.price) || 0;
    if (price > 0) {
      totalSamplePrice += price;
      validPriceCount++;
    }
    // §21 no-fabrication: rows without a compound bucket under an explicit
    // 'Unspecified compound' label — never silently counted as 'New Cairo'.
    const cmp = item.compound || 'Unspecified compound';
    if (!compoundCounts[cmp]) {
      compoundCounts[cmp] = { count: 0, totalPrice: 0 };
    }
    compoundCounts[cmp].count++;
    compoundCounts[cmp].totalPrice += price;
  }

  // §21 no-fabrication: no invented 12.5M average — when the sample carries
  // no priced rows (or the count query failed) the volume estimate is
  // simply unavailable rather than fabricated.
  const avgPrice = validPriceCount > 0 ? totalSamplePrice / validPriceCount : null;
  const estimatedTotalVolume =
    avgPrice != null && totalCount != null ? totalCount * avgPrice : null;

  const compoundDistribution = Object.entries(compoundCounts)
    .map(([compound, val]) => ({
      compound,
      count: val.count,
      avgPriceEGP: Math.round(val.totalPrice / (val.count || 1)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Extract top hot deals / arbitrage opportunities from active listings.
  // §21 no-fabrication: only rows with a stated asking price are listed, and
  // the invented AVM fair-value / discount-percent figures are gone — they
  // had no valuation source behind them.
  const hotDeals = rawListings.filter((l) => l.is_hot_deal || l.featured);
  const pool = hotDeals.length >= 3 ? hotDeals : rawListings;
  const samplePicks = pool.filter((l) => Number(l.price) > 0).slice(0, 3);

  const arbitrageOpportunities = samplePicks.map((pick) => ({
    compound: pick.compound || 'Unspecified compound',
    unitType: pick.property_type || 'Unspecified',
    askingPriceEGP: Number(pick.price),
    tag: pick.is_hot_deal ? 'Hot Deal' : pick.featured ? 'Featured' : 'Sampled Listing',
  }));

  return {
    date: dateStr,
    dataStatus: status,
    missingMetrics,
    readyForBroadcast,
    totalActiveListings: totalCount,
    totalMarketVolumeEGP: estimatedTotalVolume,
    compoundDistribution,
    arbitrageOpportunities,
  };
}

async function main() {
  console.log('\n======================================================================');
  console.log('🏛️  SIERRA ESTATES EXECUTIVE INTELLIGENCE BRIEFING');
  console.log('🗄️  Source Engine: Supabase PostgreSQL (pgvector & PostGIS Spatial)');
  console.log('======================================================================\n');

  const digest = await generateDailyDigest();

  console.log(`📅 Briefing Date: ${digest.date}`);
  console.log(
    `📊 Total Active Listings in Stock: ${
      digest.totalActiveListings != null
        ? digest.totalActiveListings.toLocaleString() + ' properties'
        : 'unavailable (count query failed)'
    }`
  );
  console.log(
    `💰 Estimated Active Portfolio Volume: ${
      digest.totalMarketVolumeEGP != null
        ? (digest.totalMarketVolumeEGP / 1e9).toFixed(2) + ' Billion EGP'
        : 'insufficient priced listings to estimate'
    }\n`
  );

  if (digest.missingMetrics.includes('inventorySample')) {
    // An empty section below must never be readable as "verified empty
    // inventory" — say WHY the sample is missing (H1).
    console.log(
      '⚠️  Inventory sample UNAVAILABLE (query failed) — the compound/opportunity sections below are omitted, NOT an empty inventory.'
    );
  }

  console.log('🏘️  TOP COMPOUND INVENTORY HUBS:');
  digest.compoundDistribution.forEach((hub, i) => {
    console.log(`  ${i + 1}. ${hub.compound}: ${hub.count} units sampled | Avg Price: ${(hub.avgPriceEGP / 1e6).toFixed(1)}M EGP`);
  });

  console.log('\n💎 TOP ARBITRAGE & HIGH-YIELD OPPORTUNITIES:');
  digest.arbitrageOpportunities.forEach((opp, i) => {
    console.log(
      `  ${i + 1}. [${opp.compound}] ${opp.unitType} (${opp.tag}): ${(opp.askingPriceEGP / 1e6).toFixed(1)}M EGP asking`
    );
  });

  // ── H1 broadcast gate ─────────────────────────────────────────────────
  // Readiness is a function of data health, not of document creation.
  if (digest.dataStatus === 'OK') {
    console.log('\n✅ Daily Executive Intelligence Briefing generated successfully and ready for broadcast.\n');
  } else if (digest.dataStatus === 'DEGRADED') {
    console.log(
      `\n⚠️  BRIEFING STATUS: DEGRADED — missing: ${digest.missingMetrics.join(', ')}. NOT ready for broadcast: an incomplete briefing must not be distributed as verified intelligence.\n`
    );
  } else {
    console.log(
      `\n🛑 BRIEFING STATUS: BLOCKED — mandatory inventory queries failed (${digest.missingMetrics.join(', ')}). No briefing is ready for broadcast.\n`
    );
  }

  // Machine-readable gate for any sender/CI consumer.
  console.log(
    `BRIEFING_RESULT ${JSON.stringify({
      status: digest.dataStatus,
      readyForBroadcast: digest.readyForBroadcast,
      missingMetrics: digest.missingMetrics,
    })}`
  );
  process.exitCode = BRIEFING_EXIT_CODE[digest.dataStatus];
}

/* Testability guard: importing this module must never execute main().
 * Direct run (tsx, CJS): require.main === module. Under vitest (ESM):
 * `require` is undefined → guard stays false. */
const isDirectRun = typeof require !== 'undefined' && require.main === module;
if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal error generating daily briefing:', err);
    process.exit(1);
  });
}
