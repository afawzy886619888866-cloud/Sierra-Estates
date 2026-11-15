/**
 * UnitQualityKpiService.ts
 *
 * Sierra Estates — Unit Content, Image Quality & Anti-Fabrication KPI Evaluator.
 * Enforces §21 anti-fabrication doctrine, Property Finder quality standards,
 * LightGBM ad performance heuristics, and stores all evaluations in ECC memory.
 */

import { eccMemory, type Episode } from '@/lib/eccMemoryEngine';
import { logger } from '@/lib/logger';

export interface UnitKpiEvaluationInput {
  unitCode: string;
  title: string;
  description?: string | null;
  dealType: 'sale' | 'rent' | 'resale' | 'primary' | string;
  compound?: string | null;
  propertyType?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: string | null;
  finishing?: string | null;
  furnishing?: string | null;
  priceEgp: number;
  monthlyRentEgp?: number | null;
  photoUrls?: string[] | null;
  virtualTourUrl?: string | null;
  isDirectOwner?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

export type ScoreTier = 'tier_1_featured' | 'tier_2_search_only' | 'tier_3_needs_enrichment' | 'tier_4_archived';

export interface QualityKpiBreakdown {
  contentScore: number;       // 0-30
  imageScore: number;         // 0-30
  infoAccuracyScore: number;  // 0-40
  totalAiScore: number;       // 0-100
  tier: ScoreTier;
  isPublishable: boolean;
  violations: string[];
  recommendations: string[];
}

export class UnitQualityKpiService {
  /**
   * Evaluates content, images, and informational compliance against Sierra Estates KPIs.
   */
  public static evaluateUnit(input: UnitKpiEvaluationInput): QualityKpiBreakdown {
    const violations: string[] = [];
    const recommendations: string[] = [];

    let contentScore = 0;
    let imageScore = 0;
    let infoAccuracyScore = 0;

    // ─────────────────────────────────────────────────────────────
    // 1. Content Quality KPI (0 - 30 Points)
    // ─────────────────────────────────────────────────────────────
    const titleLen = (input.title || '').trim().length;
    if (titleLen >= 30 && titleLen <= 60) {
      contentScore += 10;
    } else if (titleLen >= 15) {
      contentScore += 5;
      recommendations.push(`Optimize title length to 30-60 chars (currently ${titleLen} chars)`);
    } else {
      violations.push(`Title too short (< 15 chars): "${input.title}"`);
    }

    const desc = (input.description || '').trim();
    const descLen = desc.length;
    if (descLen >= 750) {
      contentScore += 10;
    } else if (descLen >= 150) {
      contentScore += 7;
      recommendations.push('Expand description above 750 characters for top algorithmic reach');
    } else if (descLen >= 20) {
      contentScore += 4;
      recommendations.push('Description is minimal (>= 150 chars required for featured status)');
    } else {
      violations.push(`Description too short (< 20 chars): "${desc}"`);
    }

    // Specifications completeness
    let specCount = 0;
    if (input.bedrooms && input.bedrooms > 0) specCount++;
    if (input.bathrooms && input.bathrooms > 0) specCount++;
    if (input.areaSqm && input.areaSqm > 0) specCount++;
    if (input.finishing) specCount++;
    if (input.furnishing) specCount++;
    if (input.floor !== undefined && input.floor !== null && input.floor !== '') specCount++;

    if (specCount >= 5) {
      contentScore += 10;
    } else if (specCount >= 3) {
      contentScore += 5;
      recommendations.push('Add missing unit specs (floor, furnishing, or exact bathrooms)');
    } else {
      violations.push('Critical specs missing (area, bedrooms, or bathrooms absent)');
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Images Quality KPI (0 - 30 Points)
    // ─────────────────────────────────────────────────────────────
    const photos = input.photoUrls || [];
    const photoCount = photos.length;

    // Validate photo URLs
    let validHttpPhotos = 0;
    for (const p of photos) {
      if (!p || typeof p !== 'string') continue;
      if (/^file:\/\//i.test(p) || p.startsWith('/') || p.startsWith('C:\\')) {
        violations.push(`Invalid image path detected (${p.slice(0, 30)}...): file:// and local paths banned`);
      } else if (/^https?:\/\//i.test(p)) {
        validHttpPhotos++;
      }
    }

    if (validHttpPhotos >= 10) {
      imageScore += 25;
    } else if (validHttpPhotos >= 5) {
      imageScore += 18;
      recommendations.push('Upload at least 10 high-resolution photos for maximum conversion');
    } else if (validHttpPhotos > 0) {
      imageScore += 8;
      recommendations.push('Photo count is below minimum quality threshold (minimum 5 photos)');
    } else {
      violations.push('Zero valid photos attached (unpublishable)');
    }

    // Virtual tour / floor plan bonus
    if (input.virtualTourUrl && /^https?:\/\//i.test(input.virtualTourUrl)) {
      imageScore += 5;
    }

    imageScore = Math.min(30, imageScore);

    // ─────────────────────────────────────────────────────────────
    // 3. Information Accuracy & §21 Anti-Fabrication (0 - 40 Points)
    // ─────────────────────────────────────────────────────────────
    const isRent = input.dealType.toLowerCase().includes('rent');
    const price = isRent ? (input.monthlyRentEgp ?? input.priceEgp) : input.priceEgp;

    // Price sanity guards (§21 Anti-fabrication)
    if (!price || price <= 0) {
      violations.push('Price is missing or 0 (Anti-fabrication gate failure)');
    } else if (price === 5_000_000 && !input.notes?.includes('5m-confirmed')) {
      violations.push('Price is exactly 5,000,000 (uniform placeholder pattern rejected without 5m-confirmed note)');
    } else if (isRent) {
      if (price < 1_000) {
        violations.push(`Rental price anomalously low (${price.toLocaleString()} EGP/mo < 1,000 EGP)`);
      } else if (price > 500_000) {
        violations.push(`Rental price exceeds allowable ceiling (${price.toLocaleString()} EGP/mo > 500k EGP)`);
      } else {
        infoAccuracyScore += 20;
      }
    } else {
      // Sale / Resale
      if (price < 100_000) {
        violations.push(`Sale listing has rental-level price (${price.toLocaleString()} EGP < 100,000 EGP)`);
      } else {
        infoAccuracyScore += 20;
      }
    }

    // Direct owner verification boost
    if (input.isDirectOwner) {
      infoAccuracyScore += 10;
    }

    // Geo & Coordinates validation (Egypt bounding box: Lat 22.0 - 31.6, Lng 24.0 - 37.0)
    if (input.latitude != null && input.longitude != null) {
      const lat = Number(input.latitude);
      const lng = Number(input.longitude);
      if (lat >= 22.0 && lat <= 31.6 && lng >= 24.0 && lng <= 37.0) {
        infoAccuracyScore += 10;
      } else {
        violations.push(`Coordinates (${lat}, ${lng}) outside valid Egypt boundaries`);
      }
    } else if (input.compound) {
      // Recognized compound centroid
      infoAccuracyScore += 7;
    } else {
      violations.push('Missing location (no compound name and no coordinates provided)');
    }

    infoAccuracyScore = Math.min(40, infoAccuracyScore);

    // ─────────────────────────────────────────────────────────────
    // Composite AI Score & Tier Assignment
    // ─────────────────────────────────────────────────────────────
    const totalAiScore = contentScore + imageScore + infoAccuracyScore;

    let tier: ScoreTier;
    if (totalAiScore >= 80) {
      tier = 'tier_1_featured';
    } else if (totalAiScore >= 50) {
      tier = 'tier_2_search_only';
    } else {
      tier = 'tier_3_needs_enrichment';
    }

    // Publishable gate: Must have 0 critical violations, price > 0, at least 1 valid photo, and score >= 50
    const isPublishable = violations.length === 0 && totalAiScore >= 50 && validHttpPhotos > 0;

    return {
      contentScore,
      imageScore,
      infoAccuracyScore,
      totalAiScore,
      tier,
      isPublishable,
      violations,
      recommendations,
    };
  }

  /**
   * Evaluates unit and records the episode into ECC memory engine.
   */
  public static recordKpiEvaluationToMemory(
    input: UnitKpiEvaluationInput,
    evaluation: QualityKpiBreakdown,
  ): Episode {
    const summary = `Unit ${input.unitCode} evaluated: Score ${evaluation.totalAiScore}/100 [${evaluation.tier}] ` +
      `(Content: ${evaluation.contentScore}/30, Images: ${evaluation.imageScore}/30, Info: ${evaluation.infoAccuracyScore}/40). ` +
      `Publishable: ${evaluation.isPublishable ? 'YES' : 'NO'}${evaluation.violations.length ? ` (${evaluation.violations.length} violations)` : ''}`;

    try {
      const episode = eccMemory.recordEpisode({
        type: 'lead_scored' as any, // reuse high-priority score episode
        entityId: input.unitCode,
        actor: 'Sierra Unit Quality KPI Engine',
        summary,
        data: {
          unitCode: input.unitCode,
          compound: input.compound,
          dealType: input.dealType,
          priceEgp: input.priceEgp,
          scores: {
            content: evaluation.contentScore,
            images: evaluation.imageScore,
            info: evaluation.infoAccuracyScore,
            total: evaluation.totalAiScore,
          },
          tier: evaluation.tier,
          isPublishable: evaluation.isPublishable,
          violations: evaluation.violations,
          recommendations: evaluation.recommendations,
          photoCount: input.photoUrls?.length ?? 0,
        },
      });
      return episode;
    } catch (err) {
      logger.warn(`[UnitQualityKpiService] Memory record warning: ${err instanceof Error ? err.message : err}`);
      return {
        id: `ep-fallback-${Date.now()}`,
        type: 'lead_scored' as any,
        entityId: input.unitCode,
        actor: 'Sierra Unit Quality KPI Engine',
        timestamp: new Date().toISOString(),
        summary,
        data: { totalScore: evaluation.totalAiScore, tier: evaluation.tier },
      };
    }
  }
}
