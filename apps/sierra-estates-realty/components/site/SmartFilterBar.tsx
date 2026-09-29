'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SmartFilterBar — compact chip-dropdown search bar (PropertyFinder/Bayut
 *  style) for the Sierra Estates client site.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Chips: Purpose (Resale/Rent) · Compound or Area (searchable, grouped by
 *  zone, popular section) · Rooms (N+) · Budget (presets aligned with
 *  /properties + /net) · Unit Type · Condition. One panel open at a time,
 *  outside-click + Escape to close, live result count + reset supported.
 *
 *  Design language matches the site: navy glass surfaces, champagne-gold
 *  accents (#dfad3a / #e9c176), Plus Jakarta Sans via CSS vars.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BedDouble,
  Building2,
  Check,
  ChevronDown,
  MapPin,
  Paintbrush,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import {
  CONDITION_OPTIONS,
  ROOM_OPTIONS,
  RENT_BUDGET_LADDER,
  SALE_BUDGET_LADDER,
  UNIT_TYPE_OPTIONS,
  hasSmartFilterValue,
  type BudgetOption,
  type SmartFilterValue,
} from '@/lib/site/smart-search';

export interface SmartCompoundOption {
  name: string;
  zone?: string;
  popular?: boolean;
}

export interface SmartFilterBarProps {
  value: SmartFilterValue;
  onChange: (next: SmartFilterValue) => void;
  /** Compound + area options for the location dropdown. */
  compounds?: SmartCompoundOption[];
  /** Hide the purpose segmented chip (e.g. hero already has mode tabs). */
  showPurpose?: boolean;
  /** Hide the condition chip (e.g. compound-level maps). */
  showCondition?: boolean;
  /** Override the purpose-driven budget ladder (e.g. compound price tiers). */
  budgetOptions?: BudgetOption[];
  /** Align dropdown panels to the inline end (for right-anchored cards). */
  panelAlign?: 'start' | 'end';
  /** Show the live result-count pill inside the bar. */
  resultCount?: number | null;
  /** Live per-condition unit counts (evidence-based). When provided, options
   *  show their count and zero-count options render disabled — no dead ends. */
  conditionCounts?: Record<string, number>;
  /** Render a reset chip when any facet is active. */
  onReset?: () => void;
  /** Tighter paddings for embedded map panels. */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  idPrefix?: string;
}

type ChipKey = 'purpose' | 'compound' | 'rooms' | 'budget' | 'type' | 'condition' | null;

const GLASS_BG = 'rgba(7, 21, 35, 0.97)';
const GOLD = '#dfad3a';
const GOLD_SOFT = 'rgba(223, 173, 58, 0.16)';

export default function SmartFilterBar({
  value,
  onChange,
  compounds = [],
  showPurpose = true,
  showCondition = true,
  budgetOptions,
  panelAlign = 'start',
  resultCount = null,
  conditionCounts,
  onReset,
  compact = false,
  className,
  style,
  idPrefix = 'sfb',
}: SmartFilterBarProps) {
  const { isAr } = useSite();
  const [openChip, setOpenChip] = useState<ChipKey>(null);
  const [cpdQuery, setCpdQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const ladder: BudgetOption[] = budgetOptions || (value.purpose === 'rent' ? RENT_BUDGET_LADDER : SALE_BUDGET_LADDER);

  const toggleChip = useCallback((key: ChipKey) => {
    setOpenChip((prev) => {
      if (prev === key) return null;
      if (key === 'compound') setCpdQuery('');
      return key;
    });
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!openChip) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenChip(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenChip(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openChip]);

  const patch = useCallback(
    (p: Partial<SmartFilterValue>) => onChange({ ...value, ...p }),
    [onChange, value]
  );

  const anyActive = hasSmartFilterValue(value);

  /* ── Dropdown option derivations ─────────────────────────────────────── */

  const filteredCompounds = useMemo(() => {
    const q = cpdQuery.trim().toLowerCase();
    if (!q) return compounds;
    return compounds.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.zone || '').toLowerCase().includes(q)
    );
  }, [compounds, cpdQuery]);

  const popularCompounds = useMemo(
    () => compounds.filter((c) => c.popular).slice(0, 8),
    [compounds]
  );

  const groupedByZone = useMemo(() => {
    const groups = new Map<string, SmartCompoundOption[]>();
    for (const c of filteredCompounds) {
      const z = c.zone || 'Other';
      const arr = groups.get(z);
      if (arr) arr.push(c);
      else groups.set(z, [c]);
    }
    return Array.from(groups.entries());
  }, [filteredCompounds]);

  const activeBudget = ladder.find((o) => o.val === value.budget);
  const activeType = UNIT_TYPE_OPTIONS.find((o) => o.val === value.unitType);
  const activeCondition = CONDITION_OPTIONS.find((o) => o.val === value.condition);
  const activeCompound = compounds.find(
    (c) => c.name.toLowerCase() === value.compound.trim().toLowerCase()
  );

  /* ── Chip visuals ────────────────────────────────────────────────────── */

  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: compact ? 34 : 40,
    padding: compact ? '0 10px' : '0 14px',
    borderRadius: 999,
    fontSize: compact ? 11.5 : 12.5,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    touchAction: 'manipulation',
    fontFamily: "var(--font, 'Plus Jakarta Sans', sans-serif)",
  };
  const chipIdle: React.CSSProperties = {
    ...chipBase,
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  };
  const chipActive: React.CSSProperties = {
    ...chipBase,
    background: GOLD_SOFT,
    color: '#e9c176',
    border: `1px solid ${GOLD}`,
    fontWeight: 700,
  };
  const chipOpen: React.CSSProperties = {
    ...chipBase,
    background: 'rgba(223, 173, 58, 0.24)',
    color: '#e9c176',
    border: `1px solid ${GOLD}`,
    fontWeight: 700,
  };

  const panelStyle = (width: number): React.CSSProperties => ({
    position: 'absolute',
    top: 'calc(100% + 8px)',
    ...(panelAlign === 'end' ? { insetInlineEnd: 0 } : { insetInlineStart: 0 }),
    width,
    maxWidth: 'min(320px, calc(100vw - 40px))',
    background: GLASS_BG,
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(223, 173, 58, 0.32)',
    borderRadius: 14,
    boxShadow: '0 24px 48px -8px rgba(0, 0, 0, 0.55)',
    zIndex: 1200,
    padding: 10,
    color: '#ffffff',
    fontFamily: "var(--font, 'Plus Jakarta Sans', sans-serif)",
  });

  const panelLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 9.5,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#94a3b8',
    margin: '2px 2px 8px',
  };

  const optionRow = (isActive: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '7px 10px',
    borderRadius: 9,
    border: isActive ? `1px solid ${GOLD}` : '1px solid transparent',
    background: isActive ? GOLD_SOFT : 'transparent',
    color: isActive ? '#e9c176' : 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: isActive ? 700 : 500,
    cursor: 'pointer',
    textAlign: 'start',
    transition: 'background 0.14s ease',
  });

  const roomBtn = (isActive: boolean): React.CSSProperties => ({
    padding: '7px 0',
    borderRadius: 9,
    border: isActive ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.12)',
    background: isActive ? GOLD_SOFT : 'rgba(255,255,255,0.04)',
    color: isActive ? '#e9c176' : 'rgba(255,255,255,0.8)',
    fontSize: 12.5,
    fontWeight: isActive ? 800 : 600,
    cursor: 'pointer',
    textAlign: 'center',
  });

  const chevron = (open: boolean) => (
    <ChevronDown
      style={{
        width: 13,
        height: 13,
        opacity: 0.7,
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.18s ease',
        flexShrink: 0,
      }}
    />
  );

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        ...style,
      }}
    >
      {/* ── Purpose segmented chip ─────────────────────────────────────── */}
      {showPurpose && (
        <div
          role="group"
          aria-label={isAr ? 'غرض البحث' : 'Search purpose'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 3,
            gap: 2,
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          {(['sale', 'rent'] as const).map((p) => {
            const isOn = value.purpose === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={isOn}
                onClick={() => patch({ purpose: p, budget: '' })}
                style={{
                  ...chipBase,
                  height: compact ? 28 : 32,
                  padding: '0 12px',
                  fontSize: compact ? 11 : 12,
                  background: isOn ? 'linear-gradient(135deg, #c8961a, #dfad3a)' : 'transparent',
                  color: isOn ? '#071523' : 'rgba(255,255,255,0.75)',
                  border: 'none',
                  fontWeight: isOn ? 800 : 600,
                }}
              >
                {p === 'sale' ? (isAr ? 'ريسيل' : 'Resale') : isAr ? 'إيجار' : 'Rent'}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Compound or Area chip ──────────────────────────────────────── */}
      {compounds.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            id={`${idPrefix}-compound`}
            aria-expanded={openChip === 'compound'}
            aria-haspopup="listbox"
            onClick={() => toggleChip('compound')}
            style={openChip === 'compound' ? chipOpen : value.compound ? chipActive : chipIdle}
          >
            <MapPin style={{ width: 13, height: 13, color: value.compound ? '#e9c176' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
            <span>
              {value.compound
                ? (activeCompound ? activeCompound.name : value.compound)
                : isAr ? 'الكمبوند أو المنطقة' : 'Compound / Area'}
            </span>
            {chevron(openChip === 'compound')}
          </button>

          {openChip === 'compound' && (
            <div style={panelStyle(300)} role="listbox" aria-label={isAr ? 'اختر الكمبوند' : 'Choose compound'}>
              <label style={panelLabel}>{isAr ? 'الكمبوند أو المنطقة' : 'Compound or area'}</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 9,
                  padding: '6px 10px',
                  marginBottom: 8,
                }}
              >
                <Search style={{ width: 13, height: 13, color: '#94a3b8', flexShrink: 0 }} />
                <input
                  autoFocus
                  type="text"
                  value={cpdQuery}
                  onChange={(e) => setCpdQuery(e.target.value)}
                  placeholder={isAr ? 'اكتب اسم كمبوند أو منطقة…' : 'Type a compound or area…'}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: '#fff',
                    fontSize: 12,
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                />
                {cpdQuery && (
                  <button type="button" onClick={() => setCpdQuery('')} title="Clear" aria-label="Clear search" style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 700 }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Any option */}
              <button type="button" onClick={() => { patch({ compound: '' }); setOpenChip(null); }} style={{ ...optionRow(!value.compound), marginBottom: 6 }}>
                <span>{isAr ? 'كل الكمبوندات' : 'All compounds & areas'}</span>
                {!value.compound && <Check style={{ width: 14, height: 14 }} />}
              </button>

              {/* Popular quick picks */}
              {!cpdQuery && popularCompounds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {popularCompounds.map((c) => {
                    const isOn = value.compound === c.name;
                    return (
                      <button
                        key={`pop-${c.name}`}
                        type="button"
                        onClick={() => { patch({ compound: c.name }); setOpenChip(null); }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: isOn ? 800 : 600,
                          border: isOn ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.12)',
                          background: isOn ? GOLD_SOFT : 'rgba(255,255,255,0.05)',
                          color: isOn ? '#e9c176' : 'rgba(255,255,255,0.75)',
                          cursor: 'pointer',
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Grouped list */}
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {groupedByZone.map(([zone, items]) => (
                  <div key={zone}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', margin: '6px 2px 3px' }}>
                      {zone}
                    </div>
                    {items.map((c) => {
                      const isOn = value.compound.toLowerCase() === c.name.toLowerCase();
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => { patch({ compound: c.name }); setOpenChip(null); }}
                          style={optionRow(isOn)}
                        >
                          <span>{c.name}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {c.zone && <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>{c.zone}</span>}
                            {isOn && <Check style={{ width: 14, height: 14 }} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {groupedByZone.length === 0 && (
                  <div style={{ padding: '10px 8px', fontSize: 11.5, color: '#94a3b8' }}>
                    {isAr ? 'لا نتائج مطابقة' : 'No matching compounds'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Rooms chip ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          id={`${idPrefix}-rooms`}
          aria-expanded={openChip === 'rooms'}
          aria-haspopup="listbox"
          onClick={() => toggleChip('rooms')}
          style={openChip === 'rooms' ? chipOpen : value.rooms ? chipActive : chipIdle}
        >
          <BedDouble style={{ width: 13, height: 13, color: value.rooms ? '#e9c176' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
          <span>{value.rooms ? `${value.rooms}+ ${isAr ? 'غرف' : 'Beds'}` : isAr ? 'الغرف' : 'Rooms'}</span>
          {chevron(openChip === 'rooms')}
        </button>
        {openChip === 'rooms' && (
          <div style={panelStyle(240)} role="listbox" aria-label={isAr ? 'عدد الغرف' : 'Rooms'}>
            <label style={panelLabel}>{isAr ? 'عدد غرف النوم' : 'Bedrooms'}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {ROOM_OPTIONS.map((r) => {
                const isOn = value.rooms === r.val;
                return (
                  <button key={r.val || 'any'} type="button" onClick={() => { patch({ rooms: r.val }); setOpenChip(null); }} style={roomBtn(isOn)}>
                    {isAr ? r.labelAr : r.label === 'Any' ? (isAr ? 'الكل' : 'Any') : `${r.label} ${isAr ? 'غرف' : 'Beds'}`}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, padding: '0 2px' }}>
              {isAr ? 'استوديو = اختر النوع «استوديو»' : 'Studio units: pick “Studio” in Unit Type'}
            </div>
          </div>
        )}
      </div>

      {/* ── Budget chip ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          id={`${idPrefix}-budget`}
          aria-expanded={openChip === 'budget'}
          aria-haspopup="listbox"
          onClick={() => toggleChip('budget')}
          style={openChip === 'budget' ? chipOpen : value.budget ? chipActive : chipIdle}
        >
          <Wallet style={{ width: 13, height: 13, color: value.budget ? '#e9c176' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
          <span>{value.budget && activeBudget ? (isAr ? activeBudget.ar : activeBudget.en) : isAr ? 'الميزانية' : 'Budget'}</span>
          {chevron(openChip === 'budget')}
        </button>
        {openChip === 'budget' && (
          <div style={panelStyle(260)} role="listbox" aria-label={isAr ? 'الميزانية' : 'Budget'}>
            <label style={panelLabel}>{value.purpose === 'rent' ? (isAr ? 'الإيجار الشهري' : 'Monthly rent budget') : isAr ? 'ميزانية الشراء' : 'Purchase budget'}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {ladder.map((o) => {
                const isOn = value.budget === o.val;
                return (
                  <button key={o.val || 'any'} type="button" onClick={() => { patch({ budget: o.val }); setOpenChip(null); }} style={optionRow(isOn)}>
                    <span>{isAr ? o.ar : o.en}</span>
                    {isOn && <Check style={{ width: 14, height: 14 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Unit type chip ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          id={`${idPrefix}-type`}
          aria-expanded={openChip === 'type'}
          aria-haspopup="listbox"
          onClick={() => toggleChip('type')}
          style={openChip === 'type' ? chipOpen : value.unitType ? chipActive : chipIdle}
        >
          <Building2 style={{ width: 13, height: 13, color: value.unitType ? '#e9c176' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
          <span>{value.unitType && activeType ? (isAr ? activeType.ar : activeType.en) : isAr ? 'النوع' : 'Unit Type'}</span>
          {chevron(openChip === 'type')}
        </button>
        {openChip === 'type' && (
          <div style={panelStyle(240)} role="listbox" aria-label={isAr ? 'نوع الوحدة' : 'Unit type'}>
            <label style={panelLabel}>{isAr ? 'نوع الوحدة' : 'Unit type'}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 250, overflowY: 'auto' }}>
              {UNIT_TYPE_OPTIONS.map((o) => {
                const isOn = value.unitType === o.val;
                return (
                  <button key={o.val || 'any'} type="button" onClick={() => { patch({ unitType: o.val }); setOpenChip(null); }} style={optionRow(isOn)}>
                    <span>{isAr ? o.ar : o.en}</span>
                    {isOn && <Check style={{ width: 14, height: 14 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Condition chip ─────────────────────────────────────────────── */}
      {showCondition && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            id={`${idPrefix}-condition`}
            aria-expanded={openChip === 'condition'}
            aria-haspopup="listbox"
            onClick={() => toggleChip('condition')}
            style={openChip === 'condition' ? chipOpen : value.condition ? chipActive : chipIdle}
          >
            <Paintbrush style={{ width: 13, height: 13, color: value.condition ? '#e9c176' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
            <span>{value.condition && activeCondition ? (isAr ? activeCondition.ar : activeCondition.en) : isAr ? 'التشطيب' : 'Condition'}</span>
            {chevron(openChip === 'condition')}
          </button>
          {openChip === 'condition' && (
            <div style={panelStyle(250)} role="listbox" aria-label={isAr ? 'حالة التشطيب' : 'Condition'}>
              <label style={panelLabel}>{isAr ? 'حالة التشطيب' : 'Finishing condition'}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {CONDITION_OPTIONS.map((o) => {
                  const isOn = value.condition === o.val;
                  const count = conditionCounts && o.val ? (conditionCounts[o.val] || 0) : null;
                  const hasEvidence = count === null || count > 0;
                  return (
                    <button
                      key={o.val || 'any'}
                      type="button"
                      disabled={conditionCounts ? !hasEvidence && !isOn : false}
                      onClick={() => { patch({ condition: o.val }); setOpenChip(null); }}
                      style={{
                        ...optionRow(isOn),
                        cursor: conditionCounts && !hasEvidence && !isOn ? 'not-allowed' : optionRow(isOn).cursor,
                        opacity: conditionCounts && !hasEvidence && !isOn ? 0.42 : 1,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {isAr ? o.ar : o.en}
                        {count !== null && (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 999,
                              background: count > 0 ? 'rgba(201, 148, 54, 0.16)' : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${count > 0 ? 'rgba(201, 148, 54, 0.35)' : 'rgba(255,255,255,0.12)'}`,
                              color: count > 0 ? '#e9c176' : 'rgba(255,255,255,0.4)',
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </span>
                      {isOn && <Check style={{ width: 14, height: 14 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Meta: result count + reset ─────────────────────────────────── */}
      {(resultCount !== null || (onReset && anyActive)) && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginInlineStart: 'auto' }}>
          {resultCount !== null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: compact ? '3px 9px' : '5px 12px',
                borderRadius: 999,
                background: 'rgba(201, 148, 54, 0.12)',
                border: '1px solid rgba(201, 148, 54, 0.3)',
                color: '#e9c176',
                fontSize: compact ? 10.5 : 11.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {isAr ? `${resultCount.toLocaleString()} وحدة مطابقة` : `${resultCount.toLocaleString()} matching units`}
            </span>
          )}
          {onReset && anyActive && (
            <button
              type="button"
              onClick={() => { onReset(); setOpenChip(null); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: compact ? '3px 8px' : '5px 10px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: compact ? 10.5 : 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
            >
              <RotateCcw style={{ width: 11, height: 11 }} />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
