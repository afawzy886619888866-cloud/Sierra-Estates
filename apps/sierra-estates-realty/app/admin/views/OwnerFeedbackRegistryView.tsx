/* eslint-disable */
// @ts-nocheck
'use client';
/**
 * Owner Feedback Registry View — سجل فيدباك الملاك
 * ──────────────────────────────────────────────────
 * Shows all contacted owners with their feedback status,
 * categorized into tabs: Available / Negotiating / Brokers / Inactive / No Reply
 * Quick-action buttons to reclassify entries.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface FeedbackEntry {
  phone: string;
  displayPhone: string;
  ownerName: string;
  unitCode: string;
  compound: string;
  price: string;
  bedrooms: string;
  dealType: string;
  category: string;
  label: string;
  replyText: string;
  mediaCount: number;
  outreachAt: string;
  lastStatusAt: string;
  lastStatusDate: string;
  session: string;
  source: string;
  notes?: string;
}

interface RegistryStats {
  totalContacted: number;
  totalReplied: number;
  responseRate: string;
  breakdown: Record<string, number>;
  generatedAt: string;
  generatedDate: string;
}

const TAB_CONFIGS = [
  { key: 'all', label: 'الكل', labelEn: 'All', icon: '📋', color: '#6366f1' },
  { key: 'available', label: 'متاح', labelEn: 'Available', icon: '✅', color: '#10b981' },
  { key: 'negotiating', label: 'تفاوض', labelEn: 'Negotiating', icon: '💬', color: '#f59e0b' },
  { key: 'general_reply', label: 'ردود', labelEn: 'Replies', icon: '💌', color: '#8b5cf6' },
  { key: 'brokers', label: 'بروكرز', labelEn: 'Brokers', icon: '🏢', color: '#ef4444' },
  { key: 'inactive', label: 'غير نشط', labelEn: 'Inactive', icon: '🚫', color: '#6b7280' },
  { key: 'no_reply', label: 'بدون رد', labelEn: 'No Reply', icon: '⏳', color: '#94a3b8' },
] as const;

const CATEGORY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: '#ecfdf5', text: '#047857', label: '✅ متاح' },
  negotiating: { bg: '#fffbeb', text: '#b45309', label: '💬 تفاوض' },
  broker: { bg: '#fef2f2', text: '#b91c1c', label: '🏢 بروكر' },
  unavailable: { bg: '#f3f4f6', text: '#374151', label: '🚫 اتباعت' },
  blocked: { bg: '#fef2f2', text: '#991b1b', label: '⛔ بلوك' },
  opt_out: { bg: '#fef2f2', text: '#991b1b', label: '❌ إلغاء' },
  no_reply: { bg: '#f8fafc', text: '#64748b', label: '⏳ بدون رد' },
  general_reply: { bg: '#f5f3ff', text: '#6d28d9', label: '💌 رد مالك' },
};

const RECLASSIFY_OPTIONS = [
  { value: 'available', label: '✅ متاح' },
  { value: 'negotiating', label: '💬 تفاوض' },
  { value: 'broker', label: '🏢 بروكر' },
  { value: 'unavailable', label: '🚫 اتباعت' },
  { value: 'blocked', label: '⛔ بلوك' },
  { value: 'opt_out', label: '❌ إلغاء' },
];

export default function OwnerFeedbackRegistryView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [reclassifying, setReclassifying] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const url = `/api/admin/owner-feedback${refresh ? '?refresh=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setEntries(data.entries || []);
      setStats(data.stats || null);
      setTabCounts(data.tabs || {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReclassify = useCallback(async (phone: string, newCategory: string) => {
    try {
      setReclassifying(phone);
      const res = await fetch('/api/admin/owner-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, category: newCategory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        // Update local state
        setEntries(prev => prev.map(e =>
          e.phone === phone ? { ...e, category: newCategory, label: data.entry?.label || newCategory, lastStatusDate: data.entry?.lastStatusDate || e.lastStatusDate } : e
        ));
        if (data.stats) setStats(data.stats);
        if (data.tabs) setTabCounts(data.tabs);
      }
    } catch (err: unknown) {
      console.error('Reclassify error:', err);
    } finally {
      setReclassifying(null);
    }
  }, []);

  const handleSyncSheet = useCallback(async () => {
    try {
      setSyncing(true);
      setSyncNotice(null);
      const res = await fetch('/api/admin/owner-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_sheet' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const msg = data?.syncResult?.error || data?.error || `HTTP ${res.status}`;
        setSyncNotice({ ok: false, text: isAr ? `تعذر المزامنة: ${msg}` : `Sync failed: ${msg}` });
        return;
      }
      const tabsSummary = Array.isArray(data?.syncResult?.results)
        ? data.syncResult.results.map((r: { tab: string; rows: number; status: string }) => `${r.tab}: ${r.rows} (${r.status})`).join(' • ')
        : (isAr ? 'تمت المزامنة بنجاح' : 'Synced successfully');
      setSyncNotice({ ok: true, text: isAr ? `✅ تمت مزامنة Google Sheets — ${tabsSummary}` : `✅ Google Sheets synced — ${tabsSummary}` });
    } catch (err: unknown) {
      setSyncNotice({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSyncing(false);
    }
  }, [isAr]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Tab filter
    if (activeTab !== 'all') {
      const tabCategories: Record<string, string[]> = {
        available: ['available'],
        negotiating: ['negotiating'],
        general_reply: ['general_reply'],
        brokers: ['broker'],
        inactive: ['unavailable', 'blocked', 'opt_out'],
        no_reply: ['no_reply'],
      };
      const cats = tabCategories[activeTab];
      if (cats) result = result.filter(e => cats.includes(e.category));
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(e =>
        e.phone.includes(q) ||
        e.displayPhone.includes(q) ||
        e.ownerName.toLowerCase().includes(q) ||
        e.unitCode.toLowerCase().includes(q) ||
        e.compound.toLowerCase().includes(q) ||
        e.replyText.toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, activeTab, search]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#64748b' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
          <p>{isAr ? 'جاري تحميل سجل الملاك...' : 'Loading owner registry...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            📋 {isAr ? 'سجل فيدباك الملاك' : 'Owner Feedback Registry'}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {isAr ? 'تصفية وتنقيح الملاك من تواصل الواتساب' : 'Filter & categorize owners from WhatsApp outreach'}
            {stats?.generatedDate && <span style={{ marginLeft: 8, opacity: 0.7 }}>• {stats.generatedDate}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            background: refreshing ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 8, cursor: refreshing ? 'wait' : 'pointer',
            boxShadow: '0 2px 8px rgba(99,102,241,0.3)', transition: 'all 0.2s',
          }}
        >
          {refreshing ? '⏳' : '🔄'} {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#991b1b', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          <StatCard icon="📤" label={isAr ? 'تم التواصل' : 'Contacted'} value={stats.totalContacted} color="#6366f1" />
          <StatCard icon="💬" label={isAr ? 'ردوا' : 'Replied'} value={stats.totalReplied} color="#10b981" />
          <StatCard icon="📊" label={isAr ? 'نسبة الرد' : 'Rate'} value={stats.responseRate} color="#f59e0b" />
          <StatCard icon="✅" label={isAr ? 'متاح' : 'Available'} value={stats.breakdown.available} color="#10b981" />
          <StatCard icon="💬" label={isAr ? 'تفاوض' : 'Negotiating'} value={stats.breakdown.negotiating} color="#f59e0b" />
          <StatCard icon="🏢" label={isAr ? 'بروكرز' : 'Brokers'} value={stats.breakdown.broker} color="#ef4444" />
          <StatCard icon="🚫" label={isAr ? 'اتباعت' : 'Sold'} value={stats.breakdown.unavailable} color="#6b7280" />
          <StatCard icon="💌" label={isAr ? 'ردود عامة' : 'General'} value={stats.breakdown.general_reply} color="#8b5cf6" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {TAB_CONFIGS.map(tab => {
          const count = tab.key === 'all' ? entries.length : (tabCounts[tab.key] ?? 0);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '7px 14px', fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                background: isActive ? `${tab.color}12` : 'transparent',
                color: isActive ? tab.color : '#64748b',
                border: isActive ? `1.5px solid ${tab.color}40` : '1px solid transparent',
                borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon} {isAr ? tab.label : tab.labelEn} <span style={{ opacity: 0.6, fontSize: 11 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? '🔍 بحث بالرقم أو الاسم أو الكمبوند...' : '🔍 Search by phone, name, compound...'}
          style={{
            width: '100%', maxWidth: 420, padding: '9px 14px', fontSize: 13,
            border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
            background: '#f8fafc', transition: 'border 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
        />
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        {filteredEntries.length} {isAr ? 'نتيجة' : 'results'}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{isAr ? 'الرقم' : 'Phone'}</th>
              <th style={thStyle}>{isAr ? 'الاسم' : 'Name'}</th>
              <th style={thStyle}>{isAr ? 'الكود' : 'Code'}</th>
              <th style={thStyle}>{isAr ? 'الكمبوند' : 'Compound'}</th>
              <th style={thStyle}>{isAr ? 'الحالة' : 'Status'}</th>
              <th style={thStyle}>{isAr ? 'الرد' : 'Reply'}</th>
              <th style={thStyle}>{isAr ? 'آخر تحديث' : 'Last Update'}</th>
              <th style={thStyle}>{isAr ? 'إجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.slice(0, 200).map((entry, i) => {
              const badge = CATEGORY_BADGE[entry.category] || CATEGORY_BADGE.no_reply;
              return (
                <tr key={entry.phone} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11.5, direction: 'ltr' }}>{entry.displayPhone}</td>
                  <td style={tdStyle}>{entry.ownerName}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{entry.unitCode || '—'}</td>
                  <td style={tdStyle}>{entry.compound || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: badge.bg, color: badge.text,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl' }}>
                    {entry.replyText ? entry.replyText.slice(0, 80) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    {entry.mediaCount > 0 && <span style={{ marginRight: 4, color: '#94a3b8' }}>📎{entry.mediaCount}</span>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {entry.lastStatusDate || entry.outreachAt?.slice(0, 10) || '—'}
                  </td>
                  <td style={tdStyle}>
                    <select
                      value=""
                      onChange={e => {
                        if (e.target.value) handleReclassify(entry.phone, e.target.value);
                        e.target.value = '';
                      }}
                      disabled={reclassifying === entry.phone}
                      style={{
                        padding: '3px 6px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5,
                        background: reclassifying === entry.phone ? '#f1f5f9' : '#fff',
                        cursor: reclassifying === entry.phone ? 'wait' : 'pointer',
                      }}
                    >
                      <option value="">{reclassifying === entry.phone ? '⏳' : (isAr ? 'تغيير' : 'Change')}</option>
                      {RECLASSIFY_OPTIONS.filter(o => o.value !== entry.category).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            {isAr ? 'لا توجد نتائج' : 'No results found'}
          </div>
        )}
        {filteredEntries.length > 200 && (
          <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: 12, borderTop: '1px solid #f1f5f9' }}>
            {isAr ? `عرض أول 200 من ${filteredEntries.length} نتيجة` : `Showing first 200 of ${filteredEntries.length} results`}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
      background: `linear-gradient(135deg, ${color}08, ${color}04)`,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569',
  fontSize: 11.5, letterSpacing: '0.02em', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '9px 12px', color: '#1e293b',
};
