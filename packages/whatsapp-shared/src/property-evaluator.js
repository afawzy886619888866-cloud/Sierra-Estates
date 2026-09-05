/**
 * Sierra Estates AI Property Evaluation & Priority Ranking Engine
 * Evaluates real estate units based on price, location tier, ROI, and stored historical market intelligence.
 * Applies a strict +20% priority boost for Direct Owner units as requested by Master Operator Ahmed Fawzy.
 */

const brochureManager = require('./brochure-manager');

// Baseline New Cairo market metrics (Average EGP/m² and Monthly Rent standards)
const MARKET_BENCHMARKS = {
  mivida: { tier: 1, baseScore: 92, avgRentPerSqm: 380, avgSalePerSqm: 95000, demandFactor: 0.95 },
  uptown: { tier: 1, baseScore: 90, avgRentPerSqm: 420, avgSalePerSqm: 105000, demandFactor: 0.94 },
  villette: { tier: 1, baseScore: 89, avgRentPerSqm: 350, avgSalePerSqm: 88000, demandFactor: 0.93 },
  eastown: { tier: 1, baseScore: 88, avgRentPerSqm: 360, avgSalePerSqm: 85000, demandFactor: 0.92 },
  icity: { tier: 2, baseScore: 82, avgRentPerSqm: 260, avgSalePerSqm: 68000, demandFactor: 0.88 },
  hydepark: { tier: 2, baseScore: 83, avgRentPerSqm: 280, avgSalePerSqm: 72000, demandFactor: 0.89 },
  madinaty: { tier: 2, baseScore: 81, avgRentPerSqm: 240, avgSalePerSqm: 60000, demandFactor: 0.87 },
  cfc: { tier: 1, baseScore: 94, avgRentPerSqm: 450, avgSalePerSqm: 110000, demandFactor: 0.96 }
};

class PropertyEvaluator {
  constructor() {
    this.ownerBoostMultiplier = 1.20; // Direct 20% bonus for Owner units
  }

  /**
   * Evaluates a unit and computes a comprehensive AI valuation score (0 - 100)
   * @param {Object} unit
   * @param {string} unit.compound - Compound name / key (e.g. 'mivida', 'villette')
   * @param {number} unit.price - Price in EGP (rental per month or total sale price)
   * @param {number} [unit.areaSqm] - Unit area in square meters
   * @param {string} [unit.type] - 'apartment', 'townhouse', 'villa', 'twin-house'
   * @param {boolean} [unit.isOwner] - True if direct from owner
   * @param {string} [unit.source] - 'owner', 'developer', 'broker'
   * @param {string} [unit.finishing] - 'ultra-super-lux', 'super-lux', 'core-and-shell'
   */
  evaluateUnit(unit = {}) {
    const compoundKey = (unit.compound || '').toLowerCase().replace(/[^a-z]/g, '');
    const benchmark = MARKET_BENCHMARKS[compoundKey] || { tier: 2, baseScore: 78, avgRentPerSqm: 300, avgSalePerSqm: 75000, demandFactor: 0.85 };

    let score = benchmark.baseScore;
    const isOwner = Boolean(unit.isOwner || unit.source === 'owner' || unit.isDirectOwner);

    // 1. Price Competitiveness Factor
    let priceCompetitiveness = 80;
    if (unit.price && unit.areaSqm && unit.areaSqm > 0) {
      const pricePerSqm = unit.price / unit.areaSqm;
      const benchmarkPrice = unit.isRental !== false ? benchmark.avgRentPerSqm : benchmark.avgSalePerSqm;
      
      if (pricePerSqm <= benchmarkPrice * 0.90) {
        priceCompetitiveness = 98; // Undervalued / Hot Deal
      } else if (pricePerSqm <= benchmarkPrice) {
        priceCompetitiveness = 90; // Fair Market Value
      } else if (pricePerSqm <= benchmarkPrice * 1.15) {
        priceCompetitiveness = 75; // Slightly Premium
      } else {
        priceCompetitiveness = 60; // Overpriced
      }
    }

    // 2. Finishing Quality Factor
    let finishingBonus = 0;
    const finishing = (unit.finishing || '').toLowerCase();
    if (finishing.includes('ultra') || finishing.includes('furnished') || finishing.includes('مفروش')) {
      finishingBonus = 5;
    } else if (finishing.includes('super') || finishing.includes('تشطيب كامل')) {
      finishingBonus = 3;
    }

    // Combine base valuation score
    const rawScore = (score * 0.5) + (priceCompetitiveness * 0.4) + (finishingBonus * 2);

    // 3. APPLY 20% OWNER BOOST
    let finalScore = rawScore;
    let ownerBoostApplied = false;
    if (isOwner) {
      finalScore = Math.min(100, Math.round(rawScore * this.ownerBoostMultiplier));
      ownerBoostApplied = true;
    } else {
      finalScore = Math.min(100, Math.round(rawScore));
    }

    // 4. Determine Grade & Category
    let grade = 'B';
    let label = 'Recommended';
    if (finalScore >= 93) {
      grade = 'A+';
      label = 'Elite High-Priority Opportunity (Top Pick)';
    } else if (finalScore >= 85) {
      grade = 'A';
      label = 'Prime Verified Investment';
    } else if (finalScore >= 75) {
      grade = 'B+';
      label = 'Solid Market Option';
    }

    // 5. Calculate Estimated ROI Yield
    const estimatedRentalYield = benchmark.tier === 1 ? '7.5% - 9.2%' : '8.0% - 10.5%';

    return {
      compound: unit.compound,
      unitTitle: unit.title || `${unit.type || 'Residence'} in ${unit.compound || 'New Cairo'}`,
      isOwner,
      ownerBoostApplied,
      ownerBonus: ownerBoostApplied ? '+20% Direct Owner Priority Boost' : null,
      evaluationScore: finalScore,
      grade,
      label,
      tier: benchmark.tier,
      estimatedYield: estimatedRentalYield,
      priceCompetitivenessScore: priceCompetitiveness,
      evaluationSummary: `Evaluated at ${finalScore}/100 [Grade ${grade}] · ${label}${ownerBoostApplied ? ' (Includes +20% Owner Advantage)' : ''}`
    };
  }

  /**
   * Sorts and ranks an array of properties by highest evaluation score
   */
  rankProperties(properties = [], userPreferences = {}) {
    const evaluated = properties.map(p => {
      const evaluation = this.evaluateUnit(p);
      return {
        ...p,
        evaluation
      };
    });

    // Sort descending by evaluationScore
    return evaluated.sort((a, b) => b.evaluation.evaluationScore - a.evaluation.evaluationScore);
  }
}

module.exports = new PropertyEvaluator();
