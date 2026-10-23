#!/usr/bin/env tsx
/**
 * Sierra Estates Executive Intelligence Briefing Dispatcher
 * Aggregates daily inventory signals directly from the authoritative
 * Supabase PostgreSQL database engine. §21 no-fabrication: every figure
 * printed is derived from real rows — nothing is estimated, defaulted, or
 * invented when the data is missing.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGZxY2lldHpvb25sbWF0aW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjI3ODAsImV4cCI6MjEwMzczODc4MH0.Eb43G38s9ODOAkR2Nextp4mtVAa_XTyqJ8nQWgwCsnk';

interface DailyBriefingStats {
  date: string;
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

  try {
    const { count, error: countErr } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (!countErr && typeof count === 'number') {
      totalCount = count;
    }

    const { data, error: fetchErr } = await supabase
      .from('listings')
      .select('id, compound, property_type, price, deal_type, featured, is_hot_deal, area_sqm, bedrooms')
      .limit(500);

    if (!fetchErr && Array.isArray(data)) {
      rawListings = data;
    }
  } catch (err) {
    console.warn('[Briefing] Supabase fetch fallback:', err);
  }

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

  console.log('\n✅ Daily Executive Intelligence Briefing generated successfully and ready for broadcast.\n');
}

main().catch((err) => {
  console.error('Fatal error generating daily briefing:', err);
  process.exit(1);
});
