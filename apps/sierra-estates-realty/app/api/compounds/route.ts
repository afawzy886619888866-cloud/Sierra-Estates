/** GET /api/compounds → EnrichedCompound[] (public, sorted featured → aiScore, enriched with GIS polygons) */
import { NextResponse } from "next/server";
import { SEED_COMPOUNDS } from "@/lib/seed";
import { listRecords } from "@sierra-estates/db";
import type { Compound } from "@/lib/types";
import {
  TARGET_14_COMPOUND_POLYGONS,
  getCompoundGisData,
  calculateLandmarkDriveTimes,
} from "@/lib/gis/compound-polygons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface EnrichedCompound extends Compound {
  polygon?: [number, number][];
  centroid?: [number, number];
  landmarkDriveTimes?: Record<string, number>;
  avgPriceSqmEgp?: number;
  rentalYieldRange?: string;
  borderColor?: string;
  fillColor?: string;
}

function enrichCompound(c: Compound): EnrichedCompound {
  const gis = getCompoundGisData(c.name) || getCompoundGisData(c.id);
  const centroid: [number, number] = gis?.centroid || [c.lat, c.lng];
  const landmarkDriveTimes = calculateLandmarkDriveTimes(centroid);

  return {
    ...c,
    lat: centroid[0],
    lng: centroid[1],
    centroid,
    polygon: gis?.polygon || [
      [centroid[0] + 0.005, centroid[1] - 0.005],
      [centroid[0] + 0.005, centroid[1] + 0.005],
      [centroid[0] - 0.005, centroid[1] + 0.005],
      [centroid[0] - 0.005, centroid[1] - 0.005],
    ],
    borderColor: gis?.borderColor || '#C9A84C',
    fillColor: gis?.fillColor || 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: gis?.avgPriceSqmEgp || (c.priceM ? c.priceM * 1000 : 75000),
    rentalYieldRange: gis?.rentalYieldRange || '8.5% - 10.0%',
    landmarkDriveTimes,
  };
}

export async function GET() {
  try {
    const items = (await listRecords("compounds")) as unknown as Compound[];
    if (items.length > 0) {
      items.sort((a, b) => {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        return b.aiScore - a.aiScore;
      });
      const enriched = items.map(enrichCompound);
      return NextResponse.json(enriched);
    }
  } catch (err) {
    console.warn("[compounds] Supabase read failed, using seed:", err);
  }
  const enriched = (SEED_COMPOUNDS as Compound[]).map(enrichCompound);
  return NextResponse.json(enriched);
}
