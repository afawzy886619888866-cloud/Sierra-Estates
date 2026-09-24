'use client';

import React, { useState, useRef } from 'react';
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
