/**
 * SIERRA ESTATES — NEW CAIRO COMPOUND MARKET STATS (reference data)
 *
 * Static placeholder figures for a compound/zone map visualization on the
 * incoming frontend (e.g. an "explore by area" map). Adapted from an older
 * sibling repo's decorative map component — these are NOT live-queried and
 * were not verified against real market data there either. There is no
 * `zones` model in lib/models/schema.ts yet (only a bare `match /zones/`
 * rule in firestore.rules with nothing built on top), so this fills a real
 * gap — but treat the numbers below as placeholders to replace with real
 * figures (or a real Firestore `zones` collection) before shipping.
 */

export interface CompoundMarketStat {
  id: string;
  nameEn: string;
  nameAr: string;
  avgPriceEGP: number;
  roiPercent: number;
  propertiesCount: number;
}

export const NEW_CAIRO_COMPOUND_STATS: CompoundMarketStat[] = [
  { id: 'fifth-settlement', nameEn: 'Fifth Settlement', nameAr: 'التجمع الخامس', avgPriceEGP: 5_600_000, roiPercent: 9.2, propertiesCount: 142 },
  { id: 'madinaty', nameEn: 'Madinaty', nameAr: 'مدينتي', avgPriceEGP: 8_400_000, roiPercent: 8.8, propertiesCount: 96 },
  { id: 'mostakbal-city', nameEn: 'Mostakbal City', nameAr: 'مستقبل سيتي', avgPriceEGP: 4_800_000, roiPercent: 10.5, propertiesCount: 110 },
  { id: 'uptown-cairo', nameEn: 'Uptown Cairo', nameAr: 'أبتاون كايرو', avgPriceEGP: 12_200_000, roiPercent: 7.9, propertiesCount: 48 },
];
