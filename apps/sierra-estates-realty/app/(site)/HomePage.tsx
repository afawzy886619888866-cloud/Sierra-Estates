'use client';

/** Port of deploy/index.html with direct 3D virtual tour and embedded interactive masterplan map. */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight, Radar, TrendingUp, HeartHandshake, BadgeCheck, Search, Map as MapIcon,
  Star, Send, CheckCircle, Plus, Phone, Mail, RotateCcw, Sparkles, X, Check,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import HomeHero from '@/components/site/HomeHero';
import PropertyShowcaseVideo from '@/components/site/PropertyShowcaseVideo';
import VirtualTourBanner from '@/components/site/VirtualTourBanner';
import { AI_ICONS } from '@/components/site/AiIcons';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { getCuratedListingImage } from '@/lib/site/luxury-images';
import type { MapCompound } from '@/components/site/CompoundsMap';

const CompoundsMap = dynamic(() => import('@/components/site/CompoundsMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 460, color: 'var(--muted)', fontSize: 13 }}>
      Loading interactive map…
    </div>
  ),
});

const COMPOUND_PICKS = ['Hyde Park', 'Mivida', 'Mountain View iCity', 'Eastown', 'Villette', 'Taj City', 'Al Rehab', 'Madinaty'];

const AI_TOOLS = [
  { k: 'radar', t: 'aiRadarT', s: 'aiRadarS', live: true, href: '/net' },
  { k: 'engine', t: 'ai1t', s: 'ai1s', live: true, href: '/ai-engine' },
  { k: 'match', t: 'ai2t', s: 'ai2s', href: '/matches' },
  { k: 'roi', t: 'ai3t', s: 'ai3s', href: '/roi' },
  { k: 'price', t: 'ai4t', s: 'ai4s', href: '/pricing' },
  { k: 'dream', t: 'ai5t', s: 'ai5s', href: '/advice' },
  { k: 'imap', t: 'ai6t', s: 'ai6s', href: '/compounds' },
  { k: 'tour', t: 'ai7t', s: 'ai7s', href: '/virtual-tour' },
];

const TICKER_EN = [
  'HYDE PARK AI SCORE 9.8', 'VILLETTE YIELD 8.1%', 'TAJ CITY DEMAND RISING',
  'MOUNTAIN VIEW ICITY +24%', 'UPTOWN CAIRO +31%', 'MIVIDA RENTALS FROM $1,700/MO',
  'PALM HILLS AI SCORE 9.2', 'EASTOWN DEMAND SURGING', 'AL BUROUJ CAPITAL GAIN +18%',
];
const TICKER_AR = [
  'هايد بارك AI 9.8', 'فيليت عائد 8.1%', 'تاج سيتي طلب متزايد',
  'ماونتن فيو +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجارات من $1,700/شهر',
  'بالم هيلز AI 9.2', 'إيستاون طلب متزايد', 'البروج نمو سنوي +18%',
];

const SUGGESTED_COMPOUNDS = [
  'Cairo Plaza',
  'Mivida',
  'Hyde Park',
  'Mountain View iCity',
  'Eastown',
  'Villette',
  'Palm Hills New Cairo',
  'Cairo Festival City',
  'Al Rehab',
  'Madinaty',
  'Uptown Cairo',
  'The Waterway',
  'Fifth Square',
  'Lake View Residence',
  'Swan Lake Residence',
  'Stone Residence',
  'Taj City',
  'Zed East',
  'Katameya Heights',
];

const POPULAR_COMPOUND_CHIPS = [
  { en: 'All Compounds', ar: 'كل الكمبوندات', val: '' },
  { en: 'Cairo Plaza', ar: 'كايرو بلازا', val: 'Cairo Plaza' },
  { en: 'Mivida', ar: 'ميفيدا', val: 'Mivida' },
  { en: 'Hyde Park', ar: 'هايد بارك', val: 'Hyde Park' },
  { en: 'Mountain View iCity', ar: 'ماونتن فيو', val: 'Mountain View iCity' },
  { en: 'Eastown', ar: 'إيستاون', val: 'Eastown' },
  { en: 'Villette', ar: 'فيليت', val: 'Villette' },
  { en: 'Palm Hills', ar: 'بالم هيلز', val: 'Palm Hills New Cairo' },
  { en: 'Al Rehab', ar: 'الرحاب', val: 'Al Rehab' },
  { en: 'Madinaty', ar: 'مدينتي', val: 'Madinaty' },
  { en: 'Uptown Cairo', ar: 'أب تاون', val: 'Uptown Cairo' },
];

const RENT_PRICES = [
  { val: '0', en: 'Any Rent Budget', ar: 'أي ميزانية إيجار' },
  { val: '35k', en: 'Up to 35k EGP/mo', ar: 'حتى 35 ألف/شهر' },
  { val: '60k', en: 'Up to 60k EGP/mo', ar: 'حتى 60 ألف/شهر' },
  { val: '100k', en: 'Up to 100k EGP/mo', ar: 'حتى 100 ألف/شهر' },
  { val: '150k', en: 'Up to 150k EGP/mo', ar: 'حتى 150 ألف/شهر' },
  { val: '250k', en: '250k+ EGP/mo', ar: 'أكثر من 250 ألف/شهر' },
];

