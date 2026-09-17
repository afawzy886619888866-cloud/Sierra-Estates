/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef } from 'react';
import {
  Smartphone,
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  Database,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { WHATSAPP_GROUP_REGISTRY } from '../../../../packages/agents/tools/whatsappGroupRegistry';

interface ParsedUnit {
  id: string;
  timestamp: string;
  sender: string;
  phone: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  beds: number;
  baths: number;
  area: number;
  price: number;
  finishing: string;
  sierraCode: string;
  rawText: string;
  isOwner: boolean;
  confidence: number;
  isDuplicate: boolean;
  duplicateOf?: string;
  summary: string;
  photoUrl?: string;
  images?: string[];
}

interface ScanStats {
  totalChatMessages: number;
  realEstateMessagesCount: number;
  extractedUnitsCount: number;
  directOwnersCount: number;
  duplicatesCount: number;
  ingestedCount: number;
}

const SAMPLE_MOBILE_OWNER_CHAT = `[12/08/2026, 10:15:32 AM] المهندس شريف (مالك ميفيدا): السلام عليكم، للبيع شقة من المالك مباشرة في كمبوند ميفيدا التجمع الخامس مساحة 210 متر بحري، 3 غرف نوم و3 حمام تشطيب الترا سوبر لوكس بالتكييفات والمطبخ، مطلوب 18,500,000 كاش للتواصل 01001928472
[12/08/2026, 11:42:10 AM] دكتورة منى - مالكة فيلييت: متاح للإيجار فيلا مستقلة في كمبوند فيلييت سوديك التجمع مساحة المباني 380 متر أرض 520 متر، 5 غرف بحمام سباحة خاص وحديقة كبيرة، مطلوب 110,000 شهرياً، الاتصال: 01223948571
[12/08/2026, 01:05:19 PM] م. هاني هايد بارك: تاون هاوس للبيع في هايد بارك كورنر مساحة 260 متر 4 غرف تشطيب كامل استلام فوري، مطلوب 22 مليون، تليفون 01092837465
[12/08/2026, 02:30:45 PM] الحاج محمود (الرحاب): شقة للإيجار في الرحاب 2 مساحة 135 متر دور ثاني 3 غرف وحمامين مفروشة بالكامل مطلوب 38 الف شهرياً 01119284756
[12/08/2026, 04:15:00 PM] System: Messages and calls are end-to-end encrypted.
[12/08/2026, 05:22:11 PM] د. حسام (بالم هيلز): دوبلكس مميز للبيع في بالم هيلز نيو كايرو 280م بحديقة 120م 4 غرف تشطيب كامل السعر 24,000,000 كاش المالك 01002384910`;

export default function WhatsAppChatScanner({
  lang = 'en',
  onUnitsIngested,
}: {
  lang?: string;
  onUnitsIngested?: (stats: ScanStats) => void;
}) {
  const isAr = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedGroup, setSelectedGroup] = useState('Owners August 2026');
  const [groupType, setGroupType] = useState<'owner' | 'broker' | 'mixed'>('owner');
  const [chatText, setChatText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [parsedUnits, setParsedUnits] = useState<ParsedUnit[]>([]);

  // Pre-filtered owner groups from canonical registry
  const ownerGroups = WHATSAPP_GROUP_REGISTRY.filter((g) => g.type === 'owner');
  const brokerGroups = WHATSAPP_GROUP_REGISTRY.filter((g) => g.type === 'broker');

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    const reg = WHATSAPP_GROUP_REGISTRY.find((g) => g.name === groupName);
    if (reg) {
      setGroupType(reg.type);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setChatText(content);
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg(isAr ? 'فشل قراءة الملف' : 'Failed to read uploaded file');
    };
    reader.readAsText(file);
  };

  const handleScan = async (action: 'parse_only' | 'ingest') => {
    if (!chatText || chatText.trim().length < 10) {
      setErrorMsg(
        isAr
          ? 'يرجى تحميل ملف محادثة واتساب أو لصق النص أولاً'
          : 'Please upload a WhatsApp chat file or paste chat text first'
      );
      return;
    }

    if (action === 'ingest') {
      setIsIngesting(true);
    } else {
      setIsScanning(true);
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/whatsapp/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: chatText,
          groupName: selectedGroup,
          groupType,
          action,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to scan WhatsApp chat');
      }

      setScanStats(json.stats);
      setParsedUnits(json.units || []);

      if (action === 'ingest') {
        setSuccessMsg(
          isAr
            ? `✓ تم بنجاح استيراد ${json.stats.ingestedCount} عقار مباشر إلى قاعدة بيانات المخزون الرئيسي!`
            : `✓ Successfully ingested ${json.stats.ingestedCount} direct listings into Master Inventory!`
        );
        if (onUnitsIngested) {
          onUnitsIngested(json.stats);
        }
      } else {
        setSuccessMsg(
          isAr
            ? `✓ تم تحليل ${json.stats.totalChatMessages} رسالة واستخراج ${json.stats.extractedUnitsCount} عقار (${json.stats.directOwnersCount} مالك مباشر)`
            : `✓ Scanned ${json.stats.totalChatMessages} messages. Identified ${json.stats.extractedUnitsCount} units (${json.stats.directOwnersCount} direct owners)`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing WhatsApp chat');
    } finally {
      setIsScanning(false);
      setIsIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        style={{
          padding: '24px 28px',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(18, 140, 126, 0.18))',
          border: '1px solid rgba(37, 211, 102, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '5px 12px',
                borderRadius: 20,
                background: 'rgba(37, 211, 102, 0.25)',
                color: '#25D366',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                fontWeight: 700,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {isAr ? 'ماسح محادثات واتساب الموبايل' : 'Mobile WhatsApp Chat Harvester'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                padding: '4px 10px',
                borderRadius: 16,
                background: 'rgba(212, 175, 55, 0.2)',
                color: 'var(--gold)',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              ⭐ {isAr ? 'أولوية مجموعات الملاك' : 'Owner Priority Engine'}
            </span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', margin: 0 }}>
            {isAr ? 'استخراج المخزون من أرشيف محادثات واتساب الموبايل' : 'Scan & Ingest Mobile WhatsApp Chat Archives'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--tx-m)', margin: '6px 0 0 0', maxWidth: 650 }}>
            {isAr
              ? 'تصدير المحادثات من موبايل واتساب يحتوي على كامل تاريخ الرسائل دون التقيد بذاكرة المتصفح. ارفع ملف التصدير (.txt) ليتم استخراج العقارات ومطابقة الملاك المباشرين فورياً.'
              : 'Exporting chat from WhatsApp Mobile preserves months of full message history. Upload your exported .txt or paste logs to automatically extract listings, isolate direct owners, and ingest into inventory.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setChatText(SAMPLE_MOBILE_OWNER_CHAT);
              setSelectedGroup('Owners August 2026');
              setGroupType('owner');
              setFileName('sample-owners-august-2026.txt');
            }}
            style={{
              padding: '9px 15px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--bd-s)',
              color: 'var(--tx)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'تحميل نموذج محادثة الملاك' : 'Load Sample Owner Chat'}</span>
          </button>
        </div>
      </div>

      {/* Target Group Selector & Instructions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {/* Step 1: Select WhatsApp Group */}
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: 'var(--bg-e)',
            border: '1px solid var(--bd)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', margin: 0 }}>
              {isAr ? '1. اختر مجموعة الواتساب المستهدفة' : '1. Select Target WhatsApp Group'}
            </h3>
          </div>

          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx-m)', display: 'block', marginBottom: 6 }}>
            {isAr ? 'مجموعات الملاك المباشرين (أولوية قصوى ⭐):' : 'Direct Owner Groups (Highest Priority ⭐):'}
          </label>
          <select
            aria-label={isAr ? 'اختر مجموعة الواتساب المستهدفة' : 'Select Target WhatsApp Group'}
            title={isAr ? 'اختر مجموعة الواتساب المستهدفة' : 'Select Target WhatsApp Group'}
            value={selectedGroup}
            onChange={(e) => handleGroupSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--bg-c)',
              border: '1px solid var(--bd)',
              color: 'var(--tx)',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <optgroup label={isAr ? '🌟 مجموعات الملاك المباشرين' : '🌟 Verified Direct Owner Groups'}>
              {ownerGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name} — ({g.description || 'Owner Group'})
                </option>
              ))}
            </optgroup>
            <optgroup label={isAr ? 'شبكات الوسطاء والإدراج الذكي' : 'Broker & Intake Networks'}>
              {brokerGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name} — ({g.description || 'Broker Group'})
                </option>
              ))}
            </optgroup>
          </select>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: groupType === 'owner' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${groupType === 'owner' ? 'rgba(37, 211, 102, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
              fontSize: 12,
            }}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {isAr
                ? `نوع المجموعة: ${groupType === 'owner' ? 'ملاك مباشرين (Direct Owners)' : 'شبكة وسطاء (Brokers)'}`
                : `Channel Profile: ${groupType === 'owner' ? 'Direct Owners Verified' : 'Broker Network'}`}
            </span>
          </div>

          {/* Quick Guide */}
          <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--tx-m)', lineHeight: 1.6 }}>
            <strong>{isAr ? 'طريقة التصدير من الهاتف:' : 'How to export from WhatsApp Mobile:'}</strong>
            <ol style={{ paddingInlineStart: 18, margin: '6px 0 0 0' }}>
              <li>{isAr ? 'افتح واتساب على الموبايل وادخل على الجروب.' : 'Open group chat on your phone.'}</li>
              <li>{isAr ? 'اضغط على اسم الجروب ➔ تصدير المحادثة (Export Chat).' : 'Tap group name ➔ Export Chat.'}</li>
              <li>{isAr ? 'اختر "بدون وسائط" (Without Media) للحصول على ملف .txt سريع.' : 'Choose "Without Media" to get clean .txt file.'}</li>
              <li>{isAr ? 'ارفع الملف هنا أو انسخ محتواه.' : 'Upload the exported file or paste text below.'}</li>
            </ol>
          </div>
        </div>

        {/* Step 2: Input / Upload */}
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: 'var(--bg-e)',
            border: '1px solid var(--bd)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', margin: 0 }}>
                {isAr ? '2. رفع ملف المحادثة أو لصق النص' : '2. Upload Chat Export or Paste Text'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(37, 211, 102, 0.2)',
                border: '1px solid rgba(37, 211, 102, 0.4)',
                color: '#25D366',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📁 {isAr ? 'اختيار ملف .txt' : 'Browse .txt File'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              aria-label={isAr ? 'رفع ملف محادثة واتساب' : 'Upload WhatsApp chat export file'}
              title={isAr ? 'رفع ملف محادثة واتساب' : 'Upload WhatsApp chat export file'}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          {fileName && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {isAr ? 'الملف المحدد:' : 'Loaded file:'} {fileName}
              </span>
            </div>
          )}

          <textarea
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder={
              isAr
                ? 'الصق محادثة الواتساب المصدرة هنا...\nمثال:\n[12/08/2026, 10:15 AM] أحمد: شقة للبيع في ميفيدا 200م 3 غرف سعر 18 مليون كاش 0100...'
                : 'Paste exported WhatsApp chat logs here...\ne.g.\n[12/08/2026, 10:15 AM] Ahmed: Villa for sale in Mivida 350m, 4 beds, 22M cash, 0100...'
            }
            rows={7}
            style={{
              width: '100%',
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: 'var(--bg-c)',
              border: '1px solid var(--bd)',
              color: 'var(--tx)',
              fontSize: 12,
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              disabled={isScanning || isIngesting}
              onClick={() => handleScan('parse_only')}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--bd-s)',
                color: 'var(--tx)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-blue-400" />
              )}
              <span>{isAr ? 'معاينة وتحليل السجلات' : 'Scan & Analyze Chat'}</span>
            </button>

            <button
              type="button"
              disabled={isScanning || isIngesting}
              onClick={() => handleScan('ingest')}
              style={{
                flex: 1.2,
                padding: '11px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                border: 'none',
                color: '#fff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              }}
            >
              {isIngesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>{isAr ? 'اعتماد وإضافة للمخزون الرئيسي' : 'Approve & Ingest to Inventory'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(37, 211, 102, 0.15)',
            border: '1px solid rgba(37, 211, 102, 0.4)',
            color: '#25D366',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      {scanStats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'var(--bg-e)',
              border: '1px solid var(--bd)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--tx-m)', marginBottom: 4 }}>
              {isAr ? 'إجمالي رسائل المحادثة' : 'Chat Messages'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>
              {scanStats.totalChatMessages.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'var(--bg-e)',
              border: '1px solid var(--bd)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--tx-m)', marginBottom: 4 }}>
              {isAr ? 'عقارات تم استخراجها' : 'Identified Units'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>
              {scanStats.extractedUnitsCount.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(37, 211, 102, 0.1)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
            }}
          >
            <div style={{ fontSize: 11, color: '#25D366', fontWeight: 600, marginBottom: 4 }}>
              ⭐ {isAr ? 'ملاك مباشرين' : 'Direct Owners'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#25D366' }}>
              {scanStats.directOwnersCount.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'var(--bg-e)',
              border: '1px solid var(--bd)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--tx-m)', marginBottom: 4 }}>
              {isAr ? 'تكرار تم فلترته' : 'Duplicates Filtered'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>
              {scanStats.duplicatesCount.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>
              {isAr ? 'تمت إضافتها للمخزون' : 'Ingested to DB'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>
              {scanStats.ingestedCount.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Extracted Units Preview Table */}
      {parsedUnits.length > 0 && (
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: 'var(--bg-e)',
            border: '1px solid var(--bd)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', margin: 0 }}>
              {isAr ? 'قائمة العقارات المستخرجة والمطابقة' : 'Extracted & Parsed Property Listings'}
            </h3>
            <span style={{ fontSize: 11, color: 'var(--tx-m)', fontFamily: 'monospace' }}>
              {parsedUnits.length} {isAr ? 'عقار مستخرج' : 'units found'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd-s)', color: 'var(--tx-m)' }}>
                  <th style={{ padding: '10px 12px' }}>{isAr ? 'الكمبوند / العقار' : 'Compound & Type'}</th>
                  <th style={{ padding: '10px 12px' }}>{isAr ? 'المواصفات' : 'Specs'}</th>
                  <th style={{ padding: '10px 12px' }}>{isAr ? 'السعر' : 'Price'}</th>
                  <th style={{ padding: '10px 12px' }}>{isAr ? 'المالك / الاتصال' : 'Owner / Contact'}</th>
                  <th style={{ padding: '10px 12px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '10px 12px' }}>{isAr ? 'كود SBR' : 'SBR Code'}</th>
                </tr>
              </thead>
              <tbody>
                {parsedUnits.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--bd-f)',
                      background: u.isDuplicate ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.photoUrl && (
                          <img
                            src={u.photoUrl}
                            alt={u.compound}
                            style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--bd-s)', flexShrink: 0 }}
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--tx)' }}>{u.compound}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                            {u.propertyType} · {u.mode === 'sale' ? (isAr ? 'بيع' : 'Sale') : isAr ? 'إيجار' : 'Rent'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div>{u.area} sqm</div>
                      <div style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                        {u.beds} BD · {u.baths} BA · {u.finishing}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--emerald)' }}>
                        {(u.price / 1000000).toFixed(2)}M EGP
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--tx-f)' }}>
                        {Math.round(u.price / u.area).toLocaleString()} EGP/sqm
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 700,
                            background: u.isOwner ? 'rgba(37, 211, 102, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: u.isOwner ? '#25D366' : 'var(--blue)',
                          }}
                        >
                          {u.isOwner ? (isAr ? '⭐ مالك مباشر' : '⭐ Direct Owner') : isAr ? 'وسيط' : 'Broker'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tx-m)', marginTop: 3 }}>
                        {u.phone}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      {u.isDuplicate ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                          }}
                        >
                          {isAr ? 'مكرر سابقاً' : 'Duplicate'}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            background: 'rgba(37, 211, 102, 0.2)',
                            color: '#25D366',
                          }}
                        >
                          ✓ {isAr ? 'جديد مؤهل' : 'New Intake'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: 'var(--gold)',
                          background: 'rgba(212, 175, 55, 0.1)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {u.sierraCode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
