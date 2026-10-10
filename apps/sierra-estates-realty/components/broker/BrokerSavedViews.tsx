'use client';

import React, { useState, useEffect } from 'react';
import {
  Filter,
  Share2,
  BookmarkPlus,
  Play,
  Check,
  Building2,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface SavedViewItem {
  id: string;
  title: string;
  dsl: string;
  visibility: string;
  shareUrl: string;
  createdAt: string;
}

const PRESET_VIEWS = [
  {
    title: 'Mivida Luxury Resale',
    dsl: `COLLECTION listings
VISIBILITY broker
SHOW code, compound, propertyType, price, area, finishing
FILTER compound == "Mivida"
FILTER price >= 15000000
SORT price desc`,
  },
  {
    title: 'Eastown Fast Deals',
    dsl: `COLLECTION listings
VISIBILITY broker
SHOW code, compound, propertyType, price, area, bedrooms
FILTER compound == "Eastown"
FILTER price <= 12000000
SORT price asc`,
  },
  {
    title: 'Fifth Square 3-Bed Family Units',
    dsl: `COLLECTION listings
VISIBILITY broker
SHOW code, compound, propertyType, price, bedrooms, area
FILTER compound == "Fifth Square"
FILTER bedrooms == 3
SORT price asc`,
  },
];

export default function BrokerSavedViews({ isAr = false }: { isAr?: boolean }) {
  const [dslInput, setDslInput] = useState(PRESET_VIEWS[0].dsl);
  const [viewTitle, setViewTitle] = useState(PRESET_VIEWS[0].title);
  const [viewsList, setViewsList] = useState<SavedViewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeResults, setActiveResults] = useState<any[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Load saved views on mount
  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/views?visibility=broker');
      const json = await res.json();
      if (json.success && Array.isArray(json.views)) {
        setViewsList(json.views);
      }
    } catch (err) {
      console.warn('[BrokerSavedViews] Error loading views:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveView = async () => {
    if (!viewTitle.trim() || !dslInput.trim()) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: viewTitle,
          dsl: dslInput,
          visibility: 'broker',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg(isAr ? '✓ تم حفظ العرض بنجاح' : '✓ View saved successfully!');
        loadViews();
      } else {
        setStatusMsg(json.error || 'Failed to save view');
      }
    } catch (err: any) {
      setStatusMsg(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteView = async (viewId?: string) => {
    setExecuting(true);
    try {
      if (viewId) {
        const res = await fetch(`/api/views/${viewId}?execute=true`);
        const json = await res.json();
        if (json.success) {
          setActiveResults(json.results || []);
        }
      } else {
        // Run against /api/inventory for immediate live preview
        const res = await fetch('/api/inventory?limit=20');
        const json = await res.json();
        if (json.units) {
          setActiveResults(json.units);
        }
      }
    } catch (err) {
      console.warn('[BrokerSavedViews] Error executing view:', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyShareUrl = (id: string, url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-slate-900/90 via-slate-900/60 to-[#211A0D]/40 border border-[#C8961A]/20 backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C8961A]/10 text-[#E9C176] border border-[#C8961A]/30">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-white tracking-wide">
              {isAr ? 'عروض الوسطاء المحفوظة · Broker Saved Views' : 'Broker Saved Views & DSL Studio'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'إنشاء عروض مفلترة للوسطاء باستخدام Sierra DSL ومشاركتها بروابط آمنة.'
              : 'Construct shareable filtered views for brokers using Sierra DSL v2.0.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: DSL Editor & Presets */}
        <div className="lg:col-span-6 space-y-4">
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#E9C176]" />
                {isAr ? 'محرر لغة الاستعلام (Sierra DSL)' : 'Sierra DSL Query Builder'}
              </label>
              <div className="flex gap-1.5">
                {PRESET_VIEWS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setViewTitle(preset.title);
                      setDslInput(preset.dsl);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    {preset.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isAr ? 'عنوان العرض' : 'View Title'}
              </label>
              <input
                type="text"
                value={viewTitle}
                onChange={(e) => setViewTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-[#C8961A]"
                placeholder="e.g. Mivida Fast Cash Deals"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isAr ? 'تعليمات لغة DSL' : 'DSL Directives (VISIBILITY broker)'}
              </label>
              <textarea
                value={dslInput}
                onChange={(e) => setDslInput(e.target.value)}
                rows={7}
                className="w-full p-3 rounded-xl bg-slate-950/90 border border-slate-700 text-emerald-400 font-mono text-xs focus:outline-none focus:border-[#C8961A]"
              />
            </div>

            {statusMsg && (
              <div className="text-xs p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                {statusMsg}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleExecuteView()}
                disabled={executing}
                className="clay-btn-navy px-4 py-2 text-xs font-semibold gap-1.5"
              >
                {executing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAr ? 'معاينة مباشرة' : 'Run Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveView}
                disabled={saving || !viewTitle.trim()}
                className="clay-btn-gold px-5 py-2 text-xs font-bold gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
                <span>{isAr ? 'حفظ العرض ومشاركته' : 'Save & Share View'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Saved Views List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#E9C176]" />
                {isAr ? 'العروض النشطة المتاحة للوسطاء' : 'Active Broker Views'}
              </label>
              <button
                type="button"
                onClick={loadViews}
                className="text-[11px] text-[#E9C176] hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>

            {viewsList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                {isAr ? 'لا توجد عروض محفوظة حالياً. أنشئ أول عرض من النموذج.' : 'No saved views found. Create one using the DSL builder.'}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-95 overflow-y-auto pr-1">
                {viewsList.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate">{v.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                          {v.visibility}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {v.id}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExecuteView(v.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Execute view query"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyShareUrl(v.id, v.shareUrl)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#C8961A]/15 hover:bg-[#C8961A]/25 text-[#E9C176] text-[11px] font-semibold flex items-center gap-1 border border-[#C8961A]/30"
                      >
                        {copiedId === v.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3" />
                            <span>{isAr ? 'مشاركة' : 'Share'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Query Execution Preview Results */}
      {activeResults && (
        <div className="clay-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'نتائج الاستعلام المباشرة' : 'Live Query Execution Results'} ({activeResults.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => setActiveResults(null)}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              ✕ {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-3 font-semibold">Code</th>
                  <th className="py-2 px-3 font-semibold">Compound</th>
                  <th className="py-2 px-3 font-semibold">Type</th>
                  <th className="py-2 px-3 font-semibold">Price (EGP)</th>
                  <th className="py-2 px-3 font-semibold">Area (m²)</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeResults.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                    <td className="py-2 px-3 font-mono text-[#E9C176]">{r.code || r.id || '—'}</td>
                    <td className="py-2 px-3 text-slate-200">{r.compound || r.cmp || '—'}</td>
                    <td className="py-2 px-3 text-slate-300">{r.propertyType || r.type || '—'}</td>
                    <td className="py-2 px-3 font-semibold text-emerald-400">
                      {Number(r.price || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{r.area || r.areaSqm || '—'}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {r.status || 'available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
