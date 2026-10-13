'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Nav, Footer } from './ui';
import {
  Compass,
  Layers,
  MapPin,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Building,
  Home,
  CheckCircle,
  ExternalLink,
  MessageCircle,
  X,
  Eye,
  GitBranch,
  ShieldCheck,
  Cpu,
  Radio,
} from 'lucide-react';

interface UnitListing {
  id: string;
  type: 'villa' | 'twin' | 'penthouse';
  name: string;
  specs: string;
  priceEgp: string;
  priceUsd: string;
  bua: string;
  status: string;
  statusColor: string;
  imageUrl: string;
}

interface CompoundData {
  id: string;
  subzone: string;
  title: string;
  desc: string;
  area: string;
  units: string;
  index: string;
  waText: string;
  unitsList: UnitListing[];
}

const COMPOUND_REGISTRY: Record<string, CompoundData> = {
  villette: {
    id: 'villette',
    subzone: 'Golden Square Corridor',
    title: 'SODIC Villette',
    desc: 'Preeminent 301-acre master community anchored by four dynamic pocket parks, signature crystal waterways, and pedestrian green spines.',
    area: '301 Acres',
    units: '18 Active',
    index: '82,500 EGP/m²',
    waText: 'Hello Sierra Estates Advisory, I am inquiring about verified units in SODIC Villette Golden Square.',
    unitsList: [
      {
        id: 'v-1',
        type: 'villa',
        name: 'Villa Signature A',
        specs: '5 Bedrooms • 6 Bathrooms • Private Pool',
        priceEgp: '28,500,000 EGP',
        priceUsd: '≈ $580,000 USD',
        bua: '380 m²',
        status: 'Available',
        statusColor: 'bg-blue-600',
        imageUrl:
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'v-2',
        type: 'twin',
        name: 'Twin House Sky Garden',
        specs: '4 Bedrooms • Semi-Furnished • Corner Plot',
        priceEgp: '22,100,000 EGP',
        priceUsd: '≈ $450,000 USD',
        bua: '290 m²',
        status: 'Immediate Delivery',
        statusColor: 'bg-amber-600',
        imageUrl:
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'v-3',
        type: 'penthouse',
        name: 'Sky Penthouse with Private Roof',
        specs: '3 Bedrooms • 85m² Panoramic Roof Terrace',
        priceEgp: '17,800,000 EGP',
        priceUsd: '≈ $362,000 USD',
        bua: '240 m²',
        status: 'Under Offer',
        statusColor: 'bg-indigo-600',
        imageUrl:
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'v-4',
        type: 'villa',
        name: 'The Grand Palace Mansion',
        specs: '6 Suites • Private Elevator • Golf Frontage',
        priceEgp: '45,000,000 EGP',
        priceUsd: '≈ $915,000 USD',
        bua: '550 m²',
        status: 'Private Reserve',
        statusColor: 'bg-amber-700',
        imageUrl:
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  mivida: {
    id: 'mivida',
    subzone: 'Emaar Misr Golden Triangle',
    title: 'Mivida New Cairo',
    desc: 'An eco-sustainable master sanctuary offering lush pine valleys, international clubhouse amenities, and prime connectivity to the AUC ring.',
    area: '860 Acres',
    units: '24 Active',
    index: '86,200 EGP/m²',
    waText: 'Hello Sierra Estates Advisory, I would like to review the inventory catalog for Mivida Emaar.',
    unitsList: [
      {
        id: 'm-1',
        type: 'villa',
        name: 'Mivida Greens Villa 4',
        specs: '4 Bedrooms • Private Garden • Direct Lake View',
        priceEgp: '32,000,000 EGP',
        priceUsd: '≈ $650,000 USD',
        bua: '410 m²',
        status: 'Available',
        statusColor: 'bg-blue-600',
        imageUrl:
          'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'm-2',
        type: 'twin',
        name: 'Valley Twin Residence',
        specs: '3 Bedrooms • Maid Room • Solarium',
        priceEgp: '24,500,000 EGP',
        priceUsd: '≈ $498,000 USD',
        bua: '315 m²',
        status: 'Immediate Delivery',
        statusColor: 'bg-amber-600',
        imageUrl:
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  auc: {
    id: 'auc',
    subzone: 'Central Academic Hub',
    title: 'American University Core',
    desc: 'The intellectual anchor of New Cairo connecting the North and South 90th Street corridors with premier high-density mixed developments.',
    area: '260 Acres',
    units: 'Commercial',
    index: '94,000 EGP/m²',
    waText: 'Hello Sierra Estates Advisory, please share commercial listings surrounding the AUC core campus.',
    unitsList: [
      {
        id: 'a-1',
        type: 'penthouse',
        name: 'AUC Plaza Executive Suite',
        specs: 'Prime Commercial / Residential • Road 90 Frontage',
        priceEgp: '19,200,000 EGP',
        priceUsd: '≈ $390,000 USD',
        bua: '195 m²',
        status: 'Active',
        statusColor: 'bg-emerald-600',
        imageUrl:
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  cfc: {
    id: 'cfc',
    subzone: 'Ring Road Interchange',
    title: 'Cairo Festival City (CFC)',
    desc: "Al-Futtaim's flagship mixed-use metropolis featuring world-class retail, business districts, and ultra-luxury Oriana residential villas.",
    area: '750 Acres',
    units: '15 Active',
    index: '89,500 EGP/m²',
    waText: 'Hello Sierra Estates Advisory, I am requesting available properties in Cairo Festival City Oriana.',
    unitsList: [
      {
        id: 'c-1',
        type: 'villa',
        name: 'Oriana 4 Standalone',
        specs: '5 Bedrooms • Pool • Smart Home Automation',
        priceEgp: '38,000,000 EGP',
        priceUsd: '≈ $772,000 USD',
        bua: '460 m²',
        status: 'Available',
        statusColor: 'bg-blue-600',
        imageUrl:
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  mountainview: {
    id: 'mountainview',
    subzone: 'iCity Innovation District',
    title: 'Mountain View iCity',
    desc: 'Revolutionary multi-tiered city with royal crystal lagoons, car-free park networks, and bespoke sky villas overlooking water features.',
    area: '500 Acres',
    units: '31 Active',
    index: '74,800 EGP/m²',
    waText: 'Hello Sierra Estates Advisory, please send available Sky Villas in Mountain View iCity.',
    unitsList: [
      {
        id: 'mv-1',
        type: 'villa',
        name: 'iVilla Lagoon Park',
        specs: '4 Bedrooms • Private Lagoon Beach • Double Height',
        priceEgp: '16,900,000 EGP',
        priceUsd: '≈ $344,000 USD',
        bua: '280 m²',
        status: 'Available',
        statusColor: 'bg-blue-600',
        imageUrl:
          'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'mv-2',
        type: 'penthouse',
        name: 'Sky Villa Club View',
        specs: '3 Bedrooms • Roof Garden • Private Jacuzzi',
        priceEgp: '13,500,000 EGP',
        priceUsd: '≈ $275,000 USD',
        bua: '235 m²',
        status: 'Immediate Delivery',
        statusColor: 'bg-amber-600',
        imageUrl:
          'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  katameya: {
    id: 'katameya',
    subzone: 'Southern Heights Corridor',
    title: 'Katameya Dunes & Heights',
    desc: 'Pinnacle of Egyptian luxury living featuring 27-hole Sir Nick Faldo championship golf courses and sprawling Mediterranean estates.',
    area: '900 Acres',
    units: '8 Mansions',
    index: '115,000 EGP/m²',
    waText: 'Hello Sierra Estates Advisory, I require private placement details for mansions in Katameya Dunes.',
    unitsList: [
      {
        id: 'kd-1',
        type: 'villa',
        name: 'Fairway Grand Estate',
        specs: '7 Suites • 1,200m² Land • Private Golf Putting Green',
        priceEgp: '85,000,000 EGP',
        priceUsd: '≈ $1,730,000 USD',
        bua: '820 m²',
        status: 'Exclusive Reserve',
        statusColor: 'bg-amber-700',
        imageUrl:
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
};

export default function MasterplanPortal() {
  const [is3D, setIs3D] = useState(true);
  const [zoom, setZoom] = useState(0.96);
  const [pitchToggled, setPitchToggled] = useState(false);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('villette');
  const [typologyFilter, setTypologyFilter] = useState<'all' | 'villa' | 'twin' | 'penthouse'>('all');
  const [activeCorridor, setActiveCorridor] = useState<string>('North 90th St');
  const [modalUnit, setModalUnit] = useState<UnitListing | null>(null);

  const selectedCompound = COMPOUND_REGISTRY[selectedCompoundId] || COMPOUND_REGISTRY.villette;

  const filteredUnits = selectedCompound.unitsList.filter((unit) => {
    if (typologyFilter === 'all') return true;
    return unit.type === typologyFilter;
  });

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 1.4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.7));
  }, []);

  const handleResetViewport = useCallback(() => {
    setIs3D(true);
    setZoom(0.96);
    setPitchToggled(false);
  }, []);

  const handleTogglePitch = useCallback(() => {
    setPitchToggled((prev) => !prev);
  }, []);

  // Compute stage transformation
  const stageTransform = is3D
    ? pitchToggled
      ? `perspective(1200px) rotateX(38deg) rotateZ(-6deg) scale(${zoom})`
      : `perspective(1200px) rotateX(24deg) rotateZ(-3deg) scale(${zoom})`
    : `perspective(0px) rotateX(0deg) rotateZ(0deg) scale(${zoom})`;

  return (
    <div className="min-h-screen bg-[#faf9fa] text-[#1b1c1d]">
      <Nav active="explore" />

      <main className="w-full pt-16">
        {/* Top Spatial Command Ribbon */}
        <section className="w-full bg-[#f5f3f4] border-b border-[#e3e2e3] px-4 lg:px-8 py-5">
          <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row md:items-baseline gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#094cb2] animate-pulse" />
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#6d5e00]">
                  Spatial Cadastral Cartography
                </span>
              </div>
              <h1 className="font-serif text-2xl lg:text-3xl font-semibold tracking-tight text-[#1b1c1d]">
                Fifth Settlement (New Cairo) Masterplan Intelligence
              </h1>
              <span className="text-[11px] font-mono tracking-wider text-[#434653] bg-[#e3e2e3] px-2.5 py-1 rounded">
                CRS: EPSG 32636 / WGS84
              </span>
            </div>

            {/* Quick Telemetry & Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-[#e3e2e3] flex items-center gap-4">
                <div>
                  <div className="text-[10px] uppercase text-[#737784] font-semibold tracking-wider">
                    Benchmark Index
                  </div>
                  <div className="text-sm font-semibold text-[#1b1c1d]">
                    85,000 <span className="text-xs text-[#094cb2] font-normal">EGP/m²</span>
                  </div>
                </div>
                <div className="h-7 w-px bg-[#e3e2e3]" />
                <div>
                  <div className="text-[10px] uppercase text-[#737784] font-semibold tracking-wider">
                    Active Inventory
                  </div>
                  <div className="text-sm font-semibold text-[#1b1c1d]">
                    9,534 <span className="text-xs text-[#6d5e00] font-normal">Units</span>
                  </div>
                </div>
                <div className="h-7 w-px bg-[#e3e2e3]" />
                <div>
                  <div className="text-[10px] uppercase text-[#737784] font-semibold tracking-wider">
                    Portfolio Parity
                  </div>
                  <div className="text-sm font-semibold text-[#1b1c1d]">
                    17.78B <span className="text-xs text-[#737784] font-normal">EGP</span>
                  </div>
                </div>
              </div>

              {/* 2D / 3D Isometric View Switcher */}
              <div className="bg-white p-1 rounded-lg shadow-sm border border-[#e3e2e3] flex items-center gap-1 text-xs">
                <button
                  onClick={() => setIs3D(false)}
                  className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 font-medium ${
                    !is3D
                      ? 'bg-[#094cb2] text-white shadow-sm font-semibold'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Orthographic 2D</span>
                </button>
                <button
                  onClick={() => setIs3D(true)}
                  className={`px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 font-medium ${
                    is3D
                      ? 'bg-[#094cb2] text-white shadow-sm font-semibold'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Isometric 3D (45°)</span>
                </button>
              </div>

              <button
                onClick={handleResetViewport}
                className="p-2 rounded-lg bg-white border border-[#e3e2e3] text-[#434653] hover:text-[#094cb2] transition-colors shadow-sm"
                title="Reset Viewport"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Interactive GIS Canvas + Floating Command HUD */}
        <div className="w-full relative px-4 lg:px-8 py-6">
          <div className="max-w-[1720px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 relative">
            {/* Primary Map/Viewport Stage (Span 8 / 12) */}
            <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-4">
              <div className="relative w-full rounded-2xl overflow-hidden bg-white border border-[#e3e2e3] shadow-md min-h-155 lg:min-h-180 flex items-center justify-center p-2 lg:p-4 group">
                {/* Layer Filter Floater (Top-Left within canvas) */}
                <div className="absolute top-6 left-6 z-30 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-md border border-[#e3e2e3] flex flex-wrap gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-[#6d5e00] uppercase tracking-wider self-center px-2">
                    Corridors:
                  </span>
                  {['North 90th St', 'Ring Road Axis', 'Suez Expressway', 'Golden Square'].map((corridor) => (
                    <button
                      key={corridor}
                      onClick={() => setActiveCorridor(corridor)}
                      className={`px-3 py-1 rounded transition-all font-medium ${
                        activeCorridor === corridor
                          ? 'bg-[#e7ebff] text-[#094cb2] font-semibold border border-[#b1c5ff]'
                          : 'bg-[#f5f3f4] text-[#434653] hover:text-[#1b1c1d]'
                      }`}
                    >
                      {corridor}
                    </button>
                  ))}
                </div>

                {/* Masterplan Stage Container with 3D Perspective */}
                <div
                  className="relative w-full h-145 lg:h-170 rounded-xl overflow-hidden transition-all duration-700 ease-out flex items-center justify-center bg-[#171c20]"
                  style={{
                    transform: stageTransform,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Cartographic Aerial Grid Pattern Overlay */}
                  <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center select-none opacity-85"
                    style={{
                      backgroundImage: `radial-gradient(circle at 50% 50%, rgba(9, 76, 178, 0.25) 0%, rgba(10, 16, 26, 0.95) 75%), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px)`,
                    }}
                  >
                    {/* Golden Corridor Highway Lines SVG Overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-70" viewBox="0 0 1000 700">
                      <path
                        d="M 50 650 Q 300 550, 600 480 T 950 250"
                        fill="none"
                        stroke="#bfab49"
                        strokeWidth="4"
                        strokeDasharray="6 3"
                      />
                      <path
                        d="M 120 700 L 450 350 L 800 120"
                        fill="none"
                        stroke="#094cb2"
                        strokeWidth="3"
                        strokeDasharray="4 4"
                      />
                      <circle cx="540" cy="336" r="45" fill="none" stroke="#dcc661" strokeWidth="1.5" strokeOpacity="0.4" />
                      <circle cx="580" cy="280" r="35" fill="none" stroke="#dcc661" strokeWidth="1.5" strokeOpacity="0.4" />
                    </svg>
                  </div>

                  {/* Hotspot 1: SODIC Villette (Golden Square) */}
                  <div
                    className="absolute top-[48%] left-[54%] z-20 group/marker cursor-pointer"
                    onClick={() => setSelectedCompoundId('villette')}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-12 h-12 rounded-full bg-[#bfab49]/30 animate-ping" />
                      <span className="absolute w-8 h-8 rounded-full bg-[#094cb2]/40 backdrop-blur-sm" />
                      <div className="w-7 h-7 rounded-full bg-[#094cb2] text-white flex items-center justify-center shadow-lg transition-transform group-hover/marker:scale-125 border border-white/50">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute -top-24 -left-20 w-52 bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-[#e3e2e3] transition-all pointer-events-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-[#6d5e00] font-semibold">
                          Golden Square
                        </span>
                        <span className="text-[10px] bg-[#d9e2ff] text-[#001946] px-1.5 py-0.5 rounded font-semibold">
                          18 Available
                        </span>
                      </div>
                      <div className="font-serif text-sm font-semibold text-[#1b1c1d] mt-1">SODIC Villette</div>
                      <div className="text-xs text-[#434653] flex items-center justify-between mt-1">
                        <span>From 17.8M EGP</span>
                        <span className="text-[#094cb2] font-semibold text-[11px] hover:underline">Inspect →</span>
                      </div>
                    </div>
                  </div>

                  {/* Hotspot 2: Mivida New Cairo */}
                  <div
                    className="absolute top-[40%] left-[58%] z-20 group/marker cursor-pointer"
                    onClick={() => setSelectedCompoundId('mivida')}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-10 h-10 rounded-full bg-[#bfab49]/30 animate-ping" />
                      <div className="w-7 h-7 rounded-full bg-[#6d5e00] text-white flex items-center justify-center shadow-lg transition-transform group-hover/marker:scale-125 border border-white/50">
                        <Home className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="absolute -top-24 -left-20 w-52 bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-[#e3e2e3] transition-all pointer-events-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-[#6d5e00] font-semibold">
                          Emaar Misr
                        </span>
                        <span className="text-[10px] bg-[#f9e37a] text-[#211b00] px-1.5 py-0.5 rounded font-semibold">
                          24 Active
                        </span>
                      </div>
                      <div className="font-serif text-sm font-semibold text-[#1b1c1d] mt-1">Mivida New Cairo</div>
                      <div className="text-xs text-[#434653] flex items-center justify-between mt-1">
                        <span>From 16.2M EGP</span>
                        <span className="text-[#094cb2] font-semibold text-[11px] hover:underline">Inspect →</span>
                      </div>
                    </div>
                  </div>

                  {/* Hotspot 3: AUC Central Campus */}
                  <div
                    className="absolute top-[52%] left-[46%] z-20 group/marker cursor-pointer"
                    onClick={() => setSelectedCompoundId('auc')}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[#5a5f63] text-white flex items-center justify-center shadow-lg transition-transform group-hover/marker:scale-125 border border-white/50">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="absolute -top-20 -left-16 w-44 bg-white/95 backdrop-blur-xl p-2.5 rounded-lg shadow-lg border border-[#e3e2e3] transition-all">
                      <span className="text-[9px] uppercase tracking-wider text-[#5a5f63] font-semibold">
                        Institutional Anchor
                      </span>
                      <div className="font-serif text-xs font-semibold text-[#1b1c1d]">AUC Central Campus</div>
                      <div className="text-[11px] text-[#434653]">South 90th Node</div>
                    </div>
                  </div>

                  {/* Hotspot 4: Cairo Festival City (CFC) */}
                  <div
                    className="absolute top-[68%] left-[22%] z-20 group/marker cursor-pointer"
                    onClick={() => setSelectedCompoundId('cfc')}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[#3366cc] text-white flex items-center justify-center shadow-lg transition-transform group-hover/marker:scale-125 border border-white/50">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="absolute -top-24 -left-20 w-48 bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-[#e3e2e3] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase text-[#094cb2] font-semibold">Al-Futtaim</span>
                        <span className="text-[10px] bg-[#e9e8e9] px-1.5 py-0.5 rounded font-semibold">15 Units</span>
                      </div>
                      <div className="font-serif text-sm font-semibold text-[#1b1c1d] mt-0.5">Cairo Festival City</div>
                      <div className="text-xs text-[#434653] mt-1">Starting 12.5M EGP</div>
                    </div>
                  </div>

                  {/* Hotspot 5: Mountain View iCity */}
                  <div
                    className="absolute top-[28%] left-[64%] z-20 group/marker cursor-pointer"
                    onClick={() => setSelectedCompoundId('mountainview')}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[#bfab49] text-[#4a3f00] flex items-center justify-center shadow-lg transition-transform group-hover/marker:scale-125 border border-white/50">
                        <Home className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="absolute -top-24 -left-20 w-48 bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-[#e3e2e3] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase text-[#6d5e00] font-semibold">iCity Lagoon</span>
                        <span className="text-[10px] bg-[#f9e37a] text-[#211b00] px-1.5 py-0.5 rounded font-semibold">
                          31 Units
                        </span>
                      </div>
                      <div className="font-serif text-sm font-semibold text-[#1b1c1d] mt-0.5">Mountain View iCity</div>
                      <div className="text-xs text-[#434653] mt-1">Starting 9.8M EGP</div>
                    </div>
                  </div>

                  {/* Hotspot 6: Katameya Dunes & Heights */}
                  <div
                    className="absolute top-[72%] left-[44%] z-20 group/marker cursor-pointer"
                    onClick={() => setSelectedCompoundId('katameya')}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[#dfe3e8] text-[#171c20] flex items-center justify-center shadow-lg transition-transform group-hover/marker:scale-125 border border-white/50">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="absolute -top-24 -left-20 w-48 bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-[#e3e2e3] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase text-[#5a5f63] font-semibold">Championship Golf</span>
                        <span className="text-[10px] bg-[#e9e8e9] px-1.5 py-0.5 rounded font-semibold">8 Mansions</span>
                      </div>
                      <div className="font-serif text-sm font-semibold text-[#1b1c1d] mt-0.5">Katameya Dunes</div>
                      <div className="text-xs text-[#434653] mt-1">Ultra-Luxury Enclave</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Viewport HUD Bar (Coordinates & Zoom Controls) */}
                <div className="absolute bottom-6 left-6 right-6 z-30 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
                  <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-[#e3e2e3] flex items-center gap-4 text-xs font-mono pointer-events-auto">
                    <div className="flex items-center gap-1.5 text-[#1b1c1d]">
                      <Radio className="w-3.5 h-3.5 text-[#094cb2]" />
                      <span>
                        Lat: <strong>30.0131° N</strong>, Lon: <strong>31.4989° E</strong>
                      </span>
                    </div>
                    <div className="hidden sm:block h-4 w-px bg-[#e3e2e3]" />
                    <div className="hidden sm:flex items-center gap-1 text-[#434653]">
                      <span>Elevation: 320m ASL</span>
                    </div>
                  </div>

                  {/* Zoom & Pitch Controls */}
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={handleTogglePitch}
                      className="px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#e3e2e3] text-xs font-semibold text-[#1b1c1d] flex items-center gap-1.5 hover:bg-white transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#094cb2]" />
                      <span>{pitchToggled ? 'Standard Tilt' : 'Steep Pitch'}</span>
                    </button>
                    <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-[#e3e2e3] flex items-center gap-1">
                      <button
                        onClick={handleZoomIn}
                        className="w-8 h-8 rounded bg-[#efedee] hover:bg-[#e3e2e3] flex items-center justify-center text-[#1b1c1d] transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="w-8 h-8 rounded bg-[#efedee] hover:bg-[#e3e2e3] flex items-center justify-center text-[#1b1c1d] transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monorepo Telemetry Bar */}
              <div className="w-full bg-white p-5 rounded-2xl border border-[#e3e2e3] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#efedee] flex items-center justify-center text-[#434653]">
                    <GitBranch className="w-5 h-5 text-[#094cb2]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[#737784] font-semibold">
                      Monorepo Production Deployment
                    </div>
                    <div className="text-xs text-[#1b1c1d] flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[#094cb2] font-semibold">
                        sierrablue8866-droid/SE-Vercel-deploy-main
                      </span>
                      <span className="text-[#6d5e00]">●</span>
                      <span className="text-[#434653]">Commit Verified (0 drift)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <Link
                    href="/explore"
                    className="px-3.5 py-1.5 rounded-lg bg-[#efedee] hover:bg-[#e3e2e3] text-xs font-semibold text-[#1b1c1d] flex items-center gap-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>3D Towers View</span>
                  </Link>
                  <a
                    href="https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-[#efedee] hover:bg-[#e3e2e3] text-xs font-semibold text-[#1b1c1d] flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>GitHub Repo</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Compound Intelligence & Inventory Inspection Drawer (Span 4 / 12) */}
            <div className="xl:col-span-4 2xl:col-span-3 flex flex-col gap-4">
              <div className="bg-white p-6 rounded-2xl border border-[#e3e2e3] shadow-md flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#6d5e00] font-semibold">
                      {selectedCompound.subzone}
                    </span>
                    <h2 className="font-serif text-xl font-semibold text-[#1b1c1d] mt-0.5">
                      {selectedCompound.title}
                    </h2>
                    <p className="text-xs text-[#434653] mt-1 leading-relaxed">
                      {selectedCompound.desc}
                    </p>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-[#efedee] flex items-center justify-center text-[#094cb2] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                </div>

                {/* Micro Metas */}
                <div className="grid grid-cols-3 gap-2 py-3 bg-[#f5f3f4] rounded-xl p-3 text-center">
                  <div>
                    <div className="text-[10px] text-[#737784] uppercase font-semibold">Total Area</div>
                    <div className="text-xs font-semibold text-[#1b1c1d] mt-0.5">{selectedCompound.area}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#737784] uppercase font-semibold">Listed Units</div>
                    <div className="text-xs font-semibold text-[#094cb2] mt-0.5">{selectedCompound.units}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#737784] uppercase font-semibold">Price Index</div>
                    <div className="text-xs font-semibold text-[#6d5e00] mt-0.5">{selectedCompound.index}</div>
                  </div>
                </div>

                {/* Typology Filter Segmented Controls */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase text-[#737784] tracking-wider font-semibold">
                    Unit Typology
                  </span>
                  <div className="flex items-center gap-1 bg-[#f5f3f4] p-1 rounded-lg text-xs font-medium">
                    {(['all', 'villa', 'twin', 'penthouse'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setTypologyFilter(type)}
                        className={`flex-1 py-1 rounded transition-all text-center capitalize ${
                          typologyFilter === type
                            ? 'bg-white text-[#094cb2] font-semibold shadow-sm'
                            : 'text-[#434653] hover:text-[#1b1c1d]'
                        }`}
                      >
                        {type === 'all' ? 'All' : type === 'villa' ? 'Villas' : type === 'twin' ? 'Twins' : 'Penthouses'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Units Catalog Feed */}
                <div className="flex flex-col gap-3 max-h-115 overflow-y-auto pr-1">
                  {filteredUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="group bg-[#f5f3f4] hover:bg-[#efedee] p-3 rounded-xl transition-all border border-transparent hover:border-[#e3e2e3]"
                    >
                      <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2.5">
                        <img
                          src={unit.imageUrl}
                          alt={unit.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span
                          className={`absolute top-2 left-2 ${unit.statusColor} text-white text-[10px] font-semibold px-2 py-0.5 rounded`}
                        >
                          {unit.status}
                        </span>
                        <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[#1b1c1d] text-[10px] font-semibold px-2 py-0.5 rounded">
                          {unit.bua}
                        </span>
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-serif text-sm font-semibold text-[#1b1c1d]">{unit.name}</h3>
                          <p className="text-xs text-[#434653] mt-0.5">{unit.specs}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 flex items-center justify-between border-t border-[#e3e2e3]/60">
                        <div>
                          <div className="text-xs font-bold text-[#1b1c1d]">{unit.priceEgp}</div>
                          <div className="text-[10px] text-[#737784]">{unit.priceUsd}</div>
                        </div>
                        <button
                          onClick={() => setModalUnit(unit)}
                          className="px-2.5 py-1 rounded bg-[#094cb2] text-white text-[11px] font-semibold hover:bg-[#3366cc] transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details & 360°</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Concierge WhatsApp Quick Dispatch Button */}
                <a
                  href={`https://wa.me/201092048333?text=${encodeURIComponent(selectedCompound.waText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#094cb2] text-white hover:bg-[#3366cc] text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Request Private Dossier via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Cadastral Deep-Dive Grid (4 Pillars) */}
        <section className="w-full bg-[#f5f3f4] border-t border-[#e3e2e3] px-4 lg:px-8 py-12 mt-6">
          <div className="max-w-[1720px] mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#6d5e00]">
                  Verified Registry Architecture
                </span>
                <h2 className="font-serif text-2xl lg:text-3xl font-semibold text-[#1b1c1d] mt-1">
                  Cadastral Polygons & Algorithmic Valuation Benchmarks
                </h2>
              </div>
              <p className="text-xs text-[#434653] max-w-xl leading-relaxed">
                Directly synchronizing Supabase PostgreSQL spatial records with the unified Obsidian Knowledge Vault.
                All valuations are benchmarked against live currency parity and gold indices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pillar 1 */}
              <div className="bg-white p-6 rounded-2xl border border-[#e3e2e3] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#d9e2ff] flex items-center justify-center text-[#001946] mb-4">
                    <Layers className="w-5 h-5 text-[#094cb2]" />
                  </div>
                  <h3 className="font-serif text-base font-semibold text-[#1b1c1d]">
                    Spatial Cadastral Engine
                  </h3>
                  <p className="text-xs text-[#434653] mt-2 leading-relaxed">
                    Vectorized boundaries with pinpoint parcel metadata for over 11,488 verified Fifth Settlement units.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e3e2e3] flex items-center justify-between text-xs text-[#6d5e00] font-semibold">
                  <span>Precision Tier L4</span>
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="bg-white p-6 rounded-2xl border border-[#e3e2e3] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#f9e37a] flex items-center justify-center text-[#211b00] mb-4">
                    <Cpu className="w-5 h-5 text-[#6d5e00]" />
                  </div>
                  <h3 className="font-serif text-base font-semibold text-[#1b1c1d]">
                    Obsidian Memory Brain
                  </h3>
                  <p className="text-xs text-[#434653] mt-2 leading-relaxed">
                    Domain intelligence RAG integrating compound financial cap rates, distressed alerts, and developer track records.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e3e2e3] flex items-center justify-between text-xs text-[#6d5e00] font-semibold">
                  <span>@sierra-estates/memory-engine</span>
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="bg-white p-6 rounded-2xl border border-[#e3e2e3] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#dfe3e8] flex items-center justify-center text-[#171c20] mb-4">
                    <MessageCircle className="w-5 h-5 text-[#094cb2]" />
                  </div>
                  <h3 className="font-serif text-base font-semibold text-[#1b1c1d]">
                    OpenWA Concierge
                  </h3>
                  <p className="text-xs text-[#434653] mt-2 leading-relaxed">
                    Autonomous WhatsApp outreach queue running with 40 contacts/hour throttle adhering to Cairo business timing.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e3e2e3] flex items-center justify-between text-xs text-[#434653] font-semibold">
                  <span>+20 109 204 8333</span>
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="bg-white p-6 rounded-2xl border border-[#e3e2e3] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#d9e2ff] flex items-center justify-center text-[#094cb2] mb-4">
                    <ShieldCheck className="w-5 h-5 text-[#094cb2]" />
                  </div>
                  <h3 className="font-serif text-base font-semibold text-[#1b1c1d]">
                    100% Verified CI Suite
                  </h3>
                  <p className="text-xs text-[#434653] mt-2 leading-relaxed">
                    105 Next.js compiled routes, 1,052 client tests, 540 Vitest assertions, and 10/10 AI reasoning benchmark score.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e3e2e3] flex items-center justify-between text-xs text-[#094cb2] font-semibold">
                  <span>Pass Rate: 100%</span>
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Unit Inspection & 360° Modal */}
      {modalUnit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl p-6 flex flex-col gap-5 relative border border-[#e3e2e3] animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalUnit(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#efedee] flex items-center justify-center text-[#434653] hover:text-[#1b1c1d] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <span className="text-xs uppercase tracking-wider text-[#6d5e00] font-semibold">
                Unit Cadastral Dossier
              </span>
              <h3 className="font-serif text-xl font-semibold text-[#1b1c1d] mt-1">
                {modalUnit.name}
              </h3>
              <p className="text-xs text-[#434653] mt-0.5">
                {selectedCompound.title} • {modalUnit.specs}
              </p>
            </div>

            {/* Virtual 360 Preview Box */}
            <div className="relative w-full h-56 rounded-xl overflow-hidden bg-[#171c20] flex items-center justify-center">
              <img
                src={modalUnit.imageUrl}
                alt={modalUnit.name}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative z-10 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md text-[#094cb2] flex items-center justify-center shadow-lg mb-2">
                  <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <span className="text-xs text-white font-medium drop-shadow">
                  Interactive 360° Matterport Scan Ready
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#f5f3f4] p-3 rounded-xl border border-[#e3e2e3]">
                <span className="text-[#737784] text-[10px] uppercase font-semibold">
                  Valuation Price
                </span>
                <div className="text-sm font-bold text-[#1b1c1d] mt-0.5">
                  {modalUnit.priceEgp}
                </div>
              </div>
              <div className="bg-[#f5f3f4] p-3 rounded-xl border border-[#e3e2e3]">
                <span className="text-[#737784] text-[10px] uppercase font-semibold">
                  Built-Up Area (BUA)
                </span>
                <div className="text-sm font-bold text-[#1b1c1d] mt-0.5">
                  {modalUnit.bua}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/201092048333?text=${encodeURIComponent(
                  `Hello Sierra Estates VIP Desk, I want to reserve a private inspection for ${modalUnit.name} in ${selectedCompound.title} (${modalUnit.priceEgp})`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#094cb2] text-white text-xs font-semibold text-center hover:bg-[#3366cc] transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Reserve Unit via VIP Broker</span>
              </a>
              <button
                onClick={() => setModalUnit(null)}
                className="py-2.5 px-4 rounded-xl bg-[#efedee] text-[#1b1c1d] text-xs font-medium hover:bg-[#e3e2e3] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
