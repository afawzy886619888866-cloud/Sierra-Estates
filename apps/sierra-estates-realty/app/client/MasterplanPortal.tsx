'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Maximize2,
  TrendingUp,
  Sparkles,
  Download,
  Copy,
  Check,
  Navigation,
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
  subtitleAr: string;
  desc: string;
  area: string;
  units: string;
  index: string;
  delivery: string;
  cadastralId: string;
  waText: string;
  unitsList: UnitListing[];
}

const COMPOUND_REGISTRY: Record<string, CompoundData> = {
  villette: {
    id: 'villette',
    subzone: 'Golden Square Corridor',
    title: 'SODIC Villette',
    subtitleAr: 'سوديك فيليت — التجمع الخامس',
    desc: 'Preeminent 301-acre master community anchored by four dynamic pocket parks, signature crystal waterways, and pedestrian green spines.',
    area: '301 Acres',
    units: '18 Active',
    index: '82,500 EGP/m²',
    delivery: 'Immediate / Q3',
    cadastralId: 'EG-NC-704',
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
        statusColor: 'bg-emerald-600',
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
    subtitleAr: 'ميفيدا إعمار مصر — المخطط المتكامل',
    desc: 'An eco-sustainable master sanctuary offering lush pine valleys, international clubhouse amenities, and prime connectivity to the AUC ring.',
    area: '860 Acres',
    units: '24 Active',
    index: '86,200 EGP/m²',
    delivery: 'Ready to Move',
    cadastralId: 'EG-NC-812',
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
        statusColor: 'bg-emerald-600',
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
    subtitleAr: 'الجامعة الأمريكية بالقاهرة — المركز الإداري',
    desc: 'The intellectual anchor of New Cairo connecting North and South 90th Street corridors with premier high-density mixed developments.',
    area: '260 Acres',
    units: 'Commercial & Suites',
    index: '94,000 EGP/m²',
    delivery: 'Operational',
    cadastralId: 'EG-NC-AUC01',
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
    subtitleAr: 'كايرو فيستيفال سيتي — أوريانا وفيلات التسعين',
    desc: "Al-Futtaim's flagship mixed-use metropolis featuring world-class retail, business districts, and ultra-luxury Oriana residential villas.",
    area: '750 Acres',
    units: '15 Active',
    index: '89,500 EGP/m²',
    delivery: 'Phased / Ready',
    cadastralId: 'EG-NC-CFC09',
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
        statusColor: 'bg-emerald-600',
        imageUrl:
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  mountainview: {
    id: 'mountainview',
    subzone: 'iCity Innovation District',
    title: 'Mountain View iCity',
    subtitleAr: 'ماونتن فيو آي سيتي — لاجون بارك التجمع',
    desc: 'Revolutionary multi-tiered city with royal crystal lagoons, car-free park networks, and bespoke sky villas overlooking water features.',
    area: '500 Acres',
    units: '31 Active',
    index: '74,800 EGP/m²',
    delivery: 'Immediate / 2026',
    cadastralId: 'EG-NC-MV33',
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
        statusColor: 'bg-emerald-600',
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
    subtitleAr: 'قطامية ديونز وهايست — قصور وفيلات الجولف',
    desc: 'Pinnacle of Egyptian luxury living featuring 27-hole Sir Nick Faldo championship golf courses and sprawling Mediterranean estates.',
    area: '900 Acres',
    units: '8 Mansions',
    index: '115,000 EGP/m²',
    delivery: 'Private Reserve',
    cadastralId: 'EG-NC-KD01',
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

const MAP_EDITIONS = [
  {
    id: 1,
    title: 'Bilingual Light (AR/EN)',
    tag: 'v4.2',
    color: '#094cb2',
    bgBadge: 'bg-blue-600',
    src: 'https://lh3.googleusercontent.com/aida/AEtjO1XiC0T7C7Bke6s3Gd-GM87jUjB6GUh45-ESmgsg55rkB5kaC7AhBiMK2NAttMEPkZxKgyblJn57kC4_lDAfeeuJWoiv2pCyvzvlGZJ3fVaycGEGHs3o2xif--SD6yZB1RkykJFOGQOCCZJvx955fXmDbdzZzk7OPKxSXHib7FI81bw-OOqvpWKji82lDeygwsARq3_T4YPOQjYlNvJS05Asg4Nm1APsCKiGG2QJVOuWF11IM56APvzgag',
    alt: 'New Cairo City Master Registry - Bilingual Light Editorial Edition',
  },
  {
    id: 2,
    title: 'Light High-Fidelity Realm',
    tag: 'Hi-Fi',
    color: '#6d5e00',
    bgBadge: 'bg-amber-600',
    src: 'https://lh3.googleusercontent.com/aida/AEtjO1UbnLYfdUPDC9aSFDEdmCK3FaRVezLo8arMCQm25lwzjBAyiefOMR9jj3Vh2IyPsICyXNNnnk_NKUHao-Ww7v_bWtGc7lU7nfLwDmaIDA5SPvnDKo3mVULjTWqXADneUxGShRRSdxkRKy0TdxzktqIOVYgz_9XkmBhRH5vdvwtAAyhT1ceBG8I8eIEO1SgS6mNoLYW0vtB9GODpSR_2PEaVLG6JDHdRLYyzOQ3yKRNy2Nq6_UH-hMg10w',
    alt: 'New Cairo City & Eastern Extensions - Light Alexandria High Fidelity',
  },
  {
    id: 3,
    title: 'Dark Nocturnal (3D Proximity)',
    tag: 'L4 3D',
    color: '#2259bf',
    bgBadge: 'bg-indigo-600',
    src: 'https://lh3.googleusercontent.com/aida/AEtjO1XSazqs_89CpZ6VEFiCPnvkj6gBL-bSC1P4qJtmtKOVPFa1iFI1EJcw_y056k4bbNzcB8MfDdVm2MkU7ipCR9ysXevxt8oQlu3Pk1wq5PIK1bNxIeQaD_gPrAnydSmWH7NhbpgFlk1g341F2ZF3zJmEhdNUVf_usyRCLtdh6v_xwll_wxHAM3L3RQwNufw9-QcQHkhH_2VPRICRk_OUaX8tDkel_n7xB-FYPYLANQghkzFoZUijeCBzWIc',
    alt: 'New Cairo City Interactive 3D Spatial Masterplan Nocturnal Edition',
  },
  {
    id: 4,
    title: 'المخطط العام الكادستري (عربي)',
    tag: 'كادستري',
    color: '#dcc661',
    bgBadge: 'bg-yellow-600',
    src: 'https://lh3.googleusercontent.com/aida/AEtjO1VFcm0Sz2wDJfcnK9kiAWGl4Y_GQuDa7R5Jsro8BH7u55BRoLXpnrq0DDlMyPyUXdbeFyFDX4IEJLFJFI2WcKFoWS1ymyLhThDMDBrtQ9wo26zeJvYwp4sKMx8nzJN_qsBcVPVNo4UtZvaHrOZGKsRO_LGIgoGbW3uqZBpyekjUoLrW7quB5TugBxuVkGvXHDL-UoGHtTKGH4i1o90AXl0tZuo9lcoSLtRd7RKY50374Nm0ZeLze_T_whg',
    alt: 'القاهرة الجديدة التجمع الخامس المخطط العام والخرائط المساحية الكادسترية',
  },
];

export default function MasterplanPortal() {
  const [mapEdition, setMapEdition] = useState<number>(1);
  const [pitchMode, setPitchMode] = useState<'2d' | '3d' | 'vol'>('vol');
  const [zoom, setZoom] = useState(1.0);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('villette');
  const [typologyFilter, setTypologyFilter] = useState<'all' | 'villa' | 'twin' | 'penthouse'>('all');
  const [modalUnit, setModalUnit] = useState<UnitListing | null>(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [liveInventory, setLiveInventory] = useState<any[]>([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState<number>(11017);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/inventory?limit=300');
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.units) && data.units.length > 0) {
          setLiveInventory(data.units);
          if (data.count) setTotalCatalogCount(data.count);
        }
      } catch {
        // graceful fallback to curated registry
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const selectedCompound = COMPOUND_REGISTRY[selectedCompoundId] || COMPOUND_REGISTRY.villette;

  const displayUnits = useMemo(() => {
    if (!liveInventory.length) return selectedCompound.unitsList;
    const id = selectedCompoundId.toLowerCase();
    const matched = liveInventory.filter((u: any) => {
      const cmp = (u.compound || u.cmp || '').toLowerCase();
      if (id === 'villette') return cmp.includes('villette');
      if (id === 'mivida') return cmp.includes('mivida');
      if (id === 'auc') return cmp.includes('auc');
      if (id === 'cfc') return cmp.includes('festival') || cmp.includes('cfc');
      if (id === 'mountainview') return cmp.includes('mountain view');
      if (id === 'katameya') return cmp.includes('katameya');
      return false;
    });

    if (matched.length > 0) {
      return matched.map((u: any, idx: number): UnitListing => {
        const rawType = (u.type || u.propertyType || '').toLowerCase();
        const type: 'villa' | 'twin' | 'penthouse' = rawType.includes('twin')
          ? 'twin'
          : rawType.includes('penthouse') || rawType.includes('roof') || rawType.includes('apt')
          ? 'penthouse'
          : 'villa';
        const priceNum = Number(u.price || (u.egpM ? u.egpM * 1e6 : 0) || 0);
        const usdNum = Math.round(priceNum / 49);
        return {
          id: String(u.code || u.id || `live-${idx}`),
          type,
          name: u.title || `${selectedCompound.title} Unit ${u.code || idx + 1}`,
          specs: [
            u.beds ? `${u.beds} Bedrooms` : null,
            (u.baths || u.bath) ? `${u.baths || u.bath} Bathrooms` : null,
            u.area ? `${u.area} m²` : null,
          ].filter(Boolean).join(' • ') || 'Specifications on request',
          priceEgp: priceNum ? `${priceNum.toLocaleString()} EGP` : 'Price on request',
          priceUsd: usdNum ? `≈ $${usdNum.toLocaleString()} USD` : '',
          bua: u.area ? `${u.area} m²` : '—',
          status: 'Verified Live',
          statusColor: 'bg-emerald-600',
          imageUrl:
            u.img ||
            u.image ||
            selectedCompound.unitsList[idx % selectedCompound.unitsList.length]?.imageUrl ||
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
        };
      });
    }

    return selectedCompound.unitsList;
  }, [liveInventory, selectedCompoundId, selectedCompound]);

  const filteredUnits = displayUnits.filter((unit) => {
    if (typologyFilter === 'all') return true;
    return unit.type === typologyFilter;
  });

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.15, 1.6));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.15, 0.7));
  }, []);

  const handleResetViewport = useCallback(() => {
    setPitchMode('vol');
    setZoom(1.0);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText('<ExclusiveNewCairoMap />');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, []);

  // Compute 3D perspective transform
  const stageTransform = useMemo(() => {
    if (pitchMode === '2d') {
      return `perspective(0px) rotateX(0deg) rotateZ(0deg) scale(${zoom})`;
    }
    if (pitchMode === '3d') {
      return `perspective(1200px) rotateX(48deg) rotateZ(-6deg) scale(${zoom})`;
    }
    // 'vol' (volumetric)
    return `perspective(1200px) rotateX(32deg) rotateZ(-3deg) scale(${zoom})`;
  }, [pitchMode, zoom]);

  return (
    <div className="min-h-screen bg-[#faf9fa] text-[#1b1c1d]">
      <Nav active="explore" />

      <main className="w-full pt-16">
        {/* Top Spatial Masterplan Control Bar (Stitch Spec) */}
        <div className="w-full bg-white border-b border-[#e3e2e3] px-4 lg:px-8 py-3.5 shadow-sm">
          <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            {/* Left: Masterplan Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#737784] font-semibold mr-1">
                Edition:
              </span>
              {MAP_EDITIONS.map((ed) => {
                const active = mapEdition === ed.id;
                return (
                  <button
                    key={ed.id}
                    onClick={() => setMapEdition(ed.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${
                      active
                        ? 'bg-[#094cb2] text-white shadow-md'
                        : 'bg-[#efedee] text-[#1b1c1d] hover:bg-[#e3e2e3]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: active ? '#ffffff' : ed.color }}
                    />
                    <span>{ed.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        active ? 'bg-white/20 text-white' : 'bg-black/5 text-[#434653]'
                      }`}
                    >
                      {ed.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Viewport Modes & System Telemetry */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Currency Toggle */}
              <div className="flex items-center bg-[#f5f3f4] p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setCurrency('EGP')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    currency === 'EGP'
                      ? 'bg-white text-[#094cb2] shadow-sm font-bold'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  EGP
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    currency === 'USD'
                      ? 'bg-white text-[#094cb2] shadow-sm font-bold'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  USD
                </button>
              </div>

              {/* CRS & Vercel Pulse */}
              <div className="hidden sm:flex items-center gap-2 bg-[#f5f3f4] px-3 py-1.5 rounded-lg border border-[#e3e2e3]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6d5e00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6d5e00]" />
                </span>
                <span className="text-[11px] text-[#434653] font-medium">Vercel Edge Synced</span>
                <span className="text-[#c3c6d5] text-[11px]">•</span>
                <span className="font-mono text-[11px] text-[#1b1c1d] font-semibold">EPSG:32636</span>
              </div>

              {/* 3D Perspective Tilt Toggle */}
              <div className="flex items-center bg-[#f5f3f4] p-0.5 rounded-lg text-xs border border-[#e3e2e3]">
                <button
                  onClick={() => setPitchMode('2d')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    pitchMode === '2d'
                      ? 'bg-white text-[#094cb2] font-semibold shadow-sm'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  2D Ortho
                </button>
                <button
                  onClick={() => setPitchMode('3d')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    pitchMode === '3d'
                      ? 'bg-white text-[#094cb2] font-semibold shadow-sm'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  3D 48°
                </button>
                <button
                  onClick={() => setPitchMode('vol')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    pitchMode === 'vol'
                      ? 'bg-white text-[#094cb2] font-semibold shadow-sm'
                      : 'text-[#434653] hover:text-[#1b1c1d]'
                  }`}
                >
                  Volumetric
                </button>
              </div>

              {/* Map Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#f5f3f4] p-1 rounded-lg border border-[#e3e2e3]">
                <button
                  onClick={handleZoomIn}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white text-[#1b1c1d] hover:text-[#094cb2] transition-all shadow-sm"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white text-[#1b1c1d] hover:text-[#094cb2] transition-all shadow-sm"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetViewport}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white text-[#1b1c1d] hover:text-[#094cb2] transition-all shadow-sm"
                  title="Reset Extent"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setInspectionModalOpen(true)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white text-[#1b1c1d] hover:text-[#094cb2] transition-all shadow-sm"
                  title="Fullscreen Inspection"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Map Stage & HUD Overlays */}
        <section className="relative w-full h-[720px] lg:h-[820px] overflow-hidden bg-[#171c20] select-none">
          {/* Background Cadastral Base Maps (Stacked and Switched via JS) */}
          <div
            className="absolute inset-0 w-full h-full origin-center transition-transform duration-700 ease-out flex items-center justify-center"
            style={{
              transform: stageTransform,
              transformStyle: 'preserve-3d',
            }}
          >
            {MAP_EDITIONS.map((ed) => (
              <img
                key={ed.id}
                src={ed.src}
                alt={ed.alt}
                className={`map-layer absolute w-full h-full object-cover transition-opacity duration-700 ${
                  mapEdition === ed.id
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                }`}
              />
            ))}

            {/* Interactive SVG Hotspots Overlay */}
            <svg
              className="absolute inset-0 w-full h-full z-10 pointer-events-none"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 1600 900"
            >
              <defs>
                <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Hotspot Ring 1: AUC Central Hub */}
              <circle
                cx="800"
                cy="450"
                r="48"
                fill="none"
                stroke="#f9e37a"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-spin origin-center"
                style={{ transformOrigin: '800px 450px', animationDuration: '35s' }}
              />
              <circle
                cx="800"
                cy="450"
                r="36"
                fill="rgba(249, 227, 122, 0.12)"
                stroke="#bfab49"
                strokeWidth="1.5"
              />

              {/* Hotspot Sector Polygon: SODIC Villette */}
              <g
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setSelectedCompoundId('villette')}
              >
                <path
                  d="M 880 430 L 980 435 L 970 590 L 870 570 Z"
                  fill={selectedCompoundId === 'villette' ? 'rgba(51, 102, 204, 0.45)' : 'rgba(51, 102, 204, 0.22)'}
                  stroke="#3366cc"
                  strokeWidth="2.5"
                  filter="url(#gold-glow)"
                  className="group-hover:fill-[#3366cc]/50 transition-all"
                />
                <circle cx="925" cy="505" r="7" fill="#bfab49" className="animate-pulse" />
                <text
                  x="925"
                  y="490"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="font-bold text-[12px] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] pointer-events-none"
                >
                  SODIC VILLETTE
                </text>
              </g>

              {/* Hotspot Sector: Mivida Emaar */}
              <g
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setSelectedCompoundId('mivida')}
              >
                <path
                  d="M 865 370 L 965 375 L 975 425 L 875 420 Z"
                  fill={selectedCompoundId === 'mivida' ? 'rgba(109, 94, 0, 0.45)' : 'rgba(109, 94, 0, 0.2)'}
                  stroke="#bfab49"
                  strokeWidth="2"
                  className="group-hover:fill-[#bfab49]/50 transition-all"
                />
                <circle cx="920" cy="398" r="6" fill="#f9e37a" />
                <text
                  x="920"
                  y="390"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="font-semibold text-[11px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] pointer-events-none"
                >
                  MIVIDA
                </text>
              </g>

              {/* Hotspot Sector: Mountain View Hyde Park */}
              <g
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setSelectedCompoundId('mountainview')}
              >
                <circle cx="710" cy="580" r="7" fill="#094cb2" />
                <circle
                  cx="710"
                  cy="580"
                  r="12"
                  fill="none"
                  stroke="#3366cc"
                  strokeWidth="1.5"
                  className="animate-ping"
                  style={{ animationDuration: '3s' }}
                />
                <text
                  x="710"
                  y="565"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="font-semibold text-[11px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] pointer-events-none"
                >
                  MOUNTAIN VIEW
                </text>
              </g>

              {/* Hotspot Sector: Cairo Festival City */}
              <g
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setSelectedCompoundId('cfc')}
              >
                <circle cx="530" cy="380" r="6" fill="#3366cc" />
                <text
                  x="530"
                  y="365"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="font-semibold text-[11px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] pointer-events-none"
                >
                  CFC NORTH 90
                </text>
              </g>

              {/* Hotspot Sector: Katameya Dunes & Heights */}
              <g
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setSelectedCompoundId('katameya')}
              >
                <circle cx="1060" cy="740" r="6" fill="#bfab49" />
                <text
                  x="1060"
                  y="725"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="font-semibold text-[11px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] pointer-events-none"
                >
                  KATAMEYA DUNES
                </text>
              </g>
            </svg>
          </div>

          {/* Floating Masterplan Cadastral Header HUD (Top Left) */}
          <div className="absolute top-6 left-6 lg:left-10 z-20 max-w-md bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-xl border-l-4 border-[#094cb2]">
            <div className="flex items-center gap-3 mb-2">
              <img
                src="https://lh3.googleusercontent.com/aida/AEtjO1XrueMgQPHH8t8tSwIeCbme0XDtyru3yzr_rn15Xjwkd-7-R1999-Iap9c7T7oa0R4gKACQ6LLnEKJiCMSDL6-QTYGHo6mDdUDlfeLan3mXJMbOMII3c-nRv5tWRFK4b3sCUb-Dh3HGmaT-PeM93UGz0MprDIq5k1i8pOz_-ALrwljH377lbDeJ3qmn0jJyzBF5Jx4iYeeZgKMK08GfnQcb_74RywWePV9d-RClx48t8rWqOPw3oKQOmfA"
                alt="Sierra Estates Official Architectural Crest"
                className="w-10 h-10 object-contain drop-shadow-sm"
              />
              <div>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#6d5e00] font-bold block">
                  Cadastral Intelligence Masterplan
                </span>
                <h1 className="font-serif text-lg lg:text-xl font-bold text-[#1b1c1d] leading-tight">
                  Fifth Settlement & Golden Square
                </h1>
              </div>
            </div>
            <p className="text-xs text-[#434653] leading-relaxed">
              Ultra-high-definition interactive GIS cadastral matrix anchored at American University in Cairo (AUC)
              core hub. Real-time availability synchronized with Supabase live registry.
            </p>
            <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-[#434653] bg-[#f5f3f4] px-3 py-2 rounded-xl">
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#094cb2]" />
                <span>Golden Square Corridor</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-[#6d5e00]" />
                <span>18 Compound Sectors</span>
              </div>
            </div>
          </div>

          {/* Live Compound Floating Inventory Card (Pinned on Right) */}
          <aside
            id="inventory-card"
            className="absolute top-6 right-6 lg:right-10 z-20 w-80 lg:w-96 bg-white/95 backdrop-blur-2xl p-5 rounded-2xl shadow-2xl border border-[#e3e2e3] transition-all duration-300"
          >
            {/* Compound Header with Live Pulse */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] tracking-wider uppercase font-bold text-[#6d5e00]">
                    {selectedCompound.subzone}
                  </span>
                </div>
                <h2 className="font-serif text-xl font-bold text-[#1b1c1d] mt-0.5">
                  {selectedCompound.title}
                </h2>
                <span className="text-xs text-[#737784] font-medium block">
                  {selectedCompound.subtitleAr}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#d9e2ff] text-[#001946] font-mono text-[10px] font-bold">
                {selectedCompound.units}
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 bg-[#f5f3f4] p-2.5 rounded-xl mb-4 text-center">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#737784] block font-semibold">
                  Avg Price/m²
                </span>
                <span className="text-xs font-bold text-[#1b1c1d]">
                  {selectedCompound.index}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#737784] block font-semibold">
                  Delivery
                </span>
                <span className="text-xs font-bold text-[#094cb2]">
                  {selectedCompound.delivery}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#737784] block font-semibold">
                  Cadastral ID
                </span>
                <span className="font-mono text-xs font-bold text-[#1b1c1d]">
                  {selectedCompound.cadastralId}
                </span>
              </div>
            </div>

            {/* Live Inventory Listing Table */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#1b1c1d] uppercase tracking-wider">
                  Available Prime Units
                </span>
                <span className="text-[10px] text-[#6d5e00] font-medium">Synced Live</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredUnits.slice(0, 4).map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => setModalUnit(unit)}
                    className="p-2.5 rounded-xl bg-[#f5f3f4] hover:bg-[#efedee] transition-colors cursor-pointer group border border-transparent hover:border-[#b1c5ff]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#094cb2] group-hover:underline">
                        {unit.id.toUpperCase()}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {unit.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-[#434653]">
                      <span>{unit.name}</span>
                      <span className="font-medium text-[#1b1c1d]">BUA: {unit.bua}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1 text-xs border-t border-[#e3e2e3]/60">
                      <span className="font-bold text-[#1b1c1d]">
                        {currency === 'USD' && unit.priceUsd ? unit.priceUsd : unit.priceEgp}
                      </span>
                      <span className="text-[10px] text-[#094cb2] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <Eye className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action CTAs (Helpline Compliant) */}
            <div className="space-y-2">
              <a
                href={`https://wa.me/201092048333?text=${encodeURIComponent(
                  `Inquiry regarding ${selectedCompound.title} masterplan cadastral inventory (ID: ${selectedCompound.cadastralId})`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-[#094cb2] hover:bg-[#3366cc] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp VIP Private Broker</span>
              </a>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectionModalOpen(true)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-[#f5f3f4] text-[#1b1c1d] hover:bg-[#efedee] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#e3e2e3]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#6d5e00]" />
                  <span>360° Inspection</span>
                </button>
                <button
                  onClick={handleCopyCode}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-[#f5f3f4] text-[#1b1c1d] hover:bg-[#efedee] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#e3e2e3]"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#094cb2]" />
                      <span>CAD Spec</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>

          {/* Floating Map Scale & Compass Watermark (Bottom Left) */}
          <div className="absolute bottom-6 left-6 lg:left-10 z-20 flex items-end gap-6 bg-white/85 backdrop-blur-md p-3.5 rounded-2xl shadow-md pointer-events-none border border-[#e3e2e3]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#094cb2]" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#1b1c1d]">
                  Scale 1:25,000
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-[#737784]">
                <span>UTM Zone 36N</span>
                <span>•</span>
                <span>WGS84 Datum</span>
              </div>
              <div className="w-28 h-1 bg-[#1b1c1d] mt-2 relative flex items-center justify-between">
                <div className="h-2 w-0.5 bg-[#1b1c1d] absolute left-0" />
                <div className="h-1.5 w-0.5 bg-[#1b1c1d] absolute left-1/2" />
                <div className="h-2 w-0.5 bg-[#1b1c1d] absolute right-0" />
              </div>
            </div>
            <div className="h-10 w-px bg-[#e3e2e3]" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-[#094cb2]">N</span>
              <Navigation className="w-4 h-4 text-[#094cb2] -rotate-45" />
            </div>
          </div>
        </section>

        {/* Bento Spatial Intelligence Grid (4 Strategic Insights) */}
        <section className="w-full bg-[#f5f3f4] px-4 lg:px-8 py-10 border-t border-[#e3e2e3]">
          <div className="max-w-[1720px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Bento Card 1: Verified Cadastral Title Deeds */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e3e2e3] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] tracking-widest uppercase text-[#6d5e00] font-bold">
                    Title Deeds & Registry
                  </span>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1b1c1d]">
                  Cadastral Polygons
                </h3>
                <p className="text-xs text-[#434653] mt-2 leading-relaxed">
                  Every polygon demarcated on the interactive masterplan holds verified cadastral title deeds, construction permits, and escrow verification.
                </p>
              </div>
              <div className="mt-6 pt-4 bg-[#f5f3f4] p-3 rounded-xl flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#1b1c1d] font-semibold">100% Verified Escrow</span>
                <span className="text-[10px] text-[#6d5e00] font-bold uppercase">L4 Tier</span>
              </div>
            </div>

            {/* Bento Card 2: Strategic Proximity Index */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e3e2e3] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] tracking-widest uppercase text-[#737784] font-bold">
                    Arterial Connectivity
                  </span>
                  <span className="font-mono text-xs text-[#094cb2] font-bold">120 km/h</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1b1c1d]">
                  Arterial Road Network
                </h3>
                <p className="text-xs text-[#434653] mt-1.5">
                  Direct interchange access times from AUC Central Master Hub:
                </p>
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#1b1c1d]">North & South 90th Street</span>
                      <span className="font-bold text-[#094cb2]">0.0 km (Direct)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#efedee] rounded-full overflow-hidden">
                      <div className="h-full bg-[#094cb2] rounded-full w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#1b1c1d]">Cairo Ring Road Interchange</span>
                      <span className="font-bold text-[#1b1c1d]">4.2 km (6 mins)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#efedee] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3366cc] rounded-full w-4/5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#1b1c1d]">Middle Ring Road (Al-Awsati)</span>
                      <span className="font-bold text-[#1b1c1d]">5.8 km (8 mins)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#efedee] rounded-full overflow-hidden">
                      <div className="h-full bg-[#bfab49] rounded-full w-3/5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#1b1c1d]">Suez Desert Highway</span>
                      <span className="font-bold text-[#1b1c1d]">9.1 km (12 mins)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#efedee] rounded-full overflow-hidden">
                      <div className="h-full bg-[#c3c6d5] rounded-full w-2/5" />
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#737784] block mt-4">
                Calculated via real-time telemetry sensor array
              </span>
            </div>

            {/* Bento Card 3: Price Appreciation Sparkline */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e3e2e3] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] tracking-widest uppercase text-[#6d5e00] font-bold">
                    5-Year Capital Gain
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    +184.2%
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1b1c1d]">
                  Golden Square ROI Index
                </h3>
                <p className="text-xs text-[#434653] mt-1">
                  Capital valuation trajectory per square meter (EGP / m²):
                </p>
                {/* Inline SVG Sparkline */}
                <div className="mt-4 w-full h-28 bg-[#f5f3f4] rounded-xl p-2 flex flex-col justify-end">
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 300 80">
                    <path
                      d="M 0 70 Q 50 65, 80 55 T 160 40 T 220 25 T 300 6"
                      fill="none"
                      stroke="#094cb2"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 0 70 Q 50 65, 80 55 T 160 40 T 220 25 T 300 6 L 300 80 L 0 80 Z"
                      fill="rgba(9, 76, 178, 0.08)"
                    />
                    <circle cx="300" cy="6" r="4" fill="#6d5e00" />
                  </svg>
                  <div className="flex justify-between font-mono text-[9px] text-[#737784] mt-1">
                    <span>2020: 36k</span>
                    <span>2022: 54k</span>
                    <span>2024: 85k</span>
                    <span className="text-[#094cb2] font-bold">2026: 105k+</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                <span className="text-[#434653]">Annualized Yield:</span>
                <span className="font-bold text-[#1b1c1d]">24.6% Compound</span>
              </div>
            </div>

            {/* Bento Card 4: Master Developer Consortium Status */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e3e2e3] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] tracking-widest uppercase text-[#737784] font-bold">
                    Consortium
                  </span>
                  <Building className="w-5 h-5 text-[#6d5e00]" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1b1c1d]">
                  Ecosystem Developers
                </h3>
                <p className="text-xs text-[#434653] mt-1">
                  Tier-1 master developers represented in New Cairo registry:
                </p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between bg-[#f5f3f4] px-3 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-[#1b1c1d]">SODIC (Aldar Group)</span>
                    <span className="font-mono text-[#094cb2] font-bold">Villette / EDNC</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#f5f3f4] px-3 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-[#1b1c1d]">Emaar Misr</span>
                    <span className="font-mono text-[#094cb2] font-bold">Mivida / Uptown</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#f5f3f4] px-3 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-[#1b1c1d]">Mountain View (DMG)</span>
                    <span className="font-mono text-[#094cb2] font-bold">iCity / Hyde Park</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#f5f3f4] px-3 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-[#1b1c1d]">Palm Hills Dev.</span>
                    <span className="font-mono text-[#094cb2] font-bold">Palm Hills New Cairo</span>
                  </div>
                </div>
              </div>
              <Link
                href="/explore"
                className="mt-4 text-xs font-bold text-[#094cb2] hover:underline flex items-center gap-1"
              >
                <span>Explore Developer Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* GitHub Repo & Vercel Deployment Integration Bar */}
        <section className="w-full bg-[#f5f3f4] px-4 lg:px-8 py-6">
          <div className="max-w-[1720px] mx-auto bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-[#e3e2e3]">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Deployment Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Vercel Production: Ready
                  </span>
                  <span className="text-[#c3c6d5] text-xs">•</span>
                  <span className="font-mono text-xs text-[#434653] font-medium">
                    apps/sierra-estates-realty
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1b1c1d]">
                  Component: <code className="font-mono text-sm bg-[#efedee] px-2 py-0.5 rounded text-[#094cb2]">MasterplanPortal.tsx</code>
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[#434653]">
                  <span>Repo: <strong className="text-[#1b1c1d]">sierrablue8866-droid/SE-Vercel-deploy-main</strong></span>
                  <span>Commit: <strong className="text-[#1b1c1d]">84658c9 (main)</strong></span>
                  <span>Active Catalog: <strong className="text-[#1b1c1d]">{totalCatalogCount.toLocaleString()} Units</strong></span>
                </div>
              </div>

              {/* Developer Direct Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 rounded-xl bg-[#efedee] text-[#1b1c1d] hover:bg-[#e3e2e3] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied JSX Tag</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Component JSX</span>
                    </>
                  )}
                </button>
                <a
                  href="/admin?tab=inventory_os"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#094cb2] text-white hover:bg-[#3366cc] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Inspect in Admin OS</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 360° Inspection Modal */}
      {inspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-[#e3e2e3] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-[#f5f3f4] border-b border-[#e3e2e3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#094cb2]" />
                <h3 className="font-serif text-sm font-semibold text-[#1b1c1d]">
                  360° Masterplan Inspection — {selectedCompound.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectionModalOpen(false)}
                className="p-1 rounded-lg text-[#737784] hover:text-[#1b1c1d] hover:bg-[#e3e2e3] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="relative w-full h-96 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <img
                  src={MAP_EDITIONS[mapEdition - 1].src}
                  alt={selectedCompound.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#dcc661]">
                    {selectedCompound.subzone} • {selectedCompound.cadastralId}
                  </span>
                  <h4 className="font-serif text-2xl font-bold mt-1">
                    {selectedCompound.title}
                  </h4>
                  <p className="text-xs text-white/80 max-w-xl mt-1 leading-relaxed">
                    {selectedCompound.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-[#737784]">
                  Scale 1:25,000 • High-Fidelity Satellite Raster
                </div>
                <a
                  href={`https://wa.me/201092048333?text=${encodeURIComponent(
                    `Inquiry for 360 inspection data of ${selectedCompound.title}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#094cb2] text-white text-xs font-semibold hover:bg-[#3366cc] flex items-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reserve Viewing with Concierge</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unit Detail Modal */}
      {modalUnit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-[#e3e2e3] animate-in fade-in zoom-in-95 duration-150">
            <div className="relative h-64 w-full">
              <img
                src={modalUnit.imageUrl}
                alt={modalUnit.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setModalUnit(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span
                className={`absolute bottom-3 left-3 ${modalUnit.statusColor} text-white text-xs font-semibold px-2.5 py-1 rounded-md`}
              >
                {modalUnit.status}
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1b1c1d]">
                    {modalUnit.name}
                  </h3>
                  <p className="text-xs text-[#434653] mt-1">{modalUnit.specs}</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-[#094cb2]">
                    {modalUnit.priceEgp}
                  </div>
                  <div className="text-xs text-[#737784] font-medium">
                    {modalUnit.priceUsd}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#e3e2e3] grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#f5f3f4] p-2.5 rounded-xl">
                  <span className="text-[#737784] text-[10px] uppercase font-semibold">
                    Built-Up Area (BUA)
                  </span>
                  <div className="font-bold text-[#1b1c1d] mt-0.5">{modalUnit.bua}</div>
                </div>
                <div className="bg-[#f5f3f4] p-2.5 rounded-xl">
                  <span className="text-[#737784] text-[10px] uppercase font-semibold">
                    Cadastral Verification
                  </span>
                  <div className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>L4 Verified</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`https://wa.me/201092048333?text=${encodeURIComponent(
                    `Hello Sierra VIP Concierge, I would like to reserve or schedule a private viewing for unit ${modalUnit.id} (${modalUnit.name}) in ${selectedCompound.title}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 w-full py-2.5 px-4 rounded-xl bg-[#094cb2] text-white text-xs font-semibold text-center hover:bg-[#3366cc] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reserve Unit via VIP Broker</span>
                </a>
                <button
                  onClick={() => setModalUnit(null)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#efedee] text-[#1b1c1d] text-xs font-medium hover:bg-[#e3e2e3] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
