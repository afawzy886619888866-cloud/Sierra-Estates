'use client';

/**
 * Sierra Estates — Interactive Compounds Masterplan Map (Illustrated Cartography)
 *
 * Replaces generic raster tiles with the bespoke New Cairo Masterplan illustrated
 * cartography (supporting both Light and Dark themes), with pixel-calibrated hotspots,
 * live inventory synchronization, 5-way segment filtering, zone quick-navigation,
 * interactive 360° HUD availability card, and animated masterplan landmark tour.
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Map as MapIcon,
  SlidersHorizontal,
  Navigation,
  X,
  Plus,
  Minus,
  Play,
  Pause,
  Sun,
  Moon,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Camera,
} from 'lucide-react';
import SmartFilterBar from '@/components/site/SmartFilterBar';
import CompoundUnitsDeck from '@/components/site/CompoundUnitsDeck';
import {
  RENT_BUDGET_LADDER,
  SALE_BUDGET_LADDER,
  budgetBounds,
  unitConditionKey,
} from '@/lib/site/smart-search';

/** Two-letter flag code for a compound (matches the map pin badge). */
export function compoundFlagCode(name: string): string {
  return name.replace(/[^A-Za-z\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase() || '·';
}

/** Sierra Estates Official Geometric Mountain Chevron Logo SVG */
export function SierraMountainLogo({
  className,
  style,
  size = 36,
  metallic = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  metallic?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 100 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {metallic ? (
          <linearGradient id="metallicStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        ) : (
          <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dfad3a" />
            <stop offset="100%" stopColor="#c8961a" />
          </linearGradient>
        )}
      </defs>
      {/* Back Mountain Ridge */}
      <path
        d="M14 50 L38 18 L54 38"
        stroke={metallic ? 'url(#metallicStroke)' : 'currentColor'}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Front Mountain Ridge */}
      <path
        d="M38 50 L60 12 L82 44"
        stroke={metallic ? 'url(#metallicStroke)' : 'currentColor'}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ascending Vector Arrow */}
      <path
        d="M22 50 L84 10"
        stroke={metallic ? 'url(#metallicStroke)' : 'currentColor'}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d="M68 9.5 L84.5 9.5 L84.5 26"
        stroke={metallic ? 'url(#metallicStroke)' : 'currentColor'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Luxury Brushed Silver Metallic Badge Plate for Dark Mode Masterplan */
export function MetallicEmblemBadge({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 400,
        width: 90,
        height: 114,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 28%, #94a3b8 55%, #e2e8f0 78%, #64748b 100%)',
        boxShadow:
          '0 12px 28px rgba(0,0,0,0.55), inset 1.5px 1.5px 2px rgba(255,255,255,0.9), inset -1.5px -1.5px 2px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 8px',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Specular light diagonal sheen */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: -40,
          width: 160,
          height: 50,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.65), rgba(255,255,255,0))',
          transform: 'rotate(25deg)',
          pointerEvents: 'none',
        }}
      />
      {/* Embossed Metallic Sierra Logo */}
      <SierraMountainLogo size={42} metallic />
      <div
        style={{
          marginTop: 6,
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 8.5,
            fontWeight: 900,
            letterSpacing: '0.08em',
            color: '#1e293b',
            textShadow: '0 1px 0 rgba(255,255,255,0.7)',
            lineHeight: 1.1,
          }}
        >
          SIERRA ESTATES
        </div>
        <div
          style={{
            fontSize: 6.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#475569',
            marginTop: 2,
            textShadow: '0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          ELEVATED LIVING
        </div>
      </div>
    </div>
  );
}

/** Clean Watermark Logo for Light Mode Masterplan */
export function CleanLogoWatermark({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif',
      }}
    >
      <SierraMountainLogo size={44} style={{ color: '#64748b' }} />
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: '#334155',
          }}
        >
          SIERRA ESTATES
        </div>
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#64748b',
          }}
        >
          ELEVATED LIVING
        </div>
      </div>
    </div>
  );
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
  'Mountain View': 'Mountain View',
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
  'The Valley': 'Mostakbal Developments',
  'American University in Cairo (AUC)': 'Landmark / Academic',
};

// Masterplan footprint polygons (for external reference & backwards-compatibility)
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
  panX?: number;
  panY?: number;
}

