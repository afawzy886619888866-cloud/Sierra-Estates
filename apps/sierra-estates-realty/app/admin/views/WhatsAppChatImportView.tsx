'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, CheckCircle2, AlertTriangle, Loader2, FileText, Database, BarChart2, Phone } from 'lucide-react';

interface ScrapeReport {
  totalMessages: number;
  listingsFound: number;
  duplicatesSkipped: number;
  syncedToSupabase: number;
  syncedToAirtable: number;
  failedRows: number;
  missingInfoCount: number;
  missingInfoSummary: Record<string, number>;
  missingInfoWarnings: string[];
  timestamp: string;
}

interface ScrapedListing {
  compound: string | null;
  price: number | null;
  priceType: string;
  area: number | null;
  bedrooms: number | null;
  unitType: string | null;
  ownerPhone: string | null;
  senderName: string;
  missingFields: string[];
  valuationScore: number;
  urgencyScore: number;
  hasPhoto: boolean;
  rawText: string;
}

interface Props {
  lang?: 'ar' | 'en';
}

export default function WhatsAppChatImportView({ lang = 'en' }: Props) {
  const isAr = lang === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [groupName, setGroupName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<ScrapeReport | null>(null);
  const [listings, setListings] = useState<ScrapedListing[]>([]);
  const [error, setError] = useState('');
  const [skipDup, setSkipDup] = useState(true);
  const [syncAirtable, setSyncAirtable] = useState(true);

  // OpenClaw Autonomous Scanner State
  const [isOpenClawScanning, setIsOpenClawScanning] = useState(false);
  const [openClawSummary, setOpenClawSummary] = useState<any>(null);
  const [openClawTelemetry, setOpenClawTelemetry] = useState<{
    totalExtractedUnits: number;
    directOwnersCount: number;
    pendingOutreachCount: number;
    lastReport?: any;
  } | null>(null);

  // NotebookLM Multi-Platform Harvester State
  const [isMultiPlatformScanning, setIsMultiPlatformScanning] = useState(false);
  const [multiPlatformReport, setMultiPlatformReport] = useState<any>(null);

  const handleRunMultiPlatformScan = async () => {
    setIsMultiPlatformScanning(true);
    setError('');
    try {
      const res = await fetch('/api/openclaw/scan-multiplatform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setMultiPlatformReport(data);
      } else {
        setError(data.message || 'Multiplatform scan failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error triggering Multiplatform scan');
    } finally {
      setIsMultiPlatformScanning(false);
    }
  };

  const fetchOpenClawTelemetry = async () => {
    try {
      const res = await fetch('/api/openclaw/scan-whatsapp-groups');
      if (res.ok) {
        const data = await res.json();
        setOpenClawTelemetry(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchOpenClawTelemetry();
  }, []);

  const handleRunOpenClawScan = async () => {
    setIsOpenClawScanning(true);
    setError('');
    try {
      const res = await fetch('/api/openclaw/scan-whatsapp-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetGroup: 'Owners August 2026' }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setOpenClawSummary(data.summary);
        await fetchOpenClawTelemetry();
      } else {
        setError(data.message || 'OpenClaw scan failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error triggering OpenClaw scan');
    } finally {
      setIsOpenClawScanning(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!groupName) setGroupName(f.name.replace(/\.txt$/i, ''));
    setReport(null);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.txt') || f.type === 'text/plain')) {
      setFile(f);
      if (!groupName) setGroupName(f.name.replace(/\.txt$/i, ''));
      setReport(null);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');
    setReport(null);
    setListings([]);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('groupName', groupName || 'Owners Group');
      form.append('skipDup', skipDup ? 'true' : 'false');
      form.append('airtable', syncAirtable ? 'true' : 'false');

      const res = await fetch('/api/ingest/whatsapp-group-chat', {
        method: 'POST',
        body: form,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Upload failed');
        return;
      }

      setReport(data.report);
      setListings(data.listings || []);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsUploading(false);
    }
  };

  const statCard = (label: string, value: number | string, color: string, icon: React.ReactNode) => (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: 'var(--surf)',
        border: `1px solid var(--bd)`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 140,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx-p)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--tx-m)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx-p)', margin: 0 }}>
            {isAr ? '📲 استيراد محادثات مجموعة الواتساب' : '📲 WhatsApp Group Chat Import'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--tx-m)', margin: '2px 0 0' }}>
            {isAr
              ? 'ارفع ملف .txt من صادرات المجموعة وسيستخرج الذكاء الاصطناعي الوحدات ويضيفها للمخزون وAirtable'
              : 'Upload a .txt export from any WhatsApp owners group. AI will extract listings and sync to inventory & Airtable.'}
          </p>
        </div>
      </div>

      {/* OpenClaw Autonomous Scanner Card */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(200, 150, 26, 0.08), rgba(37, 211, 102, 0.08))',
          border: '1px solid rgba(200, 150, 26, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx-p)' }}>
                {isAr ? 'وكيل OpenClaw لمسح مجموعات الواتساب التلقائي' : 'OpenClaw Autonomous WhatsApp Scanner'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                {isAr ? 'المجموعة المستهدفة: Owners August 2026 (120363044918239011@g.us)' : 'Target Group: Owners August 2026 (120363044918239011@g.us)'}
              </div>
            </div>
          </div>

          <button
            onClick={handleRunOpenClawScan}
            disabled={isOpenClawScanning}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isOpenClawScanning ? 'not-allowed' : 'pointer',
              opacity: isOpenClawScanning ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
            }}
          >
            {isOpenClawScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري مسح المجموعات بواسطة OpenClaw...' : 'OpenClaw Scanning Groups...'}</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{isAr ? 'تشغيل مسح ملاك أغسطس الآن (Daily Scan)' : 'Run Owners August Daily Scan Now'}</span>
              </>
            )}
          </button>
        </div>

        {/* Live Telemetry Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
          <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', fontWeight: 700 }}>
            {isAr ? 'الوحدات المستخرجة من الواتساب: ' : 'Extracted WhatsApp Units: '}
            {openClawTelemetry?.totalExtractedUnits ?? '...'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(200, 150, 26, 0.15)', color: '#C8961A', fontWeight: 700 }}>
            {isAr ? 'وحدات الملاك المباشرة: ' : 'Direct Owner Units: '}
            {openClawTelemetry?.directOwnersCount ?? '...'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', fontWeight: 700 }}>
            {isAr ? 'مسودات التواصل التلقائي مع الملاك: ' : 'Pending Owner Outreach Drafts: '}
            {openClawTelemetry?.pendingOutreachCount ?? '...'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255, 255, 255, 0.06)', color: 'var(--tx-m)', fontWeight: 600 }}>
            {isAr ? 'مجدول يومياً الساعة 06:00 صباحاً' : 'Scheduled Daily at 06:00 AM'}
          </span>
        </div>

        {/* Scan Summary Banner if just run */}
        {openClawSummary && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(37, 211, 102, 0.1)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              fontSize: 12,
              color: 'var(--tx-p)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontWeight: 700, color: '#25D366' }}>
              ✓ {isAr ? 'اكتمل مسح OpenClaw اليومي بنجاح!' : 'OpenClaw Daily Scan Completed Successfully!'}
            </div>
            <div style={{ color: 'var(--tx-m)' }}>
              {isAr
                ? `تم فحص ${openClawSummary.filesScanned} ملف دردشة · استخراج ${openClawSummary.realEstateListingsFound} إعلان عقاري · ${openClawSummary.outreachDraftsGenerated} مسودة تواصل تم تجهيزها في ${(openClawSummary.durationMs / 1000).toFixed(1)} ثانية.`
                : `Scanned ${openClawSummary.filesScanned} chat files · Extracted ${openClawSummary.realEstateListingsFound} property listings · ${openClawSummary.outreachDraftsGenerated} owner outreach drafts queued in ${(openClawSummary.durationMs / 1000).toFixed(1)}s.`}
            </div>
          </div>
        )}
      </div>

      {/* NotebookLM Multi-Platform Harvester Card */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(200, 150, 26, 0.08))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧠</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx-p)' }}>
                {isAr ? 'حاصد العقارات الذكي NotebookLM (عقارماب + دوبيزل + فيسبوك + واتساب)' : 'NotebookLM Multi-Platform Real Estate Harvester'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                {isAr
                  ? 'جمع عروض الملاك المباشرة من عقارماب، دوبيزل، وجروبات فيسبوك وواتساب التجمع الخامس وحساب تسعير المتر العادل'
                  : 'Grounded direct-owner scraping across AqarMap, Dubizzle, Facebook Groups & WhatsApp with AVM pricing arbitrage'}
              </div>
            </div>
          </div>

          <button
            onClick={handleRunMultiPlatformScan}
            disabled={isMultiPlatformScanning}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isMultiPlatformScanning ? 'not-allowed' : 'pointer',
              opacity: isMultiPlatformScanning ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
            }}
          >
            {isMultiPlatformScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري الفحص متعدد المنصات...' : 'Scanning Multi-Platforms...'}</span>
              </>
            ) : (
              <>
                <span>🌐</span>
                <span>{isAr ? 'تشغيل الحاصد متعدد المنصات الآن' : 'Run Multi-Platform Harvester'}</span>
              </>
            )}
          </button>
        </div>

        {/* Multi-Platform Telemetry & Results */}
        {multiPlatformReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', fontWeight: 700 }}>
                {isAr ? 'إجمالي المعروض: ' : 'Total Processed: '}
                {multiPlatformReport.report.totalProcessed}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', fontWeight: 700 }}>
                {isAr ? 'ملاك مباشرين معتمدين: ' : 'Authentic Direct Owners: '}
                {multiPlatformReport.report.ownerUnitsFoundCount}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(200, 150, 26, 0.15)', color: '#C8961A', fontWeight: 700 }}>
                {isAr ? 'صفقات ذهبية أقل من سعر السوق: ' : 'Golden Deals: '}
                {multiPlatformReport.report.goldenDealsCount}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 700 }}>
                {isAr ? 'إعلانات وسطاء مفلترة: ' : 'Broker Ads Filtered: '}
                {multiPlatformReport.report.brokerUnitsFiltered}
              </span>
            </div>

            {/* List of discovered owner units */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {multiPlatformReport.report.ownerUnits.map((u: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: u.arbitrageStatus === 'UNDERPRICED_GOLDEN_DEAL' ? '1px solid rgba(200, 150, 26, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: 'var(--tx-p)' }}>{u.compound}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', fontSize: 10, fontWeight: 700 }}>
                      {u.platform.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: '#25D366', fontWeight: 700 }}>{u.priceFormatted}</div>
                  <div style={{ color: 'var(--tx-m)', fontSize: 11 }}>
                    {u.areaSqm ? `${u.areaSqm} م²` : ''} {u.bedrooms ? `· ${u.bedrooms} غرف` : ''} · {u.finishing}
                  </div>
                  {u.arbitrageStatus === 'UNDERPRICED_GOLDEN_DEAL' && (
                    <div style={{ color: '#C8961A', fontWeight: 700, fontSize: 11 }}>
                      ⭐ {isAr ? `صفقة ذهبية (${u.arbitrageDeltaPct}% أقل من متوسط الكمبوند)` : `Golden Deal (${u.arbitrageDeltaPct}% vs median)`}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--tx-m)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Phone className="w-3 h-3 text-[#25D366]" />
                    <span>{u.contactPhone} ({u.contactName})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* How-to */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(37, 211, 102, 0.06)',
          border: '1px solid rgba(37, 211, 102, 0.2)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#25D366', marginBottom: 8 }}>
          📱 {isAr ? 'كيف تصدر من الموبايل:' : 'How to export from your phone:'}
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--tx-m)', lineHeight: 1.8 }}>
          <li>{isAr ? 'افتح المجموعة في واتساب' : 'Open the WhatsApp group'}</li>
          <li>{isAr ? 'اضغط ⋮ → المزيد → تصدير الدردشة' : 'Tap ⋮ → More → Export chat'}</li>
          <li>{isAr ? 'اختر "بدون وسائط"' : 'Choose "Without media"'}</li>
          <li>{isAr ? 'شارك ملف .txt عبر الإيميل أو Google Drive' : 'Share the .txt file via email or Google Drive'}</li>
          <li>{isAr ? 'ارفع الملف هنا 👇' : 'Upload it here 👇'}</li>
        </ol>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          padding: '32px 20px',
          borderRadius: 14,
          border: `2px dashed ${file ? '#25D366' : 'var(--bd)'}`,
          background: file ? 'rgba(37, 211, 102, 0.04)' : 'var(--surf)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {file ? (
          <>
            <FileText className="w-8 h-8" style={{ color: '#25D366' }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--tx-p)' }}>{file.name}</div>
            <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
              {(file.size / 1024).toFixed(1)} KB — {isAr ? 'جاهز للرفع' : 'Ready to upload'}
            </div>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8" style={{ color: 'var(--tx-m)' }} />
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx-p)' }}>
              {isAr ? 'اسحب وأفلت ملف .txt أو اضغط للاختيار' : 'Drop your .txt file here or click to browse'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
              {isAr ? 'يدعم تنسيق تصدير واتساب (iOS وAndroid)' : 'Supports both iOS and Android WhatsApp export formats'}
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept=".txt,text/plain" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {/* Config */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-m)', display: 'block', marginBottom: 6 }}>
            {isAr ? 'اسم المجموعة' : 'Group Name'}
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={isAr ? 'مثل: مجموعة الملاك - ميفيدا' : 'e.g. Owners Group - Mivida'}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--bd)',
              background: 'var(--surf)',
              color: 'var(--tx-p)',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', paddingBottom: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--tx-m)' }}>
            <input
              type="checkbox"
              checked={skipDup}
              onChange={(e) => setSkipDup(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            {isAr ? 'تجاهل المكررات' : 'Skip duplicates'}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--tx-m)' }}>
            <input
              type="checkbox"
              checked={syncAirtable}
              onChange={(e) => setSyncAirtable(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            {isAr ? 'مزامنة مع Airtable' : 'Sync to Airtable'}
          </label>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || isUploading}
        style={{
          padding: '12px 24px',
          borderRadius: 10,
          background: !file || isUploading
            ? 'var(--surf)'
            : 'linear-gradient(135deg, #25D366, #128C7E)',
          border: 'none',
          color: !file || isUploading ? 'var(--tx-m)' : '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: !file || isUploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
          transition: 'all 0.2s',
        }}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {isAr ? 'يتم التحليل...' : 'Analyzing...'}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {isAr ? 'ابدأ الاستيراد والتحليل' : 'Import & Analyze'}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 12,
              background: 'rgba(37, 211, 102, 0.08)',
              border: '1px solid rgba(37, 211, 102, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: '#25D366', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--tx-p)' }}>
                {isAr
                  ? `✅ تم الاستيراد بنجاح — ${report.listingsFound} وحدة مُستخرجة`
                  : `✅ Import Complete — ${report.listingsFound} listings extracted`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                {new Date(report.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {statCard(
              isAr ? 'رسائل محللة' : 'Messages Parsed',
              report.totalMessages,
              'rgba(201, 168, 76, 0.15)',
              <BarChart2 className="w-4 h-4" style={{ color: '#C9A84C' }} />
            )}
            {statCard(
              isAr ? 'وحدات مستخرجة' : 'Listings Found',
              report.listingsFound,
              'rgba(37, 211, 102, 0.15)',
              <MessageSquare className="w-4 h-4" style={{ color: '#25D366' }} />
            )}
            {statCard(
              isAr ? 'تمت المزامنة' : 'Synced to DB',
              report.syncedToSupabase,
              'rgba(99, 179, 237, 0.15)',
              <Database className="w-4 h-4" style={{ color: '#63B3ED' }} />
            )}
            {statCard(
              isAr ? 'مكررات متجاهلة' : 'Duplicates Skipped',
              report.duplicatesSkipped,
              'rgba(156, 163, 175, 0.15)',
              <CheckCircle2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            )}
          </div>

          {/* Missing info warnings */}
          {report.missingInfoCount > 0 && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: '#F59E0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle className="w-4 h-4" />
                {isAr ? `⚠️ معلومات ناقصة في ${report.missingInfoCount} وحدة` : `⚠️ Missing info in ${report.missingInfoCount} listings`}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(report.missingInfoSummary).map(([field, count]) => (
                  <span
                    key={field}
                    style={{
                      fontSize: 11,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#F59E0B',
                      fontWeight: 700,
                    }}
                  >
                    {field}: {count}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx-m)', marginTop: 8 }}>
                {isAr
                  ? 'الوحدات بمعلومات ناقصة تمت إضافتها بحالة "تحتاج مراجعة". تواصل مع المرسل لاستكمال البيانات.'
                  : 'Incomplete listings were added with status "Needs Review". Contact the sender to complete the missing info.'}
              </div>
            </div>
          )}

          {/* Listings preview */}
          {listings.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx-p)', marginBottom: 10 }}>
                {isAr ? `📋 معاينة الوحدات المستخرجة (${listings.length})` : `📋 Extracted Listings Preview (${listings.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {listings.slice(0, 20).map((l, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'var(--surf)',
                      border: '1px solid var(--bd)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background:
                          l.valuationScore >= 80
                            ? 'rgba(37, 211, 102, 0.15)'
                            : 'rgba(201, 168, 76, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 14,
                      }}
                    >
                      {l.valuationScore >= 80 ? '🔥' : '🏠'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--tx-p)' }}>
                          {l.compound || (isAr ? 'مجمع غير محدد' : 'Unknown Compound')}
                        </span>
                        {l.priceType === 'rent' ? (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(99, 179, 237, 0.15)', color: '#63B3ED', fontWeight: 700 }}>
                            {isAr ? 'إيجار' : 'Rent'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', fontWeight: 700 }}>
                            {isAr ? 'بيع' : 'Sale'}
                          </span>
                        )}
                        {l.missingFields.length > 0 && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 700 }}>
                            ⚠️ {l.missingFields.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tx-m)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {l.price && (
                          <span>💰 {(l.price / 1_000_000).toFixed(1)}M EGP</span>
                        )}
                        {l.area && <span>📐 {l.area}m²</span>}
                        {l.bedrooms && <span>🛏 {l.bedrooms} bed</span>}
                        {l.unitType && <span>🏗 {l.unitType}</span>}
                        {l.ownerPhone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone className="w-3 h-3" />
                            {l.ownerPhone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: l.valuationScore >= 80 ? '#25D366' : 'var(--tx-m)' }}>
                      {l.valuationScore}%
                    </div>
                  </div>
                ))}
                {listings.length > 20 && (
                  <div style={{ fontSize: 12, color: 'var(--tx-m)', textAlign: 'center', padding: '8px 0' }}>
                    {isAr ? `+ ${listings.length - 20} وحدة إضافية في قاعدة البيانات` : `+ ${listings.length - 20} more units stored in database`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
