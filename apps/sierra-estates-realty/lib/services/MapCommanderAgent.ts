/**
 * Sierra Map Commander Agent Service
 *
 * Coordinates GIS spatial verification, compound inventory alignment,
 * and automated photo harvesting campaigns across New Cairo assets.
 */

import { NEW_CAIRO_COMPOUNDS, type CompoundLocation } from '@/components/Maps/compounds-data';
import type { MapUnitPin } from '@/components/Maps/LiveMap';
import { hasPendingPhoto } from '@/lib/inventory/normalize';
import { logger } from '@/lib/logger';

export interface GisAuditResult {
  code: string;
  nameEn: string;
  lat: number;
  lng: number;
  isGpsVerified: boolean;
  zone: string;
  withinExpectedBounds: boolean;
  distanceFromCairoCenterKm: number;
}

export interface CompoundCoverageStat {
  compoundCode: string;
  compoundName: string;
  totalUnits: number;
  saleUnits: number;
  rentUnits: number;
  unitsWithPhotos: number;
  unitsNeedingPhotos: number;
  photoCoveragePercent: number;
}

export interface PhotoHarvestTarget {
  unitCode: string;
  compound: string;
  mode: string;
  type: string;
  priceLabel: string;
  priority: 'high' | 'medium' | 'low';
}

/** New Cairo approximate bounding box [minLat, maxLat, minLng, maxLng] */
const NEW_CAIRO_BOUNDS = {
  minLat: 29.95,
  maxLat: 30.15,
  minLng: 31.40,
  maxLng: 31.75,
};

const CAIRO_CENTER: [number, number] = [30.025, 31.54];

/** Haversine distance in km between two GPS coordinates */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class MapCommanderAgent {
  /**
   * Audit compound GIS coordinates against Greater Cairo & New Cairo bounding boxes.
   */
  static auditGisCoordinates(
    compounds: CompoundLocation[] = NEW_CAIRO_COMPOUNDS
  ): GisAuditResult[] {
    return compounds.map((c) => {
      const withinExpectedBounds =
        c.lat >= NEW_CAIRO_BOUNDS.minLat &&
        c.lat <= NEW_CAIRO_BOUNDS.maxLat &&
        c.lng >= NEW_CAIRO_BOUNDS.minLng &&
        c.lng <= NEW_CAIRO_BOUNDS.maxLng;

      const distanceFromCairoCenterKm = calculateDistanceKm(
        c.lat,
        c.lng,
        CAIRO_CENTER[0],
        CAIRO_CENTER[1]
      );

      return {
        code: c.code,
        nameEn: c.nameEn,
        lat: c.lat,
        lng: c.lng,
        isGpsVerified: Boolean(c.isGpsVerified),
        zone: c.zone || 'New Cairo',
        withinExpectedBounds,
        distanceFromCairoCenterKm,
      };
    });
  }

  /**
   * Calculate compound-level inventory coverage, sales vs rent split, and photo completeness.
   */
  static analyzeCompoundCoverage(
    compounds: CompoundLocation[] = NEW_CAIRO_COMPOUNDS,
    units: MapUnitPin[] = []
  ): CompoundCoverageStat[] {
    return compounds.map((comp) => {
      const compName = (comp.nameEn || '').toLowerCase().trim();
      const compCode = (comp.code || '').toLowerCase().trim();

      const matchedUnits = units.filter((u) => {
        const uComp = (u.compound || '').toLowerCase().trim();
        return (
          uComp === compName ||
          uComp === compCode ||
          uComp.includes(compName) ||
          (compName.length > 3 && compName.includes(uComp))
        );
      });

      const totalUnits = matchedUnits.length;
      const saleUnits = matchedUnits.filter((u) => u.mode === 'sale').length;
      const rentUnits = matchedUnits.filter((u) => u.mode === 'rent').length;
      const unitsNeedingPhotos = matchedUnits.filter((u) => hasPendingPhoto(u.img)).length;
      const unitsWithPhotos = totalUnits - unitsNeedingPhotos;
      const photoCoveragePercent =
        totalUnits > 0 ? Math.round((unitsWithPhotos / totalUnits) * 100) : 100;

      return {
        compoundCode: comp.code,
        compoundName: comp.nameEn,
        totalUnits,
        saleUnits,
        rentUnits,
        unitsWithPhotos,
        unitsNeedingPhotos,
        photoCoveragePercent,
      };
    });
  }

  /**
   * Plan a targeted WhatsApp photo harvesting campaign for units missing verified photos.
   */
  static planPhotoHarvestingCampaign(
    units: MapUnitPin[],
    targetCompoundCode?: string
  ): PhotoHarvestTarget[] {
    const candidates = targetCompoundCode
      ? units.filter(
          (u) =>
            u.compound.toLowerCase().includes(targetCompoundCode.toLowerCase()) ||
            u.code.toLowerCase().startsWith(targetCompoundCode.toLowerCase())
        )
      : units;

    const targets: PhotoHarvestTarget[] = [];

    for (const unit of candidates) {
      if (hasPendingPhoto(unit.img)) {
        // High priority for sale units and featured units
        const isHighPriority = unit.mode === 'sale' || Boolean(unit.featured);
        targets.push({
          unitCode: unit.code,
          compound: unit.compound,
          mode: unit.mode,
          type: unit.type,
          priceLabel: unit.priceLabel,
          priority: isHighPriority ? 'high' : 'medium',
        });
      }
    }

    // Sort by priority (high first)
    return targets.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  }
}
