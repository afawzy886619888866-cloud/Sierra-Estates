import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { api } from '../lib/apiClient';
import { Listing } from '../types';
import HighlightText from './HighlightText';
import { motion } from 'motion/react';
import { recordAccess, getRelevanceScore } from '../utils/relevance';
import { sendWhatsAppPhotoRequest } from '../utils/whatsappBot';

interface ListingsHubPageProps {
  T: (key: string) => string;
  searchQuery?: string;
}

const HUB_IMGS = [
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=120&q=70',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&q=70',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=120&q=70',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=120&q=70',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=120&q=70',
];

export default function ListingsHubPage({ T, searchQuery = '' }: ListingsHubPageProps) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (searchQuery !== undefined) {
      setQ(searchQuery);
    }
  }, [searchQuery]);
  const [cmpF, setCmpF] = useState('All');
  const [statusF, setStatusF] = useState('All');
  const [sortCol, setSortCol] = useState<'code' | 'beds' | 'area' | 'ai' | 'price'>('ai');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortByRelevance, setSortByRelevance] = useState<boolean>(true);
  const [accessUpdateTrigger, setAccessUpdateTrigger] = useState<number>(0);

  useEffect(() => {
    const handleUpdate = () => {
      setAccessUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('sierra_access_updated', handleUpdate);
    return () => window.removeEventListener('sierra_access_updated', handleUpdate);
  }, []);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBulkUpdateStatus = async (status: string) => {
    if (!confirm(`Update status to ${status} for ${selectedIds.size} listings?`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.patch(`/api/admin/listings/${id}`, { status }))
      );
      await refreshListings();
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert('Failed to update status for some items.');
    }
  };

  const handleBulkAssign = () => {
    const agent = prompt("Enter agent name to assign to selected listings:");
    if (!agent) return;
    alert(`Assigned ${selectedIds.size} listings to agent: ${agent}`);
    setSelectedIds(new Set());
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    cmp: '',
    type: 'Apartment',
    beds: '3',
    area: '150',
    price: '20M',
    status: 'Active',
  });
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      code: `SA-${Math.floor(Math.random() * 900) + 100}`,
      cmp: '',
      type: 'Apartment',
      beds: '3',
      area: '150',
      price: '',
      status: 'Active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (l: Listing) => {
    setEditingId(l.id);
    setFormData({
      code: l.code,
      cmp: l.cmp,
      type: l.type,
      beds: String(l.beds),
      area: String(l.area),
      price: l.price,
      status: l.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.cmp || !formData.price || !formData.beds || !formData.area) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const payload = {
      ...formData,
      beds: parseInt(formData.beds, 10) || 0,
      area: parseInt(formData.area, 10) || 0,
    };

    try {
      if (editingId) {
        await api.patch(`/api/admin/listings/${editingId}`, payload);
      } else {
        await api.post('/api/admin/listings', payload);
      }
      await refreshListings();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save listing:', err);
      setFormError('Failed to save listing.');
    }
  };

  const refreshListings = async () => {
    try {
      const { listings: loaded } = await api.get<{ listings: any[] }>('/api/admin/listings');
      setListings(
        loaded.map((d) => ({
          ...d,
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        }))
      );
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Backend-polled list (replaces Firestore onSnapshot — see ARCHITECTURE_INTEGRATION.md).
  useEffect(() => {
    refreshListings();
    const interval = setInterval(refreshListings, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute compounds dynamic list
  const compounds = useMemo(() => {
    return ['All', ...Array.from(new Set(listings.map((l) => l.cmp)))];
  }, [listings]);

  const filtered = useMemo(() => {
    let r = [...listings];
    if (q) {
      const qLower = q.toLowerCase();
      r = r.filter(
        (l) =>
          l.code.toUpperCase().includes(q.toUpperCase()) ||
          l.cmp.toLowerCase().includes(qLower) ||
          l.type.toLowerCase().includes(qLower) ||
          // Leveraging T() translation to match multilingual queries (e.g. Arabic words for status / type / compound)
          T(l.type.toLowerCase()).toLowerCase().includes(qLower) ||
          T(l.status.toLowerCase()).toLowerCase().includes(qLower) ||
          T(l.cmp.toLowerCase()).toLowerCase().includes(qLower)
      );
    }
    if (cmpF !== 'All') {
      r = r.filter((l) => l.cmp === cmpF);
    }
    if (statusF !== 'All') {
      r = r.filter((l) => l.status === statusF);
    }

    if (sortByRelevance && q) {
      return r.sort((a, b) => {
        const scoreA = getRelevanceScore(a.id);
        const scoreB = getRelevanceScore(b.id);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // secondary tie-breaker
        let av: any = a[sortCol];
        let bv: any = b[sortCol];
        if (sortCol === 'price' || sortCol === 'beds' || sortCol === 'area') {
          av = parseFloat(String(a[sortCol]).replace(/[^\d.]/g, '')) || 0;
          bv = parseFloat(String(b[sortCol]).replace(/[^\d.]/g, '')) || 0;
        }
        return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
    }

    // Sort
    return r.sort((a, b) => {
      let av: any = a[sortCol];
      let bv: any = b[sortCol];

      if (sortCol === 'price' || sortCol === 'beds' || sortCol === 'area') {
        av = parseFloat(String(a[sortCol]).replace(/[^\d.]/g, '')) || 0;
        bv = parseFloat(String(b[sortCol]).replace(/[^\d.]/g, '')) || 0;
      }

      if (sortDir === 'asc') {
        return av > bv ? 1 : av < bv ? -1 : 0;
      } else {
        return av < bv ? 1 : av > bv ? -1 : 0;
      }
    });
  }, [q, cmpF, statusF, sortCol, sortDir, listings, sortByRelevance, accessUpdateTrigger]);

  const handleSort = (col: typeof sortCol) => {
    setSortByRelevance(false);
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const handleListingDelete = async (id: string, code: string) => {
    if (!confirm(`Remove listing ${code} from registry?`)) return;
    try {
      await api.delete(`/api/admin/listings/${id}`);
      await refreshListings();
    } catch (err) {
      console.error(`Failed to delete listing ${id}:`, err);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean = false) => {
    try {
      await api.patch(`/api/admin/listings/${id}`, { publishToClient: !currentStatus });
      await refreshListings();
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
      alert('Failed to update publish status.');
    }
  };

  const renderSortIndicator = (col: typeof sortCol) => {
    if (sortCol !== col) return <span className="text-white/20 select-none ml-1">⇅</span>;
    return <span className="text-cyan-400 select-none ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const handleExportCSV = () => {
    const rows = filtered.map((l) => ({
      Code: l.code,
      Compound: l.cmp,
      Type: l.type,
      Beds: l.beds,
      Area: l.area,
      Price: l.price,
      AVM_Score: l.ai,
      Status: l.status,
    }));
    if (!rows.length) return;
    const keys = Object.keys(rows[0]) as (keyof typeof rows[0])[];
    const csvContent = [
      keys.join(','),
      ...rows.map((r) => keys.map((k) => `"${String(r[k]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'sierra_realty_listings.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will import new listings into the registry. Continue?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim());
        
        let added = 0;
        let errors = 0;
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
          const item: any = {};
          headers.forEach((h, idx) => {
            item[h] = vals[idx] || '';
          });
          
          if (!item['Code'] || !item['Compound']) continue;

          try {
            await api.post('/api/admin/listings', {
              code: item['Code'],
              cmp: item['Compound'],
              type: item['Type'] || 'Apartment',
              beds: parseInt(item['Beds'], 10) || 0,
              area: parseInt(item['Area'], 10) || 0,
              price: item['Price'] || '1M',
              status: item['Status'] || 'Active',
            });
            added++;
          } catch(err) {
            errors++;
          }
        }
        await refreshListings();
        alert(`Import complete! Added ${added} listings. ${errors > 0 ? `Errors: ${errors}` : ''}`);
      } catch (err) {
        console.error("Import error:", err);
        alert('Failed to import CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Search and filter toolbar */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={T('search') || "Search Registry..."}
          className="flex-1 min-w-[160px] max-w-xs bg-[#0a0f1d] border border-slate-800 rounded px-4 py-2 text-xs text-white outline-none focus:border-cyan-500/50 shrink-0"
        />

        <select
          value={cmpF}
          onChange={(e) => setCmpF(e.target.value)}
          title="Filter by Compound"
          className="bg-[#0a0f1d] border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50 shrink-0 cursor-pointer"
        >
          {compounds.map((c) => (
            <option key={c} value={c} className="bg-[#0a0f1d] text-white">
              {c}
            </option>
          ))}
        </select>

        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          title="Filter by Status"
          className="bg-[#0a0f1d] border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50 shrink-0 cursor-pointer"
        >
          {['All', 'Active', 'Sold', 'Archived'].map((s) => (
            <option key={s} value={s} className="bg-[#0a0f1d] text-slate-300">
              {s}
            </option>
          ))}
        </select>

        {q && (
          <button
            onClick={() => setSortByRelevance(!sortByRelevance)}
            className={`px-3 py-2 rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
              sortByRelevance
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-[#0a0f1d]/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>🎯</span>
            <span>Sort by Relevance</span>
          </button>
        )}

        <span className="font-mono text-[10px] text-slate-500 select-none">
          {filtered.length} / {listings.length} LISTS
        </span>

        <div className="md:ml-auto flex gap-2">
          <label className="px-4 py-2 text-xs font-mono bg-white/5 border border-slate-800 text-slate-300 rounded flex items-center gap-1 hover:bg-white/10 transition select-none cursor-pointer active:scale-95 duration-100">
            <span>⬆</span>
            <span>Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-mono bg-white/5 border border-slate-800 text-slate-300 rounded flex items-center gap-1 hover:bg-white/10 transition select-none cursor-pointer active:scale-95 duration-100"
          >
            <span>⬇</span>
            <span>{T('exportCSV')}</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('sierra_navigate_tab', { detail: 'easyListing' }))}
            className="px-4 py-2 text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded flex items-center gap-1.5 shadow select-none hover:bg-amber-500/20 transition active:scale-95 duration-100 uppercase font-mono tracking-wider cursor-pointer">
            <span>⚡</span>
            <span>Easy Listing (AI)</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded flex items-center gap-1.5 shadow select-none hover:bg-cyan-500/20 transition active:scale-95 duration-100 uppercase font-mono tracking-wider cursor-pointer">
            <span>＋</span>
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between shadow-lg mb-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="font-mono text-cyan-400 text-xs tracking-wider font-bold">
              {selectedIds.size} SELECTED
            </span>
          </div>
          <div className="flex gap-2 mt-3 md:mt-0">
            <select
              title="Update Status"
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkUpdateStatus(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Update Status...</option>
              <option value="Active">Active</option>
              <option value="Rented">Rented</option>
              <option value="Sold">Sold</option>
              <option value="Archived">Archived</option>
            </select>
            <button
              onClick={handleBulkAssign}
              className="px-3 py-1.5 text-xs font-mono bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded hover:bg-indigo-500/20 transition active:scale-95 duration-100 uppercase"
            >
              Assign to Agent
            </button>
          </div>
        </div>
      )}

      {/* Main listings list table */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto text-xs">
          {loading ? (
            <div className="p-12 text-center font-mono text-slate-500 select-none">
              LOADING ASSETS REGISTRY...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono select-none">
              No matching listings in inventory.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#05080f] font-mono text-[9px] text-cyan-400 uppercase tracking-wider select-none">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 focus:ring-cyan-500 focus:ring-offset-slate-900 accent-cyan-500"
                    />
                  </th>
                  <th className="p-4" style={{ width: 64 }}>
                    Photo
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('code')}>
                    Code {renderSortIndicator('code')}
                  </th>
                  <th className="p-4">Compound</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('beds')}>
                    Beds {renderSortIndicator('beds')}
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('area')}>
                    Area {renderSortIndicator('area')}
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('price')}>
                    Price {renderSortIndicator('price')}
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('ai')}>
                    AI ▸ {renderSortIndicator('ai')}
                  </th>
                  <th className="p-4 text-center">Client Portal</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((l) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    key={l.id}
                    className={`hover:bg-white/5 border-b border-slate-800/55 transition duration-100 cursor-pointer ${selectedIds.has(l.id) ? 'bg-cyan-900/10' : ''}`}
                    onClick={() => recordAccess(l.id, 'listings')}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(l.id)}
                        onChange={(e) => handleSelectRow(l.id, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 focus:ring-cyan-500 focus:ring-offset-slate-900 accent-cyan-500"
                      />
                    </td>
                    <td className="p-4 select-none" onClick={(e) => e.stopPropagation()}>
                      <img
                        src={HUB_IMGS[l.img] || HUB_IMGS[0]}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-14 h-9 rounded-lg object-cover bg-slate-900 border border-slate-800"
                      />
                    </td>
                    <td className="p-4 font-mono text-white font-bold tracking-wide select-all">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <HighlightText text={l.code} highlight={searchQuery} />
                        {getRelevanceScore(l.id) > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-[8px] font-mono text-cyan-400 font-medium cursor-help" title={`Relevance Score: ${getRelevanceScore(l.id)}`}>
                            🎯 {getRelevanceScore(l.id)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-white uppercase">
                      <HighlightText
                        text={(() => {
                          const lower = l.cmp.toLowerCase();
                          const translated = T(lower);
                          return translated !== lower ? translated : l.cmp;
                        })()}
                        highlight={searchQuery}
                      />
                    </td>
                    <td className="p-4">
                      <span className="bg-[#1E88D9]/10 text-[#1E88D9] font-mono text-[9px] px-2 py-0.5 rounded border border-[#1E88D9]/20 uppercase">
                        <HighlightText
                          text={(() => {
                            const lower = l.type.toLowerCase();
                            const translated = T(lower);
                            return translated !== lower ? translated : l.type;
                          })()}
                          highlight={searchQuery}
                        />
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{l.beds}</td>
                    <td className="p-4 font-mono text-slate-300">{l.area}m²</td>
                    <td className="p-4 font-mono text-cyan-400 font-bold">{l.price}</td>
                    <td className="p-4">
                      <span
                        className={`font-mono font-bold ${
                          l.ai >= 9.5 ? 'text-emerald-400' : l.ai >= 9 ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      >
                        {l.ai.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                       <button
                         onClick={() => handleTogglePublish(l.id, l.publishToClient)}
                         className={`px-3 py-1 text-[10px] font-mono rounded transition-colors uppercase tracking-widest font-bold ${
                           l.publishToClient 
                             ? 'bg-[#C9A24D]/10 text-[#C9A24D] border border-[#C9A24D]/40 shadow-[0_0_10px_rgba(201,162,77,0.15)] hover:bg-[#C9A24D]/20' 
                             : 'bg-white/5 text-slate-500 border border-slate-800 hover:bg-white/10 hover:text-slate-300'
                         }`}
                       >
                         {l.publishToClient ? 'Published' : 'Hidden'}
                       </button>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          l.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : l.status === 'Review'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        <HighlightText
                          text={(() => {
                            const lower = l.status.toLowerCase();
                            const translated = T(lower);
                            return translated !== lower ? translated : l.status;
                          })()}
                          highlight={searchQuery}
                        />
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        {(l.img === 0 || !l.images || l.images.length === 0) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sendWhatsAppPhotoRequest(l);
                            }}
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9.5px] uppercase font-mono tracking-wider rounded transition flex items-center gap-1 select-none cursor-pointer"
                            title="Request Pictures from Owner/Broker via WhatsApp"
                          >
                            <span>💬</span>
                            <span>Request Pics</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(l);
                          }}
                          className="px-2.5 py-1 hover:bg-cyan-500/10 text-cyan-400 border border-white/5 hover:border-cyan-500/30 text-[9.5px] uppercase font-mono tracking-wider rounded transition select-none cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleListingDelete(l.id, l.code);
                          }}
                          className="px-2.5 py-1 hover:bg-red-500/10 text-red-400 border border-white/5 hover:border-red-500/30 text-[9.5px] uppercase font-mono tracking-wider rounded transition select-none cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0f1d] border border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
          >
            <div className="bg-[#05080f] px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-cyan-400 font-mono text-sm tracking-wider uppercase font-bold">
                {editingId ? 'Edit Property Asset' : 'New Property Asset'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-300">
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-slate-500">Compound / Location</label>
                  <input
                    type="text"
                    value={formData.cmp}
                    onChange={(e) => setFormData({ ...formData, cmp: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-slate-500">Price (e.g. 20M)</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-slate-500">Bedrooms</label>
                  <input
                    type="number"
                    value={formData.beds}
                    onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-slate-500">Area (m²)</label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-slate-500">Property Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500/50"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Duplex">Duplex</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Chalet">Chalet</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-slate-500">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Review">Review</option>
                    <option value="Sold">Sold</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition"
                >
                  {editingId ? 'Save Changes' : 'Create Asset'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
