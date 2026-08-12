import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { motion } from 'motion/react';
import {
  Bot, RefreshCw, RotateCcw, Zap, Power, PowerOff,
  Activity, Clock, AlertTriangle, CheckCircle,
  MessageSquare, Workflow, PenLine, Palette, Handshake, Heart,
  type LucideIcon,
} from 'lucide-react';

interface Bot {
  id: string;
  status: 'active' | 'syncing' | 'error' | 'idle' | 'offline';
  lastPulse?: string;
  lastError?: string;
  enabled?: boolean;
  lastCommand?: string;
  lastCommandAt?: string;
  config?: Record<string, any>;
  stats?: Record<string, any>;
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

const BOT_DESCRIPTIONS: Record<string, { en: string; ar: string; icon: LucideIcon }> = {
  'liela-bot': {
    en: 'Liela Bot (OpenClaw Plugin active)',
    ar: 'روبوت ليلى (مزود بـ OpenClaw)',
    icon: MessageSquare,
  },
  'whatsapp-scraper': {
    en: 'Live broker-group lead ingestion bot',
    ar: 'بوت استخراج العملاء من مجموعات الوسطاء',
    icon: MessageSquare,
  },
  'n8n-orchestrator': {
    en: 'Workflow automation engine (Docker, port 5678)',
    ar: 'محرك أتمتة سير العمل',
    icon: Workflow,
  },
  'scribe-agent': {
    en: 'AI listing normalization (S1-S2)',
    ar: 'تطبيع قوائم الذكاء الاصطناعي',
    icon: PenLine,
  },
  'curator-agent': {
    en: 'AI portfolio curation (S3-S5)',
    ar: 'تنسيق محفظة الذكاء الاصطناعي',
    icon: Palette,
  },
  'closer-agent': {
    en: 'Fail-safe lead follow-up (Stage 9)',
    ar: 'متابعة العملاء الآمنة',
    icon: Handshake,
  },
  'matchmaker-agent': {
    en: 'Lead-to-property matching',
    ar: 'مطابقة العملاء بالعقارات',
    icon: Heart,
  },
  'property-finder-bot': {
    en: 'Property Finder API Sync & Lead Intake',
    ar: 'مزامنة Property Finder واستقبال العملاء',
    icon: RefreshCw,
  },
  'mass-blast-bot': {
    en: 'WhatsApp Mass-Blast Campaign Dispatcher',
    ar: 'محرك الحملات الترويجية الجماهيرية WhatsApp',
    icon: Zap,
  },
};

export default function BotsControlPage({ T, isAr = false }: BotsControlPageProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { success, bots, error: apiError } = await api.get<{ success: boolean; bots: Bot[]; error?: string }>(
        '/api/admin/bots'
      );
      if (!success) throw new Error(apiError || 'Failed to fetch');
      setBots(bots || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    // Auto-refresh every 30s
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  const sendCommand = async (botId: string, command: string) => {
    setActionLoading(`${botId}:${command}`);
    try {
      await api.post('/api/admin/bots', { botId, command });
      // Immediate refresh to show the pending command
      setTimeout(fetchBots, 500);
    } catch (err: any) {
      alert(`Command failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'التحكم بالبوتات' : 'Bots Control'}
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            {isAr
              ? 'مراقبة وتحكم بالبوتات والوكلاء الآليين · تحديث تلقائي كل 30 ثانية'
              : 'Monitor and control background bots and AI agents · auto-refreshes every 30s'}
          </p>
        </div>
        <button
          onClick={fetchBots}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md text-[13px] font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg">
          <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Bots grid — 2 columns max for breathing room (was 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && bots.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-500">
            <RefreshCw className="animate-spin mx-auto mb-3 text-slate-400" size={20} strokeWidth={1.75} />
            <p className="text-[13px]">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>
          </div>
        ) : bots.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-500">
            <Bot className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={36} strokeWidth={1.25} />
            <p className="text-[13px]">{isAr ? 'لا توجد بوتات مسجلة' : 'No bots registered'}</p>
          </div>
        ) : (
          bots.map((bot, index) => {
            const config = STATUS_CONFIG[bot.status] || STATUS_CONFIG.offline;
            const StatusIcon = config.icon;
            const desc = BOT_DESCRIPTIONS[bot.id] || { en: bot.id, ar: bot.id, icon: Bot };
            const BotIcon = desc.icon;
            const enabled = bot.enabled !== false;

            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.05 }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                className={`group bg-white dark:bg-slate-900 border rounded-xl p-5 transition-colors ${
                  bot.status === 'error'
                    ? 'border-red-200 dark:border-red-900/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header — icon + name + status, with proper spacing */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <BotIcon className="w-[18px] h-[18px] text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-medium text-slate-900 dark:text-white font-mono truncate">
                        {bot.id}
                      </h3>
                      <p className="text-[12px] text-slate-500 truncate mt-0.5">
                        {isAr ? desc.ar : desc.en}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg} ring-1 ring-inset ${config.ring} shrink-0`}>
                    <StatusIcon className={`w-3 h-3 ${config.color}`} strokeWidth={2} />
                    <span className={`text-[11px] font-medium ${config.color}`}>
                      {isAr ? config.labelAr : config.label}
                    </span>
                  </div>
                </div>

                {/* Stats — single muted line, not a dense block */}
                <div className="text-[12px] text-slate-500 mb-4 min-h-[20px]">
                  {bot.lastError ? (
                    <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
                      <span className="line-clamp-1">{bot.lastError.slice(0, 120)}</span>
                    </div>
                  ) : bot.lastPulse ? (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                      <span>
                        {isAr ? 'آخر نبضة' : 'Last pulse'}: {new Date(bot.lastPulse).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">—</span>
                  )}
                </div>

                {/* Action buttons — only on hover, prevents visual noise */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => sendCommand(bot.id, 'run_now')}
                      disabled={actionLoading === `${bot.id}:run_now` || !enabled}
                      className="flex items-center gap-1.5 px-2.5 h-7 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-md text-[11px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Run now"
                    >
                      <Zap className="w-3 h-3" strokeWidth={2} />
                      {isAr ? 'تشغيل' : 'Run'}
                    </button>
                    <button
                      onClick={() => sendCommand(bot.id, 'restart')}
                      disabled={actionLoading === `${bot.id}:restart`}
                      className="flex items-center gap-1.5 px-2.5 h-7 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-md text-[11px] font-medium transition disabled:opacity-40"
                      title="Restart"
                    >
                      <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
                      {isAr ? 'إعادة' : 'Restart'}
                    </button>
                    {enabled ? (
                      <button
                        onClick={() => sendCommand(bot.id, 'disable')}
                        disabled={actionLoading === `${bot.id}:disable`}
                        className="flex items-center gap-1.5 px-2.5 h-7 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md text-[11px] font-medium transition disabled:opacity-40"
                        title="Disable"
                      >
                        <PowerOff className="w-3 h-3" strokeWidth={1.75} />
                        {isAr ? 'إيقاف' : 'Disable'}
                      </button>
                    ) : (
                      <button
                        onClick={() => sendCommand(bot.id, 'enable')}
                        disabled={actionLoading === `${bot.id}:enable`}
                        className="flex items-center gap-1.5 px-2.5 h-7 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md text-[11px] font-medium transition disabled:opacity-40"
                        title="Enable"
                      >
                        <Power className="w-3 h-3" strokeWidth={1.75} />
                        {isAr ? 'تفعيل' : 'Enable'}
                      </button>
                    )}
                  </div>

                  {/* Last command — always visible, subtle */}
                  {bot.lastCommand && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto">
                      <span className="font-mono text-blue-600 dark:text-blue-400">{bot.lastCommand}</span>
                      {bot.lastCommandAt && (
                        <span>· {new Date(bot.lastCommandAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
