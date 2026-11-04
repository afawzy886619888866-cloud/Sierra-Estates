'use client';

/**
 * Sierra Estates · Masterplan Map (Stitch v2 redesign — presentation layer only)
 *
 * Implements the approved 4-variant Stitch design system
 * (project 2455613122012383700 "New Cairo Real Estate Map"):
 *   theme (Light "Alexandria" / Dark "Nocturnal") × language (EN / AR / Bilingual)
 *   via two independent glass toggles — one page, no reloads.
 *
 * §21 NO-FABRICATION (project law):
 *   EVERY number on screen is computed from the live `inventoryRows` prop
 *   (the page's real /api/inventory data). Missing data renders nothing —
 *   never an invented value. No Stitch demo codes / prices / counts ship.
 *
 * Data contract is read-only: this component never fetches or mutates —
 * it renders what PropertiesPage already filtered (toolbar behavior and
 * the map-filters contracts are untouched upstream).
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Moon, Sun, X, ExternalLink, MessageCircle } from 'lucide-react';

import { CompoundLocation, NEW_CAIRO_COMPOUNDS } from './compounds-data';
import { normalizeCompoundKey, type MapUnitPin } from './LiveMap';

export type MapTheme = 'light' | 'dark';
export type MapLang = 'en' | 'ar' | 'bi';

/** Minimal real-inventory row shape (subset of PropertiesPage's RealListing). */
export interface InventoryRow {
  id: string;
  code: string;
  compound: string;
  type: string;
  area?: number;
  price?: number;
  priceLabel: string;
  mode: 'sale' | 'rent';
  availability?: string;
  img?: string;
  lat?: number;
  lng?: number;
}

export interface MasterplanMapProps {
  units?: MapUnitPin[];
  /** Full filtered live inventory (drives counts, modal rows, HUD metrics). */
  inventoryRows: InventoryRow[];
  initialTheme?: MapTheme;
  initialLang?: MapLang;
  activeUnitId?: string | null;
  flyToCoords?: [number, number] | null;
  flyToZoom?: number;
  onSelectUnit?: (unit: MapUnitPin) => void;
  height?: string;
}

/* ── Design tokens (v2 order, verbatim) ─────────────────────────────── */

const TOKENS = {
  light: {
    pillBg: 'rgba(255,255,255,0.88)',
    pillBorder: 'rgba(185,155,104,0.55)',
    pillText: '#0F172A',
    topAccent: '#1D4ED8',
    altAccent: '#0D9488',
    glass: 'rgba(255,255,255,0.85)',
    glassBorder: 'rgba(195,198,213,0.6)',
    hudText: '#1b1c1d',
    hudMuted: '#434653',
    gold: '#C9A24D',
    tile: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    tileAttr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    wash: 'linear-gradient(rgba(250,249,246,0.10), rgba(246,244,239,0.16))',
  },
  dark: {
    pillBg: 'rgba(16,24,40,0.85)',
    pillBorder: '#2A3B4C',
    pillText: '#FFFFFF',
    topAccent: '#06B6D4',
    altAccent: '#10B981',
    glass: 'rgba(16,24,40,0.85)',
    glassBorder: '#2A3B4C',
    hudText: '#FFFFFF',
    hudMuted: '#8A9BAE',
    gold: '#FFD700',
    tile: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    tileAttr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    wash: 'linear-gradient(rgba(6,11,18,0.18), rgba(2,6,23,0.30))',
  },
} as const;

/** Top-tier compounds (sapphire accent) — v2 order list. */
const TOP_TIER = new Set([
  'mivida', 'villette', 'hyde park', 'palm hills', 'cfc', 'eastown', 'katameya',
  'katameya heights', 'katameya dossier', 'hyde park new cairo',
]);

const NEW_CAIRO_CENTER: [number, number] = [30.0131, 31.4989];
const WHATSAPP_NUMBER = '201092048333'; // real site VIP broker line

const HEADER_COPY: Record<MapLang, string> = {
  en: 'New Cairo City (Fifth Settlement) — Interactive Spatial Masterplan',
  ar: 'مدينة القاهرة الجديدة (التجمع الخامس) — المخطط المكاني التفاعلي',
  bi: 'مدينة القاهرة الجديدة | New Cairo City — Master Registry',
};

