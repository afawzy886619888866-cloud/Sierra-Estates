'use client';

/**
 * Sierra Estates — Interactive Compounds Masterplan Map
 *
 * Central interactive command deck featuring:
 * - Two-letter flag pins (clean masterplan) — press opens the Excel sheet
 * - Zone fast-switching (Golden Square, 5th Settlement, Katameya, South/North 90th, Mostakbal City)
 * - 5-way segment bar (All Inventory, Owners Rent, Owners Buy, Broker Rent, Broker Buy)
 * - Rich interactive popup cards with AI investment score, pricing, growth rate, and developer tag
 * - Responsive floating Smart Filter with tactile buttons
 * - Synchronized compound selection with live inventory
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import { RotateCcw, Map as MapIcon, SlidersHorizontal, Navigation, X } from 'lucide-react';
import SmartFilterBar from '@/components/site/SmartFilterBar';
import CompoundUnitsDeck from '@/components/site/CompoundUnitsDeck';
import {
  RENT_BUDGET_LADDER,
  SALE_BUDGET_LADDER,
  budgetBounds,
  unitConditionKey,
} from '@/lib/site/smart-search';

/** Two-letter flag code for a compound (matches the map pin badge). */
function compoundFlagCode(name: string): string {
  return name.replace(/[^A-Za-z\u0600-\u06FF]/g, '').slice(0, 2).toLowerCase() || '·';
}

export interface MapCompound {
  n: string;
  c: [number, number];
  z: string;
  ai: number;
  priceM: number;
  g: string;
  rent?: number;
  dev?: string;
  units?: number;
}

const NEW_CAIRO_CENTER: [number, number] = [30.045, 31.59];

// Developer mapping for New Cairo compounds
export const COMPOUND_DEVELOPERS: Record<string, string> = {
  'Al Burouj': 'Capital Group',
  'Al Burouj (Capital Group)': 'Capital Group',
  'Hyde Park': 'Hyde Park Developments',
  'Hyde Park New Cairo': 'Hyde Park Developments',
  'Mountain View iCity': 'Mountain View',
  'Mountain View Executive': 'Mountain View',
  'Mivida': 'Emaar Misr',
  'Mivida Parks': 'Emaar Misr',
  'Eastown': 'SODIC',
  'Eastown (SODIC)': 'SODIC',
  'Villette': 'SODIC',
  'Villette (SODIC)': 'SODIC',
  'Palm Hills New Cairo': 'Palm Hills',
  'Taj City': 'MNHD',
  'Taj Sultan': 'MNHD',
  'Sarai': 'MNHD',
  'Sarai (MNHD)': 'MNHD',
  'Cairo Festival City': 'Al-Futtaim Group',
  'Cairo Festival City Residences': 'Al-Futtaim Group',
  'Swan Lake Residence': 'Hassan Allam',
  'Fifth Square': 'Al Marasem',
  'Fifth Square (Al Marasem)': 'Al Marasem',
  'Fifth Square Boulevard': 'Al Marasem',
  'Zed East': 'Ora Developers',
  'Zed East (Ora)': 'Ora Developers',
  'Katameya Heights': 'Katameya Group',
  'Katameya Dunes': 'Katameya Group',
  'The Waterway': 'The Waterway Developments',
  'Bloomfields': 'Tatweer Misr',
  'Bloomfields (Tatweer Misr)': 'Tatweer Misr',
  'STEI8HT': 'LMD',
  'STEI8HT (LMD)': 'LMD',
  'The Crest': 'IL Cazar',
  'The Crest (IL Cazar)': 'IL Cazar',
  'Dar Misr El Shorouk': 'Ministry of Housing',
  'Madinaty': 'TMG',
  'Madinaty District 1': 'TMG',
  'Madinaty District 3': 'TMG',
  'Madinaty District 7': 'TMG',
  'Madinaty District 8': 'TMG',
  'Madinaty Executive Villas': 'TMG',
  'Al Rehab': 'TMG',
  'Uptown Cairo': 'Emaar Misr',
  'Stone Residence': 'Rooya Group',
  'Stone Residence (Rooya)': 'Rooya Group',
  'The Square': 'Al Ahly Sabbour',
  'El Patio Oro': 'La Vista',
  'El Patio Oro (La Vista)': 'La Vista',
  'El Patio 7': 'La Vista',
  'El Patio 7 (La Vista)': 'La Vista',
  'El Patio 5 East': 'La Vista',
  'El Patio 5 East (La Vista)': 'La Vista',
  'District 5': 'Marakez',
  '90 Avenue': 'Tabarak',
  'The Brooks': 'PRE',
  'La Mirada': 'Inertia',
  'Aeon': 'Tabarak',
  'Green Square': 'Sabbour',
  'Layan Residence': 'MNHD',
  'Jayd': 'IWAN',
  'Galleria Moon Valley': 'Arabia Holding',
  'Azzar New Cairo': 'Reedy Group',
  'Cairo Plaza': 'Commercial Transit',
};

