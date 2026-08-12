import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, Send, Users, CheckCircle2, Copy, ExternalLink, 
  Sparkles, Clock, Smartphone, Search, FileText, RefreshCw, 
  AlertCircle, Check, ShieldCheck, UserCheck, CheckCheck
} from 'lucide-react';
import { api } from '../lib/apiClient';

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  compound?: string;
  interest?: string;
}

interface TemplateOption {
  id: string;
  title: string;
  titleAr: string;
  icon: string;
  textEn: string;
  textAr: string;
}

const DEFAULT_TEMPLATES: TemplateOption[] = [
  {
    id: 'property_offer',
    title: 'Property Presentation',
    titleAr: 'عرض عقار فاخر',
    icon: '🏠',
    textEn: `Hello {name}! 🌟

We have an exclusive property matching your search criteria in {compound}:

📍 *Location:* {compound}, New Cairo
🛏️ *Bedrooms:* 3 Bedrooms | 2 Bathrooms
📐 *Area:* 180 sqm
💰 *Price:* EGP 8,500,000

Would you like to schedule a private viewing or view the 3D virtual tour?

*Sierra Estates — Beyond Brokerage*
📞 01092048333`,
    textAr: `أهلاً بك يا {name}! 🌟

لدينا عقار حصري يطابق متطلبات بحثك في {compound}:

📍 *الموقع:* {compound}، القاهرة الجديدة
🛏️ *عدد الغرف:* 3 غرف نوم | 2 حمام
📐 *المساحة:* 180 متر مربع
💰 *السعر:* 8,500,000 جنيه مصري

هل ترغب في تحديد موعد لمعاينة العقار أو مشاهدة الجولة الافتراضية 3D؟

*سييرا إستيتس — التميز العقاري*
📞 01092048333`
  },
  {
    id: 'viewing_confirm',
    title: 'Viewing Confirmation',
    titleAr: 'تأكيد موعد المعاينة',
    icon: '📅',
    textEn: `Hello {name},

This is a confirmation for your upcoming property viewing:

📍 *Property:* {compound} Unit
🗓️ *Date:* Tomorrow at 4:00 PM
👤 *Assigned Agent:* Sierra Estates Senior Advisor

Please confirm if this time works for you. Looking forward to meeting you!

*Sierra Estates*`,
    textAr: `أهلاً {name}،

تأكيد موعد معاينة العقار المجدول:

📍 *العقار:* وحدة {compound}
🗓️ *الموعد:* غداً الساعة 4:00 مساءً
👤 *المستشار العقاري:* مستشار سييرا إستيتس

يرجى التأكيد في حال مناسبة الموعد لك. يسعدنا لقاؤكم!

*سييرا إستيتس*`
  },
  {
    id: 'owner_pitch',
    title: 'Owner Listing Sourcing',
    titleAr: 'عروض تسويق الملاك',
    icon: '💎',
    textEn: `Hello {name},

Are you looking to rent or sell your unit in {compound}?

At Sierra Estates, we provide:
✨ AI-powered valuation & instant ROI pricing
🌐 Premier placement across top luxury client portals
🎯 Direct access to verified high-net-worth buyers & tenants

Reply to this message for a free automated market evaluation.

*Sierra Estates Team*`,
    textAr: `أهلاً بك {name}،

هل ترغب في بيع أو إيجار وحدتك العقارية في {compound}؟

في سييرا إستيتس نقدم لك:
✨ تقييم آلي بالذكاء الاصطناعي وحد أعلى للعائد
🌐 تسويق حصري على أحدث المنصات العقارية
🎯 وصول مباشر للمشترين والمستأجرين المعتمدين

رد على هذه الرسالة للحصول على تقييم مجاني لسعر السوق.

*فريق سييرا إستيتس*`
  }
];

const FALLBACK_LEADS: LeadItem[] = [
  { id: 'lead-1', name: 'Eng. Ahmed Hassan', phone: '01092048333', compound: 'Madinaty', interest: 'Villa Sale' },
  { id: 'lead-2', name: 'Dr. Mariam El-Sayed', phone: '01123456789', compound: 'Mivida', interest: 'Apartment Rent' },
  { id: 'lead-3', name: 'Karim Abdelrahman', phone: '01006518003', compound: 'SODIC Eastown', interest: 'Penthouse Sale' },
  { id: 'lead-4', name: 'Youssef Mansour', phone: '01228446610', compound: 'Hyde Park', interest: 'Twin House' },
  { id: 'lead-5', name: 'Nour El-Din', phone: '01081445400', compound: 'Uptown Cairo', interest: 'Duplex' },
];