const I18N = {
  en: {
    eyebrow: 'SIERRA ESTATES — REGISTRY BENCHMARK', units: 'VERIFIED UNITS',
    index: 'PRICE INDEX', registry: 'LIVE INVENTORY REGISTRY', unitCol: 'UNIT CODE',
    typeCol: 'TYPE', buaCol: 'BUA m²', priceCol: 'PRICE', statusCol: 'STATUS',
    inspect: '360° INSPECTION', broker: 'WHATSAPP VIP BROKER', close: 'Close registry',
    available: 'Available', reserved: 'Reserved', coords: 'Coordinates',
    forRent: '/mo', from: 'From', unitsN: 'UNITS', live: 'LIVE',
  },
  ar: {
    eyebrow: 'سييرا إستيتس — سجل الوحدات المتاحة', units: 'وحدة موثقة',
    index: 'مؤشر الأسعار', registry: 'سجل الوحدات المتاحة', unitCol: 'كود الوحدة',
    typeCol: 'النوع', buaCol: 'م²', priceCol: 'السعر', statusCol: 'الحالة',
    inspect: 'معاينة 360°', broker: 'واتساب وسيط VIP', close: 'إغلاق السجل',
    available: 'متاح', reserved: 'محجوز', coords: 'الإحداثيات',
    forRent: '/شهر', from: 'يبدأ من', unitsN: 'وحدة', live: 'مباشر',
  },
  bi: {
    eyebrow: 'سييرا إستيتس | SIERRA ESTATES — REGISTRY BENCHMARK', units: 'وحدة موثقة | VERIFIED UNITS',
    index: 'مؤشر الأسعار | PRICE INDEX', registry: 'سجل الوحدات | LIVE INVENTORY REGISTRY', unitCol: 'UNIT CODE | كود',
    typeCol: 'TYPE | النوع', buaCol: 'BUA m²', priceCol: 'PRICE | السعر', statusCol: 'STATUS',
    inspect: '360° INSPECTION', broker: 'WHATSAPP VIP BROKER', close: 'Close | إغلاق',
    available: 'Available', reserved: 'Reserved', coords: 'Coordinates',
    forRent: '/mo', from: 'From', unitsN: 'UNITS', live: 'LIVE',
  },
};

/* ── Zoom watcher (drives proximity magnification + coords HUD) ─────── */

function MapTelemetry({ onZoom, onCenter }: { onZoom: (z: number) => void; onCenter: (c: [number, number]) => void }) {
  const map = useMap();
  useEffect(() => {
    const sync = () => {
      onZoom(map.getZoom());
      const c = map.getCenter();
      onCenter([c.lat, c.lng]);
    };
    sync();
    map.on('zoomend', sync);
    map.on('moveend', sync);
    return () => {
      map.off('zoomend', sync);
      map.off('moveend', sync);
    };
  }, [map, onZoom, onCenter]);
  return null;
}

function FlyToController({ coords, zoom }: { coords: [number, number] | null; zoom: number }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (!coords) return;
    const key = `${coords[0]},${coords[1]}`;
    if (prev.current === key) return;
    prev.current = key;
    map.flyTo(coords, Math.max(zoom, map.getZoom()), { duration: 1.1 });
  }, [coords, zoom, map]);
  return null;
}

/* ── Compound pill icon — THE masterplan restyle ────────────────────── */
/**
 * Proximity magnification (owner's explicit interaction, MUST ship):
 *   z < 12        → 11px pill, count chip on top-tier only (declutter)
 *   12 ≤ z < 14   → 13px pill, all compounds fully labelled
 *   z ≥ 14        → focused (selected/hover) pill scales to 16px bold with
 *                   the golden focus aura — the SODIC VILLETTE treatment.
 */