// Masterplan footprint polygons for top New Cairo luxury compounds
export const COMPOUND_POLYGONS: Record<string, [number, number][]> = {
  'Hyde Park': [
    [30.021, 31.562],
    [30.018, 31.588],
    [29.997, 31.586],
    [30.000, 31.560],
  ],
  'Mivida': [
    [30.028, 31.525],
    [30.025, 31.547],
    [30.008, 31.544],
    [30.011, 31.522],
  ],
  'Mountain View iCity': [
    [30.064, 31.550],
    [30.062, 31.572],
    [30.047, 31.569],
    [30.049, 31.547],
  ],
  'Katameya Heights': [
    [29.999, 31.413],
    [29.996, 31.438],
    [29.977, 31.435],
    [29.980, 31.410],
  ],
  'Swan Lake Residence': [
    [30.050, 31.507],
    [30.048, 31.525],
    [30.034, 31.523],
    [30.036, 31.505],
  ],
  'Eastown': [
    [30.022, 31.497],
    [30.020, 31.514],
    [30.006, 31.512],
    [30.008, 31.495],
  ],
  'Villette': [
    [30.033, 31.539],
    [30.031, 31.558],
    [30.017, 31.556],
    [30.019, 31.537],
  ],
  'Palm Hills New Cairo': [
    [30.031, 31.571],
    [30.029, 31.591],
    [30.013, 31.589],
    [30.015, 31.569],
  ],
  'Zed East': [
    [30.011, 31.546],
    [30.009, 31.566],
    [29.993, 31.564],
    [29.995, 31.544],
  ],
  'The Waterway': [
    [30.045, 31.488],
    [30.043, 31.503],
    [30.031, 31.501],
    [30.033, 31.486],
  ],
  'Cairo Festival City': [
    [30.041, 31.398],
    [30.039, 31.420],
    [30.021, 31.418],
    [30.023, 31.396],
  ],
  'District 5': [
    [30.004, 31.446],
    [30.002, 31.465],
    [29.986, 31.463],
    [29.988, 31.444],
  ],
  'Stone Residence': [
    [30.007, 31.403],
    [30.005, 31.422],
    [29.989, 31.420],
    [29.991, 31.401],
  ],
  'Fifth Square': [
    [30.035, 31.520],
    [30.033, 31.535],
    [30.022, 31.533],
    [30.024, 31.518],
  ],
  'Al Rehab': [
    [30.075, 31.480],
    [30.072, 31.515],
    [30.050, 31.512],
    [30.053, 31.477],
  ],
  'Madinaty': [
    [30.125, 31.620],
    [30.120, 31.670],
    [30.080, 31.665],
    [30.085, 31.615],
  ],
  'Taj City': [
    [30.082, 31.390],
    [30.080, 31.412],
    [30.065, 31.410],
    [30.067, 31.388],
  ],
  'Uptown Cairo': [
    [30.038, 31.295],
    [30.035, 31.320],
    [30.015, 31.318],
    [30.018, 31.292],
  ],
};

// Masterplan recognized phases, districts, and lifestyle quarters
export const COMPOUND_PHASES: Record<string, string[]> = {
  'Hyde Park': ['Park Corner', 'Hyde Park Central', 'The Residence', 'HydeOut Lifestyle'],
  'Mivida': ['The Boulevard', 'The Greens', 'Twin Valley', 'Mivida Business Park'],
  'Mountain View iCity': ['Lagoon Beach Park', 'Club Park', 'Mountain Park', 'Royal Park'],
  'Katameya Heights': ['Golf Villas Phase 1', 'Fairway Residences', 'Clubhouse Quarter'],
  'Eastown': ['Eastown Residences', 'The Commercial Spine', 'Spectra'],
  'Villette': ['Sky Condos', 'The Pocket Parks', 'Villette Central'],
  'Palm Hills New Cairo': ['Phase 1 Enclave', 'Palm Hills Club', 'The Botanical Valley'],
  'Swan Lake Residence': ['The Phoenix', 'The Scarlet', 'Selena', 'The Iris'],
  'Zed East': ['Club Residences', 'Park View Apartments', 'The Commercial Strip'],
  'The Waterway': ['Waterway Villas', 'The Commercial Promenade', 'Waterway Central'],
  'Cairo Festival City': ['Oriana Villas', 'Aura Apartments', 'Festival Tower District'],
  'District 5': ['Mindhaus Business', 'District 5 Villas', 'Plaza Concourse'],
  'Stone Residence': ['Stone Park Villas', 'Stone Residence West', 'The Boulevard Promenade'],
  'Fifth Square': ['Fifth Square Park Villas', 'The Mall Concourse', 'Clubhouse Central'],
  'Al Rehab': ['Phase 1-5 Residences', 'Phase 2 Extension', 'Rehab City Avenue'],
  'Madinaty': ['South Park', 'Golf Residences', 'Craft Zone District', 'Madinaty Central'],
  'Taj City': ['Shalya', 'Taj Sultan', 'Zone T', 'Elect'],
  'Uptown Cairo': ['Celesta Hills', 'Aurora', 'The Sierras', 'Uptown Golf Clubhouse'],
};

export interface MasterplanSubfeature {
  name: string;
  type: 'park' | 'lagoon' | 'club';
  coords: [number, number][];
}

