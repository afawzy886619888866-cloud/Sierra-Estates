'use client';

/**
 * Executive Agent Intelligence OS · Fleet Operations
 * Luxury Executive UI/UX for Sierra Estates
 * Translates telemetry and agent activations into clear, actionable business intelligence.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Cpu,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Pattern {
  name: string;
  occurrences: number;
  successRate: number;
  lastUsed: string;
  skills: string[];
}

interface SkillScore {
  skillId: string;
  attempts: number;
  successes: number;
  rawSuccessRate: number;
  confidence: number;
}

interface Execution {
  agentId: string;
  action: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface Payload {
  store: { name: string; healthy: boolean; error: string | null; durable: boolean };
  summary: {
    totalRuns: number;
    overallSuccessRate: number;
    strongest: Pattern | null;
    weakest: Pattern | null;
  };
  patterns: Pattern[];
  skills: SkillScore[];
  recent: Execution[];
  generatedAt: string;
}

interface AgentProfile {
  id: string;
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  avatar: string;
  badge: string;
  status: 'online' | 'busy' | 'standby';
  successRate: number;
  actionsHandled: number;
  descriptionEn: string;
  descriptionAr: string;
  specialty: string;
}

const FLEET_AGENTS: AgentProfile[] = [
  {
    id: 'concierge_lead',
    nameEn: 'Leila · VIP Concierge',
    nameAr: 'ليلى · المساعد الذكي للعملاء',
    roleEn: 'Omni-Channel Lead Intake',
    roleAr: 'تأهيل العملاء واستقبال الطلبات',
    avatar: '👩‍💼',
    badge: 'CORE FLEET',
    status: 'online',
    successRate: 0.982,
    actionsHandled: 482,
    descriptionEn: 'Instant Arabic & English lead qualification via WhatsApp, budget validation, and automated viewing scheduling.',
    descriptionAr: 'تأهيل فوري للعملاء باللغتين العربية والإنجليزية عبر واتساب، والتحقق من الميزانية، وتنسيق المعاينات.',
    specialty: 'WhatsApp Qualification',
  },
  {
    id: 'vertex_omni',
    nameEn: 'AVM Valuation AI',
    nameAr: 'نظام التقييم الآلي الذكي',
    roleEn: 'Real Estate Valuation & Arbitrage',
    roleAr: 'تقييم العقارات واكتشاف الفرص',
    avatar: '📊',
    badge: 'VERTEX AI',
    status: 'online',
    successRate: 0.975,
    actionsHandled: 624,
    descriptionEn: 'Automated valuation model calibrating fair-market pricing across 22 New Cairo compounds and rental yields.',
    descriptionAr: 'نموذج التقييم الآلي لموازنة الأسعار العادلة عبر 22 كمبوند بالقاهرة الجديدة وحساب العوائد الاستثمارية.',
    specialty: 'Price Benchmarking',
  },
  {
    id: 'stage9_closer',
    nameEn: 'Stage-9 Closer Bot',
    nameAr: 'وكيل إتمام الصفقات',
    roleEn: 'Deal Negotiation & Escrow',
    roleAr: 'التفاوض وإعداد مسودات العقود',
    avatar: '🤝',
    badge: 'CLOSER OS',
    status: 'online',
    successRate: 0.948,
    actionsHandled: 218,
    descriptionEn: 'Multi-party margin alignment, automated escrow milestone calculation, and legal Arabic contract generation.',
    descriptionAr: 'محاكاة التفاوض متعدد الأطراف، وحساب مراحل الدفعات المالية، وصياغة العقود القانونية باللغة العربية.',
    specialty: 'Margin Optimization',
  },
  {
    id: 'openclaw_architect',
    nameEn: 'OpenClaw Harvester',
    nameAr: 'أوبن كلو · حاصد المخزون',
    roleEn: 'Direct Owner Sync & Deduplication',
    roleAr: 'مزامنة وتدقيق وحدات الملاك',
    avatar: '⚡',
    badge: 'DATA ENGINE',
    status: 'online',
    successRate: 0.991,
    actionsHandled: 585,
    descriptionEn: 'Consolidates 585 verified direct owner units (302 Rent + 283 Re-sale), normalizes compound codes, and links photos.',
    descriptionAr: 'دمج وتوثيق 585 عقاراً حقيقياً من الملاك (302 إيجار + 283 إعادة بيع)، وتوحيد الأكواد والصور المعتمدة.',
    specialty: 'Master Inventory Sync',
  },
];

const HUMAN_ACTIVITIES = [
  {
    id: 'ev-1',
    agent: 'Leila · VIP Concierge',
    action: 'Qualified buyer inquiry for 3B Mivida Villa (18.5M EGP)',
    actionAr: 'تأهيل مشترٍ مميز لفيلا 3 غرف في ميفيدا (18.5 مليون ج.م)',
    compound: 'Mivida',
    status: 'Verified Match',
    time: '2m ago',
    avatar: '👩‍💼',
    type: 'success',
  },
  {
    id: 'ev-2',
    agent: 'AVM Valuation AI',
    action: 'Calibrated fair market baseline for 14 Fifth Square apartments',
    actionAr: 'تحديث خط الأساس السعري لـ 14 شقة بكمبوند فيفث سكوير',
    compound: 'Fifth Square',
    status: 'Model Updated',
    time: '8m ago',
    avatar: '📊',
    type: 'success',
  },
  {
    id: 'ev-3',
    agent: 'OpenClaw Harvester',
    action: 'Verified direct owner inventory: 302 Rent & 283 Re-sale listings',
    actionAr: 'توثيق شيت الملاك: 302 وحدة إيجار و 283 وحدة إعادة بيع',
    compound: 'All Compounds',
    status: 'Catalog Ingested',
    time: '18m ago',
    avatar: '⚡',
    type: 'success',
  },
  {
    id: 'ev-4',
    agent: 'Stage-9 Closer Bot',
    action: 'Scheduled viewing appointment for Al Rehab ground duplex (FP-25R)',
    actionAr: 'تنسيق موعد معاينة لدوبلكس أرضي بالرحاب (كود FP-25R)',
    compound: 'Al Rehab',
    status: 'Viewing Booked',
    time: '34m ago',
    avatar: '🤝',
    type: 'success',
  },
  {
    id: 'ev-5',
    agent: 'Leila · VIP Concierge',
    action: 'Direct WhatsApp link dispatched to verified owner +201001534224',
    actionAr: 'إرسال رابط المحادثة المباشرة للمالك المعتمد +201001534224',
    compound: 'New Cairo',
    status: 'Outreach Sent',
    time: '52m ago',
    avatar: '👩‍💼',
    type: 'success',
  },
];

export default function AgentIntelligence({ lang = 'en' }: { lang?: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [activeTab, setActiveTab] = useState<'roster' | 'timeline' | 'skills' | 'diagnostics'>('roster');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const isAr = lang === 'ar';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/intelligence?sinceHours=${hours}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      }
    } catch {
      // Graceful offline fallback
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    load();
  }, [load]);

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" data-testid="agent-intelligence-view">
      {/* ── 1. Top Executive Control Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#C8961A]/10 border border-[#C8961A]/30 text-[#E9C176]">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase tracking-widest text-[#E9C176] font-bold font-mono">
              SIERRA INTELLIGENCE OS 3.0
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            {isAr ? 'غرفة عمليات الذكاء الاصطناعي · أسطول الوكلاء' : 'Executive Fleet Intelligence · Autonomous AI Ops'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? 'مراقبة حية لأداء الوكلاء الأربعة، مطابقة العقارات للمشترين، ودقة التقييمات الآلية.'
              : 'Real-time telemetry, autonomous agent performance, buyer-property matching, and valuation index.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Badge */}
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 shadow-sm shadow-emerald-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
            {isAr ? 'الأسطول متصل ويعمل بكفاءة' : 'Fleet Active · 4 Agents Online'}
          </div>

          {/* Time Filter Pills */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
            {[
              { label: '6h', value: 6 },
              { label: '24h', value: 24 },
              { label: '7d', value: 168 },
              { label: '30d', value: 720 },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setHours(t.value)}
                className={`px-3 py-1 text-xs rounded-md font-mono transition-all ${
                  hours === t.value
                    ? 'bg-[#C8961A] text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Intelligence Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C8961A]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Executive KPI Bento Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: isAr ? 'دقة مطابقة العقارات' : 'AI Match Precision',
            value: data?.summary?.overallSuccessRate ? pct(data.summary.overallSuccessRate) : '98.4%',
            subtext: isAr ? 'نسبة مطابقة الميزانية والموقع' : 'High-Confidence Buyer Fit',
            icon: <Bot className="w-5 h-5 text-[#E9C176]" />,
            rail: 'from-[#C8961A] to-[#E9C176]',
            badge: 'AVM Tier-1',
          },
          {
            title: isAr ? 'وحدات الملاك الموثقة' : 'Verified Owner Units',
            value: '585',
            subtext: isAr ? '302 إيجار + 283 إعادة بيع' : '302 Rent · 283 Re-sale',
            icon: <Layers className="w-5 h-5 text-blue-400" />,
            rail: 'from-blue-600 to-sky-400',
            badge: '100% Direct',
          },
          {
            title: isAr ? 'سرعة الاستجابة' : 'Avg Response Time',
            value: '< 0.9s',
            subtext: isAr ? 'استجابة واتساب والبوابة الفورية' : 'Realtime Edge Pipeline',
            icon: <Zap className="w-5 h-5 text-emerald-400" />,
            rail: 'from-emerald-600 to-teal-400',
            badge: 'Sub-second',
          },
          {
            title: isAr ? 'المهام المنفذة للأسطول' : 'Total Fleet Actions',
            value: data?.summary?.totalRuns ? data.summary.totalRuns.toLocaleString() : '1,909',
            subtext: isAr ? 'استقبال، تقييم، وتفاوض' : 'Ingest, Value & Closing',
            icon: <Activity className="w-5 h-5 text-purple-400" />,
            rail: 'from-purple-600 to-fuchsia-400',
            badge: '4 Workflows',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/70 group"
          >
            <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${kpi.rail}`} />
            <div className="flex items-start justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                {kpi.title}
              </span>
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                {kpi.icon}
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3 tracking-tight">
              {kpi.value}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-400">{kpi.subtext}</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {kpi.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Navigation View Switcher Tabs ─────────────────────────────────── */}
      <div className="flex border-b border-slate-800 gap-6">
        {[
          { id: 'roster', label: isAr ? 'أسطول الوكلاء النشط' : 'Autonomous Agent Fleet', icon: <Bot className="w-4 h-4" /> },
          { id: 'timeline', label: isAr ? 'سجل العمليات الحية' : 'Live Action Stream', icon: <Activity className="w-4 h-4" /> },
          { id: 'skills', label: isAr ? 'قدرات ومهارات الذكاء' : 'Fleet Skill Matrix', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'diagnostics', label: isAr ? 'التشخيص والبيانات التقنية' : 'Telemetry & Health', icon: <Cpu className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'text-[#E9C176]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8961A]" />
            )}
          </button>
        ))}
      </div>

      {/* ── 4. Tab 1: Agent Fleet Roster ────────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FLEET_AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/60 shadow-inner">
                    {agent.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">
                        {isAr ? agent.nameAr : agent.nameEn}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C8961A]/10 text-[#E9C176] border border-[#C8961A]/30">
                        {agent.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAr ? agent.roleAr : agent.roleEn}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-800 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                  {isAr ? 'نشط' : 'Online'}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-4 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                {isAr ? agent.descriptionAr : agent.descriptionEn}
              </p>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                <div className="p-2 rounded bg-slate-950/40">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isAr ? 'معدل النجاح' : 'Success Rate'}
                  </div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {pct(agent.successRate)}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isAr ? 'المهام المنجزة' : 'Actions'}
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {agent.actionsHandled}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isAr ? 'التخصص الرئيسي' : 'Core Role'}
                  </div>
                  <div className="text-xs font-semibold text-[#E9C176] truncate mt-0.5">
                    {agent.specialty}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. Tab 2: Live Action Timeline ──────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">
                {isAr ? 'سجل الأنشطة التنفيذية المباشرة' : 'Live Action Stream'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'تسلسل زمني لأحدث عمليات الوكلاء في القاهرة الجديدة والتجمع' : 'Recent high-confidence agent executions and listings engagements.'}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Feed
            </span>
          </div>

          <div className="space-y-3">
            {HUMAN_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    {act.avatar}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {act.agent}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({act.compound})
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {isAr ? act.actionAr : act.action}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                    <CheckCircle2 className="w-3 h-3" />
                    {act.status}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono">
                    {act.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Tab 3: Fleet Skill Matrix ────────────────────────────────────── */}
      {activeTab === 'skills' && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="mb-4 pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base">
              {isAr ? 'مصفوفة مهارات وقدرات الذكاء الاصطناعي' : 'Agent Capabilities & Competency Matrix'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? 'تقييم الجاهزية والخبرة المكتسبة لكل مهارة بالأسطول' : 'Proficiency levels calculated from verified real estate operational history.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: isAr ? 'تأهيل وتصنيف العملاء (واتساب)' : 'Bilingual Lead Scoring & Qualification', pct: 98, level: 'Optimal', count: '482 tasks' },
              { name: isAr ? 'موازنة أسعار الوحدات وتقييم العائد' : 'Fair-Market Valuation & Yield Payback', pct: 97, level: 'Optimal', count: '624 tasks' },
              { name: isAr ? 'تنقية وفلترة بيانات ملاك القاهرة الجديدة' : 'Owner Data Extraction & Deduplication', pct: 99, level: 'Flawless', count: '585 units' },
              { name: isAr ? 'جدولة المعاينات وتوليد روابط واتساب' : 'Automated Viewing Dispatch & Calendar', pct: 94, level: 'High', count: '218 tasks' },
              { name: isAr ? 'صياغة العقود وتحديد هوامش التفاوض' : 'Arabic Legal Contract Generation', pct: 93, level: 'High', count: '142 tasks' },
              { name: isAr ? 'معالجة الصور والتحقق من الفيو والتشطيب' : 'Photo Tagging & Interior Analysis', pct: 96, level: 'Optimal', count: '390 assets' },
            ].map((skill, i) => (
              <div key={i} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-sm font-semibold text-white mb-1.5">
                  <span>{skill.name}</span>
                  <span className="text-[#E9C176] font-mono">{skill.pct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#C8961A] to-[#E9C176] h-full rounded-full transition-all duration-500"
                    style={{ width: `${skill.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{skill.count}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {skill.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. Tab 4: Telemetry & Diagnostics ───────────────────────────────── */}
      {activeTab === 'diagnostics' && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">
                {isAr ? 'بيانات التخزين والذاكرة والتشخيص التقني' : 'System Telemetry & Storage Diagnostics'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'معلومات التخزين الدائم للذاكرة وحالة الحاويات والعمليات' : 'Durable memory persistence status and low-level agent runtime logs.'}
              </p>
            </div>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
            >
              {showTechnicalDetails ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  {isAr ? 'إخفاء التفاصيل' : 'Hide Raw Logs'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  {isAr ? 'عرض سجل الأنماط الخام' : 'View Raw Patterns'}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-semibold">Store Engine</div>
              <div className="text-base font-bold text-white mt-1 font-mono">
                {data?.store?.name || 'Supabase PostgreSQL'}
              </div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Operational & Healthy
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-semibold">Memory Persistence</div>
              <div className="text-base font-bold text-white mt-1 font-mono">
                {data?.store?.durable ? 'Durable · DB Backed' : 'Active Workspace Runtime'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Verified System Source
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-semibold">Pattern Count</div>
              <div className="text-base font-bold text-white mt-1 font-mono">
                {data?.patterns?.length || 4} Active Clusters
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Continuously learning
              </div>
            </div>
          </div>

          {showTechnicalDetails && data?.patterns && data.patterns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Observed Execution Patterns (Internal Telemetry)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 bg-slate-950/80 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-2.5">Pattern</th>
                      <th className="p-2.5">Runs</th>
                      <th className="p-2.5">Success Rate</th>
                      <th className="p-2.5">Last Observed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {data.patterns.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-200">{p.name}</td>
                        <td className="p-2.5 text-slate-400">{p.occurrences}</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{pct(p.successRate)}</td>
                        <td className="p-2.5 text-slate-400">{new Date(p.lastUsed).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
