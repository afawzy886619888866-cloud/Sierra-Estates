'use client';

import React, { useState, useMemo } from 'react';

interface ReportItem {
  id: string;
  title: string;
  category: 'valuation' | 'revenue' | 'compliance';
  date: string;
  summary: string;
  format: 'PDF' | 'CSV';
  size: string;
}

const REPORTS_DATA: ReportItem[] = [
  {
    id: 'rep-1',
    title: 'Q2 2026 Fleet Intelligence & Valuation Audit',
    category: 'valuation',
    date: '2026-08-20',
    summary: 'Generated on 2026-08-20 · Includes 1,547 listings evaluated by Vertex AI.',
    format: 'PDF',
    size: '4.8 MB',
  },
  {
    id: 'rep-2',
    title: 'August Deal Conversion & Revenue Pipeline',
    category: 'revenue',
    date: '2026-08-23',
    summary: 'Generated today · 97 closed deals totaling EGP 601M in gross volume.',
    format: 'PDF',
    size: '3.2 MB',
  },
  {
    id: 'rep-3',
    title: 'New Cairo Compound Price Index Normalization Data',
    category: 'valuation',
    date: '2026-08-22',
    summary: 'Comprehensive tabular export of median asking vs transacted price per sqm.',
    format: 'CSV',
    size: '1.4 MB',
  },
  {
    id: 'rep-4',
    title: 'Audit Log & Agent Zero-Trust Access Verification',
    category: 'compliance',
    date: '2026-08-21',
    summary: 'Security review of memory accesses, webhook verifications, and auth sessions.',
    format: 'PDF',
    size: '2.1 MB',
  },
];

export default function ReportsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'valuation' | 'revenue' | 'compliance'>('all');
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    if (categoryFilter === 'all') return REPORTS_DATA;
    return REPORTS_DATA.filter((r) => r.category === categoryFilter);
  }, [categoryFilter]);

  const handleDownload = (title: string, format: string) => {
    setDownloadNotification(
      isAr ? `جاري تحميل ${title} (${format})...` : `Downloading ${title} (${format})...`
    );
    setTimeout(() => {
      setDownloadNotification(null);
    }, 3000);
  };

  return (
    <div className="space-y-6" data-testid="reports-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'التقارير التحليلية · التصدير' : 'Executive Reports & Analytics'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'توليد تقارير دورية عن أداء الوسطاء والمبيعات والتقييمات العقارية'
              : 'Automated valuation audits, monthly deal summaries, and broker KPI performance exports.'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleDownload('Master_Sierra_Export', 'CSV')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleDownload('Executive_Summary_Report', 'PDF')}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
          >
            {isAr ? 'توليد تقرير PDF' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {downloadNotification && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-800 rounded-lg text-cyan-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <span>✓ {downloadNotification}</span>
          <button onClick={() => setDownloadNotification(null)} className="text-cyan-400 font-bold">✕</button>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 pb-1 overflow-x-auto">
        {(['all', 'valuation', 'revenue', 'compliance'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors capitalize ${
              categoryFilter === cat
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat === 'all' && (isAr ? 'جميع التقارير' : 'All Reports')}
            {cat === 'valuation' && (isAr ? 'التقييم العقاري' : 'Valuation')}
            {cat === 'revenue' && (isAr ? 'الإيرادات والصفقات' : 'Revenue')}
            {cat === 'compliance' && (isAr ? 'الامتثال والأمان' : 'Compliance')}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-white text-sm">{report.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {report.format} • {report.size}
                </span>
              </div>
              <p className="text-xs text-slate-400">{report.summary}</p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <div className="text-xs text-cyan-400 font-mono">Status: Ready for Download</div>
              <button
                onClick={() => handleDownload(report.title, report.format)}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
              >
                {isAr ? 'تحميل' : 'Download'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
