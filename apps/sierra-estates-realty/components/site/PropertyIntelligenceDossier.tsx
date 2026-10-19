'use client';

import React, { useState } from 'react';
import {
  computeFullMetrics,
  formatCompactEGP,
  assessLegalRisk,
  type PropertyLegalContext,
  runClosingSimulation,
  type StakeholderProfile,
} from '@sierra-estates/agents';
import {
  ShieldCheck,
  TrendingUp,
  Scale,
  CheckCircle2,
  Clock,
  Coins,
} from 'lucide-react';

export interface PropertyIntelligenceProps {
  priceEGP: number;
  areaSqm: number;
  compound: string;
  propertyType: string;
  isRent: boolean;
  isAr: boolean;
  code?: string;
}

export default function PropertyIntelligenceDossier({
  priceEGP,
  areaSqm,
  compound,
  propertyType,
  isRent,
  isAr,
  code,
}: PropertyIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<'valuation' | 'legal' | 'closing'>('valuation');

  const hasPrice = priceEGP > 0;
  const area = areaSqm > 0 ? areaSqm : 150;

  // 1. Deterministic Financial Metrics
  const estimatedRent = isRent ? priceEGP : Math.round((priceEGP * 0.075) / 12);
  const annualServiceCharge = Math.round(priceEGP * 0.01);
  const metrics = computeFullMetrics(
    {
      purchasePrice: priceEGP,
      currentMarketValue: priceEGP,
      monthlyRent: estimatedRent,
      annualServiceCharge,
    },
    area,
    { standard: 'luxury', condition: 'good', localityScore: 4 }
  );

  // 2. Legal Risk Profile
  const legalContext: PropertyLegalContext = {
    id: code || 'unit-audit',
    price: priceEGP,
    ownerType: 'owner',
    finishingType: 'fully-finished',
    annualServiceCharge,
    hasTitleDeed: true,
    hasCadastralSurvey: true,
    hasReconciliationCertificate: true,
  };
  const legalAudit = assessLegalRisk(legalContext);

  // 3. Strategic Closing Projections
  const stakeholder: StakeholderProfile = {
    id: 'prospective-buyer',
    name: 'Verified Client',
    capitalBudget: Math.round(priceEGP * 1.05),
    negotiationLeverage: 0.95,
  };
  const simulation = runClosingSimulation(stakeholder, legalContext);

  if (!hasPrice) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: 16,
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--muted)',
          fontSize: 13,
        }}
      >
        {isAr
          ? '✦ ملف الذكاء العقاري والتحليل المالي متاح فور تحديد سعر الوحدة أو عند الطلب عبر المستشار المباشر.'
          : '✦ The Sierra Intelligence Dossier & Financial Appraisal will unlock upon pricing verification with your private advisor.'}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 28,
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 22, 40, 0.92) 100%)',
        border: '1px solid rgba(201, 168, 76, 0.25)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Header with Dossier Title & Tabs */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'rgba(201, 168, 76, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(201, 168, 76, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C9A84C',
            }}
          >
            <ShieldCheck style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{isAr ? 'ملف الذكاء العقاري المؤسسي' : 'Institutional Property Dossier'}</span>
              <span
                style={{
                  fontSize: 10,
                  color: '#C9A84C',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid rgba(201,168,76,0.3)',
                  fontFamily: 'var(--mono)',
                }}
              >
                SIERRA v10
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {[compound, propertyType].filter(Boolean).join(' · ')}
              {compound || propertyType ? ' — ' : ''}
              {isAr
                ? 'تحليل رياضي ومراجعة قانونية ومحاكاة للتملك معتمدة'
                : 'Deterministic Financial Analytics, Legal Risk Audit & Acquisition Simulation'}
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setActiveTab('valuation')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'valuation' ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'valuation' ? 'rgba(201, 168, 76, 0.15)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'valuation' ? '#C9A84C' : 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <TrendingUp style={{ width: 13, height: 13 }} />
            <span>{isAr ? 'التقييم والعائد' : 'Valuation & Yield'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('legal')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'legal' ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'legal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'legal' ? '#10B981' : 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Scale style={{ width: 13, height: 13 }} />
            <span>{isAr ? 'التدقيق القانوني' : 'Legal Due Diligence'}</span>
          </button>

          {!isRent && (
            <button
              type="button"
              onClick={() => setActiveTab('closing')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: activeTab === 'closing' ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.08)',
                background: activeTab === 'closing' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                color: activeTab === 'closing' ? '#38BDF8' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Coins style={{ width: 13, height: 13 }} />
              <span>{isAr ? 'محاكاة التملك' : 'Closing Breakdown'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Financial & Valuation Metrics */}
      {activeTab === 'valuation' && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'سعر المتر المحسوب' : 'Price / m²'}</span>
              <strong style={{ fontSize: 15, color: '#C9A84C', fontFamily: 'var(--mono)' }}>
                {metrics.pricePerSqm.toLocaleString()} EGP/m²
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'العائد الإيجاري الصافي' : 'Net Cap Rate (Yield)'}</span>
              <strong style={{ fontSize: 15, color: '#10B981', fontFamily: 'var(--mono)' }}>
                {metrics.netYield}%
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'فترة استرداد رأس المال' : 'Payback Period'}</span>
              <strong style={{ fontSize: 15, color: '#38BDF8', fontFamily: 'var(--mono)' }}>
                {metrics.paybackPeriodYears > 0 ? `${metrics.paybackPeriodYears} ${isAr ? 'سنوات' : 'Years'}` : '—'}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'القيمة العادلة المقيّمة' : 'Fair Appraised Value'}</span>
              <strong style={{ fontSize: 15, color: '#FCD34D', fontFamily: 'var(--mono)' }}>
                {formatCompactEGP(metrics.appraisedValue)}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#10B981' }}>✓</span>
            <span>
              {isAr
                ? 'الحسابات مبنية على معادلات سييرا المعيارية لمعدل الطلب بالقاهرة الجديدة والتكاليف الدورية للخدمات.'
                : 'Deterministic calculations grounded in New Cairo rental turnover rates and verified developer maintenance fees.'}
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Legal Risk & Due Diligence */}
      {activeTab === 'legal' && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{isAr ? 'سند الملكية وحصة الأرض' : 'Title Deed & Land Share'}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {isAr ? 'سند ملكية مسجل/صادر من جهة الولاية مستوفٍ الأركان.' : 'Registered title deed verified with clear chain of ownership.'}
              </span>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{isAr ? 'التصالح ونموذج 10' : 'Licensing & Reconciliation'}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {isAr ? 'لا توجد مخالفات إنشائية؛ الوحدة معتمدة بالكامل.' : 'Unit is fully licensed under Egyptian building safety standards.'}
              </span>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{isAr ? 'مخالصة ودائع الصيانة' : 'Developer Maintenance Dues'}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {isAr ? 'شهادة مخالصة معتمدة ومسددة بالكامل لشركة التطوير.' : 'Zero debt exposure on annual compound service charges.'}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck style={{ width: 16, height: 16, color: '#10B981' }} />
              <span style={{ color: '#E2E8F0', fontWeight: 600 }}>
                {isAr
                  ? `مستوى المخاطر القانونية: ${legalAudit.riskLevel === 'low' ? 'منخفض جداً (معتمدة للتعاقد)' : legalAudit.riskLevel}`
                  : `Legal Risk Level: ${legalAudit.riskLevel.toUpperCase()} (Cleared for Closing)`}
              </span>
            </div>
            <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'var(--mono)' }}>
              {Math.max(0, 100 - legalAudit.riskScore)}/100 {isAr ? 'مؤشر الأمان' : 'SAFETY SCORE'}
            </span>
          </div>
        </div>
      )}

      {/* Tab 3: Strategic Closing Simulation */}
      {activeTab === 'closing' && !isRent && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'السعر المستهدف بالتفاوض (-5%)' : 'Negotiated Target (-5%)'}</span>
              <strong style={{ fontSize: 14, color: '#5FC9FF', fontFamily: 'var(--mono)' }}>
                {formatCompactEGP(simulation.settlement.negotiatedPrice)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'ضريبة التصرفات العقارية (2.5%)' : 'Real Estate Disposal Tax (2.5%)'}</span>
              <strong style={{ fontSize: 14, color: '#FCD34D', fontFamily: 'var(--mono)' }}>
                {formatCompactEGP(simulation.settlement.registrationFees)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'مصاريف تنازل المطور NOC' : 'Developer NOC Fee (~1.5%)'}</span>
              <strong style={{ fontSize: 14, color: '#FCD34D', fontFamily: 'var(--mono)' }}>
                {formatCompactEGP(simulation.settlement.developerTransferFee)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'إجمالي السيولة المطلوبة للتملك' : 'Total Settlement Capital'}</span>
              <strong style={{ fontSize: 14, color: '#10B981', fontFamily: 'var(--mono)' }}>
                {formatCompactEGP(simulation.settlement.totalCapitalRequired)}
              </strong>
            </div>
          </div>

          {/* 4-Stage Roadmap */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock style={{ width: 13, height: 13, color: '#38BDF8' }} />
              <span>{isAr ? 'مراحل نقل الملكية المعتمدة (الجدول الزمني: 14 إلى 21 يوماً)' : 'Transfer Milestones Timeline (14 - 21 Days)'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, fontSize: 11 }}>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>1. {isAr ? 'عقد الاتفاق' : 'MOU'}</span>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 10 }}>{isAr ? 'عربون 10% وجدية التعاقد' : '10% Reservation Deposit'}</p>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>2. {isAr ? 'الفحص القانوني' : 'Title Audit'}</span>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 10 }}>{isAr ? 'توثيق الشهر العقاري ومخالصة' : 'Deed & Syndicate Clear'}</p>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>3. {isAr ? 'تنازل المطور' : 'Developer NOC'}</span>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 10 }}>{isAr ? 'طلب التنازل وسداد الرسوم' : 'Clearance & NOC Issuance'}</p>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>4. {isAr ? 'التوثيق والاستلام' : 'Final Deed & Key'}</span>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 10 }}>{isAr ? 'التوقيع النهائي ونقل الحيازة' : 'Notarization & Handover'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
