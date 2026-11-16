'use client';

import React from 'react';

interface RealEstateProcessorViewProps {
  lang?: string;
  onNavigate?: (tab: string) => void;
}

const PROCESSING_STEPS = [
  ['01', 'Load', 'Excel, CSV, and WhatsApp text exports'],
  ['02', 'Normalize', 'Arabic/English headers, phones, prices, and compounds'],
  ['03', 'Deduplicate', 'Phone suffix + EGP price + deal type'],
  ['04', 'Export', 'CRM-ready workbook with traceable source metadata'],
] as const;

const OUTPUT_SHEETS = ['Summary', 'All_Units', 'Owners_Rent', 'Owners_Sale', 'Brokers_Rent', 'Brokers_Sale'];

const SUPPORTED_INPUTS = [
  { format: '.xlsx / .xls', label: 'Excel inventory', detail: 'Auto-detects headers up to row 10' },
  { format: '.csv', label: 'CSV exports', detail: 'Maps common English and Arabic aliases' },
  { format: '.txt', label: 'WhatsApp exports', detail: 'Parses timestamps, phones, prices, and unit codes' },
];

export default function RealEstateProcessorView({ lang = 'en', onNavigate }: RealEstateProcessorViewProps) {
  const isAr = lang === 'ar';

  const copy = isAr
    ? {
        title: 'معالج العقارات',
        subtitle: 'مهارة سييرا لمعالجة قوائم Excel وWhatsApp وتنظيفها',
        active: 'نشطة',
        description: 'تجميع المخزون العقاري غير المنظم وتحويله إلى قاعدة بيانات موحدة جاهزة لإدارة علاقات العملاء.',
        run: 'فتح أداة دمج Excel',
        source: 'مصدر المهارة',
        sourceValue: '.agents/skills/real-estate-excel-processor',
        inputs: 'المدخلات المدعومة',
        pipeline: 'مسار المعالجة',
        outputs: 'المخرجات',
        rule: 'قاعدة إزالة التكرار',
        ruleText: 'آخر 7 أرقام من الهاتف + السعر بالجنيه المصري + نوع المعاملة. تغيير السعر يبقى كسجل مستقل.',
        currency: 'تحويل العملة',
        currencyText: 'USD → EGP باستخدام معدل الإعداد الافتراضي 48.0',
        traceability: 'التتبع',
        traceabilityText: 'يتم الاحتفاظ باسم الملف واسم الورقة وملاحظات المصدر.',
      }
    : {
        title: 'Real Estate Processor',
        subtitle: 'Sierra skill for Excel and WhatsApp inventory processing',
        active: 'ACTIVE',
        description: 'Consolidate messy property inventory into a normalized, deduplicated CRM-ready database.',
        run: 'Open Excel Merger',
        source: 'Skill source',
        sourceValue: '.agents/skills/real-estate-excel-processor',
        inputs: 'Supported inputs',
        pipeline: 'Processing pipeline',
        outputs: 'Workbook outputs',
        rule: 'Deduplication rule',
        ruleText: 'Phone last 7 digits + EGP price + deal type. Price changes remain separate records.',
        currency: 'Currency handling',
        currencyText: 'USD → EGP using the configured default rate of 48.0',
        traceability: 'Traceability',
        traceabilityText: 'Source file, sheet name, and original notes are retained.',
      };

  return (
    <div className="fade-up" data-testid="real-estate-processor-view">
      <div className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div
          style={{
            padding: '22px 22px 20px',
            background: 'linear-gradient(135deg, rgba(0,174,255,.16), rgba(52,211,153,.08) 55%, transparent)',
            borderBottom: '1px solid var(--bd)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ fontSize: 25 }}>🏘️</span>
                <h2 style={{ margin: 0, color: 'var(--tx)', fontSize: 25, fontWeight: 700 }}>{copy.title}</h2>
                <span className="chip chip-green">{copy.active}</span>
              </div>
              <p style={{ margin: '0 0 8px', color: 'var(--tx-s)', fontSize: 13 }}>{copy.subtitle}</p>
              <p style={{ margin: 0, color: 'var(--tx-m)', fontSize: 12, lineHeight: 1.6 }}>{copy.description}</p>
            </div>
            <button className="btn btn-gold" onClick={() => onNavigate?.('excel_merger')}>
              {copy.run} ↗
            </button>
          </div>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <div>
            <div className="kpi-lbl">{copy.source}</div>
            <code style={{ display: 'block', marginTop: 8, color: 'var(--tx-s)', fontSize: 11, overflowWrap: 'anywhere' }}>{copy.sourceValue}</code>
          </div>
          <div>
            <div className="kpi-lbl">{copy.currency}</div>
            <div style={{ marginTop: 8, color: 'var(--emerald)', fontSize: 12 }}>{copy.currencyText}</div>
          </div>
          <div>
            <div className="kpi-lbl">{copy.traceability}</div>
            <div style={{ marginTop: 8, color: 'var(--tx-m)', fontSize: 12, lineHeight: 1.45 }}>{copy.traceabilityText}</div>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
        <div className="kpi-card"><div className="kpi-val" style={{ color: '#C8961A' }}>3</div><div className="kpi-lbl">{isAr ? 'أنواع المدخلات' : 'Input formats'}</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: '#34D399' }}>2</div><div className="kpi-lbl">{isAr ? 'اللغات المدعومة' : 'Languages supported'}</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: '#7C3AED' }}>6</div><div className="kpi-lbl">{isAr ? 'أوراق Excel' : 'Workbook sheets'}</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: '#f59e0b' }}>48.0</div><div className="kpi-lbl">{isAr ? 'معدل USD/EGP' : 'USD/EGP rate'}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,.8fr)', gap: 14, marginTop: 14 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">⚡ {copy.pipeline}</span></div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {PROCESSING_STEPS.map(([number, title, detail]) => (
              <div key={number} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 12px', border: '1px solid var(--bd)', borderRadius: 10, background: 'var(--bg-e)' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--gold)', minWidth: 24 }}>{number}</span>
                <div style={{ minWidth: 92, color: 'var(--tx)', fontWeight: 700, fontSize: 12 }}>{isAr ? ({ Load: 'تحميل', Normalize: 'توحيد', Deduplicate: 'إزالة التكرار', Export: 'تصدير' } as Record<string, string>)[title] : title}</div>
                <div style={{ color: 'var(--tx-m)', fontSize: 11 }}>{isAr ? ({ 'Excel, CSV, and WhatsApp text exports': 'ملفات Excel وCSV ونصوص WhatsApp', 'Arabic/English headers, phones, prices, and compounds': 'العناوين والأرقام والأسعار والمجمعات بالعربية والإنجليزية', 'Phone suffix + EGP price + deal type': 'آخر أرقام الهاتف والسعر ونوع المعاملة', 'CRM-ready workbook with traceable source metadata': 'ملف جاهز لإدارة العملاء مع بيانات المصدر' } as Record<string, string>)[detail] : detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><span className="card-title">📥 {copy.inputs}</span></div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {SUPPORTED_INPUTS.map((item) => (
              <div key={item.format} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-e)', border: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--tx)', fontSize: 12 }}>{isAr ? ({ 'Excel inventory': 'مخزون Excel', 'CSV exports': 'تصدير CSV', 'WhatsApp exports': 'تصدير WhatsApp' } as Record<string, string>)[item.label] : item.label}</strong>
                  <span className="chip chip-blue">{item.format}</span>
                </div>
                <div style={{ color: 'var(--tx-f)', fontSize: 10.5, marginTop: 5 }}>{isAr ? ({ 'Auto-detects headers up to row 10': 'يكتشف العناوين حتى الصف 10', 'Maps common English and Arabic aliases': 'يطابق المرادفات العربية والإنجليزية', 'Parses timestamps, phones, prices, and unit codes': 'يحلل التواريخ والأرقام والأسعار وأكواد الوحدات' } as Record<string, string>)[item.detail] : item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-hd"><span className="card-title">📊 {copy.outputs}</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {OUTPUT_SHEETS.map((sheet) => <span key={sheet} className="chip chip-blue">{sheet}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div style={{ padding: 13, borderLeft: '3px solid #C8961A', background: 'var(--bg-e)', borderRadius: 8 }}>
              <div className="kpi-lbl">{copy.rule}</div>
              <p style={{ margin: '7px 0 0', color: 'var(--tx-m)', fontSize: 11, lineHeight: 1.5 }}>{copy.ruleText}</p>
            </div>
            <div style={{ padding: 13, borderLeft: '3px solid #34D399', background: 'var(--bg-e)', borderRadius: 8 }}>
              <div className="kpi-lbl">{isAr ? 'المخطط الرئيسي' : 'Master schema'}</div>
              <p style={{ margin: '7px 0 0', color: 'var(--tx-m)', fontSize: 11, lineHeight: 1.5 }}>{isAr ? 'Unit_ID، Phone، Deal، Price_EGP، Compound، Unit_Code، Source_File، Notes والمزيد.' : 'Unit_ID, Phone, Deal, Price_EGP, Compound, Unit_Code, Source_File, Notes, and more.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
