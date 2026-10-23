'use client';

import React, { useState } from 'react';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  service: 'Next.js App Router' | 'Python FastAPI' | 'n8n Automation';
  summary: { en: string; ar: string };
  auth: 'Bearer JWT (Admin)' | 'Public API' | 'HMAC Webhook';
  rateLimit: string;
  p50: string;
  p95: string;
  sampleRequest?: string;
  sampleResponse: string;
}

const ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'ep-1',
    method: 'GET',
    path: '/api/listings',
    service: 'Next.js App Router',
    summary: { en: 'Fetch paginated luxury listings with compound, type, and price filters.', ar: 'استعلام عن قائمة العقارات مع الفلترة حسب المجمع والنوع والسعر.' },
    auth: 'Public API',
    rateLimit: '120 req/min',
    p50: '68ms',
    p95: '210ms',
    sampleResponse: JSON.stringify(
      {
        success: true,
        count: 2,
        data: [
          {
            id: 'prop-mvd-01',
            title: 'Mivida Standalone Villa Type B',
            compound: 'Mivida',
            priceEgp: 24500000,
            beds: 4,
            baths: 5,
            areaM2: 380,
            status: 'active'
          }
        ]
      },
      null,
      2
    )
  },
  {
    id: 'ep-2',
    method: 'POST',
    path: '/api/leads',
    service: 'Next.js App Router',
    summary: { en: 'Ingest inbound lead inquiry and dispatch to triage AI.', ar: 'تسجيل عميل محتمل جديد وتوجيهه لبوت التأهيل الذكي.' },
    auth: 'Public API',
    rateLimit: '60 req/min',
    p50: '94ms',
    p95: '310ms',
    sampleRequest: JSON.stringify(
      {
        fullName: 'Eng. Karim El-Sayed',
        phoneNumber: '+201012345678',
        preferredCompound: 'Hyde Park',
        budgetMaxEgp: 28000000,
        dealType: 'sale'
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify(
      {
        success: true,
        leadId: 'lead_9041a',
        qualificationStatus: 'queued_for_leila',
        assignedAgent: 'Leila AI Concierge'
      },
      null,
      2
    )
  },
  {
    id: 'ep-3',
    method: 'POST',
    path: '/api/leads/request-viewing',
    service: 'Next.js App Router',
    summary: { en: 'Schedule in-person property walkthrough and notify closer.', ar: 'طلب معاينة ميدانية للعقار وتنبيه المستشار المسؤول.' },
    auth: 'Public API',
    rateLimit: '30 req/min',
    p50: '115ms',
    p95: '380ms',
    sampleRequest: JSON.stringify(
      {
        propertyId: 'prop-mvd-01',
        leadPhone: '+201012345678',
        requestedDate: '2026-09-10T15:00:00Z',
        notes: 'Client interested in lake view orientation'
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify(
      {
        success: true,
        viewingId: 'view_819b',
        confirmed: true,
        calendarLink: 'https://cal.sierra-estates.net/view_819b'
      },
      null,
      2
    )
  },
  {
    id: 'ep-4',
    method: 'POST',
    path: '/api/v1/valuation/avm',
    service: 'Python FastAPI',
    summary: { en: 'Execute automated valuation model (AVM) with regional hedonic regression.', ar: 'حساب التقييم العقاري العادل والتنبؤ بسعر المتر بناءً على صفقات المنطقة.' },
    auth: 'Bearer JWT (Admin)',
    rateLimit: '300 req/min',
    p50: '142ms',
    p95: '420ms',
    sampleRequest: JSON.stringify(
      {
        compound: 'Mountain View iCity',
        unitType: 'Penthouse',
        builtUpArea: 295,
        finishingType: 'ultra_lux',
        floorNumber: 4,
        deliveryYear: 2024
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify(
      {
        valuationBaselineEgp: 16800000,
        pricePerMeterEgp: 56949,
        marketConfidenceScore: 0.94,
        recommendation: 'FAIR_MARKET_VALUE',
        compsAnalyzed: 18
      },
      null,
      2
    )
  },
  {
    id: 'ep-5',
    method: 'POST',
    path: '/api/sync/propertyfinder',
    service: 'Python FastAPI',
    summary: { en: 'Trigger background synchronization with PropertyFinder portal listings.', ar: 'تشغيل مزامنة الإعلانات مع بوابة بروبرتي فايندر في الخلفية.' },
    auth: 'Bearer JWT (Admin)',
    rateLimit: '10 req/min',
    p50: '280ms',
    p95: '890ms',
    sampleRequest: JSON.stringify({ compoundFilter: 'All', maxPages: 5 }, null, 2),
    sampleResponse: JSON.stringify(
      {
        status: 'sync_job_queued',
        jobId: 'job_pf_772',
        worker: 'Cloud Run worker :8000'
      },
      null,
      2
    )
  },
  {
    id: 'ep-6',
    method: 'POST',
    path: '/api/webhooks/whatsapp',
    service: 'n8n Automation',
    summary: { en: 'Handle incoming WhatsApp cloud messages and route to Leila bot.', ar: 'استقبال رسائل واتساب السحابية وتوجيهها مباشرة إلى محرك ليلى.' },
    auth: 'HMAC Webhook',
    rateLimit: '1,000 req/min',
    p50: '45ms',
    p95: '120ms',
    sampleRequest: JSON.stringify(
      {
        from: '+201099887766',
        message: 'مساء الخير، محتاج فيلا تاون هاوس في التجمع الخامس ميزانية 15 مليون',
        timestamp: 1788776400
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify({ status: 'delivered_to_n8n', eventId: 'evt_wa_991' }, null, 2)
  },
];

export default function ApiGatewayView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(ENDPOINTS[0]);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'GET':
        return '#C8961A';
      case 'POST':
        return '#34D399';
      case 'PATCH':
        return '#F59E0B';
      case 'DELETE':
        return '#E63946';
      default:
        return '#FFFFFF';
    }
  };

  const handleCopyCurl = () => {
    const isPost = selectedEndpoint.method === 'POST';
    const curl = `curl -X ${selectedEndpoint.method} "https://sierra-estates.net${selectedEndpoint.path}" \\
  -H "Content-Type: application/json" \\
  ${selectedEndpoint.auth.includes('Bearer') ? '-H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \\\n  ' : ''}${isPost && selectedEndpoint.sampleRequest ? `-d '${selectedEndpoint.sampleRequest.replace(/\n/g, '')}'` : ''}`;

    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2500);
  };

  return (
    <div className="fade-up" style={{ paddingBottom: 40, direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 32, 53, 0.95) 0%, rgba(8, 18, 32, 0.98) 100%)',
          border: '1px solid rgba(0, 174, 255, 0.25)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#C8961A',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(0, 174, 255, 0.1)',
              border: '1px solid rgba(0, 174, 255, 0.25)',
            }}
          >
            {isAr ? 'بوابة واجهات التطبيقات REST & OPENAPI' : 'RESTful API GATEWAY & CONTRACT EXPLORER'}
          </span>
          <span style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="pulse-dot">●</span> 99.4% {isAr ? 'نسبة النجاح (2xx)' : 'Success Rate (2xx)'}
          </span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: isAr ? 700 : 600,
            fontFamily: isAr ? "'Cairo', sans-serif" : "'Cormorant Garamond', serif",
            color: '#FFFFFF',
            marginBottom: 6,
          }}
        >
          {isAr ? 'عقود واجهات البرمجة ومقاييس الأداء' : 'API Design Architecture & Endpoints Directory'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(240, 237, 229, 0.72)', maxWidth: 640 }}>
          {isAr
            ? 'دليل تفاعلي شامل لكافة واجهات RESTful، ومخططات الاستجابة ومعدلات زمن التأخير استناداً لمعايير api-design-principles.'
            : 'Interactive contract directory adhering to api-design-principles standards with schema inspection, latency percentiles, and cURL snippets.'}
        </p>
      </div>

      {/* Observability Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: isAr ? 'متوسط الاستجابة (p50)' : 'Median Latency (p50)', val: '78ms', color: '#34D399', icon: '⚡' },
          { label: isAr ? 'أقصى استجابة (p95)' : '95th Percentile (p95)', val: '290ms', color: '#C8961A', icon: '⏱️' },
          { label: isAr ? 'معدل الأخطاء (5xx)' : 'Error Rate (5xx)', val: '0.08%', color: '#34D399', icon: '🛡️' },
          { label: isAr ? 'استهلاك الحصة' : 'Rate Quota Used', val: '1,420 / 10,000', color: '#F59E0B', icon: '📊' },
        ].map((m, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(15, 32, 53, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '16px 18px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: 'rgba(240, 237, 229, 0.6)' }}>
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {/* Main Split: Endpoints List & Detail Inspector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(380px, 1.4fr)',
          gap: 20,
        }}
      >
        {/* Endpoints List */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(15, 32, 53, 0.8) 0%, rgba(9, 20, 36, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 18,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', padding: '6px 8px', marginBottom: 4 }}>
            {isAr ? 'الواجهات النشطة (Active Endpoints)' : 'Active API Endpoints'}
          </div>

          {ENDPOINTS.map((ep) => {
            const isSelected = selectedEndpoint.id === ep.id;
            const color = getMethodBadgeColor(ep.method);
            return (
              <div
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: isSelected
                    ? `1px solid ${color}66`
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isSelected
                    ? `linear-gradient(90deg, ${color}18 0%, rgba(255, 255, 255, 0.02) 100%)`
                    : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 120ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${color}22`,
                      color: color,
                      border: `1px solid ${color}44`,
                    }}
                  >
                    {ep.method}
                  </span>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: '#FFFFFF',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ep.path}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(240, 237, 229, 0.55)', lineHeight: 1.4 }}>
                  {isAr ? ep.summary.ar : ep.summary.en}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Endpoint Contract Inspector */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(15, 32, 53, 0.85) 0%, rgba(9, 20, 36, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 18,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: `${getMethodBadgeColor(selectedEndpoint.method)}22`,
                    color: getMethodBadgeColor(selectedEndpoint.method),
                    border: `1px solid ${getMethodBadgeColor(selectedEndpoint.method)}44`,
                  }}
                >
                  {selectedEndpoint.method}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                  {selectedEndpoint.path}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gold, #C8961A)' }}>
                {selectedEndpoint.service} · {selectedEndpoint.auth}
              </div>
            </div>

            <button
              onClick={handleCopyCurl}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(0, 174, 255, 0.15)',
                border: '1px solid rgba(0, 174, 255, 0.35)',
                color: '#E9C176',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{copiedCurl ? '✓' : '📋'}</span>
              <span>{copiedCurl ? (isAr ? 'تم النسخ!' : 'Copied cURL!') : (isAr ? 'نسخ كود cURL' : 'Copy cURL')}</span>
            </button>
          </div>

          {/* Telemetry chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.04)', padding: '4px 8px', borderRadius: 6, color: 'rgba(240, 237, 229, 0.7)' }}>
              Rate Limit: <strong style={{ color: '#FFFFFF' }}>{selectedEndpoint.rateLimit}</strong>
            </span>
            <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.04)', padding: '4px 8px', borderRadius: 6, color: 'rgba(240, 237, 229, 0.7)' }}>
              Latency p50: <strong style={{ color: '#34D399' }}>{selectedEndpoint.p50}</strong>
            </span>
            <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.04)', padding: '4px 8px', borderRadius: 6, color: 'rgba(240, 237, 229, 0.7)' }}>
              Latency p95: <strong style={{ color: '#C8961A' }}>{selectedEndpoint.p95}</strong>
            </span>
          </div>

          {/* Request Payload (if present) */}
          {selectedEndpoint.sampleRequest && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240, 237, 229, 0.6)', marginBottom: 6 }}>
                REQUEST BODY (JSON)
              </div>
              <pre
                style={{
                  background: 'rgba(5, 11, 20, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#A5F3FC',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {selectedEndpoint.sampleRequest}
              </pre>
            </div>
          )}

          {/* Response Payload */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240, 237, 229, 0.6)', marginBottom: 6 }}>
              SUCCESS RESPONSE (200 OK)
            </div>
            <pre
              style={{
                background: 'rgba(5, 11, 20, 0.85)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: 10,
                padding: 12,
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#6EE7B7',
                overflowX: 'auto',
                lineHeight: 1.5,
              }}
            >
              {selectedEndpoint.sampleResponse}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
