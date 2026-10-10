'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Sparkles,
  Calendar,
} from 'lucide-react';
import AiToolPage from '@/components/site/AiToolPage';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import type { MonthlyPriceIndex } from '@/lib/services/PriceIndexService';

export default function PriceIndexClient({ initialData }: { initialData: MonthlyPriceIndex }) {
  const { isAr } = useSite();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price_desc' | 'mom_desc' | 'roi_desc'>('price_desc');

  const { marketSummary, compounds, historicalTrend, period } = initialData;

  const uniqueZones = useMemo(() => {
    const set = new Set<string>();
    compounds.forEach((c) => set.add(c.zone));
    return Array.from(set);
  }, [compounds]);

  const filteredCompounds = useMemo(() => {
    return compounds
      .filter((c) => {
        const matchesSearch =
          c.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.nameAr.includes(searchTerm);
        const matchesZone = selectedZone === 'all' || c.zone === selectedZone;
        return matchesSearch && matchesZone;
      })
      .sort((a, b) => {
        if (sortBy === 'price_desc') return b.avgPricePerSqm - a.avgPricePerSqm;
        if (sortBy === 'mom_desc') return b.momChangePercent - a.momChangePercent;
        if (sortBy === 'roi_desc') return b.projected3YrROI - a.projected3YrROI;
        return 0;
      });
  }, [compounds, searchTerm, selectedZone, sortBy]);

  return (
    <AiToolPage
      crumb={isAr ? 'مؤشر أسعار سييرا' : 'Sierra Price Index'}
      title={isAr ? 'مؤشر أسعار عقارات القاهرة الجديدة' : 'Sierra New Cairo Price Index'}
      sub={
        isAr
          ? `المؤشر الشهري المرجعي لتقييم كمبوندات القاهرة الجديدة (${period}) — مبني على تحليلات الذكاء الاصطناعي ومعاملات السوق الموثقة.`
          : `Authoritative monthly real estate valuation benchmarks across New Cairo compounds (${period}) — grounded in algorithmic market telemetry.`
      }
    >
      <section className="block">
        <div className="wrap">
          {/* Top Market Overview KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <Reveal className="card">
              <div
                style={{
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '16px',
                  padding: '22px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted, #8b949e)', fontWeight: 600 }}>
                    {isAr ? 'متوسط سعر المتر (القاهرة الجديدة)' : 'Average Price / m² (New Cairo)'}
                  </span>
                  <BarChart3 size={18} style={{ color: 'var(--brand-gold, #c5a880)' }} />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                  {marketSummary.avgPricePerSqm.toLocaleString()} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand-gold, #c5a880)' }}>EGP/m²</span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                  <TrendingUp size={14} />
                  <span>+{marketSummary.momChangePercent}% {isAr ? 'نمو شهري' : 'MoM Growth'}</span>
                </div>
              </div>
            </Reveal>

            <Reveal className="card">
              <div
                style={{
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '16px',
                  padding: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted, #8b949e)', fontWeight: 600 }}>
                    {isAr ? 'أعلى كمبوند في معدل النمو' : 'Top Appreciating Compound'}
                  </span>
                  <Sparkles size={18} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
                  {isAr ? marketSummary.topAppreciatingCompound.nameAr : marketSummary.topAppreciatingCompound.nameEn}
                </div>
                <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                  +{marketSummary.topAppreciatingCompound.changePercent}% {isAr ? 'هذا الشهر' : 'this month'}
                </div>
              </div>
            </Reveal>

            <Reveal className="card">
              <div
                style={{
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '16px',
                  padding: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted, #8b949e)', fontWeight: 600 }}>
                    {isAr ? 'الوحدات الموثقة تحت التحليل' : 'Verified Units Analyzed'}
                  </span>
                  <ShieldCheck size={18} style={{ color: '#60a5fa' }} />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
                  {marketSummary.totalAnalyzedUnits.toLocaleString()}
                </div>
                <div style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--muted, #8b949e)' }}>
                  {isAr ? `عبر ${marketSummary.totalTrackedCompounds} كمبوند رئيسي` : `Across ${marketSummary.totalTrackedCompounds} major compounds`}
                </div>
              </div>
            </Reveal>

            <Reveal className="card">
              <div
                style={{
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '16px',
                  padding: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted, #8b949e)', fontWeight: 600 }}>
                    {isAr ? 'النمو السنوي التراكمي' : 'Annual Growth Benchmark'}
                  </span>
                  <Percent size={18} style={{ color: '#34d399' }} />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
                  +{marketSummary.yoyChangePercent}%
                </div>
                <div style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--muted, #8b949e)' }}>
                  {isAr ? 'متوسط سنوي (YoY)' : 'Year-over-Year Average'}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Historical Trend Sparkline Bar */}
          <Reveal className="card">
            <div
              style={{
                background: 'var(--surface, #14171d)',
                border: '1px solid var(--line, rgba(255,255,255,0.08))',
                borderRadius: '18px',
                padding: '26px',
                marginBottom: '32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#fff' }}>
                    {isAr ? 'تطور مؤشر أسعار القاهرة الجديدة (آخر 6 أشهر)' : 'New Cairo Price Index Trend (Last 6 Months)'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted, #8b949e)', margin: '4px 0 0 0' }}>
                    {isAr ? 'قيمة المؤشر مقارنة بشهر الأساس (100.0)' : 'Normalized index value vs baseline month (100.0)'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brand-gold, #c5a880)', background: 'rgba(197, 168, 128, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(197, 168, 128, 0.2)' }}>
                  <Calendar size={13} />
                  <span>{period}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${historicalTrend.length}, 1fr)`,
                  gap: '12px',
                  alignItems: 'end',
                  height: '140px',
                  paddingTop: '20px',
                }}
              >
                {historicalTrend.map((pt, idx) => {
                  const heightPercent = Math.max(30, Math.min(100, Math.round(((pt.indexBase100 - 95) / 20) * 100)));
                  const isCurrent = idx === historicalTrend.length - 1;
                  return (
                    <div key={pt.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '11px', color: isCurrent ? 'var(--brand-gold, #c5a880)' : 'var(--muted, #8b949e)', fontWeight: 600 }}>
                        {pt.avgPricePerSqm.toLocaleString()}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '48px',
                          height: `${heightPercent}%`,
                          background: isCurrent ? 'linear-gradient(180deg, #c5a880 0%, rgba(197, 168, 128, 0.4) 100%)' : 'rgba(255,255,255,0.08)',
                          borderRadius: '6px',
                          border: isCurrent ? '1px solid #c5a880' : '1px solid rgba(255,255,255,0.05)',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <span style={{ fontSize: '11.5px', color: isCurrent ? '#fff' : 'var(--muted, #8b949e)', fontWeight: isCurrent ? 700 : 500 }}>
                        {isAr ? pt.labelAr : pt.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* Controls: Search, Zone, Sort */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
              {/* Search input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  minWidth: '220px',
                }}
              >
                <Search size={16} style={{ color: 'var(--muted, #8b949e)' }} />
                <input
                  type="text"
                  placeholder={isAr ? 'ابحث عن اسم الكمبوند...' : 'Search compound...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '13.5px',
                    width: '100%',
                  }}
                />
              </div>

              {/* Zone Filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '10px',
                  padding: '6px 12px',
                }}
              >
                <Filter size={14} style={{ color: 'var(--muted, #8b949e)' }} />
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#14171d' }}>
                    {isAr ? 'جميع المناطق' : 'All Zones'}
                  </option>
                  {uniqueZones.map((z) => (
                    <option key={z} value={z} style={{ background: '#14171d' }}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--muted, #8b949e)' }}>
                {isAr ? 'ترتيب حسب:' : 'Sort by:'}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: 'var(--surface, #14171d)',
                  border: '1px solid var(--line, rgba(255,255,255,0.08))',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <option value="price_desc">{isAr ? 'الأعلى سعراً للمتر' : 'Highest Price / m²'}</option>
                <option value="mom_desc">{isAr ? 'الأعلى نمواً شهرياً' : 'Highest MoM Growth'}</option>
                <option value="roi_desc">{isAr ? 'أعلى عائد استثماري (3 سنوات)' : 'Highest 3Y ROI'}</option>
              </select>
            </div>
          </div>

          {/* Compound Index Table / Bento Cards */}
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredCompounds.map((item) => (
              <Reveal key={item.id} className="card">
                <div
                  style={{
                    background: 'var(--surface, #14171d)',
                    border: '1px solid var(--line, rgba(255,255,255,0.08))',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(130px, 1fr) minmax(100px, 0.8fr) minmax(110px, 0.9fr) auto',
                    gap: '20px',
                    alignItems: 'center',
                    transition: 'border-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  {/* Compound Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                        {isAr ? item.nameAr : item.nameEn}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: item.tier === 'Ultra Luxury' ? 'rgba(197, 168, 128, 0.15)' : 'rgba(255,255,255,0.06)',
                          color: item.tier === 'Ultra Luxury' ? 'var(--brand-gold, #c5a880)' : 'var(--muted, #8b949e)',
                          border: item.tier === 'Ultra Luxury' ? '1px solid rgba(197, 168, 128, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {item.tier}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--muted, #8b949e)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{isAr ? item.zoneAr : item.zone}</span>
                      <span>•</span>
                      <span>{item.totalUnitsTracked} {isAr ? 'وحدة موثقة' : 'units tracked'}</span>
                    </div>
                  </div>

                  {/* Price / m² */}
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted, #8b949e)', marginBottom: '2px' }}>
                      {isAr ? 'متوسط سعر المتر' : 'Avg Price / m²'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--brand-gold, #c5a880)' }}>
                      {item.avgPricePerSqm.toLocaleString()} <span style={{ fontSize: '12px' }}>EGP</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted, #8b949e)' }}>
                      {item.minPricePerSqm.toLocaleString()} - {item.maxPricePerSqm.toLocaleString()}
                    </div>
                  </div>

                  {/* MoM Change */}
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted, #8b949e)', marginBottom: '2px' }}>
                      {isAr ? 'النمو الشهري' : 'MoM Change'}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <TrendingUp size={13} />
                      <span>+{item.momChangePercent}%</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted, #8b949e)' }}>
                      +{item.yoyChangePercent}% YoY
                    </div>
                  </div>

                  {/* 3-Year ROI */}
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted, #8b949e)', marginBottom: '2px' }}>
                      {isAr ? 'العائد المتوقع (3 سنين)' : '3Y Projected ROI'}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6' }}>
                      +{item.projected3YrROI}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted, #8b949e)' }}>
                      {item.annualRentalYield}% {isAr ? 'عائد إيجار' : 'Yield'}
                    </div>
                  </div>

                  {/* Action Link */}
                  <div style={{ textAlign: 'end' }}>
                    <Link
                      href={`/properties?compound=${encodeURIComponent(item.nameEn)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(197, 168, 128, 0.12)',
                        border: '1px solid rgba(197, 168, 128, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        color: 'var(--brand-gold, #c5a880)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <span>{isAr ? 'عرض الوحدات' : 'View Units'}</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </AiToolPage>
  );
}
