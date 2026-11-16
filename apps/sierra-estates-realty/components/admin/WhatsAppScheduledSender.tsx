'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  ListFilter,
  Zap,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  Trash2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface ScheduledJobItem {
  id: string;
  toPhone: string;
  purpose: string;
  body: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string | null;
  sentAt: string | null;
  attempts: number;
}

interface GatewayLineItem {
  id: string;
  name: string;
  phone?: string | null;
  status: string;
}

export default function WhatsAppScheduledSender({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [recipientInput, setRecipientInput] = useState('+201092048333');
  const [messageBody, setMessageBody] = useState(
    'أهلاً بحضرتك يا فندم، أنا ليلى من Sierra Estates 🌸\nنود الاستفسار هل الوحدة لا زالت متاحة حالياً؟ وما هي أحدث المواصفات والأسعار المطلوبة؟ معنا عدد من العملاء المهتمين بالتجمع الخامس.\nشكراً جزيلاً لوقت حضرتك 🤝'
  );

  // Dispatch mode: 'instant' (stealth human direct send) vs 'scheduled' (queued broadcast)
  const [dispatchMode, setDispatchMode] = useState<'instant' | 'scheduled'>('instant');
  const [selectedSession, setSelectedSession] = useState<string>('auto');
  const [gatewayLines, setGatewayLines] = useState<GatewayLineItem[]>([]);

  const [purpose, setPurpose] = useState('campaign-broadcast');
  const [campaignName, setCampaignName] = useState('New Cairo Resale Outreach');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isImmediate, setIsImmediate] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDraining, setIsDraining] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  // Queue state
  const [queueJobs, setQueueJobs] = useState<ScheduledJobItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'queued' | 'sent' | 'failed'>('all');

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch('/api/admin/whatsapp/schedule?limit=30');
      const json = await res.json();
      if (json.success) {
        setQueueJobs(json.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchGatewayLines = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/outbox?limit=1');
      const json = await res.json();
      if (json.gateway?.sessions && Array.isArray(json.gateway.sessions)) {
        setGatewayLines(json.gateway.sessions);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchQueue();
    fetchGatewayLines();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const parsedRecipients = useMemo(() => {
    const lines = recipientInput
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 6);

    return lines.map((line, idx) => {
      const parts = line.split(/[,\t]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const p1Digits = parts[0].replace(/\D/g, '');
        const p2Digits = parts[1].replace(/\D/g, '');
        if (p1Digits.length >= 8 && isNaN(Number(parts[1]))) {
          return { phone: parts[0], name: parts[1] };
        } else if (p2Digits.length >= 8 && isNaN(Number(parts[0]))) {
          return { phone: parts[1], name: parts[0] };
        }
      }
      return { phone: line, name: `Client #${idx + 1}` };
    });
  }, [recipientInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatusMsg(null);

    try {
      if (parsedRecipients.length === 0) {
        throw new Error(isAr ? 'يرجى إدخال رقم هاتف واحد على الأقل' : 'Please enter at least one valid phone number');
      }

      if (dispatchMode === 'instant') {
        // Direct Instant Dispatch through OpenWA Gateway with Stealth Human Emulation
        const res = await fetch('/api/admin/whatsapp/direct-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: parsedRecipients,
            body: messageBody,
            sessionId: selectedSession,
          }),
        });

        const json = await res.json();
        if (!json.success && json.sentCount === 0) {
          throw new Error(json.error || json.message || 'Failed to dispatch WhatsApp messages via gateway');
        }

        setStatusMsg({
          type: json.sentCount > 0 ? 'success' : 'error',
          text:
            json.message ||
            (isAr
              ? `تم إرسال ${json.sentCount} رسالة بنجاح عبر محاكاة التنكر البشري.`
              : `Dispatched ${json.sentCount} message(s) with stealth human simulation.`),
          details: json.results,
        });
        fetchQueue();
      } else {
        // Scheduled / Queued Mode
        const scheduledForDate = isImmediate ? null : new Date(scheduleDate).toISOString();

        const res = await fetch('/api/admin/whatsapp/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: parsedRecipients,
            body: messageBody,
            purpose,
            campaignName,
            scheduledFor: scheduledForDate,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to schedule WhatsApp broadcast');
        }

        setStatusMsg({
          type: 'success',
          text:
            json.message ||
            (isAr
              ? `تمت جدولة ${json.count} رسالة بنجاح في طابور الإرسال!`
              : `Successfully queued ${json.count} WhatsApp outreach job(s)!`),
        });

        fetchQueue();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send WhatsApp message' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDrainQueue = async () => {
    setIsDraining(true);
    try {
      const res = await fetch('/api/admin/whatsapp/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drain' }),
      });
      const json = await res.json();
      if (json.ok) {
        setStatusMsg({
          type: 'success',
          text: isAr
            ? `تم تشغيل تفريغ الطابور وإرسال ${json.sent || 0} رسالة بنجاح.`
            : `Queue drain executed successfully (${json.sent || 0} sent).`,
        });
        fetchQueue();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Drain failed' });
    } finally {
      setIsDraining(false);
    }
  };

  const applyTemplate = (tpl: string) => {
    if (tpl === 'black-friday') {
      setMessageBody(
        'عزيزي {{name}}، نود إعلامكم بانطلاق عروض البلاك فرايداي الحصرية من Sierra Estates بخصم 25% على كافة باقات التسويق والخدمات العقارية حتى 25 نوفمبر 2026.\nللاطلاع على الفرص الاستثمارية الحصرية والمتاحة بالتجمع الخامس:\nhttps://sierra-estates.net\nأو تواصل معنا مباشرة بكود العرض BF2026 🌸'
      );
      setPurpose('campaign-broadcast');
    } else if (tpl === 'new-listing') {
      setMessageBody(
        'مرحباً {{name}}! تم إضافة وحدة عقارية مميزة جديدة في {{compound}} بسعر {{price}} للمعاينة والحجز:\nhttps://sierra-estates.net\nSierra Estates Luxury Concierge'
      );
      setPurpose('property-recommendation');
    } else if (tpl === 'owner-inquiry') {
      setMessageBody(
        'أهلاً بحضرتك يا فندم، أنا ليلى من Sierra Estates 🌸\nنود الاستفسار هل الوحدة لا زالت متاحة حالياً؟ وما هي أحدث المواصفات والأسعار المطلوبة؟ معنا عدد من العملاء المهتمين بالتجمع الخامس.\nشكراً جزيلاً لوقت حضرتك 🤝'
      );
      setPurpose('owner-negotiation');
    } else if (tpl === 'viewing-reminder') {
      setMessageBody(
        'عزيزي {{name}}، تذكير بموعد معاينة العقار غداً الساعة 4:00 عصراً بالتجمع الخامس. مستشارك العقاري سيكون بانتظارك.\nSierra Estates'
      );
      setPurpose('viewing-confirmation');
    } else if (tpl === 'market-briefing') {
      setMessageBody(
        'تقرير Sierra Estates العقاري: أحدث اتجاهات الأسعار وفرص إعادة البيع (Resale) بالتجمع الخامس. تصفح خريطة المشاريع التفاعلية:\nhttps://sierra-estates.net'
      );
      setPurpose('campaign-broadcast');
    }
  };

  const filteredJobs = useMemo(() => {
    if (queueFilter === 'all') return queueJobs;
    if (queueFilter === 'queued') return queueJobs.filter((j) => ['pending', 'queued', 'sending', 'processing'].includes(j.status));
    if (queueFilter === 'sent') return queueJobs.filter((j) => ['sent', 'delivered', 'read'].includes(j.status));
    if (queueFilter === 'failed') return queueJobs.filter((j) => j.status === 'failed');
    return queueJobs;
  }, [queueJobs, queueFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner — Bright Clay Gold */}
      <div className="clay-card-gold p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[var(--tx-s)] tracking-wide">
              {isAr ? 'مرسل رسائل واتساب المجدول' : 'WhatsApp Outreach & Date Scheduler'}
            </h3>
          </div>
          <p className="text-xs text-[var(--tx-m)] mt-1.5 leading-relaxed">
            {isAr
              ? 'إرسال فوري بتنكر بشري كامل (محاكاة الكتابة والقراءة لمنع الحظر) أو جدولة رسائل لأوقات وتواريخ محددة مع التوزيع التلقائي على الخطوط النشطة.'
              : 'Instant human-simulated direct send (typing presence & read receipts to prevent bans) or scheduled future outreach campaigns across active SIM lines.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleDrainQueue}
            disabled={isDraining}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDraining ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'إرسال الطابور فوراً' : 'Drain Queue Now'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono clay-stat-badge bg-emerald-50 border border-emerald-200 text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Anti-Ban Stealth Shield: Active</span>
          </div>
        </div>
      </div>

      {/* Mode Toggle Bar */}
      <div className="clay-inset flex items-center gap-2 p-1.5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setDispatchMode('instant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            dispatchMode === 'instant'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
              : 'text-[var(--tx-m)] hover:text-[var(--tx-s)]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isAr ? 'إرسال فوري مباشر (محاكاة بشرية خفية)' : 'Instant Stealth Direct Send (Human Emulation)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setDispatchMode('scheduled')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            dispatchMode === 'scheduled'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md'
              : 'text-[var(--tx-m)] hover:text-[var(--tx-s)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isAr ? 'جدولة وقت الإرسال (تاريخ وتوقيت محدد)' : 'Schedule Time to Send (Target Date & Time)'}</span>
        </button>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`clay-card p-4 text-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              : 'bg-red-50/90 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>

          {Array.isArray(statusMsg.details) && statusMsg.details.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
              {statusMsg.details.map((res: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>
                    {res.phone}: {res.ok ? '✓ Sent' : `✗ Failed (${res.error})`}
                  </span>
                  {res.session && <span className="text-amber-700 font-semibold">Line: {res.session}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Setup */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="clay-card-elevated p-6 space-y-5">
            {/* Quick Templates */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--tx-m)] block mb-2 font-mono">
                {isAr ? 'قوالب سريعة جاهزة للرسائل' : 'Ready Message Templates'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('black-friday')}
                  className="clay-stat-badge bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs py-1.5 px-3 cursor-pointer shadow-sm"
                >
                  🏷️ Black Friday 25% Off
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('owner-inquiry')}
                  className="clay-stat-badge bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs py-1.5 px-3 cursor-pointer"
                >
                  🤝 سؤال مالك عن إتاحة وحدة
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('new-listing')}
                  className="clay-stat-badge bg-yellow-50 hover:bg-yellow-100 text-amber-900 border border-amber-200 text-xs py-1.5 px-3 cursor-pointer"
                >
                  🏡 New Listing Alert
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('viewing-reminder')}
                  className="clay-stat-badge bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs py-1.5 px-3 cursor-pointer"
                >
                  📅 Viewing Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('market-briefing')}
                  className="clay-stat-badge bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs py-1.5 px-3 cursor-pointer"
                >
                  📊 Market Report
                </button>
              </div>
            </div>

            {/* Line Selector */}
            <div className="clay-inset p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-700 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'اختيار خط الإرسال (WhatsApp SIM Line)' : 'Dispatch SIM Line'}</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                  {dispatchMode === 'instant' ? 'Typing Jitter: 0.8s–3.0s' : 'Pool Scheduled'}
                </span>
              </div>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-[var(--tx-s)] text-xs focus:outline-none focus:border-emerald-500 font-mono shadow-xs"
              >
                <option value="auto">🔄 Auto Round-Robin (All Ready SIM Lines)</option>
                {gatewayLines.length > 0 ? (
                  gatewayLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      📱 {l.name || l.id} {l.phone ? `(+${l.phone})` : ''} [{l.status.toUpperCase()}]
                    </option>
                  ))
                ) : (
                  <>
                    <option value="line-1">📱 Line 1 (Ahmed Fawzy · +201032206443) [READY]</option>
                    <option value="line-2">📱 Line 2 (+201031622600) [READY]</option>
                    <option value="line-3">📱 Line 3: Sierra Estates (+201092048333) [READY]</option>
                    <option value="line-6">📱 Line 6 (+201061399688) [READY]</option>
                  </>
                )}
              </select>
              <p className="text-[10.5px] text-[var(--tx-m)] leading-relaxed">
                {isAr
                  ? 'يقوم الخادم بمحاكاة فتح المحادثة، ووضع علامة القراءة (Seen)، وتشغيل مؤشر الكتابة (Typing...) بفواصل عشوائية بشرية تمنع حظر الحساب تماماً.'
                  : 'Gateway emulates conversation open, read receipts (Seen), and realistic human typing duration jitter to eliminate account restriction risks.'}
              </p>
            </div>

            {/* Campaign Name & Purpose for Scheduled Mode */}
            {dispatchMode === 'scheduled' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--tx-m)] block mb-1">
                    {isAr ? 'اسم الحملة' : 'Campaign Tag / Reference'}
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-[var(--tx-s)] text-xs focus:outline-none focus:border-emerald-500 font-medium shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--tx-m)] block mb-1">
                    {isAr ? 'نوع الغرض' : 'Outreach Purpose'}
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-[var(--tx-s)] text-xs focus:outline-none focus:border-emerald-500 shadow-xs"
                  >
                    <option value="campaign-broadcast">Campaign Broadcast</option>
                    <option value="property-recommendation">Property Recommendation</option>
                    <option value="lead-qualification">Lead Qualification</option>
                    <option value="viewing-confirmation">Viewing Confirmation</option>
                    <option value="owner-negotiation">Owner Negotiation</option>
                  </select>
                </div>
              </div>
            )}

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[var(--tx-m)] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isAr ? 'أرقام المستلمين (رقم واحد أو عدة أرقام مفصولة بفاصلة أو سطر جديد)' : 'Recipients (Single or Bulk)'}</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">
                  {parsedRecipients.length} {isAr ? 'رقم تم رصده' : 'recipient(s) ready'}
                </span>
              </div>

              {/* Quick Recipient Presets */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setRecipientInput('+201092048333')}
                  className="clay-stat-badge bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] py-1 px-2.5 cursor-pointer"
                >
                  <span>📌</span>
                  <span>{isAr ? 'رقمي المباشر للتجربة (01092048333)' : 'My Direct Phone (01092048333)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientInput('+201092048333, +201032206443, +201061399688')}
                  className="clay-stat-badge bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-[10px] py-1 px-2.5 cursor-pointer"
                >
                  <span>👥</span>
                  <span>{isAr ? 'ملاك موثوقون (3 أرقام)' : 'Verified Owners (3)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientInput('')}
                  className="clay-stat-badge bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] py-1 px-2 cursor-pointer"
                >
                  <span>🗑️</span>
                  <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                </button>
              </div>

              <div className="clay-inset p-2.5 bg-white/80">
                <textarea
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  rows={2}
                  placeholder={isAr ? "أدخل رقماً واحداً مثل 01092048333 أو الصق عدة أرقام...\n01032206443\n01061399688, أحمد" : "Enter a single phone number or paste multiple...\n01092048333\n01032206443\n01061399688, Ahmed"}
                  className="w-full bg-transparent border-0 text-[var(--tx-s)] font-mono text-xs focus:outline-none resize-none"
                  required
                />
              </div>
            </div>

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[var(--tx-m)] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? 'نص رسالة الواتساب' : 'WhatsApp Message Content'}</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-[var(--tx-m)]">{isAr ? 'إدراج متغير:' : 'Insert tags:'}</span>
                  {['{{name}}', '{{compound}}', '{{price}}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setMessageBody((prev) => `${prev} ${tag}`)}
                      className="px-1.5 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-mono text-[10px] border border-emerald-200 cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="clay-inset p-2.5 bg-white/80">
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border-0 text-[var(--tx-s)] text-xs focus:outline-none resize-none font-medium leading-relaxed"
                  required
                />
              </div>

              {/* Realistic WhatsApp Chat Bubble Preview */}
              <div className="mt-3 clay-inset p-3.5 space-y-2 bg-[#efeae2]/80">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-300/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10.5px] font-bold text-emerald-800 font-mono">
                      {isAr ? 'معاينة شات الواتساب الحقيقي (WhatsApp Live Balloon)' : 'Realistic WhatsApp Chat Bubble Preview'}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-600 font-mono">End-to-end Encrypted</span>
                </div>

                <div className="flex justify-end pt-1">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#d9fdd3] text-[#111b21] p-3 shadow-sm border border-emerald-300/60 text-xs relative space-y-1">
                    <div className="text-[10px] font-bold text-emerald-800">Sierra Estates Luxury Concierge</div>
                    <div className="text-[#111b21] whitespace-pre-line text-[11px] leading-relaxed">
                      {messageBody
                        .replace(/\{\{name\}\}/g, isAr ? '[اسم العميل]' : '[Client Name]')
                        .replace(/\{\{compound\}\}/g, isAr ? '[الكومباوند]' : '[Compound]')
                        .replace(/\{\{price\}\}/g, isAr ? '[السعر]' : '[Price]')}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-mono pt-0.5">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-sky-600 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Section only in scheduled mode */}
            {dispatchMode === 'scheduled' && (
              <div className="clay-inset p-4 space-y-3 bg-amber-50/70 border border-amber-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    {isAr ? 'توقيت وتاريخ الجدولة' : 'Target Schedule Date & Time'}
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--tx-m)] flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={isImmediate}
                        onChange={(e) => setIsImmediate(e.target.checked)}
                        className="rounded bg-white border-slate-300 text-amber-600 focus:ring-0"
                      />
                      <span>{isAr ? 'إرسال فوري الآن في الطابور' : 'Immediate Queue Dispatch'}</span>
                    </label>
                  </div>
                </div>

                {!isImmediate && (
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--tx-m)] block mb-1">
                      {isAr ? 'اختر اليوم والساعة المستهدفة' : 'Select Target Date & Time'}
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-[var(--tx-s)] text-xs focus:outline-none focus:border-amber-500 font-mono shadow-xs"
                      required={!isImmediate}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSending}
                className={`px-6 py-3 text-xs font-bold gap-2 disabled:opacity-50 cursor-pointer rounded-xl flex items-center shadow-lg transition-all ${
                  dispatchMode === 'instant' ? 'clay-btn-emerald' : 'clay-btn-gold'
                }`}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {dispatchMode === 'instant'
                        ? isAr
                          ? 'جاري الإرسال ومحاكاة الكتابة...'
                          : 'Simulating Human Presence & Sending...'
                        : isAr
                        ? 'جاري جدولة الرسائل...'
                        : 'Scheduling Messages...'}
                    </span>
                  </>
                ) : (
                  <>
                    {dispatchMode === 'instant' ? <Zap className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    <span>
                      {dispatchMode === 'instant'
                        ? isAr
                          ? `إرسال الآن (${parsedRecipients.length} رقم) بتنكر بشري كامل`
                          : `Send Direct (${parsedRecipients.length} recipient${parsedRecipients.length > 1 ? 's' : ''}) with Stealth`
                        : isImmediate
                        ? isAr
                          ? 'إرسال الآن إلى قائمة الانتظار'
                          : 'Queue for Immediate Dispatch'
                        : isAr
                        ? `جدولة الرسائل لتاريخ ${scheduleDate.replace('T', ' ')}`
                        : `Schedule WhatsApp Campaign for ${scheduleDate.replace('T', ' ')}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Scheduled Queue Monitor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--tx-s)]">
                  {isAr ? 'طابور الرسائل وحالة الإرسال' : 'Message Queue & Outbox'}
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchQueue}
                  className="p-1.5 text-[var(--tx-m)] hover:text-[var(--tx-s)] rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200/70 transition-colors shadow-xs cursor-pointer"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5">
              {(['all', 'queued', 'sent', 'failed'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setQueueFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                    queueFilter === f
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                      : 'bg-slate-100 border border-slate-200 text-[var(--tx-m)] hover:text-[var(--tx-s)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredJobs.length === 0 ? (
              <div className="clay-inset p-8 text-center text-[var(--tx-m)] text-xs">
                {isLoadingQueue ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Loading queue...</span>
                  </div>
                ) : (
                  <span>{isAr ? 'لا توجد رسائل مجدولة في هذا التصنيف حالياً.' : 'No WhatsApp messages found.'}</span>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredJobs.map((job) => {
                  const isSent = ['sent', 'delivered', 'read'].includes(job.status);
                  const isFail = job.status === 'failed';
                  return (
                    <div
                      key={job.id}
                      className="clay-inset p-3 rounded-xl text-xs space-y-2 bg-white/80 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-amber-700 font-semibold">{job.toPhone}</span>
                        <span
                          className={`clay-pill px-2 py-0.5 text-[10px] font-bold ${
                            isSent
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : isFail
                              ? 'text-red-700 bg-red-50 border border-red-200'
                              : 'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}
                        >
                          {job.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-[var(--tx-m)] line-clamp-2 text-[11px] font-sans">{job.body}</p>

                      <div className="flex items-center justify-between text-[10px] text-[var(--tx-f)] pt-1 border-t border-slate-200">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : 'Immediate'}
                        </span>
                        <span className="text-[var(--tx-m)] capitalize">{job.purpose}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