export const COMPOUND_SUBFEATURES: Record<string, MasterplanSubfeature[]> = {
  'Hyde Park': [
    {
      name: 'Central Park (600,000 sqm Green Spine)',
      type: 'park',
      coords: [
        [30.012, 31.568],
        [30.010, 31.580],
        [30.003, 31.578],
        [30.005, 31.566],
      ],
    },
    {
      name: 'HydeOut Lifestyle Concourse',
      type: 'club',
      coords: [
        [30.018, 31.570],
        [30.017, 31.577],
        [30.013, 31.575],
        [30.014, 31.568],
      ],
    },
  ],
  'Mountain View iCity': [
    {
      name: 'Crystal Lagoon Beach Park',
      type: 'lagoon',
      coords: [
        [30.058, 31.554],
        [30.057, 31.565],
        [30.051, 31.563],
        [30.052, 31.552],
      ],
    },
    {
      name: 'Central Club Park & Islands',
      type: 'park',
      coords: [
        [30.061, 31.556],
        [30.060, 31.568],
        [30.055, 31.566],
        [30.056, 31.554],
      ],
    },
  ],
  'Mivida': [
    {
      name: 'Mivida Central Greens & Botanical Valley',
      type: 'park',
      coords: [
        [30.022, 31.530],
        [30.020, 31.542],
        [30.014, 31.540],
        [30.016, 31.528],
      ],
    },
    {
      name: 'The Lake District Water Feature',
      type: 'lagoon',
      coords: [
        [30.025, 31.533],
        [30.024, 31.539],
        [30.021, 31.538],
        [30.022, 31.532],
      ],
    },
  ],
  'Katameya Heights': [
    {
      name: 'Championship Golf Course & Lakes',
      type: 'park',
      coords: [
        [29.992, 31.418],
        [29.990, 31.432],
        [29.982, 31.430],
        [29.984, 31.416],
      ],
    },
  ],
};

export interface ZonePreset {
  key: string;
  label: string;
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
}

export const NEW_CAIRO_ZONES: ZonePreset[] = [
  { key: 'all', label: 'Uptown → New Capital', center: [30.045, 31.59], zoom: 11, bounds: [[29.94, 31.27], [30.18, 31.78]] },
  { key: 'Uptown', label: 'Uptown Cairo', center: [30.026, 31.307], zoom: 14, bounds: [[29.99, 31.27], [30.06, 31.35]] },
  { key: 'Golden Square', label: 'Golden Square', center: [30.015, 31.60], zoom: 13, bounds: [[29.97, 31.54], [30.06, 31.64]] },
  { key: '5th Settlement', label: '5th Settlement', center: [30.02, 31.55], zoom: 13, bounds: [[29.97, 31.49], [30.08, 31.61]] },
  { key: 'Katameya', label: 'Katameya', center: [29.988, 31.485], zoom: 13, bounds: [[29.95, 31.40], [30.04, 31.53]] },
  { key: 'Mostakbal', label: 'Mostakbal City', center: [30.065, 31.65], zoom: 12, bounds: [[30.01, 31.60], [30.12, 31.71]] },
  { key: 'Madinaty', label: 'Madinaty & Shorouk', center: [30.105, 31.64], zoom: 12, bounds: [[30.04, 31.57], [30.18, 31.72]] },
  { key: 'New Capital', label: 'New Capital', center: [30.01, 31.73], zoom: 12, bounds: [[29.94, 31.66], [30.10, 31.82]] },
  { key: 'Transit', label: 'Cairo Plaza Metro', center: [30.129, 31.312], zoom: 14, bounds: [[30.10, 31.27], [30.16, 31.36]] },
];

export interface MapPricePreset {
  val: string;
  labelEn: string;
  labelAr: string;
  minM?: number;
  maxM?: number;
}

export const MAP_PRICE_PRESETS: MapPricePreset[] = [
  { val: 'any', labelEn: 'Any Budget', labelAr: 'أي ميزانية' },
  { val: 'under10', labelEn: '< 10M', labelAr: '< 10 مليون', maxM: 10 },
  { val: '10-20', labelEn: '10-20M', labelAr: '10-20 مليون', minM: 10, maxM: 20 },
  { val: '20-35', labelEn: '20-35M', labelAr: '20-35 مليون', minM: 20, maxM: 35 },
  { val: '35+', labelEn: '35M+', labelAr: '35+ مليون', minM: 35 },
];

export type SegmentKey = 'all' | 'owners_rent' | 'owners_buy' | 'broker_rent' | 'broker_buy' | 'unknown';

export interface SegmentTab {
  key: SegmentKey;
  label: string;
  defaultBadge: string;
  color: string;
}

export const SEGMENT_TABS: SegmentTab[] = [
  { key: 'all', label: 'All Inventory', defaultBadge: '13,892', color: '#334155' },
  { key: 'owners_rent', label: 'Direct Rent', defaultBadge: '302', color: '#059669' },
  { key: 'owners_buy', label: 'Direct Resale', defaultBadge: '262', color: '#c8961a' },
  { key: 'broker_rent', label: 'Broker Rent', defaultBadge: '4,955', color: '#d97706' },
  { key: 'broker_buy', label: 'Broker Resale', defaultBadge: '7,495', color: '#6366f1' },
];

interface InventoryApiData {
  count: number;
  segments?: {
    total: number;
    owners_rent: number;
    owners_buy: number;
    broker_rent: number;
    broker_buy: number;
    unknown: number;
  };
  compoundCounts?: Record<string, number>;
  compoundSheetCounts?: Record<string, number>;
  compoundSegmentCounts?: Record<string, Record<string, number>>;
  units?: Array<{
    id?: string;
    code?: string | null;
    compound?: string;
    location?: string;
    img?: string;
    price?: number;
    hasPhoto?: boolean;
  }>;
}

