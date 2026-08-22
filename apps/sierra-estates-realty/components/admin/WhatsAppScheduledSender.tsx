'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Users, Sparkles, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, ShieldCheck, ListFilter } from 'lucide-react';

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

export default function WhatsAppScheduledSender({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [recipientInput, setRecipientInput] = useState('+201001112233, +201012223344');
  const [messageBody, setMessageBody] = useState(
    'عزيزي {{name}}، لدينا عقار حصري جديد في كمبوند ميفيدا بخصم خاص اليوم. هل تود حجز موعد للمعاينة؟\n\nSierra Estates Luxury Concierge'
  );
  const [purpose, setPurpose] = useState('campaign-broadcast');
  const [campaignName, setCampaignName] = useState('Mivida Lake View Launch');
  const [scheduleDate, setScheduleDate] = useState(() => {
    // Default to tomorrow 2:00 PM
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [isImmediate, setIsImmediate] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queue state
  const [queueJobs, setQueueJobs] = useState<ScheduledJobItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch('/api/admin/whatsapp/schedule?limit=20');
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

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatusMsg(null);

    try {
      const rawPhones = recipientInput
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 6);

      if (rawPhones.length === 0) {
        throw new Error(isAr ? 'يرجى إدخال رقم هاتف واحد على الأقل' : 'Please enter at least one valid phone number');
      }

      const recipients = rawPhones.map((phone, idx) => ({
        phone,
        name: `Client #${idx + 1}`,
      }));

      const scheduledForDate = isImmediate ? null : new Date(scheduleDate).toISOString();

      const res = await fetch('/api/admin/whatsapp/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
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
        text: json.message || `Successfully queued ${json.count} WhatsApp outreach job(s)!`,
      });

      fetchQueue();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit scheduled broadcast' });
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (tpl: string) => {
    if (tpl === 'new-listing') {
      setMessageBody(
        'مرحباً {{name}}! تم إضافة فيلا فاخرة جديدة في هايد بارك بسعر مميز جداً. للمعاينة والتفاصيل:\nhttps://sierra-estates.net/cairo-plaza\nSierra Estates Team'
      );
      setPurpose('property-recommendation');
    } else if (tpl === 'viewing-reminder') {
      setMessageBody(
        'عزيزي {{name}}، تذكير بموعد معاينة العقار غداً الساعة 4:00 عصراً بالتجمع الخامس. مستشارك العقاري سيكون بانتظارك.\nSierra Estates'
      );
      setPurpose('viewing-confirmation');
    } else if (tpl === 'market-briefing') {
      setMessageBody(
        'تقرير سيير ايستيتس الشهري: ارتفاع متوسط أسعار المتر في التجمع الخامس بنسبة 4.2%. اطلع على أحدث الفرص الاستثمارية الحصرية.\nhttps://sierra-estates.net'
      );
      setPurpose('campaign-broadcast');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-emerald-950/40 border border-emerald-500/20 backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Calendar className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-white tracking-wide">
              {isAr ? 'مرسل رسائل واتساب المجدول · Scheduled WhatsApp Hub' : 'WhatsApp Outreach & Date Scheduler'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'جدولة حملات ورسائل واتساب للعملاء والملاك بمواعيد محددة مع توزيع الحمل على 4 أرقام معتمدة وساعات العمل (12-8م)'
              : 'Schedule targeted WhatsApp outreach, property brochures, and client follow-ups on specific future dates & times with load-balanced dispatch.'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/60">
          <Clock className="w-4 h-4" />
          <span>Auto-Throttle: 12PM–8PM Cairo</span>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Setup */}
        <div className="lg:col-span-7">
          <form onSubmit={handleScheduleSubmit} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
            {/* Quick Templates */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                {isAr ? 'قوالب سريعة للرسائل' : 'Quick Message Templates'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('new-listing')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium border border-slate-700"
                >
                  🏡 New Listing Alert
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('viewing-reminder')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium border border-slate-700"
                >
                  📅 Viewing Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('market-briefing')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium border border-slate-700"
                >
                  📊 Market Report
                </button>
              </div>
            </div>

            {/* Campaign Name & Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  {isAr ? 'اسم الحملة' : 'Campaign Tag / Reference'}
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  {isAr ? 'نوع الغرض' : 'Outreach Purpose'}
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="campaign-broadcast">Campaign Broadcast</option>
                  <option value="property-recommendation">Property Recommendation</option>
                  <option value="lead-qualification">Lead Qualification</option>
                  <option value="viewing-confirmation">Viewing Confirmation</option>
                  <option value="owner-negotiation">Owner Negotiation</option>
                </select>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {isAr ? 'أرقام المستلمين (مفصولة بفواصل أو سطور)' : 'Recipients (E.164 phone numbers)'}
                </span>
                <span className="text-[10px] text-slate-500">e.g. +201001112233, +201098887766</span>
              </label>
              <textarea
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  {isAr ? 'نص رسالة الواتساب' : 'WhatsApp Message Content'}
                </span>
                <span className="text-[10px] text-emerald-400/80">Tag: &#123;&#123;name&#125;&#125; supported</span>
              </label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Schedule Date/Time Section */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  {isAr ? 'توقيت الإرسال' : 'Dispatch Timing'}
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isImmediate}
                      onChange={(e) => setIsImmediate(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>{isAr ? 'إرسال فوري الآن' : 'Immediate Dispatch'}</span>
                  </label>
                </div>
              </div>

              {!isImmediate && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {isAr ? 'اختر التاريخ والوقت المستهدف' : 'Select Target Schedule Date & Time'}
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    required={!isImmediate}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isAr
                      ? 'سيتم حجز الرسائل في قائمة الانتظار وإرسالها تلقائياً بواسطة خادم المعالجة في الموعد المحدد'
                      : 'Jobs will be held in the queued pool and dispatched automatically by the cron worker once this time arrives.'}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري الجدولة...' : 'Scheduling Broadcast...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isImmediate
                        ? isAr ? 'إرسال الآن إلى قائمة الانتظار' : 'Queue for Immediate Dispatch'
                        : isAr ? 'جدولة الرسائل للتاريخ المحدد' : 'Schedule WhatsApp Campaign'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Scheduled Queue Monitor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr ? 'قائمة الرسائل المجدولة والنشطة' : 'Scheduled & Active Queue'}
                </h4>
              </div>
              <button
                type="button"
                onClick={fetchQueue}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {queueJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {isLoadingQueue ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Loading queue...</span>
                  </div>
                ) : (
                  <span>No pending scheduled WhatsApp messages found.</span>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {queueJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400 font-semibold">{job.toPhone}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {job.status}
                      </span>
                    </div>

                    <p className="text-slate-300 line-clamp-2 text-[11px] font-sans">
                      {job.body}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {job.scheduledFor
                          ? new Date(job.scheduledFor).toLocaleString()
                          : 'Immediate'}
                      </span>
                      <span className="text-slate-400 capitalize">{job.purpose}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
