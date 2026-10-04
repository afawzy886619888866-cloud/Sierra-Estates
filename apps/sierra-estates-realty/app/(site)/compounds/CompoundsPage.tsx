'use client';

/** Port of deploy/compounds.html. */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  RotateCcw,
  Compass,
  ShieldCheck,
  X,
  MessageCircle,
  Building2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { motionTokens } from '@/lib/site/motionTokens';
import type { MapCompound } from '@/components/site/CompoundsMap';
import { compoundFlagCode } from '@/components/site/CompoundsMap';
import SmartFilterBar, { type SmartCompoundOption } from '@/components/site/SmartFilterBar';
import { type SmartFilterValue } from '@/lib/site/smart-search';
import CompoundExcelSheetModal from '@/components/site/CompoundExcelSheetModal';

const CompoundsMap = dynamic(() => import('@/components/site/CompoundsMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 460, color: 'var(--muted)', fontSize: 13 }}>
      Loading map…
    </div>
  ),
});

const TYPES = ['all', 'Apartment', 'Villa', 'Townhouse', 'Twin House'];
const BEDS = [0, 1, 2, 3, 4, 5];

export default function CompoundsPage() {
  const { t, isAr } = useSite();
  const reduce = useReducedMotion();
  const all = HZDATA.compounds as MapCompound[];
  const featured = HZDATA.featured as string[];
  const imgs = HZDATA.compoundImgs as Record<string, string>;

  // Smart Filter State (mirrors hero SmartFilterBar with compact={true})
  const [smartFilter, setSmartFilter] = useState<SmartFilterValue>({
    purpose: 'sale',
    compound: '',
    rooms: '',
    budget: 'any',
    unitType: '',
    condition: '',
  });

  const [q, setQ] = useState('');
  const [zone, setZone] = useState('all');
  const [type, setType] = useState('all');
  const [beds, setBeds] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [quickFacet, setQuickFacet] = useState<'all' | 'owner' | 'resale' | 'rent' | 'yield' | 'growth'>('all');
  const [unitSubTab, setUnitSubTab] = useState<'all' | 'owner' | 'resale' | 'rent'>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [liveUnits, setLiveUnits] = useState<any[]>([]);
  const [compoundSheetCounts, setCompoundSheetCounts] = useState<Record<string, number>>({});
  const [sheetModalCompound, setSheetModalCompound] = useState<string | null>(null);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState(false);

  // Fetch the live inventory once (same source as /properties and the map):
  useEffect(() => {
    let cancelled = false;
    fetch('/api/inventory')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setInventoryLoading(false);
        if (d && Array.isArray(d.units)) {
          setLiveUnits(d.units);
          if (d.compoundSheetCounts) {
            setCompoundSheetCounts(d.compoundSheetCounts);
          }
        } else {
          setInventoryError(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInventoryLoading(false);
          setInventoryError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const zones = useMemo(
    () => ['all', ...Array.from(new Set(all.map((c) => c.z)))],
    [all]
  );

  const compoundOptions = useMemo<SmartCompoundOption[]>(() => {
    return all.map((c) => ({
      name: c.n,
      zone: c.z,
      popular: featured.includes(c.n),
    }));
  }, [all, featured]);

  const filtered = useMemo(() => {
    const needle = (smartFilter.compound || q).trim().toLowerCase();
    return all.filter((c) => {
      if (needle && !c.n.toLowerCase().includes(needle) && !c.z.toLowerCase().includes(needle)) {
        return false;
      }
      if (zone !== 'all' && c.z !== zone) return false;
      if (quickFacet === 'yield' && c.ai < 8.2) return false;
      if (quickFacet === 'growth' && !c.g?.includes('+2')) return false;
      return true;
    });
  }, [all, q, smartFilter.compound, zone, quickFacet]);

  const normalize = (s: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(new cairo|residence|residences|district \d+|phase \d+)\b/g, '')
      .trim();

  const getSheetCount = (name: string): number => {
    const target = normalize(name);
    for (const [key, count] of Object.entries(compoundSheetCounts)) {
      const k = normalize(key);
      if (k === target || k.startsWith(target) || target.startsWith(k)) return count;
    }
    return 0;
  };

  // All verified units in the selected compound
  const compoundUnits = useMemo(() => {
    if (!selected) return [];
    const target = normalize(selected);

    // 1. Live inventory (real units from Supabase/sheet/snapshot)
    const live = liveUnits
      .filter((u: any) => {
        const cmp = normalize(u.compound || u.location || '');
        if (!cmp) return false;
        return cmp === target || cmp.startsWith(target) || target.startsWith(cmp);
      })
      .map((u: any, i: number) => {
        const isOwner = Boolean(
          u.isDirectOwner ||
          u.isOwner ||
          u.advertiserRole === 'owner' ||
          u.ownerClue ||
          (u.sourceGroup && String(u.sourceGroup).toLowerCase().includes('owner'))
        );
        const mode = u.mode === 'rent' || u.dealType === 'rent' ? 'rent' : 'sale';
        const price = Number(u.price) || 0;
        const egpM = u.egpM ?? (price ? Number((price / 1_000_000).toFixed(1)) : 0);
        const usd = u.usd ?? (price ? Math.round(price / 48.5) : 0);

        return {
          code: u.code || u.id || `${compoundFlagCode(selected)}-${i + 1}`,
          type: u.propertyType || u.type || 'Apartment',
          beds: u.beds ?? 0,
          bath: u.bath ?? 0,
          area: u.area ?? 0,
          status: u.status || u.availability || 'Available',
          mode,
          price,
          egpM,
          usd,
          isDirectOwner: isOwner,
          finishing: u.finishing || '',
        };
      });

    // 2. Fallback catalog data if no live
    const catalog: any[] = live.length ? [] : ((HZDATA as any).unitsFor?.(selected) || []).map((u: any, i: number) => ({
      code: u.code || `${compoundFlagCode(selected)}-${i + 1}`,
      type: u.type || 'Apartment',
      beds: u.beds ?? 0,
      bath: u.bath ?? 0,
      area: u.area ?? 0,
      status: u.status || 'Available',
      mode: u.mode || 'sale',
      price: u.price || 0,
      egpM: u.egpM || 0,
      usd: u.usd || 0,
      isDirectOwner: false,
      finishing: '',
    }));

    return [...live, ...catalog];
  }, [selected, liveUnits]);

  // Sub-filtered units rendered in the right panel
  const filteredUnits = useMemo(() => {
    return compoundUnits.filter((u) => {
      // Sub-tab filter
      if (unitSubTab === 'owner' && !u.isDirectOwner) return false;
      if (unitSubTab === 'resale' && u.mode !== 'sale') return false;
      if (unitSubTab === 'rent' && u.mode !== 'rent') return false;

      // SmartFilter: Purpose
      if (smartFilter.purpose === 'rent' && u.mode !== 'rent') return false;
      if (smartFilter.purpose === 'sale' && u.mode !== 'sale') return false;

      // SmartFilter: Unit Type
      if (smartFilter.unitType && smartFilter.unitType !== 'all') {
        const uType = (u.type || '').toLowerCase();
        const fType = smartFilter.unitType.toLowerCase();
        if (!uType.includes(fType)) return false;
      }

      // SmartFilter: Rooms
      if (smartFilter.rooms) {
        const reqBeds = parseInt(smartFilter.rooms, 10);
        if (!isNaN(reqBeds) && reqBeds > 0 && (u.beds || 0) < reqBeds) return false;
      }

      return true;
    });
  }, [compoundUnits, unitSubTab, smartFilter]);

  const handleSelectCompound = useCallback((name: string) => {
    const val = name || null;
    setSelected(val);
    setUnitSubTab('all');
    if (val) {
      setSmartFilter((prev) => ({ ...prev, compound: val }));
    }
  }, []);

  const handleSmartFilterChange = useCallback((next: SmartFilterValue) => {
    setSmartFilter(next);
    if (next.compound) {
      const match = all.find(
        (c) => c.n.toLowerCase() === next.compound?.toLowerCase()
      );
      if (match) setSelected(match.n);
    }
  }, [all]);

  const reset = useCallback(() => {
    setQ('');
    setZone('all');
    setType('all');
    setBeds(0);
    setSelected(null);
    setQuickFacet('all');
    setUnitSubTab('all');
    setSmartFilter({
      purpose: 'sale',
      compound: '',
      rooms: '',
      budget: 'any',
      unitType: '',
      condition: '',
    });
  }, []);
  const selectedCompound = useMemo(
    () => (selected ? all.find((c) => c.n.toLowerCase() === selected.toLowerCase()) : null),
    [all, selected]
  );

  return (
    <SiteShell active="cpds">
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('navCpds')}</span>
          </div>
          <h1>{t('cpdsTit')}</h1>
          <p className="sub">{t('cpdsSub')}</p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          {/* SMART MAP FILTER BAR — Styled identically to the Hero SmartFilterBar (compact mode) */}
          <div
            style={{
              marginBottom: 16,
              background: 'rgba(7, 21, 35, 0.95)',
              border: '1px solid rgba(223, 173, 58, 0.28)',
              borderRadius: 16,
              padding: '12px 16px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#dfad3a',
                  }}
                >
                  {isAr ? 'فلتر الخريطة الذكي' : 'Smart Masterplan Filter'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>•</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>
                  <b>{filtered.length}</b> {isAr ? 'كمبوند' : 'Compounds'}
                </span>
              </div>

              {/* Reset Action */}
              <button
                type="button"
                onClick={reset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCcw style={{ width: 11, height: 11 }} />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            </div>

            {/* SmartFilterBar Component in Compact Mode */}
            <SmartFilterBar
              value={smartFilter}
              onChange={handleSmartFilterChange}
              compounds={compoundOptions}
              showPurpose={true}
              showCondition={false}
              compact={true}
              resultCount={filtered.length}
              onReset={reset}
              idPrefix="map-filter"
            />

            {/* Quick Segment & Category Facets */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {[
                { id: 'all', labelEn: 'All Listings', labelAr: 'كل المعروض' },
                { id: 'owner', labelEn: '🛡️ Direct Owner Only', labelAr: '🛡️ مالك مباشر فقط' },
                { id: 'resale', labelEn: 'Resale Units', labelAr: 'إعادة بيع' },
                { id: 'rent', labelEn: 'Rental Units', labelAr: 'إيجار' },
                { id: 'yield', labelEn: '💎 High Yield (>8%)', labelAr: '💎 عائد مرتفع (>8%)' },
                { id: 'growth', labelEn: '📈 High Growth (>20%)', labelAr: '📈 نمو سنوي (>20%)' },
              ].map((pill) => {
                const isActive = quickFacet === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setQuickFacet(pill.id as any);
                      if (pill.id === 'owner') setUnitSubTab('owner');
                      else if (pill.id === 'resale') setUnitSubTab('resale');
                      else if (pill.id === 'rent') setUnitSubTab('rent');
                      else setUnitSubTab('all');
                    }}
                    style={{
                      fontFamily: 'var(--font)',
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '4px 11px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      background: isActive
                        ? 'linear-gradient(135deg, #c8961a, #dfad3a)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#071523' : '#cbd5e1',
                      border: isActive
                        ? '1px solid #dfad3a'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: isActive ? '0 2px 10px rgba(223, 173, 58, 0.35)' : 'none',
                    }}
                  >
                    {isAr ? pill.labelAr : pill.labelEn}
                  </button>
                );
              })}

              <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#dfad3a',
                    padding: '3px 9px',
                    borderRadius: 6,
                    background: 'rgba(223, 173, 58, 0.12)',
                    border: '1px solid rgba(223, 173, 58, 0.25)',
                  }}
                >
                  62 Compounds · {liveUnits.length > 0 ? `${liveUnits.length.toLocaleString()} Units` : '5,834 Verified'}
                </span>
              </div>
            </div>

            {/* Zone Quick-Filter Pills */}
            <div
              style={{
                display: 'flex',
                gap: 5,
                overflowX: 'auto',
                paddingTop: 8,
                marginTop: 8,
                scrollbarWidth: 'none',
              }}
            >
              {zones.map((z) => {
                const isActive = zone === z;
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZone(z)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 8,
                      background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#93c5fd' : 'var(--muted)',
                      border: isActive ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {z === 'all' ? (isAr ? 'كل المناطق' : 'All zones') : z}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map + Right-Screen Compound Units Deck */}
          <div className="map-shell rv">
            <div id="cpd-map">
              <CompoundsMap
                compounds={filtered}
                featured={featured}
                selectedName={selected}
                onSelectAction={handleSelectCompound}
              />
            </div>

            {/* Right Screen: Compound Units & Intelligence Deck */}
            <div className="intel" id="intel-panel">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected ?? '__overview__'}
                  initial={reduce ? false : { opacity: 0, y: motionTokens.distance.sm }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 1 } : { opacity: 0, y: -motionTokens.distance.sm }}
                  transition={{
                    duration: reduce ? 0 : motionTokens.duration.fast,
                    ease: motionTokens.easing.smooth,
                  }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 540 }}
                >
                  {!selected ? (
                    /* Initial Overview State: Guide + Quick Picks */
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div>
                        {/* Header Guide */}
                        <div style={{ textAlign: 'center', padding: '16px 8px 12px' }}>
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              background: 'rgba(223, 173, 58, 0.1)',
                              border: '1.5px solid rgba(223, 173, 58, 0.35)',
                              display: 'grid',
                              placeItems: 'center',
                              margin: '0 auto 12px',
                              boxShadow: '0 0 20px rgba(223, 173, 58, 0.15)',
                            }}
                          >
                            <Compass style={{ width: 26, height: 26, color: '#dfad3a' }} />
                          </div>
                          <h3 style={{ fontFamily: 'var(--display)', fontSize: 19, color: 'var(--ink)', marginBottom: 4 }}>
                            {isAr ? 'استكشف كمبوندات القاهرة الجديدة' : 'Select Compound on Map'}
                          </h3>
                          <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                            {isAr
                              ? 'اضغط على أي كمبوند على الخريطة لعرض الوحدات المتاحة، عروض المالك المباشر، ومتوسط الأسعار.'
                              : 'Click any compound on the masterplan to view verified units, direct owner deals, and price metrics.'}
                          </p>
                        </div>

                        {/* Quick Picks Grid */}
                        <div style={{ marginTop: 12 }}>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              color: 'var(--muted)',
                              display: 'block',
                              marginBottom: 8,
                            }}
                          >
                            {isAr ? 'كمبوندات بارزة سريعة' : 'Flagship Quick Picks'}
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {['Mivida', 'Palm Hills', 'Villette', 'Hyde Park', 'Mountain View', 'Madinaty'].map((cpdName) => {
                              const match = all.find((c) => c.n.toLowerCase().includes(cpdName.toLowerCase()));
                              return (
                                <button
                                  key={cpdName}
                                  type="button"
                                  onClick={() => handleSelectCompound(match?.n || cpdName)}
                                  style={{
                                    padding: '9px 11px',
                                    borderRadius: 10,
                                    background: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                                    border: '1px solid var(--line, rgba(255, 255, 255, 0.1))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    textAlign: 'start',
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                  }}
                                >
                                  <div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block' }}>
                                      {cpdName}
                                    </span>
                                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                      {match?.z || 'New Cairo'}
                                    </span>
                                  </div>
                                  <ChevronRight style={{ width: 13, height: 13, color: '#dfad3a' }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* VIP Concierge Banner */}
                      <div
                        style={{
                          marginTop: 16,
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(223, 173, 58, 0.08), rgba(7, 21, 35, 0.6))',
                          border: '1px dashed rgba(223, 173, 58, 0.35)',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f6d88b', display: 'block', marginBottom: 2 }}>
                          {isAr ? 'تبحث عن وحدة بمواصفات خاصة؟' : 'Custom Portfolio Request'}
                        </span>
                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px' }}>
                          {isAr ? 'تواصل فورًا مع مستشار سيرّا لتلقي الوحدات غير المنشورة.' : 'Speak with our senior desk for off-market inventory.'}
                        </p>
                        <a
                          href={`https://wa.me/201092048333?text=${encodeURIComponent(
                            isAr ? 'مرحبًا سيرّا إستيتس، أبحث عن وحدة بمواصفات محددة في القاهرة الجديدة.' : 'Hello Sierra Estates, I am looking for a specific property inquiry in New Cairo.'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            color: '#dfad3a',
                            textDecoration: 'none',
                          }}
                        >
                          <MessageCircle style={{ width: 13, height: 13 }} />
                          <span>{isAr ? 'استفسار عبر واتساب ←' : 'WhatsApp Concierge Desk →'}</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* Active Selected Compound Deck */
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Compound Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 10,
                          paddingBottom: 10,
                          borderBottom: '1px solid var(--line, rgba(255, 255, 255, 0.1))',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 12,
                              fontWeight: 900,
                              padding: '5px 8px',
                              borderRadius: 8,
                              background: 'rgba(223, 173, 58, 0.18)',
                              border: '1.5px solid #dfad3a',
                              color: '#dfad3a',
                            }}
                          >
                            {compoundFlagCode(selected)}
                          </span>
                          <div>
                            <h3 style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--ink)', margin: '0 0 2px' }}>
                              {selected}
                            </h3>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {selectedCompound?.z || 'New Cairo'} · <b>{compoundUnits.length}</b> {isAr ? 'وحدة متوفرة' : 'verified units'}
                            </span>
                          </div>
                        </div>

                        {/* Deselect / Close Button */}
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          title={isAr ? 'إلغاء التحديد' : 'Clear selection'}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid var(--line)',
                            color: 'var(--muted)',
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      </div>

                      {/* Compound Investment Metrics Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 6,
                          marginBottom: 10,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: 'rgba(15, 23, 42, 0.5)',
                          border: '1px solid var(--line, rgba(255, 255, 255, 0.08))',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 9.5 }}>
                            {isAr ? 'متوسط السعر/م²' : 'Avg Price/m²'}
                          </span>
                          <strong style={{ color: '#5FC9FF', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                            {selectedCompound?.priceM ? `${Math.round(selectedCompound.priceM * 5.5)},000 EGP` : '64,500 EGP'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 9.5 }}>
                            {isAr ? 'عائد الإيجار' : 'Net Yield'}
                          </span>
                          <strong style={{ color: '#10B981', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                            {selectedCompound?.ai ? `${selectedCompound.ai.toFixed(1)}%` : '8.4%'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 9.5 }}>
                            {isAr ? 'النمو السنوي' : 'YoY Growth'}
                          </span>
                          <strong style={{ color: '#FCD34D', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                            {selectedCompound?.g || '+24%'}
                          </strong>
                        </div>
                      </div>

                      {/* Sub-Filters Tabs for Units */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                        {[
                          { id: 'all', label: `${isAr ? 'الكل' : 'All'} (${compoundUnits.length})` },
                          { id: 'owner', label: `🛡️ ${isAr ? 'المالك' : 'Owner'} (${compoundUnits.filter((u) => u.isDirectOwner).length})` },
                          { id: 'resale', label: `${isAr ? 'إعادة بيع' : 'Resale'} (${compoundUnits.filter((u) => u.mode === 'sale').length})` },
                          { id: 'rent', label: `${isAr ? 'إيجار' : 'Rent'} (${compoundUnits.filter((u) => u.mode === 'rent').length})` },
                        ].map((subTab) => (
                          <button
                            key={subTab.id}
                            type="button"
                            onClick={() => setUnitSubTab(subTab.id as any)}
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: unitSubTab === subTab.id ? '#dfad3a' : 'rgba(255, 255, 255, 0.05)',
                              color: unitSubTab === subTab.id ? '#071523' : '#cbd5e1',
                              border: unitSubTab === subTab.id ? '1px solid #dfad3a' : '1px solid rgba(255, 255, 255, 0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {subTab.label}
                          </button>
                        ))}
                      </div>

                      {/* Unphotographed Master Sheet Units Callout */}
                      {getSheetCount(selected) > 0 && (
                        <div
                          style={{
                            marginBottom: 8,
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'rgba(223, 173, 58, 0.08)',
                            border: '1px dashed rgba(223, 173, 58, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                          }}
                        >
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f6d88b' }}>
                            +{getSheetCount(selected)} {isAr ? 'وحدة بجدول الإكسل' : 'Unphotographed Sheet Units'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSheetModalCompound(selected);
                              setSheetModalOpen(true);
                            }}
                            style={{
                              background: '#dfad3a',
                              color: '#071523',
                              border: 0,
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            {isAr ? 'عرض الجدول ←' : 'View Sheet →'}
                          </button>
                        </div>
                      )}

                      {/* Scrollable Luxury Units List */}
                      <div className="intel-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {inventoryLoading ? (
                          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)', fontSize: 12 }}>
                            {isAr ? 'جاري تحميل الوحدات الموثقة…' : 'Loading verified units…'}
                          </div>
                        ) : filteredUnits.length > 0 ? (
                          filteredUnits.map((u) => (
                            <div
                              key={u.code}
                              style={{
                                background: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                                border: '1px solid var(--line, rgba(255, 255, 255, 0.1))',
                                borderRadius: 10,
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {/* Unit Card Header: Code + Direct Owner Pill + Mode Badge */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
                                    #{u.code}
                                  </span>
                                  {u.isDirectOwner && (
                                    <span
                                      style={{
                                        fontSize: 9.5,
                                        fontWeight: 800,
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                        color: '#10b981',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                      }}
                                    >
                                      <ShieldCheck style={{ width: 10, height: 10 }} />
                                      <span>{isAr ? 'مالك مباشر' : 'Direct Owner'}</span>
                                    </span>
                                  )}
                                </div>

                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: 999,
                                    background: u.mode === 'rent' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(223, 173, 58, 0.15)',
                                    border: u.mode === 'rent' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(223, 173, 58, 0.3)',
                                    color: u.mode === 'rent' ? '#93c5fd' : '#f6d88b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {u.mode === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'بيع' : 'Resale')}
                                </span>
                              </div>

                              {/* Unit Specs */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.type}</span>
                                {u.beds > 0 && <span>• {u.beds} {isAr ? 'غرف' : 'Beds'}</span>}
                                {u.bath > 0 && <span>• {u.bath} {isAr ? 'حمام' : 'Baths'}</span>}
                                {u.area > 0 && <span>• {u.area} م²</span>}
                              </div>

                              {/* Price + WhatsApp CTA */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#dfad3a' }}>
                                  {u.mode === 'rent'
                                    ? (u.usd ? `$${u.usd.toLocaleString()}/mo` : `EGP ${u.price ? u.price.toLocaleString() : '—'}/mo`)
                                    : (u.egpM ? `EGP ${u.egpM}M` : `EGP ${u.price ? u.price.toLocaleString() : '—'}`)}
                                </span>

                                <a
                                  href={`https://wa.me/201092048333?text=${encodeURIComponent(
                                    isAr
                                      ? `مرحبًا سيرّا إستيتس، أود حجز أو الاستفسار عن الوحدة #${u.code} (${u.type}، ${u.beds} غرف) في كمبوند ${selected}.`
                                      : `Hello Sierra Estates, I would like to inquire about verified unit #${u.code} (${u.type}, ${u.beds}BR) in ${selected}.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    background: 'linear-gradient(135deg, #c8961a, #dfad3a)',
                                    color: '#071523',
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <MessageCircle style={{ width: 11, height: 11 }} />
                                  <span>{isAr ? 'حجز / استفسار' : 'Inquire'}</span>
                                </a>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '24px 12px', textAlign: 'center', borderRadius: 10, border: '1px dashed var(--line)' }}>
                            <p style={{ color: 'var(--muted)', fontSize: 11.5, margin: '0 0 10px' }}>
                              {isAr ? 'لا توجد وحدات مطابقة للفلاتر المحددة حاليًا.' : 'No units match current filter criteria in this compound.'}
                            </p>
                            <a
                              href={`https://wa.me/201092048333?text=${encodeURIComponent(
                                isAr ? `مرحبًا، أبحث عن وحدة في كمبوند ${selected}.` : `Hello, I am looking for available units in ${selected}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11.5, fontWeight: 700, color: '#dfad3a', textDecoration: 'none' }}
                            >
                              {isAr ? 'اطلب توفر الوحدات عبر واتساب ←' : 'Request units on WhatsApp →'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Compound cards */}
          <Reveal className="sec-head">
            <div>
              <h2>{t('cpdTit')}</h2>
              <p>{t('cpdSub')}</p>
            </div>
          </Reveal>

          <div className="grid-comp">
            {filtered.map((c, i) => {
              const sheetCount = getSheetCount(c.n);
              return (
                <button
                  key={c.n}
                  type="button"
                  className={`comp rv d${(i % 4) + 1} ${selected === c.n ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelected(c.n);
                    document.getElementById('cpd-map')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  style={{ border: 0, padding: 0, cursor: 'pointer', textAlign: 'start', position: 'relative' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgs[c.n] || imgs['Mivida']} alt={c.n} loading="lazy" />
                  <div className="co-scrim" />
                  <div className="co-count">AI {c.ai.toFixed(1)} · {c.g}</div>
                  {sheetCount > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSheetModalCompound(c.n);
                        setSheetModalOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        zIndex: 3,
                        background: 'rgba(7, 21, 35, 0.88)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(223, 173, 58, 0.5)',
                        color: '#f6d88b',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      }}
                      title={isAr ? `عرض ${sheetCount} وحدة مسجلة بالإكسل` : `View ${sheetCount} unphotographed sheet units`}
                    >
                      <span>📊 +{sheetCount}</span>
                      <span style={{ fontSize: 9, opacity: 0.85 }}>{isAr ? 'إكسل' : 'Sheet'}</span>
                    </span>
                  )}
                  <div className="co-body">
                    <h4>{c.n}</h4>
                    <span>{c.z} · EGP {c.priceM}M avg</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Compound Excel Sheet Modal */}
      <CompoundExcelSheetModal
        isOpen={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        compoundName={sheetModalCompound}
        initialUnits={liveUnits}
        isAr={isAr}
      />
    </SiteShell>
  );
}
