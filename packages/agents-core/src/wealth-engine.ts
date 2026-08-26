/**
 * Sierra Estates Institutional Wealth Portfolio & Yield Forecaster
 * Simulates luxury real estate multi-asset allocations, rental yields, and 5-year capital appreciation.
 */

export interface PortfolioAssetInput {
  compoundName: string;
  unitType: 'standalone_villa' | 'twin_house' | 'penthouse' | 'commercial_retail';
  purchasePriceEGP: number;
  expectedAnnualGrossRentEGP: number;
  projectedAnnualAppreciationPercent: number;
}

export interface PortfolioProjection {
  totalCapitalInvestedEGP: number;
  blendedGrossYieldPercent: number;
  blendedNetYieldPercent: number;
  totalAnnualNetRentalIncomeEGP: number;
  fiveYearProjectedValuationEGP: number;
  fiveYearCapitalGainEGP: number;
  inflationHedgeIndexScore: number; // 0 - 100
  assetBreakdown: {
    compound: string;
    type: string;
    allocationPercent: number;
    year5ValueEGP: number;
  }[];
  executiveSummary: {
    ar: string;
    en: string;
  };
}

export class WealthPortfolioEngine {
  /**
   * Run comprehensive 5-year investment portfolio simulation
   */
  public static simulatePortfolio(assets: PortfolioAssetInput[]): PortfolioProjection {
    if (!assets || assets.length === 0) {
      throw new Error('Portfolio requires at least one asset.');
    }

    const totalInvested = assets.reduce((sum, a) => sum + a.purchasePriceEGP, 0);
    const totalGrossRent = assets.reduce((sum, a) => sum + a.expectedAnnualGrossRentEGP, 0);

    // Net rent = Gross rent - 10% operating/maintenance reserve
    const totalNetRent = totalGrossRent * 0.9;
    const blendedGrossYield = Number(((totalGrossRent / totalInvested) * 100).toFixed(2));
    const blendedNetYield = Number(((totalNetRent / totalInvested) * 100).toFixed(2));

    let total5YearValuation = 0;
    const assetBreakdown = assets.map((a) => {
      const allocation = Number(((a.purchasePriceEGP / totalInvested) * 100).toFixed(1));
      const year5Val = Math.round(
        a.purchasePriceEGP * Math.pow(1 + a.projectedAnnualAppreciationPercent / 100, 5)
      );
      total5YearValuation += year5Val;

      return {
        compound: a.compoundName,
        type: a.unitType,
        allocationPercent: allocation,
        year5ValueEGP: year5Val,
      };
    });

    const capitalGain = total5YearValuation - totalInvested;

    // Inflation Hedge Score: Weighted score based on yield and appreciation
    const avgAppreciation =
      assets.reduce((sum, a) => sum + a.projectedAnnualAppreciationPercent, 0) / assets.length;
    const hedgeScore = Math.min(100, Math.round(avgAppreciation * 3.5 + blendedNetYield * 2));

    return {
      totalCapitalInvestedEGP: totalInvested,
      blendedGrossYieldPercent: blendedGrossYield,
      blendedNetYieldPercent: blendedNetYield,
      totalAnnualNetRentalIncomeEGP: Math.round(totalNetRent),
      fiveYearProjectedValuationEGP: total5YearValuation,
      fiveYearCapitalGainEGP: capitalGain,
      inflationHedgeIndexScore: hedgeScore,
      assetBreakdown,
      executiveSummary: {
        ar: `محفظة استثمارية بقيمة ${(totalInvested / 1e6).toFixed(1)} مليون ج.م تحقق عائداً إيجارياً صافياً ${blendedNetYield}% وقيمة متوقعة ${(total5YearValuation / 1e6).toFixed(1)} مليون ج.م خلال 5 سنوات.`,
        en: `Luxury portfolio of ${(totalInvested / 1e6).toFixed(1)}M EGP yields ${blendedNetYield}% net annual cashflow with projected 5-year valuation of ${(total5YearValuation / 1e6).toFixed(1)}M EGP (Hedge Score: ${hedgeScore}/100).`,
      },
    };
  }
}
