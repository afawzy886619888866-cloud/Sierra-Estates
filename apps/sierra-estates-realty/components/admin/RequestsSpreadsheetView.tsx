'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Users,
  Eye,
  Sparkles,
  Calendar,
  Building,
  Check,
  Copy,
} from 'lucide-react';
import type { RequestSheetRow } from '@/lib/services/RequestSheetSyncService';

interface RequestsStats {
  total: number;
  buyerDemands: number;
  viewingRequests: number;
  campaigns: number;
  newCount: number;
  contactedCount: number;
  scheduledCount: number;
}

export default function RequestsSpreadsheetView({ lang = 'ar' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [rows, setRows] = useState<RequestSheetRow[]>([]);
  const [stats, setStats] = useState<RequestsStats | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buyer_demand' | 'viewing_request'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/requests/sheet');
      const data = await res.json();
      if (data.ok) {
        setRows(data.rows || []);
        setStats(data.stats || null);
        if (data.sheetUrl) setSheetUrl(data.sheetUrl);
      }
    } catch (err: any) {
      console.error('Failed to load requests sheet:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleSyncToGoogle = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/requests/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_sheet' }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMsg({
          type: 'ok',
          text: isAr
            ? `✓ تمت مزامنة ${data.synced || 0} طلب مع جوجل شيت بنجاح!`
            : `✓ Successfully synced ${data.synced || 0} requests to Google Sheet!`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err.message || (isAr ? 'فشلت المزامنة مع الشيت' : 'Failed to sync with Google Sheet'),
      });
    } finally {
      setSyncing(false);
      fetchRequests();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/admin/requests/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id, status: newStatus }),
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus as any } : r)));
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCsv = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      'ID',
      'Type',
      'Date',
      'Client_Name',
      'Phone',
      'Email',
      'Mode',
      'Zone_Compound',
      'Unit_Type',
      'Bedrooms',
      'Budget',
      'Campaign',
      'Target_Date',
      'Status',
      'Notes',
    ];
    const csvRows = filteredRows.map((r) => [
      `"${r.id}"`,
      `"${r.type}"`,
      `"${r.createdAt?.slice(0, 10)}"`,
      `"${r.clientName.replace(/"/g, '""')}"`,
      `"${r.clientPhone}"`,
      `"${r.clientEmail || ''}"`,
      `"${r.mode}"`,
      `"${(r.preferredZone || '').replace(/"/g, '""')}"`,
      `"${r.unitType}"`,
      `"${r.bedrooms || ''}"`,
      `"${(r.budget || '').toString().replace(/"/g, '""')}"`,
      `"${r.campaign || ''}"`,
      `"${r.targetDate || ''}"`,
      `"${r.status}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sierra-requests-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterMode !== 'all' && r.mode !== filterMode) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.clientName?.toLowerCase().includes(term) ||
        r.clientPhone?.includes(term) ||
        r.preferredZone?.toLowerCase().includes(term) ||
        r.unitType?.toLowerCase().includes(term) ||
        r.id?.toLowerCase().includes(term) ||
        r.notes?.toLowerCase().includes(term)
      );
    });
  }, [rows, filterType, filterStatus, filterMode, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Bento Diagnostic Header */}
      <div className="station-bento p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                background: 'linear-gradient(145deg, #e0f2fe, #bae6fd)',
                border: '2px solid rgba(14, 165, 233, 0.4)',
                boxShadow: '0 8px 18px -4px rgba(14, 165, 233, 0.25), inset 2px 2px 4px rgba(255,255,255,0.9)',
              }}
            >
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--tx-s)] m-0">
                  {isAr ? 'شيت طلبات العملاء أونلاين' : 'Client Requests Online Spreadsheet'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● LIVE SHEET SYNC
                </span>
              </div>
              <p className="text-xs text-[var(--tx-m)] mt-0.5">
                {isAr
                  ? 'مزامنة فورية لكافة طلبات الشراء، الإيجار، والمعاينات من الموقع والحملات إلى جوجل شيت و Supabase.'
                  : 'Real-time two-way synchronization for buyer demands, rental inquiries & property viewings.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleSyncToGoogle}
              disabled={syncing}
              className="station-scan-pill px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'مزامنة مع جوجل شيت' : 'Sync to Google Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="clay-pill px-3.5 py-2 text-xs font-bold text-[var(--tx-s)] flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>{isAr ? 'تصدير إكسل / CSV' : 'Export CSV'}</span>
            </button>

            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="clay-btn-gold px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <span>{isAr ? 'فتح الشيت أونلاين' : 'Open Sheet'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* 4 Vertical KPI Pillars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="station-kpi-pillar p-4 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--tx-f)]">
                {isAr ? 'إجمالي الطلبات' : 'Total Requests'}
              </span>
              <span className="text-base">📋</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-[var(--tx-s)]">
              {stats?.total ?? rows.length}
            </div>
            <div className="station-bar-track">
              <div
                className="station-bar-fill"
                style={{ width: `${Math.min(100, Math.max(15, (stats?.total ?? rows.length) * 5))}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--tx-m)] font-semibold">
              {stats?.newCount ?? 0} {isAr ? 'طلب جديد غير متواصل' : 'New / Uncontacted'}
            </div>
          </div>

          <div className="station-kpi-pillar p-4 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--tx-f)]">
                {isAr ? 'طلبات الشراء والبحث' : 'Buyer Demands'}
              </span>
              <span className="text-base">🏢</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-sky-600">
              {stats?.buyerDemands ?? rows.filter((r) => r.type === 'buyer_demand').length}
            </div>
            <div className="station-bar-track">
              <div
                className="station-bar-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(15, (stats?.buyerDemands ?? rows.filter((r) => r.type === 'buyer_demand').length) * 8)
                  )}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-sky-700 font-semibold">
              ✓ {isAr ? 'مربوطة بالمخزون والمطابقة' : 'AI Matched with Inventory'}
            </div>
          </div>

          <div className="station-kpi-pillar p-4 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--tx-f)]">
                {isAr ? 'طلبات المعاينات' : 'Viewing Tours'}
              </span>
              <span className="text-base">📅</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-600">
              {stats?.viewingRequests ?? rows.filter((r) => r.type === 'viewing_request').length}
            </div>
            <div className="station-bar-track">
              <div
                className="station-bar-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      15,
                      (stats?.viewingRequests ?? rows.filter((r) => r.type === 'viewing_request').length) * 12
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-amber-700 font-semibold">
              ⚡ {isAr ? 'تتبع الساعة الذهبية نشط' : 'Golden-Hour Follow-Up Active'}
            </div>
          </div>

          <div className="station-kpi-pillar p-4 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--tx-f)]">
                {isAr ? 'عروض البلاك فرايداي (25%)' : '25% Discount Campaigns'}
              </span>
              <span className="text-base">🏷️</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600">
              {stats?.campaigns ?? rows.filter((r) => Boolean(r.campaign || r.voucherCode)).length}
            </div>
            <div className="station-bar-track">
              <div
                className="station-bar-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      20,
                      (stats?.campaigns ?? rows.filter((r) => Boolean(r.campaign || r.voucherCode)).length) * 15
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold">
              🎉 {isAr ? 'ساري حتى 25 نوفمبر 2026' : 'Active till 25 Nov 2026'}
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`clay-card p-3.5 text-xs border ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              : 'bg-red-50/90 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="clay-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="clay-inset flex items-center gap-2 px-3 py-1.5 min-w-[280px] flex-1 max-w-md bg-white">
            <Search className="w-4 h-4 text-[var(--tx-f)] shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث باسم العميل، الهاتف، الكومباوند، كود الطلب...'
                  : 'Search by client name, mobile, compound, code...'
              }
              className="bg-transparent border-0 text-xs text-[var(--tx-s)] outline-none w-full"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter */}
            <div className="clay-inset flex items-center p-1 rounded-xl text-xs bg-slate-50">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-sky-700 shadow-xs' : 'text-[var(--tx-m)]'
                }`}
              >
                {isAr ? 'الكل' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('buyer_demand')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'buyer_demand' ? 'bg-white text-sky-700 shadow-xs' : 'text-[var(--tx-m)]'
                }`}
              >
                {isAr ? 'طلبات شراء وبحث' : 'Buyer Demands'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('viewing_request')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'viewing_request' ? 'bg-white text-amber-700 shadow-xs' : 'text-[var(--tx-m)]'
                }`}
              >
                {isAr ? 'معاينات' : 'Viewings'}
              </button>
            </div>

            {/* Mode Filter */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-[var(--tx-s)] outline-none shadow-xs"
            >
              <option value="all">{isAr ? 'كل المعاملات' : 'All Modes'}</option>
              <option value="sale">{isAr ? 'بيع / شراء' : 'Sale'}</option>
              <option value="rent">{isAr ? 'إيجار' : 'Rent'}</option>
              <option value="resale">{isAr ? 'ريسيل' : 'Resale'}</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-[var(--tx-s)] outline-none shadow-xs"
            >
              <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="new">{isAr ? 'جديد (New)' : 'New'}</option>
              <option value="contacted">{isAr ? 'تم التواصل (Contacted)' : 'Contacted'}</option>
              <option value="viewing_scheduled">{isAr ? 'معاينة مجدولة' : 'Viewing Scheduled'}</option>
              <option value="closed">{isAr ? 'مكتمل / مغلق' : 'Closed'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="clay-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-[var(--tx-f)]">
                <th className="py-3 px-3 text-start">ID / Code</th>
                <th className="py-3 px-3 text-start">{isAr ? 'العميل والتواصل' : 'Client & Contact'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'نوع الطلب' : 'Type'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'المنطقة / الكومباوند' : 'Zone / Compound'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'المواصفات المطلوبة' : 'Specs'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'الميزانية' : 'Budget'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'الحملة / الخصم' : 'Campaign'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'التاريخ المستهدف' : 'Target Date'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'الوحدات المرشحة' : 'Matched Units'}</th>
                <th className="py-3 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                      <span>{isAr ? 'جاري تحميل شيت الطلبات...' : 'Loading Requests Spreadsheet...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    {isAr ? 'لا توجد طلبات مطابقة للبحث أو الفلتر حالياً.' : 'No matching requests found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isViewing = row.type === 'viewing_request';
                  const cleanPhoneNum = row.clientPhone?.replace(/[^0-9]/g, '');
                  const waLink = cleanPhoneNum ? `https://wa.me/${cleanPhoneNum}` : null;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID / Code */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]">{row.id}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(row.id, row.id)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Copy ID"
                          >
                            {copiedId === row.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[9px] text-[var(--tx-f)] font-sans">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''}
                        </div>
                      </td>

                      {/* Client & Contact */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-[var(--tx-s)]">{row.clientName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-600">{row.clientPhone}</span>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isViewing
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {isViewing ? (isAr ? 'معاينة' : 'Viewing') : (isAr ? 'طلب شراء/بحث' : 'Demand')}
                        </span>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                          {row.mode}
                        </div>
                      </td>

                      {/* Zone / Compound */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{row.preferredZone}</div>
                        {row.notes && <p className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">{row.notes}</p>}
                      </td>

                      {/* Specs */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-700 font-medium">{row.unitType}</div>
                        <div className="text-[10px] text-slate-500">
                          {row.bedrooms ? `${row.bedrooms} beds` : ''} {row.finishing ? `· ${row.finishing}` : ''}
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {row.budget}
                      </td>

                      {/* Campaign */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.campaign || row.voucherCode ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            🏷️ {row.campaign || row.voucherCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Target Date */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {row.targetDate || '—'}
                      </td>

                      {/* Matched Units */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.matchedUnits && row.matchedUnits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.matchedUnits.map((u) => (
                              <span
                                key={u}
                                className="px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-sky-50 text-sky-800 border border-sky-200"
                              >
                                {u}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                            row.status === 'new'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : row.status === 'contacted'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : row.status === 'viewing_scheduled'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <option value="new">{isAr ? 'جديد (New)' : 'New'}</option>
                          <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                          <option value="viewing_scheduled">{isAr ? 'معاينة مجدولة' : 'Viewing Scheduled'}</option>
                          <option value="closed">{isAr ? 'مكتمل / مغلق' : 'Closed'}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
