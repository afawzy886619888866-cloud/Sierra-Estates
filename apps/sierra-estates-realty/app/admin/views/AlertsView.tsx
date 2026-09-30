'use client';

import React, { useState, useMemo } from 'react';

interface AlertItem {
  id: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  severity: 'critical' | 'high' | 'warning' | 'info';
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  badgeLabel?: string;
}

// ANTI-FABRICATION (§21 wave 5): four fabricated demo alerts (an invented
// AVM deviation, a fake VIP viewing request naming a demo lead, a made-up
// latency spike and a fictitious ingestion batch) were previously rendered
// here as live system warnings. Alerts must originate from real monitoring
// — until an alert feed is wired in, the center starts honestly empty.
const INITIAL_ALERTS: AlertItem[] = [];

export default function AlertsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  const updateStatus = (id: string, newStatus: 'acknowledged' | 'resolved' | 'active') => {
    setAlerts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const getSeverityBadge = (severity: AlertItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-950/80 text-red-300 border-red-800';
      case 'high':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'warning':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800';
      case 'info':
        return 'bg-[#211A0D]/80 text-[#F5D78E] border-[#C8961A]/40';
    }
  };

  return (
    <div className="space-y-6" data-testid="alerts-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'مركز التنبيهات الذكية · الإشعارات الحرجة' : 'System Alerts & Threshold Warnings'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'تنبيهات فورية عند انحراف التسعير، العملاء الساخنين، وأداء البوت'
              : 'Immediate escalations for AVM price deviations, high-value leads, or sync anomalies.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#C8961A] text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {isAr ? 'الكل' : 'All'} ({alerts.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-[#C8961A] text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {isAr ? 'نشط' : 'Active'} ({alerts.filter((a) => a.status === 'active').length})
          </button>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'critical', 'high', 'warning', 'info'] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors capitalize ${
              severityFilter === sev
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {sev === 'all' && (isAr ? 'جميع المستويات' : 'All Severities')}
            {sev === 'critical' && (isAr ? 'حرج' : 'Critical')}
            {sev === 'high' && (isAr ? 'مرتفع' : 'High')}
            {sev === 'warning' && (isAr ? 'تحذير' : 'Warning')}
            {sev === 'info' && (isAr ? 'معلومات' : 'Info')}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div
          data-testid="alerts-empty-state"
          className="p-10 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2"
        >
          <div className="text-slate-300 text-sm font-semibold">
            {isAr ? 'لا توجد تنبيهات' : 'No alerts'}
          </div>
          <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'لا توجد تنبيهات مراقبة حقيقية حالياً. ستظهر هنا التنبيهات الصادرة من أنظمة المراقبة الفعلية — لا يتم اختراع تنبيهات تجريبية.'
              : 'There are no real monitoring alerts right now. Alerts raised by the actual monitoring systems will appear here — demo alerts are never invented.'}
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-sm">
          {isAr ? 'لا توجد تنبيهات تطابق الفلتر المحدد.' : 'No alerts match the selected criteria.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.status === 'resolved'
                  ? 'bg-slate-900/40 border-slate-800/50 opacity-70'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${getSeverityBadge(item.severity)}`}>
                    {item.severity.toUpperCase()}
                  </span>
                  {item.badgeLabel && (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-800/80">
                      {item.badgeLabel}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-mono">{item.timestamp}</span>
                  {item.status === 'acknowledged' && (
                    <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900">
                      {isAr ? 'تم الاستلام' : 'ACKNOWLEDGED'}
                    </span>
                  )}
                  {item.status === 'resolved' && (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                      {isAr ? 'تم الحل' : 'RESOLVED'}
                    </span>
                  )}
                </div>

                <div className="text-sm font-semibold text-white">
                  {isAr ? item.title.ar : item.title.en}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr ? item.description.ar : item.description.en}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.status === 'active' && (
                  <button
                    onClick={() => updateStatus(item.id, 'acknowledged')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-amber-900/50 transition-colors"
                  >
                    {isAr ? 'تأكيد الاستلام' : 'Acknowledge'}
                  </button>
                )}
                {item.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(item.id, 'resolved')}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {isAr ? 'إغلاق التنبيه' : 'Resolve'}
                  </button>
                )}
                {item.status === 'resolved' && (
                  <button
                    onClick={() => updateStatus(item.id, 'active')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                  >
                    {isAr ? 'إعادة فتح' : 'Reopen'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