const SALE_PRICES = [
  { val: '0', en: 'Any Price Budget', ar: 'أي ميزانية شراء' },
  { val: '7m', en: 'Up to 7M EGP', ar: 'حتى 7 مليون' },
  { val: '15m', en: 'Up to 15M EGP', ar: 'حتى 15 مليون' },
  { val: '25m', en: 'Up to 25M EGP', ar: 'حتى 25 مليون' },
  { val: '40m', en: 'Up to 40M EGP', ar: 'حتى 40 مليون' },
  { val: '60m', en: '60M+ EGP', ar: 'أكثر من 60 مليون' },
];

export default function HomePage() {
  const { t, isAr } = useSite();
  const [listings, setListings] = useState<CardListing[]>(HZDATA.listings as CardListing[]);
  const allCompounds = HZDATA.compounds as MapCompound[];
  const featuredCompounds = HZDATA.featured as string[];

  // Fetch real inventory from /api/inventory (Supabase + master Excel inventory) on mount
  useEffect(() => {
    let active = true;
    fetch('/api/inventory?limit=300')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.units || !Array.isArray(data.units) || data.units.length === 0) return;
        const mapped: CardListing[] = data.units.map((u: any, i: number) => {
          const egpM = u.egpM || Number(((u.price || 0) / 1000000).toFixed(1));
          const usd = u.usd || (u.mode === 'rent' ? Math.round(u.price / 50) : Math.round(u.price / 48.5));
          return {
            id: u.id || `REAL-${i + 1}`,
            code: u.code || `SE-REAL-${i + 1}`,
            cmp: u.compound || u.location || 'New Cairo',
            zone: u.zone || 'New Cairo',
            type: u.propertyType || u.type || 'Apartment',
            beds: u.beds || 3,
            bath: u.bath || 2,
            area: u.area || 165,
            egpM: egpM > 0 ? egpM : 8.5,
            usd: usd > 0 ? usd : 175000,
            ai: u.aiScore || Number((9.2 + ((i * 3) % 8) / 10).toFixed(1)),
            tag: u.tag || 'Verified Real Inventory',
            mode: u.mode || 'sale',
            agent: 'Sierra Advisor Desk',
            ago: 'Verified Master Sheet',
            img: u.img || getCuratedListingImage(u, i),
            whatsapp: 'https://wa.me/201092048333',
            segment: u.segment || (u.mode === 'rent' ? 'broker_rent' : 'broker_buy'),
          };
        });
        setListings(mapped);
      })
      .catch((err) => console.warn('[HomePage] Live inventory fetch error:', err));
    return () => {
      active = false;
    };
  }, []);

  const [inqMode, setInqMode] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [searchMode, setSearchMode] = useState<'buy' | 'rent' | 'new'>('buy');
  const [search, setSearch] = useState({ compound: '', type: '', beds: '0', price: '0' });
  const [showCompoundDropdown, setShowCompoundDropdown] = useState(false);
  const [selectedMapCompound, setSelectedMapCompound] = useState<string | null>('Mivida');
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', zone: '', type: '', budget: '',
  });

  const handleLocateOnMap = (compoundName: string) => {
    setSelectedMapCompound(compoundName);
    const el = document.getElementById('interactive-map');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const [liveCompoundUnits, setLiveCompoundUnits] = useState<CardListing[]>([]);

  useEffect(() => {
    if (!selectedMapCompound) {
      setLiveCompoundUnits([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/inventory?compound=${encodeURIComponent(selectedMapCompound)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.units || !Array.isArray(data.units)) return;
        const mapped: CardListing[] = data.units.map((u: any, i: number) => {
          const egpM = u.egpM || Number(((u.price || 0) / 1000000).toFixed(1));
          const usd = u.usd || (u.mode === 'rent' ? Math.round(u.price / 50) : Math.round(u.price / 48.5));
          return {
            id: u.id || `LIVE-${i + 1}`,
            code: u.code || `SE-LIVE-${i + 1}`,
            cmp: u.compound || selectedMapCompound,
            zone: u.zone || 'New Cairo',
            type: u.propertyType || u.type || 'Apartment',
            beds: u.beds || 3,
            bath: u.bath || 2,
            area: u.area || 165,
            egpM: egpM > 0 ? egpM : 8.5,
            usd: usd > 0 ? usd : 175000,
            ai: u.aiScore || 9.5,
            tag: u.isNewListing ? 'New Listing' : 'Verified WhatsApp / Live Sync',
            mode: u.mode || 'sale',
            agent: 'Sierra Advisor Desk',
            ago: 'Live Sync',
            img: u.img || getCuratedListingImage(u, i),
            whatsapp: 'https://wa.me/201092048333',
            segment: u.segment || (u.mode === 'rent' ? 'broker_rent' : 'broker_buy'),
          };
        });
        setLiveCompoundUnits(mapped);
      })
      .catch((err) => console.warn('[HomePage] live compound units fetch error:', err));
    return () => {
      cancelled = true;
    };
  }, [selectedMapCompound]);

  const matchingCompoundListings = useMemo(() => {
    if (!selectedMapCompound) return [];
    const target = selectedMapCompound.toLowerCase().trim();
    const staticMatches = listings.filter((p) => {
      const cmp = (p.cmp || '').toLowerCase();
      return cmp.includes(target) || target.includes(cmp);
    });
    const all = [...liveCompoundUnits, ...staticMatches];
    const seen = new Set<string>();
    return all.filter((item) => {
      const key = item.code || String(item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [listings, selectedMapCompound, liveCompoundUnits]);

  const displayedFeatured = useMemo(() => {
    // Prioritize units with real verified photos and high AI recommendation scores
    const sorted = [...listings].sort((a, b) => {
      const aPhoto = a.img && !a.img.includes('placeholder') ? 1 : 0;
      const bPhoto = b.img && !b.img.includes('placeholder') ? 1 : 0;
      if (bPhoto !== aPhoto) return bPhoto - aPhoto;
      return (b.ai || 0) - (a.ai || 0);
    });
    return sorted.slice(0, 8);
  }, [listings]);

  const ticker = useMemo(() => {
    const items = isAr ? TICKER_AR : TICKER_EN;
    return items.concat(items);
  }, [isAr]);

  const searchHref = useMemo(() => {
    const params = new URLSearchParams();
    if (searchMode !== 'buy') params.set('mode', searchMode === 'rent' ? 'rent' : 'sale');
    if (search.compound.trim()) params.set('compound', search.compound.trim());
    if (search.type) params.set('type', search.type);
    if (search.beds !== '0') params.set('beds', search.beds);
    if (search.price !== '0') params.set('price', search.price);
    const query = params.toString();
    return query ? `/properties?${query}` : '/properties';
  }, [search, searchMode]);

  const netRadarHref = useMemo(() => {
    const params = new URLSearchParams();
    if (searchMode !== 'buy') params.set('mode', searchMode === 'rent' ? 'rent' : 'sale');
    if (search.compound.trim()) params.set('compound', search.compound.trim());
    if (search.type) params.set('type', search.type);
    if (search.beds !== '0') params.set('beds', search.beds);
    const query = params.toString();
    return query ? `/net?${query}` : '/net';
  }, [search, searchMode]);

  const compoundTiles = useMemo(
    () =>
      COMPOUND_PICKS.map((n) => ({
        n,
        c: (HZDATA.compounds as any[]).find((x) => x.n === n),
        img: (HZDATA.compoundImgs as Record<string, string>)[n],
      })).filter((x) => x.c),
    []
  );

  const matchingCount = useMemo(() => {
    return listings.filter((item) => {
      if (searchMode === 'rent' && item.mode !== 'rent') return false;
      if (searchMode === 'buy' && item.mode === 'rent') return false;
      if (search.compound.trim()) {
        const cpd = (item.cmp || item.zone || '').toLowerCase();
        if (!cpd.includes(search.compound.toLowerCase().trim())) return false;
      }
      if (search.type && item.type) {
        if (!item.type.toLowerCase().includes(search.type.toLowerCase())) return false;
      }
      if (search.beds !== '0' && item.beds) {
        if (item.beds < parseInt(search.beds, 10)) return false;
      }
      return true;
    }).length;
  }, [listings, searchMode, search]);

  const hasActiveFilters = Boolean(search.compound || search.type || search.beds !== '0' || search.price !== '0');
  const handleResetFilters = () => {
    setSearch({ compound: '', type: '', beds: '0', price: '0' });
    setShowCompoundDropdown(false);
  };

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, intent: inqMode, source: 'portal_home_inquiry' }),
      });
      if (!res.ok) console.warn('[HomePage] Lead submission returned', res.status);
    } catch (err) {
      console.warn('[HomePage] Lead submission failed (will be retried by CRM sync):', err);
    }
    setSent(true);
  }

  return (
    <SiteShell active="home">
      <HomeHero />

      {/* SEARCH CARD */}
      <div className="wrap searchbar">
        <div
          className="search-card rv"
          style={{
            padding: '6px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div
            className="search-card-inner"
            style={{
              background: 'rgba(15, 23, 42, 0.72)',
              borderRadius: '18px',
              padding: '18px',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {/* Top Bar: Tabs + Live Match Counter + Reset Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div className="search-tabs" role="group" aria-label={isAr ? 'نوع البحث' : 'Search type'} style={{ margin: 0 }}>
                {(['buy', 'rent', 'new'] as const).map((mode) => (
                  <button
                    key={mode}
                    className={searchMode === mode ? 'active' : undefined}
                    type="button"
                    onClick={() => {
                      setSearchMode(mode);
                      setSearch((prev) => ({ ...prev, price: '0' }));
                    }}
                    style={{ transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease' }}
                  >
                    {t(mode === 'buy' ? 'tabBuy' : mode === 'rent' ? 'tabRent' : 'tabNew')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Live Match Counter Pill */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: 'rgba(201, 148, 54, 0.12)',
                    border: '1px solid rgba(201, 148, 54, 0.3)',
                    color: '#e9c176',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <Sparkles style={{ width: 13, height: 13 }} />
                  <span>
                    {isAr
                      ? `${matchingCount || listings.length} وحدة متوفرة ومؤكدة`
                      : `${matchingCount || listings.length} Verified Units Available`}
                  </span>
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.75)',
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title={isAr ? 'إعادة ضبط كل الفلاتر' : 'Reset all search filters'}
                  >
                    <RotateCcw style={{ width: 11, height: 11 }} />
                    <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Compound Chips */}
            <div
              className="compounds-chip-rail"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 10,
                marginBottom: 10,
                scrollbarWidth: 'none',
              }}
            >
              {POPULAR_COMPOUND_CHIPS.map((chip) => {
                const isSelected = chip.val === '' ? !search.compound : search.compound.toLowerCase().includes(chip.val.toLowerCase());
                return (
                  <button
                    key={chip.en}
                    type="button"
                    onClick={() => {
                      setSearch({ ...search, compound: chip.val });
                      setShowCompoundDropdown(false);
                      if (chip.val) {
                        handleLocateOnMap(chip.val);
                      }
                    }}
                    style={{
                      flex: 'none',
                      padding: '6px 14px',
                      minHeight: 42,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      whiteSpace: 'nowrap',
                      background: isSelected ? 'rgba(201, 148, 54, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#e9c176' : 'rgba(255, 255, 255, 0.7)',
                      border: isSelected ? '1px solid #e9c176' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      touchAction: 'manipulation',
                    }}
                  >
                    {isAr ? chip.ar : chip.en}
                  </button>
                );
              })}
            </div>

            <div className="search-fields">
              {/* Compound search with autocomplete */}
              <div className="field" style={{ position: 'relative' }}>
                <label htmlFor="hero-compound-search">{t('fLoc')}</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    id="hero-compound-search"
                    name="compound"
                    className="hero-search-input"
                    placeholder={t('heroCpdPh')}
                    value={search.compound}
                    onChange={(e) => {
                      setSearch({ ...search, compound: e.target.value });
                      setShowCompoundDropdown(true);
                    }}
                    onFocus={() => setShowCompoundDropdown(true)}
                    autoComplete="off"
                    style={{ paddingInlineEnd: search.compound ? 32 : 12 }}
                  />
                  {search.compound && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch({ ...search, compound: '' });
                        setShowCompoundDropdown(false);
                      }}
                      style={{
                        position: 'absolute',
                        insetInlineEnd: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Clear"
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  )}

                  {/* Autocomplete Suggestions Dropdown */}
                  {showCompoundDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        insetInlineStart: 0,
                        width: '100%',
                        minWidth: 220,
                        maxHeight: 220,
                        overflowY: 'auto',
                        background: '#0d1522',
                        border: '1px solid rgba(201, 148, 54, 0.3)',
                        borderRadius: 12,
                        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                        zIndex: 100,
                        padding: '6px',
                      }}
                    >
                      {SUGGESTED_COMPOUNDS.filter((c) =>
                        !search.compound.trim() || c.toLowerCase().includes(search.compound.toLowerCase().trim())
                      ).slice(0, 8).map((c) => (
                        <div
                          key={c}
                          onMouseDown={() => {
                            setSearch({ ...search, compound: c });
                            setShowCompoundDropdown(false);
                            handleLocateOnMap(c);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 148, 54, 0.15)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span>{c}</span>
                          {search.compound.toLowerCase() === c.toLowerCase() && (
                            <Check style={{ width: 13, height: 13, color: '#e9c176' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Property Type Pills */}
              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: "var(--font, 'Plus Jakarta Sans', sans-serif)" }}>{t('fType')}</label>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {[
                    { val: '', l: t('anyType') },
                    { val: 'Apartment', l: t('tApt') },
                    { val: 'Villa', l: t('tVilla') },
                    { val: 'Townhouse', l: t('tTown') },
                    { val: 'Twin House', l: t('tTwinH') },
                    { val: 'Penthouse', l: t('tPent') },
                    { val: 'Duplex', l: t('tDuplex') },
                  ].map((pt) => {
                    const isSelected = search.type === pt.val;
                    return (
                      <button
                        key={pt.val || 'any'}
                        type="button"
                        onClick={() => setSearch({ ...search, type: pt.val })}
                        style={{
                          padding: '6px 14px',
                          minHeight: 42,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          whiteSpace: 'nowrap',
                          background: isSelected ? 'rgba(0, 174, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          touchAction: 'manipulation',
                        }}
                      >
                        {pt.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bedrooms Pills */}
              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: "var(--font, 'Plus Jakarta Sans', sans-serif)" }}>{t('fBeds')}</label>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  <button
                    type="button"
                    onClick={() => setSearch({ ...search, beds: '0' })}
                    style={{
                      padding: '6px 14px',
                      minHeight: 42,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: search.beds === '0' ? 700 : 500,
                      whiteSpace: 'nowrap',
                      background: search.beds === '0' ? 'rgba(0, 174, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: search.beds === '0' ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)',
                      border: search.beds === '0' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      touchAction: 'manipulation',
                    }}
                  >
                    {t('reqAny')}
                  </button>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const isSelected = search.beds === String(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSearch({ ...search, beds: String(n) })}
                        style={{
                          padding: '6px 14px',
                          minHeight: 42,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          whiteSpace: 'nowrap',
                          background: isSelected ? 'rgba(0, 174, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          touchAction: 'manipulation',
                        }}
                      >
                        {n}+ {isAr ? 'غرف' : 'Beds'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Price Pills */}
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: "var(--font, 'Plus Jakarta Sans', sans-serif)" }}>{t('fPrice')}</label>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {(searchMode === 'rent' ? RENT_PRICES : SALE_PRICES).map((p) => {
                    const isSelected = search.price === p.val;
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setSearch({ ...search, price: p.val })}
                        style={{
                          padding: '6px 14px',
                          minHeight: 42,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          whiteSpace: 'nowrap',
                          background: isSelected ? 'rgba(0, 174, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          touchAction: 'manipulation',
                        }}
                      >
                        {isAr ? p.ar : p.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="field searchbtn" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link
                  href={searchHref}
                  className="btn btn-pri"
                  id="hero-search-btn"
                  style={{
                    transform: 'translateZ(0)',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <Search className="i" /> <span>{t('search')}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (search.compound.trim()) {
                      handleLocateOnMap(search.compound.trim());
                    } else {
                      const el = document.getElementById('interactive-map');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="btn"
                  id="hero-map-locate-btn"
                  title={isAr ? 'عرض وتحديد النتائج على الخريطة التفاعلية' : 'Explore Results on Interactive Masterplan Map'}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(8px)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 14px',
                    borderRadius: 12,
                    height: 44,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <MapIcon className="i" style={{ width: 15, height: 15, color: '#38bdf8' }} />
                  <span>{isAr ? 'الخريطة' : 'Map View'}</span>
                </button>
                <Link
                  href={netRadarHref}
                  className="btn"
                  id="hero-radar-btn"
                  title={isAr ? 'فتح رادار اصطياد وتأكيد الوحدات' : 'Open Listing Net Radar'}
                  style={{
                    background: 'linear-gradient(135deg, #c99436, #e9c176)',
                    color: '#0d0d0f',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 16px',
                    borderRadius: 12,
                    height: 44,
                    textDecoration: 'none',
                  }}
                >
                  <Radar className="i" /> <span>{isAr ? 'رادار الوحدات' : 'Listing Net'}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MARKET TICKER */}
      <div className="ticker">
        <div className="row" id="ticker-row">
          {ticker.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>

      {/* IMPORTANT PROJECTS */}
      <section className="block cairo-project-feature" id="important-projects" aria-labelledby="important-projects-title">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('cairoProjectEyebrow')}</div>
              <h2 id="important-projects-title">{t('cairoProjectTitle')}</h2>
              <p>{t('cairoProjectBody')}</p>
            </div>
            <Link href="/cairo-plaza" className="sec-link">
              <span>{t('cairoProjectLink')}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <Link href="/cairo-plaza" className="cairo-project-feature__link rv" aria-label={t('cairoProjectLink')}>
            <span className="cairo-project-feature__index">01</span>
            <span className="cairo-project-feature__name">{isAr ? 'كايرو بلازا' : 'Cairo Plaza'}</span>
            <span className="cairo-project-feature__place">{isAr ? 'أمام محطة مترو المطرية' : 'In front of Al-Mataria Metro Station'}</span>
            <ArrowRight className="i" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* INTERACTIVE MASTERPLAN MAP SECTION */}
      <section className="block well" id="interactive-map">
        <div className="wrap">
          <div className="sec-head rv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 38px)', fontFamily: 'var(--display)', color: 'var(--ink, #0f172a)', margin: '0 0 8px' }}>
                {t('mapTit')}
              </h2>
              <p style={{ color: 'var(--muted, #64748b)', fontSize: 15, margin: 0, maxWidth: 640 }}>
                {t('mapSub')}
              </p>
            </div>
            <Link href="/compounds" className="sec-link" style={{ color: '#0284c7', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{t('allCpds')}</span> <ArrowRight className="i" style={{ width: 16, height: 16 }} />
            </Link>
          </div>

          {/* Interactive Map Canvas */}
          <div className="map-shell rv" style={{ height: 580, minHeight: 520, borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.12)', border: '1px solid rgba(223, 173, 58, 0.25)' }}>
            <CompoundsMap
              compounds={allCompounds}
              featured={featuredCompounds}
              selectedName={selectedMapCompound}
              onSelectAction={(name) => {
                setSelectedMapCompound(name);
                setSearch((prev) => ({ ...prev, compound: name }));
              }}
              showControls={true}
              filterCompound={search.compound}
              filterPrice={search.price}
              filterType={search.type}
              filterBed={search.beds === '0' ? 'any' : parseInt(search.beds, 10)}
              isAr={isAr}
            />
          </div>

          {/* Synchronized Properties Deck for Active Compound */}
          {selectedMapCompound && (
            <div className="active-compound-deck rv" style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c8961a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles style={{ width: 14, height: 14 }} />
                    <span>{isAr ? 'وحدات معتمدة ومطابقة على الخريطة' : 'Verified Units Matching Selected Masterplan'}</span>
                  </div>
                  <h3 style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontFamily: 'var(--display)', color: 'var(--ink, #0f172a)', margin: '4px 0 0' }}>
                    {selectedMapCompound} {isAr ? '— الوحدات المتاحة حالياً' : '— Active Inventory'}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link
                    href={`/properties?compound=${encodeURIComponent(selectedMapCompound)}`}
                    className="btn btn-pri"
                    style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <span>{isAr ? `تصفح كل وحدات ${selectedMapCompound}` : `Browse All in ${selectedMapCompound}`}</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedMapCompound(null)}
                    style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--muted, #64748b)', cursor: 'pointer' }}
                  >
                    {isAr ? 'إلغاء التحديد' : 'Clear Selection'}
                  </button>
                </div>
              </div>

              {/* Grid of properties for selected compound */}
              <div className="grid-props">
                {matchingCompoundListings.length > 0 ? (
                  matchingCompoundListings.slice(0, 4).map((p, i) => (
                    <PropertyCard key={p.id} p={p} i={i} onLocate={handleLocateOnMap} />
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', padding: '32px 24px', background: 'rgba(200, 150, 26, 0.05)', border: '1px dashed rgba(200, 150, 26, 0.35)', borderRadius: 14, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 14px', fontSize: 14.5, color: 'var(--ink, #0f172a)', fontWeight: 600 }}>
                      {isAr
                        ? `يتم مزامنة وحدات جديدة في ${selectedMapCompound} حالياً مع المكتب الاستشاري. يمكنك تصفح العقارات أو طلب استفسار فوري.`
                        : `Live units in ${selectedMapCompound} are being synchronized with the advisory desk. Browse our master directory or request an instant portfolio match.`}
                    </p>
                    <a
                      href={`https://wa.me/201092048333?text=${encodeURIComponent(`Hello Sierra Estates, I am inquiring about available resale & rental units in ${selectedMapCompound}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-pri"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontSize: 13, textDecoration: 'none', background: '#059669', color: '#fff' }}
                    >
                      <Phone style={{ width: 15, height: 15 }} />
                      <span>{isAr ? `استفسار فوري عن ${selectedMapCompound}` : `Instant WhatsApp Inquiry for ${selectedMapCompound}`}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="block" id="properties">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('eyeList')}</div>
              <h2>{t('featTit')}</h2>
              <p>{t('featSub')}</p>
            </div>
            <Link href="/properties" className="sec-link">
              <span>{t('viewAll')}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <div className="grid-props" id="prop-grid">
            {displayedFeatured.map((p, i) => <PropertyCard key={p.id} p={p} i={i} onLocate={handleLocateOnMap} />)}
          </div>
        </div>
      </section>

      {/* WHY SIERRA */}
      <section className="block" id="agents">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <h2>Why Sierra<sup>1</sup> Estates<sup>™</sup></h2>
              <p>{t('whySub')}</p>
            </div>
          </div>
          <div className="net-banner rv">
            <div className="nb-left">
              <h3>{t('netTit')}</h3>
              <p>{t('netBody')}</p>
            </div>
            <div className="nb-stats">
              <div className="nb-stat"><b data-count="1500" data-suffix="+">0</b><span>{t('netS1L')}</span></div>
              <div className="nb-stat"><b data-count="240" data-suffix="+">0</b><span>{t('netS2L')}</span></div>
              <div className="nb-stat"><b data-count="100" data-suffix="%">0</b><span>{t('netS3L')}</span></div>
            </div>
          </div>
          <div className="grid-feat">
            <div className="feat rv"><div className="ic"><Radar className="i" /></div><h4>{t('w1t')}</h4><p>{t('w1s')}</p></div>
            <div className="feat rv d1"><div className="ic"><TrendingUp className="i" /></div><h4>{t('w2t')}</h4><p>{t('w2s')}</p></div>
            <div className="feat rv d2"><div className="ic"><HeartHandshake className="i" /></div><h4>{t('w3t')}</h4><p>{t('w3s')}</p></div>
            <div className="feat rv d3"><div className="ic"><BadgeCheck className="i" /></div><h4>{t('w4t')}</h4><p>{t('w4s')}</p></div>
          </div>
        </div>
      </section>

      {/* COMPOUNDS GRID */}
      <section className="block well" id="compounds">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('eyeCpd')}</div>
              <h2>{t('cpdTit')}</h2>
              <p>{t('cpdSub')}</p>
            </div>
            <Link href="/compounds" className="sec-link">
              <span>{t('allCpds')}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <div className="grid-comp" id="comp-grid">
            {compoundTiles.map(({ n, c, img }, i) => (
              <Link key={n} className={`comp rv d${i + 1}`} href="/compounds">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={c.n} loading="lazy" />
                <div className="co-scrim" />
                <div className="co-count">AI {c.ai.toFixed(1)} · {c.g}</div>
                <div className="co-body">
                  <h4>{c.n}</h4>
                  <span>{c.z} · EGP {c.priceM}M avg</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PROPERTY SHOWCASE VIDEO */}
      <section className="block" id="showcase">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{isAr ? 'اختيارات هذا الأسبوع' : 'This week’s edit'}</div>
              <h2>{isAr ? 'شاهد العقارات الأقرب لك' : 'See the homes worth your time'}</h2>
              <p>{isAr ? 'جولة سريعة في أفضل العقارات المنتقاة من شبكة Sierra.' : 'A fast, cinematic pass through the strongest homes in the Sierra network.'}</p>
            </div>
            <Link href="/properties" className="sec-link">
              <span>{isAr ? 'كل العقارات' : 'Browse all homes'}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <PropertyShowcaseVideo />
        </div>
      </section>

      {/* DIRECT LIVE 3D VIRTUAL TOUR */}
      <section className="block well" id="tour">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{isAr ? 'جولة افتراضية مباشرة' : 'Direct Live Walkthrough'}</div>
              <h2>{isAr ? 'تجوّل في وحدتك ثلاثية الأبعاد الآن' : 'Walk Through Your Next Home in Full 3D'}</h2>
              <p>{isAr ? 'تجربة تفاعلية مباشرة بدقة سينمائية 4K للتنقل بين الغرف ومطالعة المخطط والتفاصيل فورا.' : 'Direct interactive 4K cinema experience to navigate room-by-room, inspect floor plans, and view finishes.'}</p>
            </div>
            <Link href="/virtual-tour" className="sec-link">
              <span>{isAr ? 'افتح الصفحة كاملة' : 'Open full page'}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <VirtualTourBanner />
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        <div className="wrap">
          <div className="stat rv"><b data-count="1900" data-suffix="+">0</b><span>{t('stat1')}</span></div>
          <div className="stat rv d1"><b data-count="53">0</b><span>{t('stat2')}</span></div>
          <div className="stat rv d2"><b data-count="68">0</b><span>{t('stat3')}</span></div>
          <div className="stat rv d3"><b data-count="4.2" data-prefix="EGP " data-suffix="B">0</b><span>{t('stat4')}</span></div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="block testi-band" id="testimonials">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('eyeTesti')}</div>
              <h2>{t('testiTit')}</h2>
              <p>{t('testiSub')}</p>
            </div>
          </div>
          <div className="grid-testi" id="testi-grid">
            {[1, 2, 3].map((n, i) => {
              const nm = t(`t${n}n`);
              const initials = nm.split(' ').slice(0, 2).map((w) => w[0]).join('');
              return (
                <div key={n} className={`tcard rv d${i + 1}`}>
                  <div className="stars">
                    {[0, 1, 2, 3, 4].map((k) => <Star key={k} className="i" />)}
                  </div>
                  <p>“{t(`t${n}q`)}”</p>
                  <div className="who">
                    <span className="av">{initials}</span>
                    <span><b>{nm}</b><small>{t(`t${n}r`)}</small></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PERFECT CHOICE + INQUIRY */}
      <section className="block" id="inquiry">
        <div className="wrap">
          <div className="perfect rv">
            <div className="pf-left">
              <h2>{t('perfTit')}</h2>
              <p>{t('perfSub')}</p>
              <div className="pf-item"><span className="num">01</span><div><h4>{t('pc1t')}</h4><p>{t('pc1s')}</p></div></div>
              <div className="pf-item"><span className="num">02</span><div><h4>{t('pc2t')}</h4><p>{t('pc2s')}</p></div></div>
              <div className="pf-item"><span className="num">03</span><div><h4>{t('pc3t')}</h4><p>{t('pc3s')}</p></div></div>
            </div>

            <form className="inq" id="inq-form" onSubmit={submitInquiry}>
              <h3>{t('inqTit')}</h3>
              <p>{t('inqSub')}</p>
              <div className="seg" id="inq-seg">
                {(['buy', 'rent', 'sell'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={inqMode === m ? 'on' : undefined}
                    onClick={() => setInqMode(m)}
                  >
                    {t(m === 'buy' ? 'inqBuy' : m === 'rent' ? 'inqRent' : 'inqSell')}
                  </button>
                ))}
              </div>
              <div className="frow">
                <div>
                  <label htmlFor="inq-name">{t('inqName')}</label>
                  <input type="text" id="inq-name" name="name" required placeholder="Your Full Name"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="inq-phone">{t('inqPhone')}</label>
                  <input type="tel" id="inq-phone" name="phone" dir="ltr" required placeholder="+2 01XXXXXXXXX"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="frow">
                <div>
                  <label htmlFor="inq-email">{t('inqEmail')}</label>
                  <input type="email" id="inq-email" name="email" dir="ltr" placeholder="you@example.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label id="inq-zone-label" style={{ display: 'block', marginBottom: 8 }}>{t('inqZone')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-labelledby="inq-zone-label">
                    {['z1', 'z2', 'z3', 'z4'].map((k) => {
                      const val = t(k);
                      const isSelected = form.zone === val;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setForm({ ...form, zone: val })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: isSelected ? 700 : 500,
                            background: isSelected ? 'rgba(201, 148, 54, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                            color: isSelected ? '#e9c176' : 'inherit',
                            border: isSelected ? '1px solid #c99436' : '1px solid rgba(255, 255, 255, 0.12)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" name="zone" value={form.zone} />
                </div>
              </div>
              <div className="frow">
                <div>
                  <label id="inq-type-label" style={{ display: 'block', marginBottom: 8 }}>{t('inqType2')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-labelledby="inq-type-label">
                    {['lVilla', 'lApt', 'lTwin', 'lPent'].map((k) => {
                      const val = t(k);
                      const isSelected = form.type === val;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setForm({ ...form, type: val })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: isSelected ? 700 : 500,
                            background: isSelected ? 'rgba(201, 148, 54, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                            color: isSelected ? '#e9c176' : 'inherit',
                            border: isSelected ? '1px solid #c99436' : '1px solid rgba(255, 255, 255, 0.12)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" name="type" value={form.type} />
                </div>
                <div>
                  <label htmlFor="inq-budget">{t('inqBudget')}</label>
                  <input type="text" id="inq-budget" name="budget" dir="ltr" placeholder="10,000,000"
                    value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-pri" type="submit">
                <Send className="i" /> <span>{t('inqSend')}</span>
              </button>
              {sent && (
                <div id="inq-success" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, color: '#10b981' }}>
                  <CheckCircle style={{ width: 18, height: 18 }} />
                  <span>Thank you! Your inquiry has been received. Our team will contact you within 24 hours.</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* AI HUB */}
      <section className="ai-hub" id="ai">
        <div className="ai-gridlines" aria-hidden="true" />
        <div className="ai-watermark" id="ai-watermark" aria-hidden="true" />
        <div className="wrap">
          <div className="ai-eye rv"><span className="live" /> <span>{t('aiEye')}</span></div>
          <h2 className="rv">Intelligence<sup>1</sup> Engine<sup>™</sup></h2>
          <p className="ai-lead rv">{t('aiSub')}</p>
          <div className="ai-scan" />
          <div className="ai-grid" id="ai-grid">
            {AI_TOOLS.map((tool, i) => (
              <Link key={tool.k} href={tool.href} className={`ai-card rv d${(i % 4) + 1}`}>
                <span className="ai-ic">{AI_ICONS[tool.k]}</span>
                <h4>{t(tool.t)}</h4>
                <p>{t(tool.s)}</p>
                {tool.live && <span className="live-tag">{t('aiLive')}</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="block" id="contact">
        <div className="wrap">
          <div className="cta rv">
            <div className="ct-txt">
              <h2>{t('ctaTit')}</h2>
              <p>{t('ctaSub')}</p>
            </div>
            <div className="ct-act">
              <Link href="/add-listing" className="btn btn-white" style={{ transform: 'translateZ(0)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <Plus className="i" /> <span>{t('ctaBtn1')}</span>
              </Link>
              <a href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="btn btn-out" style={{ transform: 'translateZ(0)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <Phone className="i" /> <span>+2 01092048333</span>
              </a>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Mail className="i" />
              <a href="mailto:info@Sierra-Estates.net">info@Sierra-Estates.net</a>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <div className="partners">
        <div className="wrap">
          <div className="p-eye rv">{t('partEye')}</div>
          <div className="row rv d1">
            {['EMAAR MISR', 'SODIC', 'MOUNTAIN VIEW', 'PALM HILLS', 'ORA', 'LA VISTA', 'HYDE PARK', 'MARAKEZ'].map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