export default function WhatsAppSenderPage({ isAr = false }: { T?: any; isAr?: boolean }) {
  const [recipientPhone, setRecipientPhone] = useState('01092048333');
  const [recipientName, setRecipientName] = useState('Valued Client');
  const [recipientCompound, setRecipientCompound] = useState('Madinaty');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('property_offer');
  const [langMode, setLangMode] = useState<'en' | 'ar'>(isAr ? 'ar' : 'en');
  const [messageBody, setMessageBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadList, setLeadList] = useState<LeadItem[]>(FALLBACK_LEADS);
  const [logs, setLogs] = useState<Array<{ id: string; phone: string; name: string; time: string; status: string }>>(() => {
    try {
      const saved = localStorage.getItem('sierra_wa_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load live leads from API
  useEffect(() => {
    api.get<{ leads: any[] }>('/api/admin/leads')
      .then((res) => {
        if (res.leads && res.leads.length > 0) {
          const mapped = res.leads.map((l, i) => ({
            id: l.id || `lead-api-${i}`,
            name: l.name || l.clientName || 'Client',
            phone: l.phone || l.mobile || '01000000000',
            compound: l.compound || l.location || 'New Cairo',
            interest: l.type || l.interest || 'Property Enquiry',
          }));
          setLeadList(mapped);
        }
      })
      .catch(() => {
        // Fallback already set
      });
  }, []);

  // Update message body when template or recipient details change
  useEffect(() => {
    const tmpl = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplate) || DEFAULT_TEMPLATES[0];
    const raw = langMode === 'ar' ? tmpl.textAr : tmpl.textEn;
    const formatted = raw
      .replace(/{name}/g, recipientName || 'Client')
      .replace(/{compound}/g, recipientCompound || 'New Cairo')
      .replace(/{phone}/g, recipientPhone || '01092048333');
    setMessageBody(formatted);
  }, [selectedTemplate, langMode, recipientName, recipientCompound, recipientPhone]);

  const sanitizePhone = (raw: string): string => {
    let clean = raw.replace(/[^0-9+]/g, '');
    if (clean.startsWith('0')) {
      clean = '20' + clean.slice(1);
    }
    return clean;
  };

  const handleSelectLead = (lead: LeadItem) => {
    setRecipientName(lead.name);
    setRecipientPhone(lead.phone);
    if (lead.compound) setRecipientCompound(lead.compound);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchWhatsAppWeb = () => {
    const formattedPhone = sanitizePhone(recipientPhone);
    const encodedText = encodeURIComponent(messageBody);
    const url = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    window.open(url, '_blank');

    addLog(recipientName, recipientPhone, 'Dispatched via WhatsApp Web');
  };

  const handleServerDispatch = async () => {
    setDispatching(true);
    setDispatchStatus(null);
    try {
      const response = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: ['manual-dispatch'],
          customMessage: messageBody,
          recipientPhone: sanitizePhone(recipientPhone),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) {
        setDispatchStatus({
          success: true,
          message: `WhatsApp message queued for ${recipientName} (${recipientPhone})`,
        });
        addLog(recipientName, recipientPhone, 'Server Staggered Queue');
      } else {
        // Fallback launch if API secret not present
        setDispatchStatus({
          success: true,
          message: `Message generated cleanly. Launching WhatsApp client fallback...`,
        });
        setTimeout(handleLaunchWhatsAppWeb, 800);
      }
    } catch {
      setDispatchStatus({
        success: true,
        message: `Dispatched message via WhatsApp Web Fallback Engine.`,
      });
      setTimeout(handleLaunchWhatsAppWeb, 800);
    } finally {
      setDispatching(false);
    }
  };

  const addLog = (name: string, phone: string, status: string) => {
    const newLog = {
      id: Math.random().toString(36).slice(2),
      name,
      phone,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
    };
    const updated = [newLog, ...logs.slice(0, 19)];
    setLogs(updated);
    try {
      localStorage.setItem('sierra_wa_logs', JSON.stringify(updated));
    } catch {}
  };

  const filteredLeads = leadList.filter(
    (l) =>
      l.name.toLowerCase().includes(leadsSearch.toLowerCase()) ||
      l.phone.includes(leadsSearch) ||
      (l.compound && l.compound.toLowerCase().includes(leadsSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 mb-1">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            SIERRA ESTATES · WHATSAPP AUTOMATION & MESSAGING ENGINE
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            WhatsApp Messenger & Lead Outreach
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Dispatch personalized property presentations, viewing confirmations, and owner sourcing messages via WhatsApp Web or backend Baileys/Meta automation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLangMode('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              langMode === 'en'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            EN (English)
          </button>
          <button
            onClick={() => setLangMode('ar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              langMode === 'ar'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            العربية (AR)
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Lead Selector & Customization (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Lead Selector */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Select CRM Lead Target
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                {leadList.length} Active Leads
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                placeholder="Search leads by name, phone or compound..."
                className="w-full bg-[#040710] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Lead Scroll List */}
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar">
              {filteredLeads.map((lead) => {
                const isSelected = recipientPhone === lead.phone;
                return (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-[#040710]/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-2">
                        <span>{lead.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[11px] opacity-70 font-mono mt-0.5">
                        {lead.phone} • {lead.compound}
                      </div>
                    </div>
                    {lead.interest && (
                      <span className="text-[10px] font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-400">
                        {lead.interest}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Recipient Overrides */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                Target Custom Parameters
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-[#040710] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-[#040710] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Target Compound</label>
                <input
                  type="text"
                  value={recipientCompound}
                  onChange={(e) => setRecipientCompound(e.target.value)}
                  className="w-full bg-[#040710] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Template Selector */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-emerald-400" />
              Select Campaign Template
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {DEFAULT_TEMPLATES.map((tmpl) => {
                const active = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      active
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-md'
                        : 'bg-[#040710]/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xl">{tmpl.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{langMode === 'ar' ? tmpl.titleAr : tmpl.title}</span>
                        {active && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] opacity-70 mt-0.5 line-clamp-1">
                        {langMode === 'ar' ? tmpl.textAr : tmpl.textEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: WhatsApp Live Mockup & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Messaging Canvas */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Live WhatsApp Message Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-mono text-slate-300 flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>

            {/* Editable Text Body */}
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5">
                Message Content Editor (Markdown Supported)
              </label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                dir={langMode === 'ar' ? 'rtl' : 'ltr'}
                rows={10}
                className="w-full bg-[#040710] border border-slate-800 rounded-lg p-4 text-xs font-sans text-slate-100 outline-none focus:border-emerald-500/50 leading-relaxed shadow-inner"
              />
            </div>

            {/* Phone Screen Mockup Container */}
            <div className="bg-[#0b141a] border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                    SE
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">Sierra Estates WhatsApp</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Online • Sierra Bot active</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                  {recipientPhone}
                </span>
              </div>

              {/* Chat Bubble */}
              <div dir={langMode === 'ar' ? 'rtl' : 'ltr'} className="flex justify-end pt-2">
                <div className="bg-[#005c4b] text-slate-100 p-3.5 rounded-2xl rounded-tr-none max-w-[88%] text-xs shadow-md space-y-2">
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {messageBody}
                  </pre>
                  <div className="flex justify-end items-center gap-1 text-[9px] text-emerald-200/70 font-mono pt-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch Status Feedback */}
            {dispatchStatus && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                dispatchStatus.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div className="font-semibold">{dispatchStatus.message}</div>
              </div>
            )}

            {/* Dispatch Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleLaunchWhatsAppWeb}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all font-mono uppercase tracking-wide active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Launch WhatsApp Web (Direct)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleServerDispatch}
                disabled={dispatching}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 flex items-center justify-center gap-2 shadow-lg transition-all font-mono uppercase tracking-wide active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-4 h-4 ${dispatching ? 'animate-bounce' : ''}`} />
                <span>{dispatching ? 'Dispatching Server Queue...' : 'Server Staggered Outreach'}</span>
              </button>
            </div>
          </div>

          {/* Dispatch Log History */}
          {logs.length > 0 && (
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Recent WhatsApp Dispatch History
                </span>
                <button
                  onClick={() => { setLogs([]); localStorage.removeItem('sierra_wa_logs'); }}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                >
                  Clear Logs
                </button>
              </div>

              <div className="space-y-2">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 bg-[#040710] border border-slate-800/80 rounded-lg flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-bold">{log.name}</span>
                      <span className="text-slate-500">({log.phone})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[10px]">{log.status}</span>
                      <span className="text-slate-500 text-[10px]">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
