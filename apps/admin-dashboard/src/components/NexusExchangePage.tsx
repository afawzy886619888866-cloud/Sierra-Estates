import React, { useEffect, useState, useCallback } from 'react';
import {
  subscribeAllExchange,
  subscribeAgentTasks,
  subscribeWorkflowRuns,
  sendAdminSignal,
  type ExchangeRecord,
} from '../lib/exchange/exchange-client';
import { Bot, Zap, Settings, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    running:   'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse',
    done:      'bg-green-500/10 text-green-500 border-green-500/20',
    error:     'bg-red-500/10 text-red-500 border-red-500/20',
    cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border uppercase tracking-widest ${colors[status] ?? colors.pending}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    agent_task:     <Bot className="w-3 h-3 text-blue-400" />,
    workflow_run:   <Zap className="w-3 h-3 text-[#C9A24D]" />,
    admin_signal:   <Settings className="w-3 h-3 text-slate-400" />,
    crm_event:      <CheckCircle2 className="w-3 h-3 text-green-400" />,
    error:          <AlertCircle className="w-3 h-3 text-red-400" />
  };
  
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
      {icons[type] ?? <Clock className="w-3 h-3 text-slate-500" />} 
      {type.replace('_', ' ')}
    </span>
  );
}

function ProgressBar({ progress, stepName }: { progress?: number; stepName?: string }) {
  if (progress === undefined) return null;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-mono uppercase tracking-widest">
        <span>{stepName ?? 'Processing…'}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C9A24D] to-[#E5C66A] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ExchangeRow({ record }: { record: ExchangeRecord }) {
  const [expanded, setExpanded] = useState(false);
  const ts = record.createdAt?.toDate?.()?.toLocaleTimeString() ?? '—';
  
  return (
    <div
      className="border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 bg-white dark:bg-slate-900/40 hover:border-[#C9A24D]/40 transition-colors cursor-pointer group"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TypeBadge type={record.type} />
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
          <span className="text-slate-400 dark:text-slate-500 text-xs font-mono truncate">#{record.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono">{ts}</span>
          <StatusBadge status={record.status} />
        </div>
      </div>
      
      <ProgressBar progress={record.progress} stepName={record.stepName} />
      
      {expanded && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-black/40 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 overflow-auto max-h-40 border border-slate-200 dark:border-white/5">
          <pre>{JSON.stringify({ payload: record.payload, result: record.result, error: record.error }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

type Tab = 'all' | 'agents' | 'workflows' | 'signals';

export default function NexusExchangePage({ T, isAr }: { T: any, isAr: boolean }) {
  const [tab, setTab] = useState<Tab>('all');
  const [allRecords, setAllRecords] = useState<ExchangeRecord[]>([]);
  const [agentRecords, setAgentRecords] = useState<ExchangeRecord[]>([]);
  const [workflowRecords, setWorkflowRecords] = useState<ExchangeRecord[]>([]);
  
  const [signalPayload, setSignalPayload] = useState('');
  const [agentId, setAgentId] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSignalId, setLastSignalId] = useState<string | null>(null);

  useEffect(() => {
    const unsub1 = subscribeAllExchange(setAllRecords);
    const unsub2 = subscribeAgentTasks(setAgentRecords);
    const unsub3 = subscribeWorkflowRuns(setWorkflowRecords);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const visibleRecords =
    tab === 'agents'    ? agentRecords :
    tab === 'workflows' ? workflowRecords :
    tab === 'signals'   ? allRecords.filter(r => r.type === 'admin_signal') :
    allRecords;

  const stats = {
    total:   allRecords.length,
    running: allRecords.filter(r => r.status === 'running').length,
    done:    allRecords.filter(r => r.status === 'done').length,
    error:   allRecords.filter(r => r.status === 'error').length,
  };

  const handleSendSignal = useCallback(async () => {
    if (!signalPayload.trim()) return;
    setSending(true);
    try {
      const id = await sendAdminSignal({
        action: signalPayload.trim(),
        targetAgentId: agentId.trim() || undefined,
      });
      setLastSignalId(id);
      setSignalPayload('');
      setAgentId('');
      setTimeout(() => setLastSignalId(null), 5000);
    } catch (err) {
      console.error('[Nexus] Failed to send signal:', err);
    } finally {
      setSending(false);
    }
  }, [signalPayload, agentId]);

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-slate-800 dark:text-white' },
          { label: isAr ? 'قيد التشغيل' : 'Running', value: stats.running, color: 'text-blue-500' },
          { label: isAr ? 'مكتمل' : 'Done', value: stats.done, color: 'text-green-500' },
          { label: isAr ? 'أخطاء' : 'Errors', value: stats.error, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-[#0A1628] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className={`text-3xl font-playfair tracking-tight ${color}`}>{value}</div>
            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase tracking-widest mt-2">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A24D]/30 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A24D] to-[#E5C66A]" />
        <h2 className="text-[11px] font-mono font-bold text-[#C9A24D] uppercase tracking-widest mb-4">
          {isAr ? 'إرسال إشارة للوكلاء' : 'Dispatch Admin Signal'}
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            placeholder={isAr ? 'معرف الوكيل (اختياري)' : 'Target Agent ID (optional)'}
            className="bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-800 dark:text-white w-full sm:w-56 focus:outline-none focus:border-[#C9A24D]/50 focus:ring-1 focus:ring-[#C9A24D]/50 transition-all font-mono"
          />
          <input
            type="text"
            value={signalPayload}
            onChange={e => setSignalPayload(e.target.value)}
            placeholder={isAr ? 'الإجراء (مثال: start_closer)' : 'Action payload (e.g. start_closer)'}
            className="flex-1 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#C9A24D]/50 focus:ring-1 focus:ring-[#C9A24D]/50 transition-all font-mono"
            onKeyDown={e => e.key === 'Enter' && handleSendSignal()}
          />
          <button
            onClick={handleSendSignal}
            disabled={sending || !signalPayload.trim()}
            className="px-6 py-2.5 bg-[#C9A24D] text-[#05080f] font-bold text-sm rounded-lg hover:bg-[#B8973B] disabled:opacity-40 transition-colors shadow-md"
          >
            {sending ? '…' : (isAr ? 'إرسال' : 'Dispatch')}
          </button>
        </div>
        {lastSignalId && (
          <p className="text-green-500 text-[10px] mt-3 font-mono tracking-wide">
            ✅ {isAr ? 'تم الإرسال بنجاح' : 'Signal dispatched'} — ID: {lastSignalId}
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {([
          { id: 'all',       label: 'All Records',  labelAr: 'الكل' },
          { id: 'agents',    label: 'Agents',       labelAr: 'الوكلاء' },
          { id: 'workflows', label: 'Workflows',    labelAr: 'سير العمل' },
          { id: 'signals',   label: 'Signals',      labelAr: 'الإشارات' },
        ] as { id: Tab; label: string; labelAr: string }[]).map(({ id, label, labelAr }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-colors ${
              tab === id 
                ? 'bg-slate-800 dark:bg-white text-white dark:text-[#05080f] shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {isAr ? labelAr : label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleRecords.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-slate-900/20 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
            <div className="text-slate-400 mb-3"><Bot className="w-8 h-8 mx-auto opacity-50" /></div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {isAr ? 'لا توجد سجلات بعد' : 'No exchange records found'}
            </div>
            <div className="text-[10px] font-mono mt-2 text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {isAr ? 'في انتظار الإشارات' : 'Awaiting telemetry...'}
            </div>
          </div>
        ) : (
          visibleRecords.map(record => (
            <ExchangeRow key={record.id} record={record} />
          ))
        )}
      </div>
    </div>
  );
}