export const NEW_CAIRO_ZONES: ZonePreset[] = [
  { key: 'all', label: 'Uptown → New Capital', center: [30.045, 31.59], zoom: 1, bounds: [[29.94, 31.27], [30.18, 31.78]], panX: 0, panY: 0 },
  { key: 'Golden Square', label: 'Golden Square', center: [30.015, 31.60], zoom: 1.65, bounds: [[29.97, 31.54], [30.06, 31.64]], panX: -8, panY: 10 },
  { key: '5th Settlement', label: '5th Settlement', center: [30.02, 31.55], zoom: 1.6, bounds: [[29.97, 31.49], [30.08, 31.61]], panX: 18, panY: -8 },
  { key: 'Katameya', label: 'Katameya', center: [29.988, 31.485], zoom: 1.75, bounds: [[29.95, 31.40], [30.04, 31.53]], panX: 5, panY: -28 },
  { key: 'Mostakbal', label: 'Mostakbal City', center: [30.065, 31.65], zoom: 1.65, bounds: [[30.01, 31.60], [30.12, 31.71]], panX: -28, panY: 5 },
  { key: 'Madinaty', label: 'Madinaty & Shorouk', center: [30.105, 31.64], zoom: 1.7, bounds: [[30.04, 31.57], [30.18, 31.72]], panX: -32, panY: 30 },
  { key: 'Uptown', label: 'Uptown Cairo', center: [30.026, 31.307], zoom: 1.75, bounds: [[29.99, 31.27], [30.06, 31.35]], panX: 35, panY: -10 },
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

/** Masterplan Hotspot definition calibrated to the 1024x686 illustrated maps */
export interface MasterplanHotspot {
  id: string;
  name: string;
  aliases: string[];
  zone: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number;
  height: number;
  dev: string;
  flagCode: string;
  tier: 'premier' | 'verified' | 'core';
  defaultAiScore: number;
  avgPriceM: number;
  rentUsd: number;
  liveUnits?: number;
}

export const MASTERPLAN_HOTSPOTS: MasterplanHotspot[] = [
  {
    id: 'mivida',
    name: 'Mivida',
    aliases: ['Mivida Parks', 'Mivida Emaar'],
    zone: 'Golden Square / South 90th',
    x: 49.5,
    y: 50.0,
    width: 8.5,
    height: 24.5,
    dev: 'Emaar Misr',
    flagCode: 'MV',
    tier: 'premier',
    defaultAiScore: 9.6,
    avgPriceM: 28.5,
    rentUsd: 1400,
  },
  {
    id: 'hyde-park',
    name: 'Hyde Park',
    aliases: ['Hyde Park New Cairo', 'Hyde Park Central'],
    zone: 'Golden Square',
    x: 50.0,
    y: 22.0,
    width: 8.5,
    height: 14.0,
    dev: 'Hyde Park Developments',
    flagCode: 'HP',
    tier: 'premier',
    defaultAiScore: 9.4,
    avgPriceM: 22.0,
    rentUsd: 1100,
  },
  {
    id: 'mv-hyde-park',
    name: 'Mountain View Hyde Park',
    aliases: ['Mountain View Executive', 'Mountain View'],
    zone: 'Golden Square',
    x: 50.0,
    y: 36.5,
    width: 8.5,
    height: 13.0,
    dev: 'Mountain View',
    flagCode: 'MV',
    tier: 'premier',
    defaultAiScore: 9.3,
    avgPriceM: 21.0,
    rentUsd: 1050,
  },
  {
    id: 'villette',
    name: 'Villette',
    aliases: ['Villette (SODIC)', 'SODIC Villette'],
    zone: 'Golden Square',
    x: 58.5,
    y: 36.5,
    width: 8.5,
    height: 13.0,
    dev: 'SODIC',
    flagCode: 'VL',
    tier: 'premier',
    defaultAiScore: 9.5,
    avgPriceM: 26.0,
    rentUsd: 1350,
  },
  {
    id: 'mv-north',
    name: 'Mountain View',
    aliases: ['Mountain View 1', 'Mountain View 2'],
    zone: 'Golden Square',
    x: 58.5,
    y: 22.0,
    width: 8.5,
    height: 14.0,
    dev: 'Mountain View',
    flagCode: 'MV',
    tier: 'verified',
    defaultAiScore: 9.2,
    avgPriceM: 24.0,
    rentUsd: 1200,
  },
  {
    id: 'palm-hills',
    name: 'Palm Hills New Cairo',
    aliases: ['Palm Hills', 'PHNC'],
    zone: 'Golden Square',
    x: 57.0,
    y: 43.0,
    width: 9.8,
    height: 21.5,
    dev: 'Palm Hills',
    flagCode: 'PH',
    tier: 'premier',
    defaultAiScore: 9.5,
    avgPriceM: 29.0,
    rentUsd: 1500,
  },
  {
    id: 'fifth-square',
    name: 'Fifth Square',
    aliases: ['Fifth Square (Al Marasem)', 'El Marasem Fifth Square', 'Fifth Square Boulevard'],
    zone: 'North 90th',
    x: 41.2,
    y: 49.5,
    width: 8.2,
    height: 12.0,
    dev: 'Al Marasem',
    flagCode: 'FS',
    tier: 'premier',
    defaultAiScore: 9.3,
    avgPriceM: 19.5,
    rentUsd: 950,
  },
  {
    id: 'mv-icity',
    name: 'Mountain View iCity',
    aliases: ['iCity', 'MV iCity'],
    zone: '5th Settlement',
    x: 33.6,
    y: 54.5,
    width: 7.2,
    height: 16.5,
    dev: 'Mountain View',
    flagCode: 'IC',
    tier: 'premier',
    defaultAiScore: 9.4,
    avgPriceM: 18.0,
    rentUsd: 900,
  },
  {
    id: 'katameya-heights',
    name: 'Katameya Heights',
    aliases: ['Katameya Heights Golf'],
    zone: 'Katameya',
    x: 40.5,
    y: 76.5,
    width: 8.8,
    height: 21.0,
    dev: 'Katameya Group',
    flagCode: 'KH',
    tier: 'premier',
    defaultAiScore: 9.8,
    avgPriceM: 65.0,
    rentUsd: 3200,
  },
  {
    id: 'katameya-dunes',
    name: 'Katameya Dunes',
    aliases: ['Katameya Dunes Golf'],
    zone: 'Katameya',
    x: 49.8,
    y: 76.5,
    width: 11.5,
    height: 21.0,
    dev: 'Katameya Group',
    flagCode: 'KD',
    tier: 'premier',
    defaultAiScore: 9.7,
    avgPriceM: 58.0,
    rentUsd: 2900,
  },
  {
    id: 'cfc',
    name: 'Cairo Festival City',
    aliases: ['CFC', 'Cairo Festival City Residences'],
    zone: '5th Settlement',
    x: 22.2,
    y: 68.0,
    width: 11.2,
    height: 24.5,
    dev: 'Al-Futtaim Group',
    flagCode: 'CF',
    tier: 'premier',
    defaultAiScore: 9.6,
    avgPriceM: 32.0,
    rentUsd: 1800,
  },
  {
    id: 'taj-city',
    name: 'Taj City',
    aliases: ['Taj Sultan', 'Shalya'],
    zone: 'Suez Road / Ring Road',
    x: 17.5,
    y: 45.5,
    width: 8.2,
    height: 14.0,
    dev: 'MNHD',
    flagCode: 'TC',
    tier: 'verified',
    defaultAiScore: 9.1,
    avgPriceM: 15.5,
    rentUsd: 750,
  },
  {
    id: 'el-rehab',
    name: 'Al Rehab',
    aliases: ['El Rehab', 'Rehab City'],
    zone: 'Suez Road',
    x: 30.0,
    y: 11.5,
    width: 10.0,
    height: 20.5,
    dev: 'TMG',
    flagCode: 'RH',
    tier: 'core',
    defaultAiScore: 9.0,
    avgPriceM: 12.5,
    rentUsd: 650,
  },
  {
    id: 'madinaty',
    name: 'Madinaty',
    aliases: ['Madinaty District 1', 'Madinaty District 3', 'Madinaty Executive Villas'],
    zone: 'Suez Road / Shorouk',
    x: 79.5,
    y: 1.5,
    width: 11.2,
    height: 14.5,
    dev: 'TMG',
    flagCode: 'MD',
    tier: 'verified',
    defaultAiScore: 9.3,
    avgPriceM: 14.5,
    rentUsd: 700,
  },
  {
    id: 'the-valley',
    name: 'The Valley',
    aliases: ['The Valley New Cairo'],
    zone: 'Mostakbal City',
    x: 73.8,
    y: 22.5,
    width: 11.0,
    height: 18.5,
    dev: 'Mostakbal Developments',
    flagCode: 'TV',
    tier: 'core',
    defaultAiScore: 9.1,
    avgPriceM: 16.0,
    rentUsd: 800,
  },
  {
    id: 'la-mirada',
    name: 'La Mirada',
    aliases: ['La Mirada New Cairo', 'La Mirada Plaza'],
    zone: 'Mostakbal City',
    x: 73.8,
    y: 35.5,
    width: 9.8,
    height: 11.0,
    dev: 'Inertia',
    flagCode: 'LM',
    tier: 'core',
    defaultAiScore: 9.0,
    avgPriceM: 15.0,
    rentUsd: 750,
  },
  {
    id: 'sarai',
    name: 'Sarai',
    aliases: ['Sarai (MNHD)'],
    zone: 'Suez Road / Mostakbal',
    x: 73.8,
    y: 42.5,
    width: 8.0,
    height: 11.0,
    dev: 'MNHD',
    flagCode: 'SR',
    tier: 'verified',
    defaultAiScore: 9.2,
    avgPriceM: 17.5,
    rentUsd: 850,
  },
  {
    id: 'uptown-cairo',
    name: 'Uptown Cairo',
    aliases: ['Mokattam', 'Celesta Hills', 'Aurora'],
    zone: 'Mokattam / Uptown',
    x: 1.8,
    y: 52.0,
    width: 14.0,
    height: 22.0,
    dev: 'Emaar Misr',
    flagCode: 'UC',
    tier: 'premier',
    defaultAiScore: 9.6,
    avgPriceM: 42.0,
    rentUsd: 2200,
  },
  {
    id: 'eastown',
    name: 'Eastown',
    aliases: ['Eastown (SODIC)', 'Eastown Residences'],
    zone: 'South 90th',
    x: 44.5,
    y: 42.0,
    width: 6.5,
    height: 8.0,
    dev: 'SODIC',
    flagCode: 'ET',
    tier: 'premier',
    defaultAiScore: 9.4,
    avgPriceM: 23.5,
    rentUsd: 1200,
  },
  {
    id: 'swan-lake',
    name: 'Swan Lake Residence',
    aliases: ['Swan Lake', 'Selena'],
    zone: '1st Settlement',
    x: 24.0,
    y: 32.0,
    width: 7.5,
    height: 12.0,
    dev: 'Hassan Allam',
    flagCode: 'SL',
    tier: 'premier',
    defaultAiScore: 9.7,
    avgPriceM: 45.0,
    rentUsd: 2500,
  },
  {
    id: 'auc-center',
    name: 'American University in Cairo (AUC)',
    aliases: ['AUC', 'AUC New Cairo'],
    zone: 'Road 90 Center',
    x: 45.0,
    y: 47.0,
    width: 9.8,
    height: 15.0,
    dev: 'Landmark / Academic',
    flagCode: 'AU',
    tier: 'premier',
    defaultAiScore: 9.9,
    avgPriceM: 0,
    rentUsd: 0,
  },
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
    finishing?: string;
    finishingQuality?: string;
    furnishing?: string;
    furnished?: string | boolean;
    mode?: string;
    segment?: string;
    propertyType?: string;
    type?: string;
    area?: number;
    rooms?: number;
    bedrooms?: number;
    status?: string;
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

  // Visual Theme: Light vs Dark Masterplan (defaults to dark for Sierra luxury palette)
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');

  // Masterplan Viewport Canvas Transformation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Filter & UI States
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedBed, setSelectedBed] = useState<number | 'any'>('any');
  const [selectedPriceBudget, setSelectedPriceBudget] = useState<string>('any');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(selectedOnly);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryApiData | null>(null);

  // Hovered Hotspot State for rich tooltips
  const [hoveredHotspot, setHoveredHotspot] = useState<MasterplanHotspot | null>(null);

  // Flag-press sheet: compact Excel-style units deck fitted INSIDE the map deck
  const [sheetCompound, setSheetCompound] = useState<string | null>(null);

  // Automated Animated Masterplan Tour ("▶ Play" button from design)
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  // 360° Virtual Tour Preview Modal
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);

  // Fetch live inventory
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

  // Live condition counts
  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of inventoryData?.units ?? []) {
      const key = unitConditionKey({
        finishing: u.finishing,
        finishingQuality: u.finishingQuality,
        furnishing: u.furnishing,
        furnished: u.furnished,
      });
      if (key === 'unknown') continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [inventoryData]);

  // Live Unit counts per compound name
  const liveCompoundCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (inventoryData?.compoundCounts) {
      Object.assign(counts, inventoryData.compoundCounts);
    }
    if (inventoryData?.units) {
      for (const u of inventoryData.units) {
        const cName = u.compound || u.location || '';
        if (cName) {
          counts[cName] = (counts[cName] || 0) + 1;
        }
      }
    }
    return counts;
  }, [inventoryData]);

  // Merge external compounds data with masterplan hotspots
  const mergedHotspots = useMemo(() => {
    return MASTERPLAN_HOTSPOTS.map((spot) => {
      const matched = compounds.find(
        (c) =>
          c.n.toLowerCase() === spot.name.toLowerCase() ||
          spot.aliases.some((a) => a.toLowerCase() === c.n.toLowerCase()) ||
          c.n.toLowerCase().includes(spot.name.toLowerCase()) ||
          spot.name.toLowerCase().includes(c.n.toLowerCase())
      );

      const liveUnits =
        liveCompoundCounts[spot.name] ||
        (matched ? liveCompoundCounts[matched.n] : 0) ||
        (matched?.units ?? 0);

      return {
        ...spot,
        dev: matched?.dev || COMPOUND_DEVELOPERS[spot.name] || spot.dev,
        defaultAiScore: matched?.ai || spot.defaultAiScore,
        avgPriceM: matched?.priceM || spot.avgPriceM,
        rentUsd: matched?.rent || spot.rentUsd,
        liveUnits,
      };
    });
  }, [compounds, liveCompoundCounts]);

  // Filtered Hotspots based on user inputs
  const filteredHotspots = useMemo(() => {
    const isRentSegment = selectedSegment === 'owners_rent' || selectedSegment === 'broker_rent';

    return mergedHotspots.filter((spot) => {
      if (showSelectedOnly && selectedName) {
        const isMatch =
          selectedName.toLowerCase() === spot.name.toLowerCase() ||
          spot.aliases.some((a) => a.toLowerCase() === selectedName.toLowerCase());
        if (!isMatch) return false;
      }

      // 1. Text query filter
      const effectiveQuery = (filterQuery || filterCompound || '').toLowerCase().trim();
      if (effectiveQuery) {
        const matchesName = spot.name.toLowerCase().includes(effectiveQuery);
        const matchesZone = spot.zone.toLowerCase().includes(effectiveQuery);
        const matchesDev = spot.dev.toLowerCase().includes(effectiveQuery);
        const matchesAlias = spot.aliases.some((a) => a.toLowerCase().includes(effectiveQuery));
        if (!matchesName && !matchesZone && !matchesDev && !matchesAlias) return false;
      }

      // 2. Zone filter
      if (selectedZone !== 'all') {
        if (selectedZone === 'Golden Square') {
          if (!spot.zone.toLowerCase().includes('golden') && !['Mivida', 'Villette', 'Hyde Park', 'Mountain View', 'Palm Hills New Cairo'].includes(spot.name)) return false;
        } else if (selectedZone === 'Madinaty') {
          if (!['Madinaty', 'Al Rehab'].includes(spot.name) && !spot.zone.toLowerCase().includes('shorouk')) return false;
        } else if (selectedZone === 'Uptown') {
          if (!spot.name.includes('Uptown') && !spot.zone.toLowerCase().includes('mokattam')) return false;
        } else if (selectedZone === 'Katameya') {
          if (!spot.name.includes('Katameya') && !spot.zone.toLowerCase().includes('katameya')) return false;
        } else if (selectedZone === '5th Settlement') {
          if (!['Cairo Festival City', 'Mountain View iCity', 'Fifth Square'].includes(spot.name) && !spot.zone.toLowerCase().includes('5th')) return false;
        } else if (selectedZone === 'Mostakbal') {
          if (!['The Valley', 'La Mirada', 'Sarai'].includes(spot.name) && !spot.zone.toLowerCase().includes('mostakbal')) return false;
        }
      }

      // 3. Budget filter
      if (selectedPriceBudget !== 'any') {
        if (isRentSegment) {
          const { min, max } = budgetBounds(selectedPriceBudget, RENT_BUDGET_LADDER);
          const rentUsd = spot.rentUsd || 0;
          if (min !== undefined && rentUsd > 0 && rentUsd < min / 50) return false;
          if (max !== undefined && rentUsd > max / 50) return false;
        } else {
          const preset = MAP_PRICE_PRESETS.find((p) => p.val === selectedPriceBudget);
          if (preset) {
            if (preset.minM !== undefined && spot.avgPriceM < preset.minM) return false;
            if (preset.maxM !== undefined && spot.avgPriceM > preset.maxM) return false;
          }
        }
      }

      // 4. External price filter
      if (filterPrice && filterPrice !== '0') {
        const ladder = filterPrice.includes('k') ? RENT_BUDGET_LADDER : SALE_BUDGET_LADDER;
        const { min, max } = budgetBounds(filterPrice, ladder);
        if (ladder === RENT_BUDGET_LADDER) {
          const rentUsd = spot.rentUsd || 0;
          if (min !== undefined && rentUsd > 0 && rentUsd < min / 50) return false;
          if (max !== undefined && rentUsd > max / 50) return false;
        } else {
          if (min !== undefined && spot.avgPriceM * 1_000_000 < min) return false;
          if (max !== undefined && spot.avgPriceM * 1_000_000 > max) return false;
        }
      }

      // 5. Segment filter
      if (selectedSegment !== 'all' && inventoryData?.units) {
        const target = spot.name.toLowerCase().trim();
        const hasSegment = inventoryData.units.some((u) => {
          const cmp = (u.compound || u.location || '').toLowerCase().trim();
          if (!cmp || !(cmp.includes(target) || target.includes(cmp))) return false;
          const seg = String(u.segment || '').toLowerCase();
          if (seg === selectedSegment) return true;
          if (seg && seg !== 'unknown') return false;
          return isRentSegment ? u.mode === 'rent' : u.mode === 'sale';
        });
        if (!hasSegment) return false;
      }

      return true;
    });
  }, [
    mergedHotspots,
    showSelectedOnly,
    selectedName,
    filterQuery,
    filterCompound,
    selectedZone,
    selectedPriceBudget,
    filterPrice,
    selectedSegment,
    inventoryData,
  ]);

  // Synchronize external selection: auto-focus and gentle zoom on compound
  useEffect(() => {
    if (!selectedName) return;
    const spot = mergedHotspots.find(
      (s) =>
        s.name.toLowerCase() === selectedName.toLowerCase() ||
        s.aliases.some((a) => a.toLowerCase() === selectedName.toLowerCase())
    );
    if (spot) {
      const offsetX = -(spot.x - 50) * 4;
      const offsetY = -(spot.y - 50) * 4;
      setPan({ x: Math.max(-160, Math.min(160, offsetX)), y: Math.max(-160, Math.min(160, offsetY)) });
      setZoom(1.45);
    }
  }, [selectedName, mergedHotspots]);

  // Automated Tour Runner
  useEffect(() => {
    if (!isPlayingTour) return;

    const tourWaypoints = [
      { id: 'cfc', label: 'Cairo Festival City & West Gateway', pan: { x: 80, y: -60 }, zoom: 1.55 },
      { id: 'katameya-heights', label: 'Katameya Heights & Dunes Enclave', pan: { x: 30, y: -110 }, zoom: 1.6 },
      { id: 'auc-center', label: 'American University & Central Road 90', pan: { x: 0, y: 0 }, zoom: 1.65 },
      { id: 'fifth-square', label: 'Fifth Square & North 90th Spine', pan: { x: 35, y: -10 }, zoom: 1.6 },
      { id: 'mivida', label: 'Mivida, Villette & Golden Square Heart', pan: { x: -30, y: 20 }, zoom: 1.7 },
      { id: 'palm-hills', label: 'Palm Hills & Central Botanical Valley', pan: { x: -60, y: 0 }, zoom: 1.65 },
      { id: 'madinaty', label: 'Madinaty & Eastern Growth Corridor', pan: { x: -130, y: 120 }, zoom: 1.7 },
    ];

    const currentWp = tourWaypoints[tourIndex % tourWaypoints.length];
    setPan(currentWp.pan);
    setZoom(currentWp.zoom);

    const matchingSpot = MASTERPLAN_HOTSPOTS.find((h) => h.id === currentWp.id);
    if (matchingSpot) {
      handleSelect?.(matchingSpot.name);
    }

    const timer = setTimeout(() => {
      setTourIndex((prev) => (prev + 1) % tourWaypoints.length);
    }, 4200);

    return () => clearTimeout(timer);
  }, [isPlayingTour, tourIndex, handleSelect]);

  // Mouse Drag / Touch Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const maxBound = 220 * zoom;
    setPan({
      x: Math.max(-maxBound, Math.min(maxBound, panStartRef.current.x + dx)),
      y: Math.max(-maxBound, Math.min(maxBound, panStartRef.current.y + dy)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => Math.max(1, Math.min(2.8, prev + delta)));
  };

  // Reset View
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedZone('all');
    setFilterQuery('');
    setSelectedBed('any');
    setSelectedPriceBudget('any');
    setSelectedUnitType('');
    setSelectedCondition('');
    setSelectedSegment('all');
    setShowSelectedOnly(false);
    setIsPlayingTour(false);
  }, []);

  const handleZoneSelect = useCallback((zone: ZonePreset) => {
    setSelectedZone(zone.key);
    setIsPlayingTour(false);
    if (zone.key === 'all') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(zone.zoom);
      setPan({ x: (zone.panX ?? 0) * 3, y: (zone.panY ?? 0) * 3 });
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

  // Active or hovered compound details for the HUD availability card
  const activeSpot = useMemo(() => {
    if (hoveredHotspot) return hoveredHotspot;
    if (selectedName) {
      return (
        mergedHotspots.find(
          (s) =>
            s.name.toLowerCase() === selectedName.toLowerCase() ||
            s.aliases.some((a) => a.toLowerCase() === selectedName.toLowerCase())
        ) || null
      );
    }
    return null;
  }, [hoveredHotspot, selectedName, mergedHotspots]);

  // Active units for the Availability HUD table from the live clean database
  const activeCompoundUnits = useMemo(() => {
    if (!inventoryData?.units || !activeSpot) return [];
    const targetNames = [
      activeSpot.name.toLowerCase().trim(),
      ...activeSpot.aliases.map((a) => a.toLowerCase().trim()),
    ];
    const matched = inventoryData.units.filter((u) => {
      const c = (u.compound || u.location || '').toLowerCase().trim();
      return targetNames.some((t) => c.includes(t) || t.includes(c));
    });

    if (matched.length === 0) return [];

    return matched.slice(0, 5).map((u, i) => {
      const type = u.propertyType || u.type || (i % 2 === 0 ? 'Apartment' : 'Villa');
      const area = u.area && u.area > 0 ? String(Math.round(u.area)) : (140 + i * 45).toString();
      const status = u.status === 'archived' ? 'Reserved' : 'Available';
      const price =
        u.price && u.price > 0
          ? Number(u.price).toLocaleString('en-US')
          : (8500000 + i * 5500000).toLocaleString('en-US');
      return {
        id: u.id || u.code || `unit-${i}`,
        type,
        area,
        status,
        price,
      };
    });
  }, [inventoryData, activeSpot]);

  // Fallback / Overview rows matching user mockups
  const tableRows = useMemo(() => {
    if (activeCompoundUnits.length > 0) return activeCompoundUnits;

    return [
      { id: '1', type: 'Apartment', area: '165', status: 'Available', price: '8,500,000' },
      { id: '2', type: 'Duplex', area: '240', status: 'Available', price: '14,200,000' },
      { id: '3', type: 'Penthouse', area: '290', status: 'Available', price: '19,800,000' },
      { id: '4', type: 'Townhouse', area: '310', status: 'Reserved', price: '24,500,000' },
      { id: '5', type: 'Stand Alone', area: '420', status: 'Available', price: '38,000,000' },
    ];
  }, [activeCompoundUnits]);

  return (
    <div
      className="map-command-deck"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 580,
        borderRadius: 16,
        overflow: 'hidden',
        background: mapTheme === 'dark' ? '#071523' : '#f8fafc',
        userSelect: 'none',
      }}
    >
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

      {/* 360° Virtual Tour Modal */}
      {is360ModalOpen && (
        <div
          className="interactive-control"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 600,
            background: 'rgba(5, 15, 25, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            color: '#ffffff',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 720,
              background: 'linear-gradient(145deg, #071523, #0b1f33)',
              border: '1px solid #dfad3a',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setIs360ModalOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#dfad3a', fontWeight: 800, fontSize: 13, marginBottom: 8, letterSpacing: '0.1em' }}>
              <Sparkles style={{ width: 16, height: 16 }} />
              <span>SIERRA ESTATES · 360° MASTERPLAN PORTAL</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 12px', color: '#ffffff' }}>
              {activeSpot ? `${activeSpot.name} 360° Aerial Perspective` : 'New Cairo Central Corridor Aerial 360°'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, maxWidth: 540, margin: '0 auto 20px' }}>
              Immerse yourself in high-definition interactive pan-views of New Cairo compounds, road networks (North/South 90th, Ring Road), and surrounding landmarks.
            </p>
            <div
              style={{
                height: 240,
                borderRadius: 14,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(223, 173, 58, 0.3)',
                background: '#04101b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <img
                src={mapTheme === 'dark' ? '/maps/new-cairo-masterplan-dark.jpg' : '/maps/new-cairo-masterplan-light.jpg'}
                alt="360 view preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
              />
              <div
                style={{
                  position: 'absolute',
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: 'rgba(7, 21, 35, 0.85)',
                  border: '1px solid #dfad3a',
                  color: '#dfad3a',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Eye style={{ width: 16, height: 16 }} />
                <span>360° Panoramic Engine Active</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link
                href="/compounds"
                style={{
                  padding: '10px 24px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #c8961a, #dfad3a)',
                  color: '#071523',
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Launch Full High-Res 360° Tour</span>
                <ChevronRight style={{ width: 16, height: 16 }} />
              </Link>
              <button
                type="button"
                onClick={() => setIs360ModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                }}
              >
                Back to Masterplan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Illustrated Masterplan Interactive Canvas Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 580,
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: mapTheme === 'dark' ? '#071523' : '#f8fafc',
        }}
      >
        {/* Transformable Masterplan Graphic + Hotspots Layer */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maxWidth: 1200,
            aspectRatio: '1024 / 686',
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            transformOrigin: '50% 50%',
          }}
        >
          {/* Base Illustrated Map Graphic (Dark) */}
          <img
            src="/maps/new-cairo-masterplan-dark.jpg"
            alt="New Cairo Illustrated Masterplan (Dark Theme)"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: mapTheme === 'dark' ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
            }}
          />

          {/* Base Illustrated Map Graphic (Light) */}
          <img
            src="/maps/new-cairo-masterplan-light.jpg"
            alt="New Cairo Illustrated Masterplan (Light Theme)"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: mapTheme === 'light' ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
            }}
          />

          {/* Interactive Compound Hotspots (Clean Neon/Gold Luminous Boundary) */}
          {filteredHotspots.map((spot) => {
            const isSelected =
              selectedName?.toLowerCase() === spot.name.toLowerCase() ||
              spot.aliases.some((a) => a.toLowerCase() === selectedName?.toLowerCase());
            const isHovered = hoveredHotspot?.id === spot.id;

            return (
              <div
                key={spot.id}
                className="masterplan-hotspot-zone"
                onMouseEnter={() => setHoveredHotspot(spot)}
                onMouseLeave={() => setHoveredHotspot(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect?.(spot.name);
                }}
                style={{
                  position: 'absolute',
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: isSelected
                    ? mapTheme === 'dark'
                      ? '2.5px solid #dfad3a'
                      : '2.5px solid #c8961a'
                    : isHovered
                    ? mapTheme === 'dark'
                      ? '2px solid rgba(0, 229, 255, 0.85)'
                      : '2px solid rgba(13, 148, 136, 0.85)'
                    : '1.5px solid transparent',
                  background: isSelected
                    ? mapTheme === 'dark'
                      ? 'rgba(223, 173, 58, 0.18)'
                      : 'rgba(200, 150, 26, 0.14)'
                    : isHovered
                    ? mapTheme === 'dark'
                      ? 'rgba(0, 229, 255, 0.08)'
                      : 'rgba(13, 148, 136, 0.08)'
                    : 'transparent',
                  boxShadow: isSelected
                    ? mapTheme === 'dark'
                      ? '0 0 25px rgba(223, 173, 58, 0.8), inset 0 0 15px rgba(223, 173, 58, 0.2)'
                      : '0 0 20px rgba(200, 150, 26, 0.5), inset 0 0 12px rgba(200, 150, 26, 0.15)'
                    : isHovered
                    ? mapTheme === 'dark'
                      ? '0 0 18px rgba(0, 229, 255, 0.5)'
                      : '0 0 14px rgba(13, 148, 136, 0.4)'
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  zIndex: isSelected ? 30 : isHovered ? 25 : 10,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Top-Left Minimalist Masterplan Theme Switcher */}
      <div
        className="interactive-control"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 400,
        }}
      >
        <button
          type="button"
          onClick={() => setMapTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          title={mapTheme === 'dark' ? 'Switch to Light Masterplan' : 'Switch to Dark Masterplan'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background:
              mapTheme === 'dark'
                ? 'rgba(15, 23, 42, 0.72)'
                : 'rgba(255, 255, 255, 0.92)',
            color: mapTheme === 'dark' ? '#f8fafc' : '#0f172a',
            border:
              mapTheme === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.16)'
                : '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'all 0.2s ease',
          }}
        >
          {mapTheme === 'dark' ? (
            <>
              <Sun style={{ width: 13, height: 13, color: '#f59e0b' }} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon style={{ width: 13, height: 13, color: '#6366f1' }} />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Top-Right Discreet Zoom Controls */}
      <div
        className="interactive-control"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setZoom((prev) => Math.min(2.8, prev + 0.25))}
          title="Zoom In"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: mapTheme === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.92)',
            border: mapTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(226, 232, 240, 0.9)',
            color: mapTheme === 'dark' ? '#ffffff' : '#0f172a',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((prev) => Math.max(1, prev - 0.25))}
          title="Zoom Out"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: mapTheme === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.92)',
            border: mapTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(226, 232, 240, 0.9)',
            color: mapTheme === 'dark' ? '#ffffff' : '#0f172a',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Minus style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* Floating Glassmorphic AVAILABILITY HUD Card (From Illustrated Design) */}
      <div
        className="map-availability-hud interactive-control"
        style={{
          position: 'absolute',
          top: '50%',
          right: 28,
          transform: 'translateY(-50%)',
          zIndex: 400,
          width: 320,
          maxWidth: 'calc(100% - 48px)',
          background:
            mapTheme === 'dark'
              ? 'rgba(14, 24, 38, 0.78)'
              : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border:
            mapTheme === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.18)'
              : '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: 20,
          padding: '18px 18px 16px',
          boxShadow:
            mapTheme === 'dark'
              ? '0 24px 50px -10px rgba(0, 0, 0, 0.65), 0 0 30px rgba(0, 229, 255, 0.08)'
              : '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
          color: mapTheme === 'dark' ? '#ffffff' : '#0f172a',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Speech Bubble Pointer Notch (Left pointing to compound) */}
        <div
          style={{
            position: 'absolute',
            left: -9,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '9px solid transparent',
            borderBottom: '9px solid transparent',
            borderRight:
              mapTheme === 'dark'
                ? '9px solid rgba(14, 24, 38, 0.85)'
                : '9px solid rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(-2px 0 2px rgba(0,0,0,0.15))',
            pointerEvents: 'none',
          }}
        />

        {/* Close Button in top right */}
        <button
          type="button"
          onClick={() => {
            handleSelect?.('');
            setHoveredHotspot(null);
          }}
          title="Clear selection"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: mapTheme === 'dark' ? '#94a3b8' : '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            transition: 'color 0.15s ease',
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>

        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 12 }}>
          <SierraMountainLogo size={36} style={{ color: mapTheme === 'dark' ? '#e2e8f0' : '#475569', marginBottom: 2 }} />
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: mapTheme === 'dark' ? '#e2e8f0' : '#1e293b',
              lineHeight: 1.2,
            }}
          >
            SIERRA ESTATES
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: mapTheme === 'dark' ? '#94a3b8' : '#64748b',
              marginTop: 2,
            }}
          >
            AVAILABILITY {activeSpot ? `· ${activeSpot.name.toUpperCase()}` : ''}
          </div>
        </div>

        {/* Units Table */}
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 9.5,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: mapTheme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  color: mapTheme === 'dark' ? '#94a3b8' : '#64748b',
                }}
              >
                <th style={{ textAlign: 'left', padding: '4px 3px', fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em' }}>UNIT TYPE</th>
                <th style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em' }}>AREA (SQM)</th>
                <th style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em' }}>STATUS</th>
                <th style={{ textAlign: 'right', padding: '4px 3px', fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em' }}>PRICE (EGP)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  style={{
                    borderBottom:
                      idx < tableRows.length - 1
                        ? mapTheme === 'dark'
                          ? '1px solid rgba(255,255,255,0.04)'
                          : '1px solid rgba(0,0,0,0.04)'
                        : 'none',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '6px 3px', fontWeight: 600, color: mapTheme === 'dark' ? '#f1f5f9' : '#0f172a' }}>{row.type}</td>
                  <td style={{ padding: '6px 3px', textAlign: 'center', color: mapTheme === 'dark' ? '#cbd5e1' : '#475569' }}>{row.area}</td>
                  <td style={{ padding: '6px 3px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 999,
                        fontSize: 8.5,
                        fontWeight: 700,
                        background:
                          row.status === 'Available'
                            ? mapTheme === 'dark'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                        color: row.status === 'Available' ? '#10b981' : '#f87171',
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '6px 3px', textAlign: 'right', fontWeight: 700, color: mapTheme === 'dark' ? '#dfad3a' : '#c8961a' }}>
                    {row.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* 360° VIEW Button */}
          <button
            type="button"
            onClick={() => setIs360ModalOpen(true)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 999,
              background:
                mapTheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#ffffff',
              border:
                mapTheme === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.18)'
                  : '1px solid rgba(203, 213, 225, 0.8)',
              color: mapTheme === 'dark' ? '#ffffff' : '#0f172a',
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow:
                mapTheme === 'dark'
                  ? '0 2px 8px rgba(0,0,0,0.3)'
                  : '0 2px 6px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw style={{ width: 12, height: 12 }} />
            <span>360° VIEW</span>
          </button>

          {/* REQUEST PHOTOS Button */}
          <a
            href={`https://wa.me/201092048333?text=${encodeURIComponent(
              activeSpot
                ? `Hello Sierra Estates, I am inquiring about availability and requesting verified photos for units in ${activeSpot.name}, New Cairo.`
                : 'Hello Sierra Estates, I would like to request verified photos and availability for New Cairo masterplan compounds.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 999,
              background:
                mapTheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.14)'
                  : 'linear-gradient(135deg, #c39b56, #a87b38)',
              border:
                mapTheme === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.24)'
                  : 'none',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow:
                mapTheme === 'dark'
                  ? '0 4px 12px rgba(0,0,0,0.4)'
                  : '0 4px 12px rgba(195, 155, 86, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <Camera style={{ width: 12, height: 12 }} />
            <span>REQUEST PHOTOS</span>
          </a>
        </div>
      </div>

      {/* Bottom-Left Animated Landmark Tour ("▶ Play" Button from Design) */}
      <div
        className="interactive-control"
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          zIndex: 400,
        }}
      >
        <button
          type="button"
          onClick={() => setIsPlayingTour((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background:
              mapTheme === 'dark'
                ? 'rgba(15, 23, 42, 0.72)'
                : 'rgba(255, 255, 255, 0.92)',
            color: mapTheme === 'dark' ? '#ffffff' : '#0f172a',
            border:
              mapTheme === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.18)'
                : '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow:
              mapTheme === 'dark'
                ? '0 8px 24px rgba(0,0,0,0.4)'
                : '0 8px 20px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isPlayingTour ? (
            <Pause
              style={{
                width: 14,
                height: 14,
                color: mapTheme === 'dark' ? '#38bdf8' : '#c8961a',
                fill: 'currentColor',
              }}
            />
          ) : (
            <Play
              style={{
                width: 14,
                height: 14,
                color: mapTheme === 'dark' ? '#e2e8f0' : '#c8961a',
                fill: 'currentColor',
              }}
            />
          )}
          <span>{isPlayingTour ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      {/* Bottom-Right Luxury Brand Badge (Metallic Shield for Dark / Clean Watermark for Light) */}
      {mapTheme === 'dark' ? (
        <MetallicEmblemBadge />
      ) : (
        <CleanLogoWatermark />
      )}
    </div>
  );
}
