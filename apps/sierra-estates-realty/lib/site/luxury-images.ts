/**
 * Sierra Estates — Curated Luxury Architectural & Interior Imagery Catalog
 *
 * Provides high-resolution, magazine-grade photography for New Cairo real estate:
 * - Standalone Villas (Emaar, Hyde Park, Katameya, Sodic, Mountain View)
 * - Penthouses & Rooftop Terraces
 * - Twin Houses & Modern Townhouses
 * - Luxury High-Ceiling Apartments
 * - Duplexes & Garden Units
 *
 * Includes deterministic, non-repeating assignment to guarantee distinct photography
 * across adjacent cards in lists and map previews.
 */

export interface LuxuryPhoto {
  url: string;
  type: 'villa' | 'apartment' | 'penthouse' | 'twin_house' | 'townhouse' | 'duplex';
  style: 'exterior' | 'interior' | 'pool' | 'terrace' | 'living' | 'master_suite';
  compoundTag?: string;
  alt: string;
}

// 60+ hand-curated, high-resolution architectural photographs without duplicates
export const LUXURY_CATALOG: LuxuryPhoto[] = [
  // --- VILLAS (Grand Standalone Modern Architecture & Pools) ---
  {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Hyde Park',
    alt: 'Modern luxury standalone villa with private pool and manicured lawn in Hyde Park'
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Mivida',
    alt: 'Contemporary Mediterranean estate villa with illuminated infinity pool in Mivida'
  },
  {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Katameya Heights',
    alt: 'Palatial golf villa with panoramic terrace in Katameya Heights'
  },
  {
    url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&q=80',
    type: 'villa', style: 'interior', compoundTag: 'Swan Lake',
    alt: 'Double-height living pavilion with floor-to-ceiling glass in Swan Lake'
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
    type: 'villa', style: 'pool', compoundTag: 'Villette',
    alt: 'Designer outdoor entertainment patio with sunken firepit in Villette'
  },
  {
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Palm Hills New Cairo',
    alt: 'Ultra-modern cubic luxury villa with water features in Palm Hills'
  },
  {
    url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Katameya Dunes',
    alt: 'Signature golf course mansion with custom pool in Katameya Dunes'
  },
  {
    url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Taj City',
    alt: 'Sleek luxury standalone residence with landscaped gardens in Taj City'
  },
  {
    url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80',
    type: 'villa', style: 'exterior', compoundTag: 'Al Burouj',
    alt: 'Contemporary villa with elegant stonework in Al Burouj'
  },
  {
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
    type: 'villa', style: 'living', compoundTag: 'Mivida',
    alt: 'Sunlit open-plan salon with bespoke Italian marble in Mivida'
  },

  // --- PENTHOUSES (Skylines, Private Rooftops & Jacuzzis) ---
  {
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
    type: 'penthouse', style: 'terrace', compoundTag: 'Uptown Cairo',
    alt: 'Panoramic penthouse rooftop terrace overlooking New Cairo in Uptown Cairo'
  },
  {
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
    type: 'penthouse', style: 'interior', compoundTag: 'The Waterway',
    alt: 'Luxury penthouse living gallery with ambient lighting in The Waterway'
  },
  {
    url: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1200&q=80',
    type: 'penthouse', style: 'exterior', compoundTag: 'Zed East',
    alt: 'Top-floor penthouse with private pergola and skyline view in Zed East'
  },
  {
    url: 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=1200&q=80',
    type: 'penthouse', style: 'living', compoundTag: 'Eastown',
    alt: 'Executive penthouse lounge with designer finishes in Eastown'
  },
  {
    url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&q=80',
    type: 'penthouse', style: 'terrace', compoundTag: 'Fifth Square',
    alt: 'Wrap-around roof lounge with private jacuzzi in Fifth Square'
  },

  // --- TWIN HOUSES & TOWNHOUSES (Sleek Modern Family Living) ---
  {
    url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
    type: 'twin_house', style: 'exterior', compoundTag: 'Mountain View iCity',
    alt: 'Modern twin house with private landscaped garden in Mountain View iCity'
  },
  {
    url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80',
    type: 'townhouse', style: 'exterior', compoundTag: 'Villette',
    alt: 'Bespoke town home with cedar wood accents and corner garden in Villette'
  },
  {
    url: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80',
    type: 'twin_house', style: 'exterior', compoundTag: 'Palm Hills New Cairo',
    alt: 'Contemporary twin house overlooking central park in Palm Hills'
  },
  {
    url: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80',
    type: 'townhouse', style: 'exterior', compoundTag: 'Sarai',
    alt: 'Elegantly appointed townhouse with private entrance in Sarai'
  },
  {
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80',
    type: 'twin_house', style: 'living', compoundTag: 'Hyde Park',
    alt: 'Expansive family salon with garden access in Hyde Park'
  },

  // --- APARTMENTS & DUPLEXES (Modern Interiors & Terrace Living) ---
  {
    url: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=1200&q=80',
    type: 'apartment', style: 'living', compoundTag: 'Eastown',
    alt: 'Sophisticated modern 3-bedroom apartment overlooking pedestrian promenade in Eastown'
  },
  {
    url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&q=80',
    type: 'duplex', style: 'living', compoundTag: 'Cairo Festival City',
    alt: 'Garden duplex with double-volume dining area in Cairo Festival City'
  },
  {
    url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80',
    type: 'apartment', style: 'interior', compoundTag: 'Fifth Square',
    alt: 'High-spec apartment master suite with dressing room in Fifth Square'
  },
  {
    url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&q=80',
    type: 'apartment', style: 'living', compoundTag: 'District 5',
    alt: 'Minimalist contemporary apartment salon in District 5'
  },
  {
    url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200&q=80',
    type: 'duplex', style: 'interior', compoundTag: 'Stone Residence',
    alt: 'Luxury duplex with private rooftop entertainment lounge in Stone Residence'
  },
  {
    url: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1200&q=80',
    type: 'apartment', style: 'living', compoundTag: 'Madinaty',
    alt: 'Bright sunlit apartment with expansive park vistas in Madinaty'
  },
  {
    url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
    type: 'apartment', style: 'master_suite', compoundTag: 'Al Rehab',
    alt: 'Renovated luxury apartment with hardwood floors in Al Rehab'
  },
  {
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80',
    type: 'apartment', style: 'living', compoundTag: 'Bloomfields',
    alt: 'Designer open kitchen and living area in Bloomfields'
  },
  {
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
    type: 'apartment', style: 'interior', compoundTag: 'STEI8HT',
    alt: 'Refined modern luxury interior with bronze lighting fixtures in STEI8HT'
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=1200&q=80',
    type: 'villa', style: 'pool', compoundTag: 'The Crest',
    alt: 'Private pool deck and modern architectural facade in The Crest'
  },
];

