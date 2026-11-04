/**
 * Real 2026 New Cairo & Target Compound Market Baselines
 * Autoritative Seeds for public.unified_memory
 *
 * Governs AI valuation badges, GEM anomaly detection (>15% below compound avg),
 * rental yield / cap rate modeling, and historical price trend vectors.
 */

export interface BedroomRentalRange {
  min: number;
  avg: number;
  max: number;
}

export interface MarketBaselineValue {
  compound: string;
  canonical_name: string;
  city: string;
  submarket: string;
  year: number;
  resale: {
    avgPriceSqmEgp: number;
    minPriceSqmEgp: number;
    maxPriceSqmEgp: number;
    currency: 'EGP';
  };
  rental: {
    avgRentMonthlyEgp: number;
    currency: 'EGP';
    rangesByBedrooms: {
      '1br'?: BedroomRentalRange;
      '2br'?: BedroomRentalRange;
      '3br'?: BedroomRentalRange;
      '4br+'?: BedroomRentalRange;
      penthouse?: BedroomRentalRange;
      townhouse?: BedroomRentalRange;
      standalone_villa?: BedroomRentalRange;
    };
  };
  capRatePct: number;
  grossYieldPct: number;
  historicalPriceTrendVectors: Array<{
    period: string;
    avgPriceSqmEgp: number;
  }>;
  luxuryIndex: number; // Scale 1 - 10
  demandScore: number; // Scale 1 - 100
  lastCalibrated: string;
}

export interface UnifiedMemoryBaselineRecord {
  agent_id: string;
  category: string;
  key: string;
  value: MarketBaselineValue;
  source: string;
  ttl_seconds?: number | null;
}

