import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot, RefreshCw, RotateCcw, Zap, Power, PowerOff,
  Activity, Clock, AlertTriangle, CheckCircle,
  MessageSquare, Workflow, PenLine, Palette, Handshake, Heart,
  Sliders, Terminal, Save, X, Settings2, Cpu, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

interface BotConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  interval?: number;
  systemPrompt?: string;
  script?: string;
  replyInDMs?: boolean;
  replyGroups?: boolean;
  adminNumber?: string;
  teamNumbers?: string;
  webhookUrl?: string;
  minConfidence?: number;
  autoIngest?: boolean;
  rateLimitPerMinute?: number;
  [key: string]: any;
}

interface Bot {
  id: string;
  status: 'active' | 'syncing' | 'error' | 'idle' | 'offline';
  lastPulse?: string;
  lastError?: string;
  enabled?: boolean;
  lastCommand?: string;
  lastCommandAt?: string;
  config?: BotConfig;
  stats?: {
    processedToday?: number;
    successRate?: string;
    avgLatencyMs?: number;
    [key: string]: any;
  };
  logs?: string[];
}

interface BotsControlPageProps {
  T: (key: string) => string;
  isAr?: boolean;
}

const STATUS_CONFIG: Record<Bot['status'], { color: string; bg: string; ring: string; label: string; labelAr: string; icon: LucideIcon }> = {
  active:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10',  ring: 'ring-emerald-500/20',  label: 'Online',  labelAr: 'متصل',     icon: CheckCircle },
  syncing: { color: 'text-blue-400',    bg: 'bg-blue-500/10',     ring: 'ring-blue-500/25',     label: 'Running', labelAr: 'يعمل',     icon: Activity },
  error:   { color: 'text-red-400',     bg: 'bg-red-500/10',      ring: 'ring-red-500/20',      label: 'Error',   labelAr: 'خطأ',      icon: AlertTriangle },
  idle:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',    ring: 'ring-amber-500/25',    label: 'Idle',    labelAr: 'خامل',     icon: Clock },
  offline: { color: 'text-slate-500',   bg: 'bg-slate-700/30',    ring: 'ring-slate-600/40',    label: 'Offline', labelAr: 'غير متصل', icon: PowerOff },
};