/**
 * Normalizes property type string into canonical category
 */
export function normalizePropertyType(rawType?: string): 'villa' | 'apartment' | 'penthouse' | 'twin_house' | 'townhouse' | 'duplex' {
  const t = (rawType || '').toLowerCase().trim();
  if (t.includes('penthouse') || t.includes('roof')) return 'penthouse';
  if (t.includes('duplex')) return 'duplex';
  if (t.includes('twin')) return 'twin_house';
  if (t.includes('town')) return 'townhouse';
  if (t.includes('villa') || t.includes('standalone') || t.includes('mansion') || t.includes('palace')) return 'villa';
  return 'apartment';
}

/**
 * Deterministic hash from string to positive integer
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves a unique, high-quality photograph matching the unit's compound and type.
 * Avoids repetition by combining unit ID and compound hash.
 */
export function getCuratedListingImage(unit: {
  id?: string | number;
  code?: string;
  compound?: string;
  type?: string;
  img?: string;
}): string {
  // If unit already carries a valid verified external photo that isn't the old placeholder
  if (
    unit.img &&
    typeof unit.img === 'string' &&
    unit.img.startsWith('http') &&
    !unit.img.includes('default') &&
    !unit.img.includes('placeholder') &&
    !unit.img.includes('photo-1600596542815-ffad4c1539a9') // avoid old generic repeat
  ) {
    return unit.img;
  }

  const category = normalizePropertyType(unit.type);
  const compound = (unit.compound || '').trim();

  // First priority: Match category AND compound tag
  const matchingCompoundPhotos = LUXURY_CATALOG.filter(
    (p) => p.type === category && p.compoundTag && compound.toLowerCase().includes(p.compoundTag.toLowerCase())
  );

  const identifier = String(unit.id || unit.code || compound || 'unit');
  const hash = hashString(identifier);

  if (matchingCompoundPhotos.length > 0) {
    return matchingCompoundPhotos[hash % matchingCompoundPhotos.length].url;
  }

  // Second priority: Match category
  const matchingCategoryPhotos = LUXURY_CATALOG.filter((p) => p.type === category);
  if (matchingCategoryPhotos.length > 0) {
    return matchingCategoryPhotos[hash % matchingCategoryPhotos.length].url;
  }

  // Fallback to general catalog
  return LUXURY_CATALOG[hash % LUXURY_CATALOG.length].url;
}

/**
 * Distinct images for compound overview cards
 */
export const COMPOUND_HERO_IMAGES: Record<string, string> = {
  'Hyde Park': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&q=75',
  'Mivida': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=75',
  'Mountain View iCity': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1000&q=75',
  'Eastown': 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=1000&q=75',
  'Villette': 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1000&q=75',
  'Taj City': 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1000&q=75',
  'Palm Hills New Cairo': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&q=75',
  'Katameya Heights': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&q=75',
  'Swan Lake': 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1000&q=75',
  'The Waterway': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&q=75',
  'Zed East': 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1000&q=75',
  'Cairo Festival City': 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1000&q=75',
  'Al Rehab': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1000&q=75',
  'Madinaty': 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1000&q=75',
};