export const MARKET_BASELINES_2026: UnifiedMemoryBaselineRecord[] = [
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.hyde_park',
    source: 'verified-system',
    value: {
      compound: 'Hyde Park',
      canonical_name: 'Hyde Park New Cairo',
      city: 'New Cairo',
      submarket: 'Golden Square / South 90th',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 75000,
        minPriceSqmEgp: 65000,
        maxPriceSqmEgp: 95000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 55000,
        currency: 'EGP',
        rangesByBedrooms: {
          '1br': { min: 25000, avg: 32000, max: 40000 },
          '2br': { min: 38000, avg: 48000, max: 60000 },
          '3br': { min: 50000, avg: 62000, max: 80000 },
          '4br+': { min: 70000, avg: 85000, max: 110000 },
          penthouse: { min: 65000, avg: 80000, max: 105000 },
          townhouse: { min: 85000, avg: 110000, max: 140000 },
          standalone_villa: { min: 130000, avg: 175000, max: 240000 },
        },
      },
      capRatePct: 8.5,
      grossYieldPct: 9.2,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 52000 },
        { period: '2025-Q2', avgPriceSqmEgp: 58000 },
        { period: '2025-Q3', avgPriceSqmEgp: 64000 },
        { period: '2025-Q4', avgPriceSqmEgp: 70000 },
        { period: '2026-Q1', avgPriceSqmEgp: 75000 },
      ],
      luxuryIndex: 8.8,
      demandScore: 94,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.mountain_view_hyde_park',
    source: 'verified-system',
    value: {
      compound: 'Mountain View Hyde Park',
      canonical_name: 'Mountain View Hyde Park (MVHP)',
      city: 'New Cairo',
      submarket: 'Golden Square',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 82000,
        minPriceSqmEgp: 70000,
        maxPriceSqmEgp: 110000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 65000,
        currency: 'EGP',
        rangesByBedrooms: {
          '1br': { min: 30000, avg: 38000, max: 48000 },
          '2br': { min: 45000, avg: 56000, max: 70000 },
          '3br': { min: 60000, avg: 74000, max: 95000 },
          '4br+': { min: 80000, avg: 105000, max: 135000 },
          penthouse: { min: 75000, avg: 95000, max: 125000 },
          townhouse: { min: 95000, avg: 125000, max: 160000 },
          standalone_villa: { min: 150000, avg: 195000, max: 270000 },
        },
      },
      capRatePct: 9.0,
      grossYieldPct: 9.8,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 56000 },
        { period: '2025-Q2', avgPriceSqmEgp: 63000 },
        { period: '2025-Q3', avgPriceSqmEgp: 71000 },
        { period: '2025-Q4', avgPriceSqmEgp: 77000 },
        { period: '2026-Q1', avgPriceSqmEgp: 82000 },
      ],
      luxuryIndex: 9.1,
      demandScore: 96,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.mivida',
    source: 'verified-system',
    value: {
      compound: 'Mivida',
      canonical_name: 'Mivida New Cairo (Emaar)',
      city: 'New Cairo',
      submarket: 'South 90th / Golden Square',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 115000,
        minPriceSqmEgp: 95000,
        maxPriceSqmEgp: 150000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 75000,
        currency: 'EGP',
        rangesByBedrooms: {
          '1br': { min: 35000, avg: 45000, max: 55000 },
          '2br': { min: 55000, avg: 68000, max: 85000 },
          '3br': { min: 75000, avg: 92000, max: 120000 },
          '4br+': { min: 100000, avg: 130000, max: 170000 },
          penthouse: { min: 90000, avg: 115000, max: 150000 },
          townhouse: { min: 120000, avg: 160000, max: 210000 },
          standalone_villa: { min: 180000, avg: 240000, max: 350000 },
        },
      },
      capRatePct: 8.0,
      grossYieldPct: 8.6,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 80000 },
        { period: '2025-Q2', avgPriceSqmEgp: 90000 },
        { period: '2025-Q3', avgPriceSqmEgp: 99000 },
        { period: '2025-Q4', avgPriceSqmEgp: 108000 },
        { period: '2026-Q1', avgPriceSqmEgp: 115000 },
      ],
      luxuryIndex: 9.6,
      demandScore: 98,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.cairo_festival_city',
    source: 'verified-system',
    value: {
      compound: 'Cairo Festival City',
      canonical_name: 'Cairo Festival City (CFC)',
      city: 'New Cairo',
      submarket: 'North 90th / Ring Road',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 125000,
        minPriceSqmEgp: 105000,
        maxPriceSqmEgp: 165000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 85000,
        currency: 'EGP',
        rangesByBedrooms: {
          '1br': { min: 40000, avg: 52000, max: 65000 },
          '2br': { min: 65000, avg: 80000, max: 100000 },
          '3br': { min: 85000, avg: 110000, max: 145000 },
          '4br+': { min: 120000, avg: 155000, max: 200000 },
        },
      },
      capRatePct: 8.2,
      grossYieldPct: 8.9,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 88000 },
        { period: '2025-Q2', avgPriceSqmEgp: 98000 },
        { period: '2025-Q3', avgPriceSqmEgp: 108000 },
        { period: '2025-Q4', avgPriceSqmEgp: 118000 },
        { period: '2026-Q1', avgPriceSqmEgp: 125000 },
      ],
      luxuryIndex: 9.5,
      demandScore: 95,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.palm_hills_new_cairo',
    source: 'verified-system',
    value: {
      compound: 'Palm Hills New Cairo',
      canonical_name: 'Palm Hills New Cairo (PHNC)',
      city: 'New Cairo',
      submarket: 'Middle Ring Road',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 78000,
        minPriceSqmEgp: 66000,
        maxPriceSqmEgp: 98000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 58000,
        currency: 'EGP',
        rangesByBedrooms: {
          '2br': { min: 40000, avg: 50000, max: 62000 },
          '3br': { min: 55000, avg: 68000, max: 85000 },
          '4br+': { min: 75000, avg: 95000, max: 125000 },
          townhouse: { min: 90000, avg: 115000, max: 150000 },
          standalone_villa: { min: 140000, avg: 180000, max: 250000 },
        },
      },
      capRatePct: 8.4,
      grossYieldPct: 9.0,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 53000 },
        { period: '2025-Q2', avgPriceSqmEgp: 60000 },
        { period: '2025-Q3', avgPriceSqmEgp: 67000 },
        { period: '2025-Q4', avgPriceSqmEgp: 73000 },
        { period: '2026-Q1', avgPriceSqmEgp: 78000 },
      ],
      luxuryIndex: 9.0,
      demandScore: 92,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.eastown',
    source: 'verified-system',
    value: {
      compound: 'Eastown',
      canonical_name: 'Eastown Residences (SODIC)',
      city: 'New Cairo',
      submarket: 'South 90th / Adjacent to AUC',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 88000,
        minPriceSqmEgp: 74000,
        maxPriceSqmEgp: 112000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 62000,
        currency: 'EGP',
        rangesByBedrooms: {
          '1br': { min: 32000, avg: 40000, max: 50000 },
          '2br': { min: 46000, avg: 58000, max: 72000 },
          '3br': { min: 62000, avg: 76000, max: 98000 },
          '4br+': { min: 82000, avg: 105000, max: 135000 },
        },
      },
      capRatePct: 8.7,
      grossYieldPct: 9.3,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 60000 },
        { period: '2025-Q2', avgPriceSqmEgp: 68000 },
        { period: '2025-Q3', avgPriceSqmEgp: 75000 },
        { period: '2025-Q4', avgPriceSqmEgp: 82000 },
        { period: '2026-Q1', avgPriceSqmEgp: 88000 },
      ],
      luxuryIndex: 9.2,
      demandScore: 97,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.villette',
    source: 'verified-system',
    value: {
      compound: 'Villette',
      canonical_name: 'Villette by SODIC',
      city: 'New Cairo',
      submarket: 'Golden Square',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 95000,
        minPriceSqmEgp: 80000,
        maxPriceSqmEgp: 125000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 70000,
        currency: 'EGP',
        rangesByBedrooms: {
          '2br': { min: 48000, avg: 60000, max: 75000 },
          '3br': { min: 65000, avg: 82000, max: 105000 },
          townhouse: { min: 95000, avg: 125000, max: 165000 },
          standalone_villa: { min: 160000, avg: 210000, max: 290000 },
        },
      },
      capRatePct: 8.3,
      grossYieldPct: 8.8,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 66000 },
        { period: '2025-Q2', avgPriceSqmEgp: 74000 },
        { period: '2025-Q3', avgPriceSqmEgp: 82000 },
        { period: '2025-Q4', avgPriceSqmEgp: 89000 },
        { period: '2026-Q1', avgPriceSqmEgp: 95000 },
      ],
      luxuryIndex: 9.4,
      demandScore: 94,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.swan_lake',
    source: 'verified-system',
    value: {
      compound: 'Swan Lake',
      canonical_name: 'Swan Lake Residences (Hassan Allam)',
      city: 'New Cairo',
      submarket: 'First Settlement',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 130000,
        minPriceSqmEgp: 110000,
        maxPriceSqmEgp: 175000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 90000,
        currency: 'EGP',
        rangesByBedrooms: {
          '2br': { min: 60000, avg: 75000, max: 95000 },
          '3br': { min: 85000, avg: 110000, max: 145000 },
          townhouse: { min: 130000, avg: 170000, max: 220000 },
          standalone_villa: { min: 200000, avg: 275000, max: 380000 },
        },
      },
      capRatePct: 7.9,
      grossYieldPct: 8.5,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 92000 },
        { period: '2025-Q2', avgPriceSqmEgp: 104000 },
        { period: '2025-Q3', avgPriceSqmEgp: 114000 },
        { period: '2025-Q4', avgPriceSqmEgp: 123000 },
        { period: '2026-Q1', avgPriceSqmEgp: 130000 },
      ],
      luxuryIndex: 9.8,
      demandScore: 99,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
  {
    agent_id: 'valuation-agent',
    category: 'market-baseline',
    key: 'market.baseline.2026.new_cairo_composite',
    source: 'verified-system',
    value: {
      compound: 'New Cairo Composite',
      canonical_name: 'Greater New Cairo Master Baseline',
      city: 'New Cairo',
      submarket: 'Fifth Settlement & Golden Square',
      year: 2026,
      resale: {
        avgPriceSqmEgp: 72000,
        minPriceSqmEgp: 52000,
        maxPriceSqmEgp: 140000,
        currency: 'EGP',
      },
      rental: {
        avgRentMonthlyEgp: 50000,
        currency: 'EGP',
        rangesByBedrooms: {
          '1br': { min: 22000, avg: 30000, max: 40000 },
          '2br': { min: 35000, avg: 45000, max: 60000 },
          '3br': { min: 48000, avg: 62000, max: 85000 },
          '4br+': { min: 65000, avg: 85000, max: 120000 },
        },
      },
      capRatePct: 8.4,
      grossYieldPct: 9.1,
      historicalPriceTrendVectors: [
        { period: '2025-Q1', avgPriceSqmEgp: 48000 },
        { period: '2025-Q2', avgPriceSqmEgp: 54000 },
        { period: '2025-Q3', avgPriceSqmEgp: 61000 },
        { period: '2025-Q4', avgPriceSqmEgp: 67000 },
        { period: '2026-Q1', avgPriceSqmEgp: 72000 },
      ],
      luxuryIndex: 8.5,
      demandScore: 95,
      lastCalibrated: '2026-11-01T00:00:00Z',
    },
  },
];

/**
 * Idempotently seeds market baselines into public.unified_memory
 * Resolves on conflict by (agent_id, key).
 */
export async function seedUnifiedMemoryBaselines(supabaseClient: {
  from: (table: string) => {
    upsert: (
      values: unknown,
      options?: { onConflict?: string; ignoreDuplicates?: boolean }
    ) => Promise<{ data?: unknown; error?: unknown }>;
  };
}): Promise<{
  success: boolean;
  count: number;
  keys: string[];
  error?: unknown;
}> {
  const records = MARKET_BASELINES_2026.map((record) => ({
    agent_id: record.agent_id,
    category: record.category,
    key: record.key,
    value: record.value,
    source: record.source,
    updated_at: new Date().toISOString(),
  }));

  try {
    const { error } = await supabaseClient
      .from('unified_memory')
      .upsert(records, { onConflict: 'agent_id,key' });

    if (error) {
      return {
        success: false,
        count: 0,
        keys: [],
        error,
      };
    }

    return {
      success: true,
      count: records.length,
      keys: records.map((r) => r.key),
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      keys: [],
      error: err,
    };
  }
}
