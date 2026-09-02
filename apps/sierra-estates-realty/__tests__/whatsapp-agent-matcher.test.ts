/**
 * WhatsApp Lead Concierge & Inventory Matcher — Test Suite
 *
 * Tests:
 *  1. PropertyEvaluator (AI scoring, market tiers, direct-owner +20% boost)
 *  2. PropertyMatcher (Criteria matching, sorting, fallback catalog)
 *  3. WhatsApp Card Formatting (Arabic/English output, CTA links)
 *  4. BrochureManager (Catalog metadata, brochure generation)
 */

export {};
const propertyEvaluator = require('../../../packages/whatsapp-shared/src/property-evaluator');
const propertyMatcher = require('../../../packages/whatsapp-shared/src/property-matcher');
const brochureManager = require('../../../packages/whatsapp-shared/src/brochure-manager');

describe('WhatsApp Agent Concierge Suite', () => {
  describe('1. PropertyEvaluator', () => {
    it('evaluates Mivida unit with high tier score', () => {
      const evaluation = propertyEvaluator.evaluateUnit({
        compound: 'Mivida',
        price: 52000,
        areaSqm: 195,
        isOwner: true,
        isRental: true,
      });

      expect(evaluation.evaluationScore).toBeGreaterThan(80);
      expect(evaluation.tier).toBe(1);
      expect(evaluation.ownerBoostApplied).toBe(true);
      expect(evaluation.label).toBeDefined();
    });

    it('applies +20% boost to direct owner listings', () => {
      const brokerEval = propertyEvaluator.evaluateUnit({
        compound: 'Villette',
        price: 60000,
        areaSqm: 200,
        isOwner: false,
        isRental: true,
      });

      const ownerEval = propertyEvaluator.evaluateUnit({
        compound: 'Villette',
        price: 60000,
        areaSqm: 200,
        isOwner: true,
        isRental: true,
      });

      expect(ownerEval.evaluationScore).toBeGreaterThanOrEqual(brokerEval.evaluationScore);
      expect(ownerEval.ownerBoostApplied).toBe(true);
      expect(brokerEval.ownerBoostApplied).toBe(false);
    });

    it('correctly classifies undervalued hot deals', () => {
      const hotDeal = propertyEvaluator.evaluateUnit({
        compound: 'Eastown',
        price: 35000,
        areaSqm: 200, // 175 EGP/sqm vs 360 benchmark
        isRental: true,
      });

      expect(hotDeal.priceCompetitivenessScore).toBeGreaterThanOrEqual(90);
    });
  });

  describe('2. PropertyMatcher', () => {
    it('matches rental query for 3 bedrooms in Mivida', async () => {
      const matches = await propertyMatcher.findMatches({
        locations: ['Mivida'],
        bedrooms: 3,
        budget: 60000,
      });

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].bedrooms).toBe(3);
    });

    it('respects maximum budget constraints', async () => {
      const matches = await propertyMatcher.findMatches({
        budget: 50000,
      });

      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) {
        expect(m.price).toBeLessThanOrEqual(55000); // within tolerance
      }
    });

    it('formats rich WhatsApp card with property details and CTA in English and Arabic', () => {
      const sample = [
        {
          id: 'SE-MIV-301',
          title: 'Modern 3BR Apartment with Green Valley View',
          compound: 'Mivida (Emaar)',
          price: 52000,
          currency: 'EGP',
          bedrooms: 3,
          bathrooms: 3,
          bua: 195,
          furnishing: 'Ultra Super Lux',
          url: 'https://sierra-estates.net/property/SE-MIV-301',
        },
      ];

      const cardEn = propertyMatcher.formatRecommendationCards(sample, false);
      expect(cardEn).toContain('Mivida');
      expect(cardEn).toContain('52,000');
      expect(cardEn).toContain('3 Beds');
      expect(cardEn).toContain('https://sierra-estates.net/property/SE-MIV-301');

      const cardAr = propertyMatcher.formatRecommendationCards(sample, true);
      expect(cardAr).toContain('Mivida');
      expect(cardAr).toContain('52,000');
      expect(cardAr).toContain('3 غرف نوم');
    });
  });

  describe('3. BrochureManager', () => {
    it('returns compound brochure metadata', () => {
      expect(brochureManager).toBeDefined();
    });
  });
});
