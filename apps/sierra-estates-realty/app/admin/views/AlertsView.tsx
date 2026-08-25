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

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-1',
    title: {
      en: 'AVM Deviation Alert: Katameya Dunes Unit',
      ar: 'تنبيه انحراف السعر: وحدة في قطامية ديونز'
    },
    description: {
      en: 'Asking price is 28% below median compound market value. Urgent review recommended before syndication.',
      ar: 'سعر الطلب أقل بنسبة 28% من متوسط سعر السوق في الكمبوند. يوصى بالمراجعة العاجلة قبل النشر.'
    },
    severity: 'critical',
    timestamp: '10m ago',
    status: 'active',
    badgeLabel: 'PRIORITY: HIGH',
  },
  {
    id: 'alt-2',
    title: {
      en: 'VIP Hot Lead: Instant Viewing Request Mivida',
      ar: 'عميل ساخن VIP: طلب معاينة فورية في ميفيدا'
    },
    description: {
      en: 'Lead Ahmed Al-Rashid requested 4:00 PM viewing tomorrow. Assigned to Senior VIP Closer.',
      ar: 'طلب العميل أحمد الرشيد معاينة الساعة 4:00 مساءً غداً. تم التعيين لكبير وسطاء VIP.'
    },
    severity: 'high',
    timestamp: '25m ago',
    status: 'active',
    badgeLabel: 'ACTION REQUIRED',
  },
  {
    id: 'alt-3',
    title: {
      en: 'WhatsApp Bot Memory Sync Latency Spike',
      ar: 'ارتفاع زمن استجابة مزامنة ذاكرة بوت واتساب'
    },
    description: {
      en: 'Vector store memory update latency reached 480ms (threshold: 300ms). System auto-recovered.',
      ar: 'وصل زمن استجابة تحديث الذاكرة المتجهية إلى 480 مللي ثانية (الحد: 300 مللي ثانية). تم التعافي التلقائي.'
    },
    severity: 'warning',
    timestamp: '1h ago',
    status: 'acknowledged',
  },
  {
    id: 'alt-4',
    title: {
      en: 'PropertyFinder Ingestion Batch Completed',
      ar: 'اكتملت دفعة استيراد بيانات بروبرتي فايندر'
    },
    description: {
      en: 'Successfully synchronized 142 verified units with automated price index normalization.',
      ar: 'تمت مزامنة 142 وحدة معتمدة بنجاح مع مطابقة وتوحيد مؤشر الأسعار التلقائي.'
    },
    severity: 'info',
    timestamp: '2h ago',
    status: 'resolved',
  },
];

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
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
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
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {isAr ? 'الكل' : 'All'} ({alerts.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-cyan-600 text-white'
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
      {filteredAlerts.length === 0 ? (
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