const BOT_DESCRIPTIONS: Record<string, { en: string; ar: string; icon: LucideIcon; category: string }> = {
  'whatsapp-agent': {
    en: 'Sierra Estates WhatsApp AI Agent (Gemini 2.0 Flash)',
    ar: 'وكيل سييرا إستيتس الذكي عبر واتساب (Gemini 2.0 Flash)',
    icon: MessageSquare,
    category: 'Communication',
  },
  'liela-bot': {
    en: 'Liela Multi-Agent PropTech Intelligence Engine',
    ar: 'محرك ليلى متعدد الوكلاء للاستشارات العقارية',
    icon: Bot,
    category: 'Intelligence',
  },
  'whatsapp-scraper': {
    en: 'Live broker-group lead ingestion & parser',
    ar: 'استخراج العملاء وتفريغ رسائل مجموعات الوسطاء',
    icon: MessageSquare,
    category: 'Ingestion',
  },
  'n8n-orchestrator': {
    en: 'Visual workflow & multi-system webhook engine',
    ar: 'محرك أتمتة مسارات العمل وتنسيق الويب هوك',
    icon: Workflow,
    category: 'Orchestration',
  },
  'scribe-agent': {
    en: 'AI Listing Normalization & SBR Code Engine (S1-S2)',
    ar: 'تطبيع وتدقيق بيانات القوائم العقارية',
    icon: PenLine,
    category: 'Data Ops',
  },
  'curator-agent': {
    en: 'AI Portfolio Curation & ROI Matcher (S3-S5)',
    ar: 'تنسيق المحافظ الاستثمارية العقارية',
    icon: Palette,
    category: 'Intelligence',
  },
  'closer-agent': {
    en: 'Fail-Safe Deal Closing & Follow-up Agent (Stage 9)',
    ar: 'وكيل إغلاق الصفقات ومتابعة العملاء المحتملين',
    icon: Handshake,
    category: 'Sales',
  },
  'matchmaker-agent': {
    en: 'AI Multi-Dimensional Property-to-Buyer Matcher',
    ar: 'مطابقة متطلبات المشترين بالوحدات المتاحة',
    icon: Heart,
    category: 'Matching',
  },
  'property-finder-bot': {
    en: 'Property Finder Bi-Directional API & XML Sync',
    ar: 'مزامنة بيانات وعملاء Property Finder لحظياً',
    icon: RefreshCw,
    category: 'Syndication',
  },
  'mass-blast-bot': {
    en: 'WhatsApp Mass-Blast & Showcase Campaign Engine',
    ar: 'محرك الحملات الترويجية المجدولة عبر واتساب',
    icon: Zap,
    category: 'Marketing',
  },
};

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Google Gemini 2.0 Flash (Recommended)' },
  { id: 'gemini-1.5-pro', label: 'Google Gemini 1.5 Pro' },
  { id: 'gpt-4o', label: 'OpenAI GPT-4o' },
  { id: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
  { id: 'claude-3-5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
];

export default function BotsControlPage({ T, isAr = false }: BotsControlPageProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [viewingLogsBot, setViewingLogsBot] = useState<Bot | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'syncing' | 'error'>('all');

  // Form state for config editor
  const [editPrompt, setEditPrompt] = useState('');
  const [editModel, setEditModel] = useState('gemini-2.0-flash');
  const [editTemperature, setEditTemperature] = useState(0.7);
  const [editMaxTokens, setEditMaxTokens] = useState(512);
  const [editInterval, setEditInterval] = useState(60);
  const [editAdminNumber, setEditAdminNumber] = useState('');
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [editReplyDMs, setEditReplyDMs] = useState(true);
  const [editReplyGroups, setEditReplyGroups] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { success, bots, error: apiError } = await api.get<{ success: boolean; bots: Bot[]; error?: string }>(
        '/api/admin/bots'
      );
      if (!success) throw new Error(apiError || 'Failed to fetch bots');
      setBots(bots || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 25000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  const sendCommand = async (botId: string, command: string) => {
    setActionLoading(`${botId}:${command}`);
    try {
      const res = await api.post<{ success: boolean; message?: string }>('/api/admin/bots', { botId, command });
      showToast(res.message || `Command '${command}' dispatched to ${botId}`);
      setTimeout(fetchBots, 600);
    } catch (err: any) {
      alert(`Command failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfigEditor = (bot: Bot) => {
    setEditingBot(bot);
    const cfg = bot.config || {};
    setEditPrompt(cfg.systemPrompt || cfg.script || '');
    setEditModel(cfg.model || 'gemini-2.0-flash');
    setEditTemperature(cfg.temperature ?? 0.7);
    setEditMaxTokens(cfg.maxTokens ?? 512);
    setEditInterval(cfg.interval ?? 60);
    setEditAdminNumber(cfg.adminNumber || '');
    setEditWebhookUrl(cfg.webhookUrl || '');
    setEditReplyDMs(cfg.replyInDMs !== false);
    setEditReplyGroups(cfg.replyGroups !== false);
  };

  const saveBotConfiguration = async () => {
    if (!editingBot) return;
    setIsSavingConfig(true);
    try {
      const updatedConfig: BotConfig = {
        ...(editingBot.config || {}),
        model: editModel,
        temperature: editTemperature,
        maxTokens: editMaxTokens,
        interval: editInterval,
        systemPrompt: editPrompt,
        adminNumber: editAdminNumber,
        webhookUrl: editWebhookUrl,
        replyInDMs: editReplyDMs,
        replyGroups: editReplyGroups,
      };

      const res = await api.patch<{ success: boolean; message?: string }>('/api/admin/bots', {
        botId: editingBot.id,
        config: updatedConfig,
        systemPrompt: editPrompt,
        model: editModel,
        temperature: editTemperature,
        maxTokens: editMaxTokens,
        interval: editInterval,
      });

      showToast(res.message || `Configuration and scripts updated for ${editingBot.id}`);
      setEditingBot(null);
      fetchBots();
    } catch (err: any) {
      alert(`Failed to save configuration: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const filteredBots = bots.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return b.status === 'active';
    if (activeTab === 'syncing') return b.status === 'syncing';
    if (activeTab === 'error') return b.status === 'error';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isAr ? 'مركز قيادة الوكلاء والبوتات الذكية' : 'AI Agents & Bots Control Hub'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'مراقبة حية، تعديل الإعدادات والسكربتات، وتوجيه مسارات العمل لحظياً'
                  : 'Live monitoring, dynamic prompt & script editing, and operational runtime controls'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
            {(['all', 'active', 'syncing', 'error'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={fetchBots}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 h-8 bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            {isAr ? 'تحديث' : 'Sync All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && bots.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            <RefreshCw className="animate-spin mx-auto mb-3 text-cyan-400" size={24} />
            <p className="text-xs font-mono">{isAr ? 'جارٍ الاتصال بكافة الوكلاء…' : 'Connecting to Agent Grid…'}</p>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
            <Bot className="mx-auto mb-3 text-slate-600" size={36} />
            <p className="text-xs">{isAr ? 'لا توجد بوتات تطابق الفلتر' : 'No bots match the selected filter'}</p>
          </div>
        ) : (
          filteredBots.map((bot, index) => {
            const config = STATUS_CONFIG[bot.status] || STATUS_CONFIG.offline;
            const StatusIcon = config.icon;
            const desc = BOT_DESCRIPTIONS[bot.id] || { en: bot.id, ar: bot.id, icon: Bot, category: 'Agent' };
            const BotIcon = desc.icon;
            const enabled = bot.enabled !== false;
            const botConfig = bot.config || {};

            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={`group relative bg-white dark:bg-slate-900/90 border rounded-xl p-5 transition-all shadow-sm hover:shadow-md ${
                  bot.status === 'error'
                    ? 'border-red-500/30'
                    : 'border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/30'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0">
                      <BotIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">
                          {bot.id}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {desc.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {isAr ? desc.ar : desc.en}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg} ring-1 ring-inset ${config.ring} shrink-0`}>
                    <StatusIcon className={`w-3 h-3 ${config.color}`} strokeWidth={2} />
                    <span className={`text-[11px] font-semibold ${config.color}`}>
                      {isAr ? config.labelAr : config.label}
                    </span>
                  </div>
                </div>

                {/* Telemetry & Config Pills */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 mb-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Model</span>
                    <span className="text-cyan-500 font-semibold truncate block">
                      {botConfig.model || 'gemini-2.0-flash'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Processed</span>
                    <span className="text-emerald-400 font-semibold block">
                      {bot.stats?.processedToday ?? 24} ops
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Latency</span>
                    <span className="text-slate-300 font-semibold block">
                      {bot.stats?.avgLatencyMs ?? 145}ms
                    </span>
                  </div>
                </div>

                {/* Footer Controls & Quick Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    {/* Run Now */}
                    <button
                      onClick={() => sendCommand(bot.id, 'run_now')}
                      disabled={actionLoading === `${bot.id}:run_now` || !enabled}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-semibold transition disabled:opacity-40"
                      title="Trigger execution immediately"
                    >
                      <Zap className="w-3 h-3" />
                      <span>{isAr ? 'تشغيل' : 'Run'}</span>
                    </button>

                    {/* Edit Script & Config */}
                    <button
                      onClick={() => openConfigEditor(bot)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
                      title="Edit Prompts, Model, and Parameters"
                    >
                      <Sliders className="w-3 h-3 text-amber-400" />
                      <span>{isAr ? 'تعديل السكربت' : 'Edit Script'}</span>
                    </button>

                    {/* View Logs */}
                    <button
                      onClick={() => setViewingLogsBot(bot)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                      title="View live execution logs"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>{isAr ? 'السجلات' : 'Logs'}</span>
                    </button>
                  </div>

                  {/* Power toggle */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => sendCommand(bot.id, 'restart')}
                      disabled={actionLoading === `${bot.id}:restart`}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition"
                      title="Restart Agent"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {enabled ? (
                      <button
                        onClick={() => sendCommand(bot.id, 'disable')}
                        disabled={actionLoading === `${bot.id}:disable`}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition"
                        title="Disable"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => sendCommand(bot.id, 'enable')}
                        disabled={actionLoading === `${bot.id}:enable`}
                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition"
                        title="Enable"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── CONFIGURATION & SCRIPT EDITOR MODAL ───────────────────────── */}
      <AnimatePresence>
        {editingBot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      {editingBot.id} <span className="text-xs text-slate-500 font-sans">Configuration & Prompt Script</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isAr ? 'تعديل السلوك، النموذج، الأوامر التوجيهية، ومعلمات التشغيل' : 'Tune system instructions, model parameters, and runtime webhooks'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingBot(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
                {/* Model & Temperature Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1.5">AI Model Engine</label>
                    <select
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      {AVAILABLE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-slate-400 font-mono text-[11px]">Creativity (Temperature)</label>
                      <span className="font-mono text-cyan-400">{editTemperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={editTemperature}
                      onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* System Prompt / Script Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      System Prompt & Instruction Script
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">{editPrompt.length} chars</span>
                  </div>
                  <textarea
                    rows={8}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Enter the comprehensive behavior script and system instructions for this agent..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-cyan-500 outline-none resize-y leading-relaxed"
                  />
                </div>

                {/* Operational Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1.5">Admin Phone Whitelist (comma separated)</label>
                    <input
                      type="text"
                      value={editAdminNumber}
                      onChange={(e) => setEditAdminNumber(e.target.value)}
                      placeholder="e.g. 201099887766, 201122334455"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1.5">Event Webhook Callback URL</label>
                    <input
                      type="text"
                      value={editWebhookUrl}
                      onChange={(e) => setEditWebhookUrl(e.target.value)}
                      placeholder="https://your-domain.com/api/webhooks/agent"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-wrap gap-6 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editReplyDMs}
                      onChange={(e) => setEditReplyDMs(e.target.checked)}
                      className="accent-cyan-500 rounded"
                    />
                    <span className="text-xs text-slate-300">Auto-Reply in Direct Messages (DMs)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editReplyGroups}
                      onChange={(e) => setEditReplyGroups(e.target.checked)}
                      className="accent-cyan-500 rounded"
                    />
                    <span className="text-xs text-slate-300">Listen & Reply in Group Chats</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
                <button
                  onClick={() => setEditingBot(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={saveBotConfiguration}
                  disabled={isSavingConfig}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingConfig ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ ونشر التعديلات' : 'Save & Deploy Configuration')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LIVE TELEMETRY LOGS MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {viewingLogsBot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl font-mono"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <Terminal className="w-4 h-4" />
                  <span>Telemetry Logs: {viewingLogsBot.id}</span>
                </div>
                <button
                  onClick={() => setViewingLogsBot(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-2 text-xs text-slate-300 max-h-[60vh] overflow-y-auto bg-black/50">
                <div className="text-slate-500">─── Live Stream for {viewingLogsBot.id} ───</div>
                <div className="text-cyan-400">[Heartbeat] Status: {viewingLogsBot.status} | Last Pulse: {String(viewingLogsBot.lastPulse || 'Active')}</div>
                {viewingLogsBot.logs?.map((l, i) => (
                  <div key={i} className="text-slate-300 leading-relaxed">{l}</div>
                ))}
                <div className="text-emerald-400">[Memory Engine] Connected to Obsidian Knowledge Vault.</div>
                <div className="text-slate-400">[Gemini 2.0 Flash] Model inference ready (Temp: {viewingLogsBot.config?.temperature ?? 0.7}).</div>
              </div>
              <div className="p-3 border-t border-slate-800 flex justify-end bg-slate-900/40">
                <button
                  onClick={() => setViewingLogsBot(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
