'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ExecutiveTearSheet } from '@sierra-estates/agents-core/src/memo-generator';

interface PropertyTeaserBrochureProps {
  initialData?: Partial<ExecutiveTearSheet>;
  lang?: string;
}

export function PropertyTeaserBrochure({ initialData, lang: _lang }: PropertyTeaserBrochureProps) {
  const [formData, setFormData] = useState({
    referenceId: initialData?.referenceId || 'REF-HYD-042',
    title: initialData?.headline || 'Luxury Signature Villa · Prime Lake View',
    compoundName: initialData?.compound || 'Hyde Park',
    unitType: 'Standalone Villa',
    buaSqm: '420',
    landSqm: '510',
    bedrooms: '5',
    bathrooms: '5',
    finishing: 'ultra_lux',
    askingPriceEGP: '38000000',
    downPaymentPercent: '10',
    installmentTenureYears: '7',
    deliveryYear: '2026',
    brokerName: 'Sierra Elite Desk',
    brokerPhone: '+201092048333',
  });

  const [loading, setLoading] = useState(false);
  const [tearSheet, setTearSheet] = useState<ExecutiveTearSheet | null>(null);
  const [copiedMsg, setCopiedMsg] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teasers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceId: formData.referenceId,
          title: formData.title,
          compoundName: formData.compoundName,
          unitType: formData.unitType,
          buaSqm: Number(formData.buaSqm),
          landSqm: Number(formData.landSqm),
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          finishing: formData.finishing,
          askingPriceEGP: Number(formData.askingPriceEGP),
          downPaymentPercent: Number(formData.downPaymentPercent),
          installmentTenureYears: Number(formData.installmentTenureYears),
          deliveryYear: Number(formData.deliveryYear),
          brokerName: formData.brokerName,
          brokerPhone: formData.brokerPhone,
        }),
      });
      const data = await res.json();
      if (data?.tearSheet) {
        setTearSheet(data.tearSheet);
      }
    } catch (err) {
      console.error('Failed to generate teaser:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsg(`✓ Copied ${lang} broadcast copy!`);
    setTimeout(() => setCopiedMsg(''), 3000);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `https://wa.me/${formData.brokerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
      `مرحباً، أود الاستفسار عن كود العقار ${formData.referenceId} في ${formData.compoundName}`
    )}`
  )}&bgcolor=0a0e1a&color=00AEFF`;

  return (
    <div className="card" style={{ padding: 22, marginBottom: 20 }}>
      <div className="card-hd" style={{ marginBottom: 16 }}>
        <span className="card-title">📄 Luxury Brochure & Investor Teaser Generator</span>
        <span className="chip chip-gold">The Curator Engine</span>
      </div>

      {/* Input Parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Property Title</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Compound</label>
          <input
            value={formData.compoundName}
            onChange={(e) => setFormData({ ...formData, compoundName: e.target.value })}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Asking Price (EGP)</label>
          <input
            type="number"
            value={formData.askingPriceEGP}
            onChange={(e) => setFormData({ ...formData, askingPriceEGP: e.target.value })}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>BUA (m²)</label>
          <input
            type="number"
            value={formData.buaSqm}
            onChange={(e) => setFormData({ ...formData, buaSqm: e.target.value })}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Tenure (Years)</label>
          <input
            type="number"
            value={formData.installmentTenureYears}
            onChange={(e) => setFormData({ ...formData, installmentTenureYears: e.target.value })}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="btn btn-gold"
        style={{ width: '100%', marginBottom: 16, height: 42, fontSize: 13 }}
      >
        {loading ? 'Synthesizing Luxury Teaser…' : '✨ Generate Investment Tear-Sheet & PDF'}
      </button>

      {/* Generated Printable Tear Sheet */}
      {tearSheet && (
        <div className="tear-sheet-preview" style={{ background: '#020617', border: '1px solid rgba(0, 174, 255, 0.3)', borderRadius: 16, padding: 24, color: '#f8fafc', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 16, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
                SIERRA ESTATES · LUXURY RESIDENTIAL MEMO
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>{tearSheet.headline}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <span className="chip chip-gold">{tearSheet.compound}</span>
                <span className="chip chip-blue">{tearSheet.referenceId}</span>
                <span className="chip chip-green">{tearSheet.unitSpecs.delivery}</span>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Image src={qrUrl} alt="WhatsApp QR Code" width={80} height={80} unoptimized style={{ borderRadius: 6, display: 'block' }} />
              <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: 'var(--tx-f)', marginTop: 4 }}>SCAN FOR VIP DESK</div>
            </div>
          </div>

          {/* Specs & Financial Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: 'var(--tx-m)', textTransform: 'uppercase', marginBottom: 6 }}>Financial Structure</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', fontFamily: 'JetBrains Mono' }}>{tearSheet.financialStructure.totalPriceMillionsEGP}</div>
              <div style={{ fontSize: 11, color: 'var(--tx-f)', marginTop: 4 }}>Down Payment: EGP {(tearSheet.financialStructure.downPaymentEGP / 1e6).toFixed(2)}M (10%)</div>
              <div style={{ fontSize: 11, color: 'var(--tx-f)' }}>Quarterly: EGP {(tearSheet.financialStructure.quarterlyInstallmentEGP / 1e3).toFixed(0)}k ({tearSheet.financialStructure.tenureYears} yrs)</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: 'var(--tx-m)', textTransform: 'uppercase', marginBottom: 6 }}>5-Year Wealth Forecast</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#34D399', fontFamily: 'JetBrains Mono' }}>+{tearSheet.fiveYearForecast.projectedAppreciationPercent}% Growth</div>
              <div style={{ fontSize: 11, color: 'var(--tx-f)', marginTop: 4 }}>Est. Year 5 Value: EGP {(tearSheet.fiveYearForecast.estimatedValueYear5EGP / 1e6).toFixed(1)}M</div>
              <div style={{ fontSize: 11, color: 'var(--tx-f)' }}>Net Rental Yield: {tearSheet.fiveYearForecast.netRentalYieldPercent}% / yr</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: 'var(--tx-m)', textTransform: 'uppercase', marginBottom: 6 }}>Unit Specifications</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{tearSheet.unitSpecs.bua} BUA {tearSheet.unitSpecs.land && `· ${tearSheet.unitSpecs.land} Land`}</div>
              <div style={{ fontSize: 11, color: 'var(--tx-f)', marginTop: 4 }}>Rooms: {tearSheet.unitSpecs.rooms}</div>
              <div style={{ fontSize: 11, color: 'var(--tx-f)' }}>Finishing: {tearSheet.unitSpecs.finishing}</div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
            <button type="button" onClick={handlePrintPDF} className="btn btn-gold" style={{ padding: '8px 16px', fontSize: 11 }}>
              🖨️ Export PDF Brochure
            </button>
            <button type="button" onClick={() => handleCopy(tearSheet.whatsAppBroadcastCopy.ar, 'Arabic')} className="btn btn-green" style={{ padding: '8px 16px', fontSize: 11 }}>
              📋 Copy WhatsApp (Arabic)
            </button>
            <button type="button" onClick={() => handleCopy(tearSheet.whatsAppBroadcastCopy.en, 'English')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 11 }}>
              📋 Copy WhatsApp (English)
            </button>
            {copiedMsg && (
              <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'JetBrains Mono', marginLeft: 8 }}>
                {copiedMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