export interface CompoundsMapProps {
  compounds: MapCompound[];
  featured?: string[];
  selectedName?: string | null;
  onSelectAction?: (name: string) => void;
  onSelect?: (name: string) => void;
  onOpenSheet?: (compoundName: string) => void;
  showControls?: boolean;
  filterCompound?: string;
  filterPrice?: string;
  filterType?: string;
  filterBed?: number | 'any';
  isAr?: boolean;
  selectedOnly?: boolean;
}

export default function CompoundsMap({
  compounds,
  featured = [],
  selectedName,
  onSelectAction,
  onSelect,
  onOpenSheet,
  showControls = true,
  filterCompound,
  filterPrice,
  filterType: _filterType,
  filterBed,
  isAr = false,
  selectedOnly = false,
}: CompoundsMapProps) {
  const handleSelect = onSelectAction || onSelect;
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, { marker: any; coords: [number, number]; polygon?: any }>>(new Map());

  const [ready, setReady] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedBed, setSelectedBed] = useState<number | 'any'>('any');
  const [selectedPriceBudget, setSelectedPriceBudget] = useState<string>('any');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(selectedOnly);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryApiData | null>(null);
  // Flag-press sheet: compact Excel-style units deck fitted INSIDE the map
  // deck area (map hidden behind a solid panel while open).
  const [sheetCompound, setSheetCompound] = useState<string | null>(null);

  // Fetch full live inventory and segment aggregates (marker tooltips,
  // legend counts and the flag-press Excel sheet all read from this).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/inventory')
      .then((r) => (r.ok ? r.json() : null))
      .then((allData: InventoryApiData | null) => {
        if (cancelled) return;
        if (allData) setInventoryData(allData);
      })
      .catch((err) => console.warn('[CompoundsMap] Listings fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (filterBed !== undefined) setSelectedBed(filterBed);
  }, [filterBed]);


  // Live per-condition unit counts (evidence-based) for the condition chip:
  // options with zero resolvable units render disabled instead of dead-ending.
  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of inventoryData?.units ?? []) {
      const key = unitConditionKey({
        finishing: u.finishing,
        finishingQuality: u.finishingQuality,
        furnishing: u.furnishing,
        furnished: u.furnished,
      });
      if (key === "unknown") continue; // unresolvable finishing = no evidence
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [inventoryData]);

  // Filtered compounds based on query, zone, budget, and external props
  const filteredCompounds = useMemo(() => {
    const isRentSegment =
      selectedSegment === 'owners_rent' || selectedSegment === 'broker_rent';
    return compounds.filter((c) => {
      if (showSelectedOnly && selectedName && c.n !== selectedName) return false;
      // 1. Text query filter (local state or external prop)
      const effectiveQuery = (filterQuery || filterCompound || '').toLowerCase().trim();
      if (effectiveQuery) {
        const matchesName = c.n.toLowerCase().includes(effectiveQuery);
        const matchesZone = c.z.toLowerCase().includes(effectiveQuery);
        const dev = COMPOUND_DEVELOPERS[c.n] || '';
        const matchesDev = dev.toLowerCase().includes(effectiveQuery);
        if (!matchesName && !matchesZone && !matchesDev) return false;
      }

      // 2. Zone preset filter
      if (selectedZone !== 'all') {
        if (selectedZone === 'Golden Square') {
          const isGolden = c.z.includes('5th') && (c.n.includes('Mivida') || c.n.includes('Villette') || c.n.includes('Palm') || c.n.includes('Mountain View') || c.n.includes('Eastown') || c.n.includes('Fifth Square'));
          if (!isGolden) return false;
        } else if (selectedZone === 'Madinaty') {
          if (!c.n.includes('Madinaty') && !c.n.includes('Rehab') && !c.z.toLowerCase().includes('shorouk')) return false;
        } else if (selectedZone === 'New Capital') {
          if (!c.z.toLowerCase().includes('capital') && !c.n.toLowerCase().includes('capital')) return false;
        } else if (selectedZone === 'Uptown') {
          if (!c.n.toLowerCase().includes('uptown') && !c.z.toLowerCase().includes('mokattam')) return false;
        } else if (selectedZone === 'TMG') {
          if (!c.n.includes('Rehab') && !c.n.includes('Madinaty')) return false;
        } else if (selectedZone === 'Transit') {
          if (!c.n.includes('Cairo Plaza') && !c.z.includes('Metro') && !c.z.includes('Mataria')) return false;
        } else if (!c.z.toLowerCase().includes(selectedZone.toLowerCase()) && !c.n.toLowerCase().includes(selectedZone.toLowerCase())) {
          return false;
        }
      }

      // 3. Budget preset filter (local on map) — rent ladder while a rent
      // segment is active, sale presets otherwise (same keys as SmartFilterBar).
      if (selectedPriceBudget !== 'any') {
        if (isRentSegment) {
          // Compound rent levels are tracked in USD/month (~50 EGP/USD).
          const { min, max } = budgetBounds(selectedPriceBudget, RENT_BUDGET_LADDER);
          const rentUsd = c.rent || 0;
          if (min !== undefined && rentUsd > 0 && rentUsd < min / 50) return false;
          if (max !== undefined && rentUsd > max / 50) return false;
        } else {
          const preset = MAP_PRICE_PRESETS.find((p) => p.val === selectedPriceBudget);
          if (preset) {
            if (preset.minM !== undefined && c.priceM < preset.minM) return false;
            if (preset.maxM !== undefined && c.priceM > preset.maxM) return false;
          }
        }
      }

      // 4. External Price filter — unified preset keys from SmartFilterBar
      // ('under10m', '10m-20m', … sale) / ('under35k', '35k-60k', … rent).
      if (filterPrice && filterPrice !== '0') {
        const ladder = filterPrice.includes('k') ? RENT_BUDGET_LADDER : SALE_BUDGET_LADDER;
        const { min, max } = budgetBounds(filterPrice, ladder);
        if (ladder === RENT_BUDGET_LADDER) {
          // Compound rent levels are tracked in USD/month (~50 EGP/USD).
          const rentUsd = c.rent || 0;
          if (min !== undefined && rentUsd > 0 && rentUsd < min / 50) return false;
          if (max !== undefined && rentUsd > max / 50) return false;
        } else {
          if (min !== undefined && c.priceM * 1_000_000 < min) return false;
          if (max !== undefined && c.priceM * 1_000_000 > max) return false;
        }
      }

      // 5. Unit-type filter — a compound stays visible when the live
      // inventory holds at least one unit of that type inside it. When the
      // inventory payload has not arrived yet, keep every compound visible
      // (never exclude on missing evidence).
      if (selectedUnitType && inventoryData?.units) {
        const t = selectedUnitType.toLowerCase();
        const target = c.n.toLowerCase().trim();
        const hasType = inventoryData.units.some((u: any) => {
          const cmp = (u.compound || u.location || '').toLowerCase().trim();
          if (!cmp || !(cmp.includes(target) || target.includes(cmp))) return false;
          const pt = String(u.propertyType || u.type || '').toLowerCase();
          return Boolean(pt) && (pt.includes(t) || t.includes(pt));
        });
        if (!hasType) return false;
      }

      // 6. Segment filter (rent/resale) — a compound stays visible when the
      // live inventory holds at least one unit of that segment inside it
      // (exact segment match when the unit carries one; otherwise the unit's
      // mode is the fallback evidence — most public units carry no segment
      // attribution yet). Static compound rent/price levels are NOT evidence
      // of live inventory, so they never keep a pin alive here. When the
      // inventory payload has not arrived yet, keep every compound visible
      // — never exclude on missing evidence.
      if (selectedSegment !== 'all' && inventoryData?.units) {
        const target = c.n.toLowerCase().trim();
        const hasSegment = inventoryData.units.some((u: any) => {
          const cmp = (u.compound || u.location || '').toLowerCase().trim();
          if (!cmp || !(cmp.includes(target) || target.includes(cmp))) return false;
          const seg = String(u.segment || '').toLowerCase();
          if (seg === selectedSegment) return true;
          if (seg && seg !== 'unknown') return false;
          return isRentSegment ? u.mode === 'rent' : u.mode === 'sale';
        });
        if (!hasSegment) return false;
      }

      // 7. Condition filter — evidence rule: a compound is excluded only when
      // its live inventory holds at least one unit with a RESOLVABLE condition
      // and none of them match the selection. Units whose finishing text can't
      // be resolved ("Standard", empty, …) carry no evidence either way — they
      // must not hide the compound (same anti-fabrication stance as the rest
      // of the map filters; /properties stays strict because it filters rows,
      // not pins).
      if (selectedCondition && inventoryData?.units) {
        const target = c.n.toLowerCase().trim();
        let sawResolvable = false;
        let sawMatch = false;
        inventoryData.units.forEach((u: any) => {
          const cmp = (u.compound || u.location || '').toLowerCase().trim();
          if (!cmp || !(cmp.includes(target) || target.includes(cmp))) return;
          const key = unitConditionKey({
            finishing: u.finishing,
            finishingQuality: u.finishingQuality,
            furnishing: u.furnishing,
            furnished: u.furnished,
          });
          if (key === 'unknown') return;
          sawResolvable = true;
          if (key === selectedCondition) sawMatch = true;
        });
        if (sawResolvable && !sawMatch) return false;
      }

      return true;
    });
  }, [compounds, filterQuery, filterCompound, selectedZone, selectedPriceBudget, filterPrice, showSelectedOnly, selectedName, selectedUnitType, selectedSegment, selectedCondition, inventoryData]);

  // Initialize Leaflet Map
  useEffect(() => {
    let cancelled = false;
    const markersMap = markersMapRef.current;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !hostRef.current || mapRef.current) return;

      const map = L.map(hostRef.current, {
        center: NEW_CAIRO_CENTER,
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        scrollWheelZoom: true,
        zoomControl: true,
      });
      mapRef.current = map;

      // Sierra brand basemap — CARTO dark_matter: an obsidian-navy canvas
      // that matches the masterplan deck (#071523) and the champagne-gold
      // pins. The previous generic light OSM tiles clashed with the dark
      // brand chrome (no API key required, subdomains a–d).
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
        subdomains: 'abcd',
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersMap.clear();
    };
  }, []);

  // Render clean luxury pill markers & popups
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled) return;
      const layer = layerRef.current;
      const map = mapRef.current;
      if (!layer || !map) return;

      layer.clearLayers();
      markersMapRef.current.clear();

      filteredCompounds.forEach((c) => {
        const isFeat = featured.includes(c.n);
        const isSelected = selectedName === c.n;
        const isHot = c.ai >= 9.2;

        // Two-letter flag pin — the masterplan stays clean: NO compound names
        // on the map. Pressing the flag opens the Excel sheet modal with ALL
        // units for that compound (live inventory + master sheet).
        const flagCode = compoundFlagCode(c.n);
        const flagBg = isSelected ? '#071523' : isFeat ? '#0a382b' : '#14283d';
        const flagBorder = isSelected
          ? '2px solid #dfad3a'
          : isHot
          ? '1.5px solid rgba(223, 173, 58, 0.7)'
          : '1px solid rgba(255, 255, 255, 0.28)';
        const flagShadow = isSelected
          ? '0 0 20px rgba(223, 173, 58, 0.75), 0 6px 14px rgba(0,0,0,0.55)'
          : isHot
          ? '0 0 12px rgba(223, 173, 58, 0.35), 0 4px 10px rgba(0,0,0,0.4)'
          : '0 3px 9px rgba(0,0,0,0.38)';
        const flagColor = isSelected ? '#e9c176' : '#ffffff';

        const markerHtml = `
          <div class="sierra-compound-flag ${isSelected ? 'is-selected' : ''}" style="
            position: relative;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${flagBg};
            color: ${flagColor};
            border: ${flagBorder};
            border-radius: 9px 9px 9px 2px;
            box-shadow: ${flagShadow};
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
            font-size: 11.5px;
            font-weight: 800;
            letter-spacing: 0.05em;
            line-height: 1;
            transform: ${isSelected ? 'scale(1.14)' : 'scale(1)'};
            transform-origin: 50% 100%;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
          ">${flagCode}<span aria-hidden="true" style="
            position: absolute;
            bottom: -4.5px;
            left: 50%;
            margin-left: -4.5px;
            width: 9px;
            height: 9px;
            background: ${flagBg};
            border-right: ${flagBorder};
            border-bottom: ${flagBorder};
            transform: rotate(45deg);
          "></span></div>
        `;

        const marker = L.marker(c.c, {
          icon: L.divIcon({
            className: 'sierra-leaflet-marker-wrap',
            html: markerHtml,
            iconSize: [30, 36],
            iconAnchor: [15, 35],
          }),
          zIndexOffset: isSelected ? 1000 : isFeat ? 700 : 100,
        });

        // Flag press → select (intel panel / search sync) AND open the
        // compact Excel-style units deck fitted to the map area (map hidden
        // while open). No Leaflet popup — the masterplan itself is the
        // interface.
        marker.on('click', () => {
          handleSelect?.(c.n);
          onOpenSheet?.(c.n);
          setSheetCompound(c.n);
        });

        // Render Masterplan Boundary Polygon (if available)
        const polyCoords = COMPOUND_POLYGONS[c.n];
        let polygonRef: any = null;
        if (polyCoords) {
          const polygon = L.polygon(polyCoords, {
            color: isSelected ? '#dfad3a' : isFeat ? '#10b981' : '#64748b',
            weight: isSelected ? 2.5 : isFeat ? 1.5 : 1,
            dashArray: isSelected ? undefined : isFeat ? '4, 4' : '3, 6',
            fillColor: isSelected ? '#dfad3a' : isFeat ? '#059669' : '#0f172a',
            fillOpacity: isSelected ? 0.22 : isFeat ? 0.12 : 0.04,
            smoothFactor: 1,
          });

          polygon.on('click', () => {
            handleSelect?.(c.n);
            if (mapRef.current) {
              mapRef.current.flyToBounds(polygon.getBounds(), {
                padding: [50, 50],
                maxZoom: 15,
                duration: 0.9,
              });
            }
          });

          polygon.addTo(layer);
          polygonRef = polygon;

          // Render Masterplan Internal Subfeatures (lagoons, green spines, golf courses)
          const subfeatures = COMPOUND_SUBFEATURES[c.n];
          if (subfeatures && (isSelected || isFeat)) {
            subfeatures.forEach((sub) => {
              const subColor = sub.type === 'lagoon' ? '#0ea5e9' : sub.type === 'park' ? '#10b981' : '#f59e0b';
              const subFill = sub.type === 'lagoon' ? '#38bdf8' : sub.type === 'park' ? '#34d399' : '#fbbf24';
              const subPoly = L.polygon(sub.coords, {
                color: subColor,
                weight: 1.5,
                fillColor: subFill,
                fillOpacity: 0.35,
                smoothFactor: 1,
              });
              subPoly.bindTooltip(sub.name, { sticky: true });
              subPoly.addTo(layer);
            });
          }
        }

        marker.addTo(layer);
        markersMapRef.current.set(c.n, { marker, coords: c.c, polygon: polygonRef });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, filteredCompounds, featured, selectedName, handleSelect, onOpenSheet]);

  // Close the sheet when a different compound is selected externally
  useEffect(() => {
    if (sheetCompound && selectedName && sheetCompound !== selectedName) {
      setSheetCompound(selectedName);
    }
  }, [selectedName, sheetCompound]);


  // Handle external selection & smooth zoom
  useEffect(() => {
    if (!ready || !selectedName || !mapRef.current) return;
    const target = markersMapRef.current.get(selectedName);
    if (target) {
      if (target.polygon && mapRef.current) {
        mapRef.current.flyToBounds(target.polygon.getBounds(), {
          padding: [50, 50],
          maxZoom: 15,
          duration: 0.9,
          easeLinearity: 0.25,
        });
      } else {
        mapRef.current.flyTo(target.coords, 14, { duration: 0.9, easeLinearity: 0.25 });
      }
      target.marker.openPopup();
    }
  }, [ready, selectedName]);

  const handleZoneSelect = useCallback((zone: ZonePreset) => {
    setSelectedZone(zone.key);
    if (mapRef.current) {
      mapRef.current.fitBounds(zone.bounds, { padding: [24, 24], maxZoom: zone.zoom, duration: 0.9 });
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterQuery('');
    setSelectedZone('all');
    setSelectedBed('any');
    setSelectedPriceBudget('any');
    setSelectedUnitType('');
    setSelectedCondition('');
    setSelectedSegment('all');
    setShowSelectedOnly(false);
    if (mapRef.current) {
      mapRef.current.flyTo(NEW_CAIRO_CENTER, 12, { duration: 0.8 });
    }
  }, []);

  const activeFilterCount =
    (filterQuery ? 1 : 0) +
    (selectedZone !== 'all' ? 1 : 0) +
    (selectedBed !== 'any' ? 1 : 0) +
    (selectedPriceBudget !== 'any' ? 1 : 0) +
    (selectedUnitType ? 1 : 0) +
    (selectedCondition ? 1 : 0) +
    (selectedSegment !== 'all' ? 1 : 0) +
    (showSelectedOnly ? 1 : 0) +
    (filterCompound ? 1 : 0) +
    (filterPrice && filterPrice !== '0' ? 1 : 0);

  return (
    <div className="map-command-deck" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 560, borderRadius: 16, overflow: 'hidden' }}>
      {/* Flag-press Units Deck — fitted to the map area, map hidden while open */}
      {sheetCompound && (
        <CompoundUnitsDeck
          compoundName={sheetCompound}
          flagCode={compoundFlagCode(sheetCompound)}
          units={(inventoryData?.units || []) as any}
          onClose={() => setSheetCompound(null)}
          isAr={isAr}
        />
      )}

      {/* Map Host Canvas */}
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 560,
          background: '#071523',
        }}
      />

      {/* Top-Left Floating Controls: Segment Bar & Zone Bar */}
      <div
        className="map-top-left-controls"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 'calc(100% - 310px)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", sans-serif',
        }}
      >
        {/* Segment Filter Bar */}
        <div
          className="map-segment-bar"
          style={{
            background: 'rgba(7, 21, 35, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(223, 173, 58, 0.25)',
            borderRadius: 14,
            padding: '6px 8px',
            boxShadow: '0 12px 28px -4px rgba(0,0,0,0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {SEGMENT_TABS.map((tab) => {
            const isCurrent = selectedSegment === tab.key;
            const badgeCount =
              tab.key === 'all'
                ? (inventoryData?.segments?.total ? inventoryData.segments.total.toLocaleString() : tab.defaultBadge)
                : (inventoryData?.segments?.[tab.key] ? (inventoryData.segments[tab.key] as number).toLocaleString() : tab.defaultBadge);

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSelectedSegment(tab.key);
                  // Rent and sale use different budget ladders — reset the
                  // budget when the segment direction changes.
                  setSelectedPriceBudget('any');
                }}
                aria-pressed={isCurrent}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: isCurrent ? 800 : 600,
                  background: isCurrent ? 'linear-gradient(135deg, #c8961a, #dfad3a)' : 'rgba(255, 255, 255, 0.06)',
                  color: isCurrent ? '#071523' : '#e2e8f0',
                  border: isCurrent ? '1px solid #dfad3a' : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isCurrent ? '0 2px 10px rgba(223, 173, 58, 0.4)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: isCurrent ? '#071523' : 'rgba(255, 255, 255, 0.12)',
                    color: isCurrent ? '#dfad3a' : '#cbd5e1',
                  }}
                >
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Zone Fast-Switching Rail */}
        <div
          className="map-zone-rail"
          style={{
            background: 'rgba(7, 21, 35, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginInlineEnd: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Navigation style={{ width: 11, height: 11, color: '#dfad3a' }} />
            <span>Zone:</span>
          </span>
          {NEW_CAIRO_ZONES.map((zone) => {
            const isZoneActive = selectedZone === zone.key;
            return (
              <button
                key={zone.key}
                type="button"
                onClick={() => handleZoneSelect(zone)}
                aria-pressed={isZoneActive}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: isZoneActive ? 800 : 500,
                  whiteSpace: 'nowrap',
                  background: isZoneActive ? 'rgba(223, 173, 58, 0.25)' : 'transparent',
                  color: isZoneActive ? '#dfad3a' : '#cbd5e1',
                  border: isZoneActive ? '1px solid #dfad3a' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Filter Toggle Button on Top-Right */}
      {showControls && (
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          aria-expanded={isFilterPanelOpen}
          aria-controls="map-smart-filter-panel"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 401,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isFilterPanelOpen ? '#dfad3a' : 'rgba(7, 21, 35, 0.94)',
            color: isFilterPanelOpen ? '#071523' : '#ffffff',
            border: '1px solid rgba(223, 173, 58, 0.35)',
            padding: '7px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
          }}
        >
          <SlidersHorizontal style={{ width: 13, height: 13 }} />
          <span>{isFilterPanelOpen ? (isAr ? 'إخفاء الفلاتر' : 'Hide Filters') : (isAr ? 'فلاتر الخريطة' : 'Smart Filters')}</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                background: isFilterPanelOpen ? '#071523' : '#dfad3a',
                color: isFilterPanelOpen ? '#ffffff' : '#071523',
                fontSize: 10,
                fontWeight: 900,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'inline-grid',
                placeItems: 'center',
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Smart Filter Panel on Top-Right */}
      {showControls && isFilterPanelOpen && (
        <div
          id="map-smart-filter-panel"
          className="map-smart-filter-panel"
          role="region"
          aria-label={isAr ? 'فلاتر الخريطة' : 'Map filters'}
          style={{
            position: 'absolute',
            top: 54,
            right: 16,
            zIndex: 400,
            width: 308,
            background: 'rgba(7, 21, 35, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(223, 173, 58, 0.25)',
            borderRadius: 14,
            padding: 14,
            boxShadow: '0 20px 40px -4px rgba(0,0,0,0.45)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", sans-serif',
            color: '#ffffff',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: '#dfad3a' }}>
              <SlidersHorizontal style={{ width: 14, height: 14 }} />
              <span>Smart Masterplan Filter</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {filteredCompounds.length} compounds
              </span>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                title="Close"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* SMART FILTER CHIPS — dropdowns: compound/area · rooms · budget · unit type · condition */}
          <SmartFilterBar
            value={{
              purpose: selectedSegment === 'owners_rent' || selectedSegment === 'broker_rent' ? 'rent' : 'sale',
              compound: filterQuery,
              rooms: selectedBed === 'any' ? '' : String(selectedBed),
              budget: selectedPriceBudget === 'any' ? '' : selectedPriceBudget,
              unitType: selectedUnitType,
              condition: selectedCondition,
            }}
            onChange={(v) => {
              setFilterQuery(v.compound);
              setSelectedBed(v.rooms === '' ? 'any' : parseInt(v.rooms, 10) || 'any');
              setSelectedPriceBudget(v.budget || 'any');
              setSelectedUnitType(v.unitType || '');
              setSelectedCondition(v.condition || '');
            }}
            compounds={compounds.map((c) => ({ name: c.n, zone: c.z }))}
            showPurpose={false}
            budgetOptions={
              selectedSegment === 'owners_rent' || selectedSegment === 'broker_rent'
                ? RENT_BUDGET_LADDER
                : MAP_PRICE_PRESETS.map((p) => ({ val: p.val, en: p.labelEn, ar: p.labelAr }))
            }
            panelAlign="end"
            compact
            resultCount={filteredCompounds.length}
            conditionCounts={conditionCounts}
            onReset={handleResetFilters}
            idPrefix="map"
          />

          <button
            type="button"
            aria-pressed={showSelectedOnly}
            onClick={() => setShowSelectedOnly((value) => !value)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              padding: '8px 10px',
              borderRadius: 8,
              border: showSelectedOnly ? '1px solid #dfad3a' : '1px solid rgba(255,255,255,0.14)',
              background: showSelectedOnly ? 'rgba(223,173,58,0.18)' : 'rgba(255,255,255,0.05)',
              color: showSelectedOnly ? '#dfad3a' : '#e2e8f0',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>{isAr ? 'إظهار الكمبوند المحدد فقط' : 'Show selected compound only'}</span>
            <span>{showSelectedOnly && selectedName ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reset Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
              {selectedName ? `Selected: ${selectedName}` : 'Click any pin to inspect'}
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: '#dfad3a',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 6px',
              }}
            >
              <RotateCcw style={{ width: 11, height: 11 }} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Legend on Bottom-Left */}
      <div
        className="map-floating-legend"
        style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          zIndex: 400,
          background: 'rgba(7, 21, 35, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(223, 173, 58, 0.2)',
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif',
          color: '#e2e8f0',
          minWidth: 160,
        }}
      >
        <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: '#dfad3a', marginBottom: 6 }}>
          MASTERPLAN TIERS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#dfad3a', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #dfad3a' }} />
            <span style={{ fontWeight: 700, color: '#ffffff' }}>Selected / Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#059669', borderRadius: '50%', display: 'inline-block' }} />
            <span>AI Score 9.2+ (Premier)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#c8961a', borderRadius: '50%', display: 'inline-block' }} />
            <span>Verified Portfolio</span>
          </div>
        </div>
      </div>

      {/* Center Bottom Floating CTA: Open Full Map */}
      <div
        className="map-center-cta"
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 400,
        }}
      >
        <Link
          href="/compounds"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #071523, #04261c)',
            color: '#ffffff',
            border: '1px solid #dfad3a',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.02em',
            textDecoration: 'none',
            boxShadow: '0 10px 25px -3px rgba(0,0,0,0.5)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#c8961a';
            e.currentTarget.style.color = '#071523';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #071523, #04261c)';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          <MapIcon style={{ width: 15, height: 15 }} />
          <span>Open Full Interactive Masterplan</span>
        </Link>
      </div>
    </div>
  );
}
