import { NextResponse } from 'next/server';
import { COMPOUNDS_HEATMAP_DATA } from '@/lib/services/compounds-heatmap-data';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const zoneFilter = searchParams.get('zone');
  const minYield = parseFloat(searchParams.get('minYield') || '0');

  let results = [...COMPOUNDS_HEATMAP_DATA];

  if (zoneFilter && zoneFilter !== 'all') {
    results = results.filter(c => c.zone.toLowerCase().includes(zoneFilter.toLowerCase()));
  }

  if (minYield > 0) {
    results = results.filter(c => c.rentalCapRate >= minYield);
  }

  return NextResponse.json({
    success: true,
    totalCompounds: results.length,
    averageMarketCapRate: 12.5,
    averagePricePerSqm: 75850,
    compounds: results,
  });
}
