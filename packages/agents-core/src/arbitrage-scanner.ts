/**
 * Sierra Estates Autonomous Price Divergence & Arbitrage Scanner
 * Benchmarks resale listings against AVM baseline valuations to detect undervalued opportunities.
 */

export interface MarketListingSnapshot {
  id: string;
  compoundName: string;
  unitType: string;
  buaSqm: number;
  askingPriceEGP: number;
  brokerName: string;
  brokerPhone: string;
}

export interface CompoundBenchmarkRate {
  compoundName: string;
  unitType: string;
  averageSqmPriceEGP: number;
  expectedAnnualGrossYieldPercent: number;
}

export const DEFAULT_COMPOUND_BENCHMARKS: CompoundBenchmarkRate[] = [
  { compoundName: 'Mivida', unitType: 'Standalone Villa', averageSqmPriceEGP: 110000, expectedAnnualGrossYieldPercent: 9.0 },
  { compoundName: 'Hyde Park', unitType: 'Twin House', averageSqmPriceEGP: 85000, expectedAnnualGrossYieldPercent: 9.5 },
  { compoundName: 'Palm Hills', unitType: 'Penthouse', averageSqmPriceEGP: 95000, expectedAnnualGrossYieldPercent: 8.8 },
  { compoundName: 'Swan Lake', unitType: 'Standalone Villa', averageSqmPriceEGP: 130000, expectedAnnualGrossYieldPercent: 8.5 },
  { compoundName: 'Uptown Cairo', unitType: 'Townhouse', averageSqmPriceEGP: 90000, expectedAnnualGrossYieldPercent: 9.2 },
];

export interface ArbitrageOpportunity {
  listingId: string;
  compoundName: string;
  unitType: string;
  buaSqm: number;
  askingPriceEGP: number;
  avmFairValueEGP: number;
  undervaluationEGP: number;
  discountPercent: number;
  isHighConfidenceArbitrage: boolean;
  alertBroadcastPayload: {
    ar: string;
    en: string;
  };
}

export class ArbitrageScannerEngine {
  /**
   * Scan listing snapshots against compound benchmark baselines
   */
  public static scanListings(
    listings: MarketListingSnapshot[],
    benchmarks: CompoundBenchmarkRate[] = DEFAULT_COMPOUND_BENCHMARKS
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const listing of listings) {
      const benchmark = benchmarks.find(
        (b) =>
          b.compoundName.toLowerCase() === listing.compoundName.toLowerCase() &&
          b.unitType.toLowerCase() === listing.unitType.toLowerCase()
      ) || {
        compoundName: listing.compoundName,
        unitType: listing.unitType,
        averageSqmPriceEGP: 90000,
        expectedAnnualGrossYieldPercent: 9.0,
      };

      const avmFairValueEGP = Math.round(listing.buaSqm * benchmark.averageSqmPriceEGP);

      if (listing.askingPriceEGP < avmFairValueEGP) {
        const undervaluation = avmFairValueEGP - listing.askingPriceEGP;
        const discount = Number(((undervaluation / avmFairValueEGP) * 100).toFixed(1));

        if (discount >= 8.0) {
          const isHighConfidence = discount >= 10.0;
          const askingM = (listing.askingPriceEGP / 1e6).toFixed(1);
          const fairM = (avmFairValueEGP / 1e6).toFixed(1);

          opportunities.push({
            listingId: listing.id,
            compoundName: listing.compoundName,
            unitType: listing.unitType,
            buaSqm: listing.buaSqm,
            askingPriceEGP: listing.askingPriceEGP,
            avmFairValueEGP,
            undervaluationEGP: undervaluation,
            discountPercent: discount,
            isHighConfidenceArbitrage: isHighConfidence,
            alertBroadcastPayload: {
              ar: `🚨 *فرصة تسعير استثنائية (Arbitrage Alert)*\n📍 *المشروع:* ${listing.compoundName}\n🏡 *الوحدة:* ${listing.unitType} (${listing.buaSqm} م²)\n💰 *السعر المطلوب:* ${askingM} مليون ج.م\n📊 *القيمة السوقية العادلة:* ${fairM} مليون ج.م\n📉 *نسبة التخفيض:* ${discount}% أقل من متوسط السوق!`,
              en: `🚨 *ARBITRAGE ALERT · HIGH-YIELD OPPORTUNITY*\n📍 *Compound:* ${listing.compoundName}\n🏡 *Unit:* ${listing.unitType} (${listing.buaSqm} sqm)\n💰 *Asking Price:* ${askingM}M EGP\n📊 *AVM Fair Value:* ${fairM}M EGP\n📉 *Discount:* ${discount}% below market baseline!`,
            },
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.discountPercent - a.discountPercent);
  }
}