function createMasterplanPill(
  compound: CompoundLocation,
  opts: {
    zoom: number;
    selected: boolean;
    count: number;
    lang: MapLang;
    theme: MapTheme;
    tier: 'top' | 'alt';
  }
) {
  const { zoom, selected, count, lang, theme, tier } = opts;
  const tk = TOKENS[theme];
  const isBi = lang === 'bi';

  const name =
    lang === 'ar'
      ? compound.nameAr || compound.nameEn || compound.code
      : isBi
      ? `${compound.nameAr || compound.nameEn} | ${compound.nameEn || compound.code}`
      : compound.nameEn || compound.code;

  const focused = selected && zoom >= 14;
  const baseFont = zoom < 12 ? 11 : 12.5;
  const font = focused ? 16 : baseFont;
  const accent = tier === 'top' ? tk.topAccent : tk.altAccent;

  const focusAura = focused
    ? `box-shadow: 0 0 0 1.5px ${tk.gold}, 0 0 26px ${theme === 'dark' ? 'rgba(255,215,0,0.45)' : 'rgba(201,162,77,0.5)'}, 0 10px 30px rgba(0,0,0,${theme === 'dark' ? '0.6' : '0.18'});`
    : `box-shadow: 0 6px 18px rgba(0,0,0,${theme === 'dark' ? '0.5' : '0.14'});`;

  const chipVisible = zoom < 12 ? tier === 'top' && count > 0 : count > 0;

  return L.divIcon({
    className: 'se-masterplan-pill',
    html: `
      <div style="
        position:absolute;left:0;top:0;
        transform:translate(-50%,-50%) scale(${focused ? 1.05 : 1});
        display:inline-flex;align-items:center;gap:7px;
        padding:${focused ? '8px 16px' : '7px 13px'};
        border-radius:9999px;
        background:${tk.pillBg};
        ${theme === 'dark' ? `border:1px solid ${selected ? tk.gold : tk.pillBorder};` : `border:1px solid ${tk.pillBorder};`}
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        color:${selected ? accent : tk.pillText};
        font-family:${lang === 'ar' ? "var(--font-cairo,'Cairo')" : isBi ? "var(--font-cairo,'Cairo')" : "var(--font-inter,'Inter')"},system-ui,sans-serif;
        font-size:${font}px;font-weight:${focused ? 800 : 700};
        letter-spacing:${lang === 'en' ? '0.02em' : '0'};
        white-space:nowrap;cursor:pointer;
        transition:transform .28s cubic-bezier(.16,1,.3,1), box-shadow .28s ease, font-size .2s ease;
        ${focusAura}
      ">
        <span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${accent};box-shadow:0 0 8px ${accent};"></span>
        <span dir="${lang === 'en' ? 'ltr' : 'auto'}">${name}</span>
        ${chipVisible ? `<span style="
          background:${theme === 'dark' ? 'rgba(6,182,212,0.16)' : 'rgba(29,78,216,0.10)'};
          color:${accent};
          font-family:var(--font-mono,ui-monospace),monospace;
          font-size:${Math.max(font - 2, 9)}px;font-weight:700;
          padding:2px 7px;border-radius:9999px;
        ">${count.toLocaleString()}</span>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function MasterplanMap({
  units = [],
  inventoryRows,
  initialTheme = 'light',
  initialLang = 'en',
  activeUnitId = null,
  flyToCoords = null,
  flyToZoom = 14,
  onSelectUnit,
  height = '100%',
}: MasterplanMapProps) {
  const [theme, setTheme] = useState<MapTheme>(initialTheme);
  const [lang, setLang] = useState<MapLang>(initialLang);
  const [zoom, setZoom] = useState(12);
  const [center, setCenter] = useState<[number, number]>(NEW_CAIRO_CENTER);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const tk = TOKENS[theme];
  const isRtlText = lang !== 'en';
  const t = I18N[lang];

  /* Restore persisted variant prefs (§ variant system: persisted toggles). */
  useEffect(() => {
    try {
      const th = window.localStorage.getItem('se-map-theme');
      const lg = window.localStorage.getItem('se-map-lang');
      if (th === 'light' || th === 'dark') setTheme(th);
      if (lg === 'en' || lg === 'ar' || lg === 'bi') setLang(lg);
    } catch { /* storage unavailable — defaults stand */ }
    setPersisted(true);
  }, []);

  useEffect(() => {
    if (persisted) {
      try {
        window.localStorage.setItem('se-map-theme', theme);
        window.localStorage.setItem('se-map-lang', lang);
      } catch { /* ignore */ }
    }
  }, [theme, lang, persisted]);

  /* ── §21 live computations — every number from inventoryRows ── */

  const liveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of inventoryRows) {
      const key = normalizeCompoundKey(row.compound || '');
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [inventoryRows]);

  const metrics = useMemo(() => {
    const verified = inventoryRows.length;
    let priceSum = 0;
    let priceN = 0;
    for (const r of inventoryRows) {
      // Price index: mean(price÷sqm) over priced SALE units with area>0.
      if (r.mode === 'sale' && r.price && r.price > 0 && r.area && r.area > 0) {
        priceSum += r.price / r.area;
        priceN += 1;
      }
    }
    const priceIndex = priceN > 0 ? Math.round(priceSum / priceN) : null;
    return { verified, priceIndex };
  }, [inventoryRows]);

  const modalRows = useMemo(() => {
    if (!selectedCode) return [];
    const compound = NEW_CAIRO_COMPOUNDS.find(
      (c) => c.code.toLowerCase() === selectedCode.toLowerCase()
    );
    if (!compound) return [];
    const key = normalizeCompoundKey(compound.nameEn || compound.code);
    const arKey = normalizeCompoundKey(compound.nameAr || '');
    return inventoryRows.filter((r) => {
      const rk = normalizeCompoundKey(r.compound || '');
      return rk === key || (arKey && rk === arKey);
    });
  }, [selectedCode, inventoryRows]);

  const modalHasStatus = useMemo(
    () => modalRows.some((r) => r.availability),
    [modalRows]
  );

  const selectedCompound = useMemo(
    () =>
      NEW_CAIRO_COMPOUNDS.find(
        (c) => c.code.toLowerCase() === (selectedCode || '').toLowerCase()
      ) || null,
    [selectedCode]
  );

  /* Render only compounds with live inventory (§21: no invented counts;
   * zero-count compounds are omitted, not zero-chipped). */
  const visibleCompounds = useMemo(
    () => NEW_CAIRO_COMPOUNDS.filter((c) => {
      const key = normalizeCompoundKey(c.nameEn || c.code);
      const arKey = normalizeCompoundKey(c.nameAr || '');
      return (liveCounts[key] || 0) > 0 || (arKey && (liveCounts[arKey] || 0) > 0);
    }),
    [liveCounts]
  );

  const compoundCount = useCallback(
    (c: CompoundLocation) => {
      const key = normalizeCompoundKey(c.nameEn || c.code);
      const arKey = normalizeCompoundKey(c.nameAr || '');
      return (liveCounts[key] || 0) + (arKey ? liveCounts[arKey] || 0 : 0);
    },
    [liveCounts]
  );

  /* ── Interactions ── */

  /* Pin lookup (id/code → MapUnitPin) so modal row clicks sync the page's
   * activeUnit exactly like the legacy drawer did. */
  const pinByKey = useMemo(() => {
    const m = new Map<string, MapUnitPin>();
    for (const u of units) {
      m.set(u.id, u);
      if (u.code) m.set(u.code, u);
    }
    return m;
  }, [units]);

  const handleRowClick = useCallback(
    (row: InventoryRow, href: string) => {
      const pin = pinByKey.get(row.id) || (row.code ? pinByKey.get(row.code) : undefined);
      if (pin) onSelectUnit?.(pin);
      window.location.href = href;
    },
    [pinByKey, onSelectUnit]
  );

  const openRegistry = useCallback((code: string) => {
    setSelectedCode(code);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  /* ESC to close + focus trap (a11y contract). */
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  /* ── Derived label helpers ── */

  const compoundLabel = useCallback(
    (c: CompoundLocation) =>
      lang === 'ar'
        ? c.nameAr || c.nameEn || c.code
        : lang === 'bi'
        ? `${c.nameAr || c.nameEn} | ${c.nameEn || c.code}`
        : c.nameEn || c.code,
    [lang]
  );

  const fmtPriceIndex =
    metrics.priceIndex != null
      ? `${Math.round(metrics.priceIndex / 1000).toLocaleString()}K EGP/m²`
      : null;

  /* ── Render ── */

  return (
    <div
      className="se-masterplan-root"
      style={{ position: 'relative', width: '100%', height, overflow: 'hidden', background: theme === 'dark' ? '#060B12' : '#FAF9F6' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .se-masterplan-root .leaflet-container{background:${theme === 'dark' ? '#060B12' : '#FAF9F6'};font-family:var(--font-inter,'Inter'),system-ui,sans-serif;}
        .se-masterplan-pill{background:transparent!important;border:none!important;}
        .se-masterplan-pill:hover{filter:brightness(1.04);}
        @media (prefers-reduced-motion: reduce){
          .se-masterplan-root *{animation:none!important;transition:none!important;}
        }
      `}} />

      <MapContainer
        center={NEW_CAIRO_CENTER}
        zoom={12}
        minZoom={10}
        maxZoom={18}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        attributionControl
        zoomControl={false}
      >
        <TileLayer url={tk.tile} attribution={tk.tileAttr} subdomains="abcd" maxZoom={19} />
        {/* Ivory / void gradient wash over tiles (never hand-painted). */}
        <div
          className="leaflet-pane"
          style={{ position: 'absolute', inset: 0, background: tk.wash, pointerEvents: 'none', zIndex: 390 }}
        />
        <MapTelemetry onZoom={setZoom} onCenter={setCenter} />
        <FlyToController coords={flyToCoords} zoom={flyToZoom} />

        {visibleCompounds.map((c) => {
          const count = compoundCount(c);
          const tier: 'top' | 'alt' = TOP_TIER.has((c.nameEn || '').toLowerCase()) ? 'top' : 'alt';
          const isSelected = selectedCode?.toLowerCase() === c.code.toLowerCase();
          return (
            <Marker
              key={`cmp-${c.code}`}
              position={[c.lat, c.lng]}
              icon={createMasterplanPill(c, { zoom, selected: isSelected, count, lang, theme, tier })}
              eventHandlers={{
                click: () => openRegistry(c.code),
                keypress: (e) => {
                  // Leaflet wraps the DOM event — unwrap to read the real key.
                  const orig = (e as { originalEvent?: { key?: string } }).originalEvent;
                  if (orig && orig.key === 'Enter') openRegistry(c.code);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={1} className="se-masterplan-tip">
                <div dir={isRtlText ? 'rtl' : 'ltr'} style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.hudMuted, fontFamily: 'var(--font-mono),monospace' }}>
                    {t.unitsN} · {count.toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "var(--font-playfair,'Playfair Display'),serif", fontWeight: 700, fontSize: 14, color: tk.hudText, margin: '3px 0 2px' }}>
                    {compoundLabel(c)}
                  </div>
                  <div style={{ fontSize: 10.5, color: tk.hudMuted }}>{t.registry}</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── 1. Header pill (top-center) + variant toggles (top-right) ── */}
      <div
        style={{
          position: 'absolute', top: '4.5%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10, maxWidth: '92vw', flexWrap: 'wrap', justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: tk.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`,
            borderRadius: 999, padding: '10px 22px',
            color: tk.hudText, fontFamily: lang === 'en' ? "var(--font-inter,'Inter'),sans-serif" : "var(--font-cairo,'Cairo'),sans-serif",
            fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          dir={isRtlText ? 'rtl' : 'ltr'}
        >
          {HEADER_COPY[lang]}
        </div>
      </div>

      <div
        style={{
          position: 'absolute', top: 14, right: 14, zIndex: 1000,
          display: 'flex', gap: 8, alignItems: 'center',
          background: tk.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`,
          borderRadius: 999, padding: '5px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}
      >
        {/* Theme toggle */}
        <button
          type="button" aria-label="Light theme" onClick={() => setTheme('light')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', background: theme === 'light' ? tk.topAccent : 'transparent', color: theme === 'light' ? '#fff' : tk.hudMuted }}
        >
          <Sun size={14} />
        </button>
        <button
          type="button" aria-label="Dark theme" onClick={() => setTheme('dark')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', background: theme === 'dark' ? tk.topAccent : 'transparent', color: theme === 'dark' ? '#fff' : tk.hudMuted }}
        >
          <Moon size={14} />
        </button>
        <div style={{ width: 1, height: 18, background: tk.glassBorder }} />
        {/* Language toggle */}
        {(['en', 'ar', 'bi'] as MapLang[]).map((l) => (
          <button
            key={l} type="button" onClick={() => setLang(l)}
            aria-pressed={lang === l}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 999, padding: '5px 11px',
              fontFamily: l === 'en' ? "var(--font-inter,'Inter'),sans-serif" : "var(--font-cairo,'Cairo'),sans-serif",
              fontSize: 11, fontWeight: 700,
              background: lang === l ? tk.topAccent : 'transparent',
              color: lang === l ? '#fff' : tk.hudMuted,
            }}
          >
            {l === 'en' ? 'EN' : l === 'ar' ? 'ع' : 'AR|EN'}
          </button>
        ))}
      </div>

      {/* ── 5. Registry Benchmark HUD (right-center, hidden while modal open) ── */}
      {!modalOpen && (
        <div
          dir={isRtlText ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            zIndex: 900, width: 218,
            background: tk.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`,
            borderRadius: 14, padding: '16px 16px 14px', boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
            fontFamily: "var(--font-inter,'Inter'),system-ui,sans-serif",
          }}
        >
          <div style={{ fontSize: 8.5, letterSpacing: '0.16em', color: tk.gold, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
            {t.eyebrow}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: tk.hudMuted, textTransform: 'uppercase' }}>{t.units}</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: tk.hudText, fontFamily: 'var(--font-mono),monospace', lineHeight: 1.25 }}>
                {metrics.verified.toLocaleString()}
              </div>
            </div>
            {/* §21: price index row only when computable — omitted otherwise. */}
            {fmtPriceIndex && (
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', color: tk.hudMuted, textTransform: 'uppercase' }}>{t.index}</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: tk.hudText, fontFamily: 'var(--font-mono),monospace', lineHeight: 1.25 }}>
                  {fmtPriceIndex}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cartographic chrome: compass + coordinates (bottom-left) ── */}
      <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
          <circle cx="17" cy="17" r="15" fill="none" stroke={tk.gold} strokeWidth="1" opacity="0.65" />
          <path d="M17 4 L20 17 L17 30 L14 17 Z" fill={tk.gold} opacity="0.9" />
          <path d="M4 17 L17 14 L30 17 L17 20 Z" fill={tk.gold} opacity="0.45" />
          <text x="17" y="9.5" textAnchor="middle" fontSize="6" fill={tk.hudMuted} fontFamily="var(--font-mono),monospace">N</text>
        </svg>
        <div
          style={{
            background: tk.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`,
            borderRadius: 8, padding: '4px 10px',
            fontFamily: "var(--font-inter,'Inter'),system-ui,sans-serif",
          }}
        >
          {`Lat ${center[0].toFixed(4)}° N · Lon ${center[1].toFixed(4)}° E`}
        </div>
      </div>

      {/* Logo mark (bottom-right, repo asset — never hotlinked) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/logo-mark.png"
        alt="Sierra Estates"
        style={{ position: 'absolute', right: 14, bottom: 12, zIndex: 900, width: 30, height: 30, borderRadius: 8, opacity: 0.9 }}
      />

      {/* ── 4. Inventory Registry Modal (replaces v1 right drawer) ── */}
      {modalOpen && selectedCompound && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${compoundLabel(selectedCompound)} — ${t.registry}`}
          ref={modalRef}
          dir={isRtlText ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute', zIndex: 1100,
            /* desktop: floating centered-right; mobile: bottom sheet */
            top: '50%', right: 18, transform: 'translateY(-50%)',
            width: 'min(560px, calc(100vw - 36px))', maxHeight: '72%',
            background: theme === 'dark' ? 'rgba(16,24,40,0.92)' : 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`,
            borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: lang === 'en' ? "var(--font-inter,'Inter'),sans-serif" : "var(--font-cairo,'Cairo'),sans-serif",
            color: tk.hudText,
          }}
        >
          {/* Modal header */}
          <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.hudMuted, fontFamily: 'var(--font-mono),monospace' }}>
                    {modalRows.length.toLocaleString()} {t.unitsN}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: theme === 'dark' ? '#00C853' : '#0D9488' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: theme === 'dark' ? '#00C853' : '#0D9488', animation: 'se-pulse 1.6s ease-in-out infinite' }} />
                    {t.live}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-playfair,'Playfair Display'),serif", fontSize: 19, fontWeight: 800, color: tk.hudText, lineHeight: 1.2 }}>
                  {compoundLabel(selectedCompound)}
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.hudMuted, marginTop: 2 }}>
                  {t.registry}
                </div>
              </div>
              <button
                type="button" onClick={closeModal} aria-label={t.close}
                style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer', background: 'transparent', color: tk.hudMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Spreadsheet — real rows only (§21); PLOT/STATUS columns dropped
              when the live payload has no such field. */}
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {modalRows.length === 0 ? (
              <div style={{ padding: '28px 18px', textAlign: 'center', color: tk.hudMuted, fontSize: 12.5 }}>
                {lang === 'ar' ? 'لا توجد وحدات مطابقة ضمن الفلاتر الحالية' : 'No units match the current filters.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: theme === 'dark' ? 'rgba(10,16,28,0.96)' : 'rgba(246,244,239,0.96)', backdropFilter: 'blur(8px)' }}>
                  <tr>
                    {[
                      { k: 'code', label: t.unitCol },
                      { k: 'type', label: t.typeCol },
                      { k: 'bua', label: t.buaCol },
                      { k: 'price', label: t.priceCol },
                      ...(modalHasStatus ? [{ k: 'status', label: t.statusCol }] : []),
                    ].map((col) => (
                      <th key={col.k} style={{ textAlign: isRtlText ? 'right' : 'left', padding: '9px 12px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.hudMuted, fontWeight: 700, borderBottom: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`, whiteSpace: 'nowrap' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalRows.slice(0, 400).map((r) => {
                    const href = `/property/${r.code || r.id}`;
                    const isRent = r.mode === 'rent';
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(42,59,76,0.5)' : 'rgba(195,198,213,0.35)'}` }}>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono),monospace', fontSize: 11, fontWeight: 600, color: activeUnitId === r.id || activeUnitId === r.code ? tk.gold : tk.hudText, whiteSpace: 'nowrap' }}>
                          <a href={href} style={{ color: 'inherit', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); handleRowClick(r, href); }}>
                            {r.code || '—'}
                          </a>
                        </td>
                        <td style={{ padding: '9px 12px', color: tk.hudMuted, whiteSpace: 'nowrap' }}>{r.type || '—'}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono),monospace', color: tk.hudMuted, whiteSpace: 'nowrap' }}>
                          {r.area && r.area > 0 ? r.area.toLocaleString() : ''}
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono),monospace', fontWeight: 700, color: isRent ? (theme === 'dark' ? '#10B981' : '#0F766E') : tk.hudText, whiteSpace: 'nowrap' }}>
                          {r.priceLabel || ''}
                        </td>
                        {modalHasStatus && (
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            {r.availability ? (
                              <span style={{
                                display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 9.5, fontWeight: 700,
                                background: /avail/i.test(r.availability) ? (theme === 'dark' ? '#00C853' : '#0D9488') : '#FFAB00',
                                color: /avail/i.test(r.availability) ? '#fff' : '#000',
                              }}>
                                {/avail/i.test(r.availability) ? t.available : t.reserved}
                              </span>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {modalRows.length > 400 && (
                    <tr>
                      <td colSpan={modalHasStatus ? 5 : 4} style={{ padding: '10px 12px', fontSize: 10.5, color: tk.hudMuted, textAlign: 'center' }}>
                        {lang === 'ar'
                          ? `+ ${modalRows.length - 400} وحدة إضافية — قلّص الفلاتر لعرض الكل`
                          : `+ ${(modalRows.length - 400).toLocaleString()} more — narrow the filters to see all`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer CTAs — one primary; WhatsApp uses the real site number.
           * §21: the ghost "360°" CTA links only to a REAL listing detail page
           * (never an empty fake viewer) and is omitted when no rows exist. */}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${theme === 'dark' ? tk.pillBorder : tk.glassBorder}`, display: 'flex', gap: 10, alignItems: 'center' }}>
            {modalRows.length > 0 && (() => {
              const first = modalRows[0];
              const firstHref = `/property/${first.code || first.id}`;
              return (
                <a
                  href={firstHref}
                  onClick={(e) => { e.preventDefault(); handleRowClick(first, firstHref); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 12,
                    border: `1.5px solid ${tk.gold}`, color: tk.gold, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={13} /> {t.inspect}
                </a>
              );
            })()}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `Sierra Estates — ${compoundLabel(selectedCompound)} — ${lang === 'ar' ? 'استفسار عن الوحدات المتاحة' : 'inquiry about available units'}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 12,
                background: `linear-gradient(135deg, ${tk.topAccent}, ${theme === 'dark' ? '#0891B2' : '#3366CC'})`,
                color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                textDecoration: 'none', whiteSpace: 'nowrap', flex: 1, justifyContent: 'center',
              }}
            >
              <MessageCircle size={13} /> {t.broker}
            </a>
          </div>
        </div>
      )}

      {/* Pulse keyframes for the live dot */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes se-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82)}}
      `}} />
    </div>
  );
}
