import React, { useState, useEffect, useMemo } from 'react';
import { createSierraNotification } from '../firebase';
import { api } from '../lib/apiClient';
import { Lead } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import HighlightText from './HighlightText';
import { recordAccess, getRelevanceScore } from '../utils/relevance';

interface LeadsPageProps {
  T: (key: string) => string;
  isAr?: boolean;
  searchQuery?: string;
}

const getStageTranslationKey = (stage: string) => {
  switch (stage) {
    case 'Initial Contact': return 'initialContact';
    case 'Viewing Scheduled': return 'viewingScheduled';
    case 'AI Matched': return 'aiMatched';
    case 'Contract Draft': return 'contractDraft';
    case 'Negotiating': return 'negotiating';
    default: return stage.toLowerCase().replace(/\s+/g, '');
  }
};

export default function LeadsPage({ T, isAr = false, searchQuery = '' }: LeadsPageProps) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (searchQuery !== undefined) {
      setQ(searchQuery);
    }
  }, [searchQuery]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [onlyHot, setOnlyHot] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [sortByRelevance, setSortByRelevance] = useState<boolean>(true);
  const [accessUpdateTrigger, setAccessUpdateTrigger] = useState<number>(0);

  useEffect(() => {
    const handleUpdate = () => {
      setAccessUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('sierra_access_updated', handleUpdate);
    return () => window.removeEventListener('sierra_access_updated', handleUpdate);
  }, []);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Add lead form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [stage, setStage] = useState<Lead['stage']>('Initial Contact');
  const [hot, setHot] = useState(false);
  const [ownerId, setOwnerId] = useState<string>('auto'); // "auto", "unassigned", or direct agentId
  const [formError, setFormError] = useState<string | null>(null);

  // Agents state
  const [agents, setAgents] = useState<any[]>([]);

  // CSV Import state
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  const refreshAgents = async () => {
    try {
      const { agents: loaded } = await api.get<{ agents: any[] }>('/api/admin/agents');
      setAgents(loaded);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const refreshLeads = async () => {
    try {
      const { leads: loaded } = await api.get<{ leads: any[] }>('/api/admin/leads');
      setLeads(
        loaded.map((d) => ({
          ...d,
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        }))
      );
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Backend-polled lists (replaces Firestore onSnapshot — see ARCHITECTURE_INTEGRATION.md).
  useEffect(() => {
    refreshAgents();
    const interval = setInterval(refreshAgents, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshLeads();
    const interval = setInterval(refreshLeads, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute most available agent ID (fewest active assigned leads)
  const getMostAvailableAgentId = (currentLeads: Lead[], currentAgents: any[]): string | undefined => {
    if (currentAgents.length === 0) return undefined;

    // Count active non-archived leads per agent
    const counts: Record<string, number> = {};
    currentAgents.forEach(a => {
      counts[a.id] = 0;
    });

    currentLeads.forEach(l => {
      if (l.ownerId && counts[l.ownerId] !== undefined && !l.archived) {
        counts[l.ownerId]++;
      }
    });

    // Find the agent with the minimum count
    let minCount = Infinity;
    let selectedAgentId: string | undefined = undefined;

    currentAgents.forEach(a => {
      const count = counts[a.id];
      if (count < minCount) {
        minCount = count;
        selectedAgentId = a.id;
      }
    });

    return selectedAgentId;
  };

  const stageCounts = useMemo(() => {
    const activeLeads = leads.filter(l => !l.archived);
    const counts: Record<string, number> = {
      All: activeLeads.length,
      'Initial Contact': 0,
      'Viewing Scheduled': 0,
      'AI Matched': 0,
      'Contract Draft': 0,
      'Negotiating': 0,
    };
    activeLeads.forEach((l) => {
      if (counts[l.stage] !== undefined) {
        counts[l.stage]++;
      }
    });
    return counts;
  }, [leads]);

  const filtered = useMemo(() => {
    const res = leads.filter((l) => {
      // archived filter
      const matchesArchive = showArchived ? !!l.archived : !l.archived;

      // search query matches: client name, phone number, interest, or interest status (stage)
      const qLower = q.toLowerCase();
      const stageKey = getStageTranslationKey(l.stage);
      const stageTranslated = T(stageKey);

      const matchesQ =
        !q ||
        l.name.toLowerCase().includes(qLower) ||
        l.interest.toLowerCase().includes(qLower) ||
        l.phone.includes(q) ||
        l.stage.toLowerCase().includes(qLower) ||
        stageTranslated.toLowerCase().includes(qLower);

      // interest status (stage) filter
      const matchesStage = selectedStage === 'All' || l.stage === selectedStage;

      // channel source filter
      const matchesSource = sourceFilter === 'All' || l.source === sourceFilter;

      // hot lead filter
      const matchesHot = !onlyHot || l.hot;

      return matchesArchive && matchesQ && matchesStage && matchesHot && matchesSource;
    });

    if (sortByRelevance && q.trim()) {
      return [...res].sort((a, b) => {
        const scoreA = getRelevanceScore(a.id);
        const scoreB = getRelevanceScore(b.id);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // secondary sort by newest first
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
    }

    return res;
  }, [q, selectedStage, onlyHot, showArchived, leads, sortByRelevance, accessUpdateTrigger]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !phone.trim() || !interest.trim()) {
      setFormError("All fields are required.");
      return;
    }

    const COLORS = ['#C8961A', '#1E88D9', '#34D399', '#7C3AED', '#E63946', '#E9C176'];
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    let finalOwnerId = '';
    if (ownerId === 'auto') {
      const bestId = getMostAvailableAgentId(leads, agents);
      if (bestId) {
        finalOwnerId = bestId;
      }
    } else if (ownerId !== 'unassigned') {
      finalOwnerId = ownerId;
    }

    try {
      await api.post('/api/admin/leads', {
        name: name.trim(),
        phone: phone.trim(),
        interest: interest.trim(),
        stage,
        hot,
        color: randomColor,
        ownerId: finalOwnerId,
      });
      await refreshLeads();

      let assignedText = 'unassigned';
      let assignedTextAr = 'غير معين';
      if (finalOwnerId) {
        const foundAg = agents.find(ag => ag.id === finalOwnerId);
        if (foundAg) {
          assignedText = `assigned to ${foundAg.name}`;
          assignedTextAr = `تم تعيينه للوكيل ${foundAg.name}`;
        }
      }

      await createSierraNotification(
        'lead',
        `New CRM Lead: ${name.trim()}`,
        `A new lead has been manually entered (${assignedText}). Interested in: "${interest.trim()}".`,
        `عميل جديد: ${name.trim()}`,
        `تم إضافة عميل جديد يدوياً في النظام (${assignedTextAr}). الاهتمامات: "${interest.trim()}".`
      );

      // Reset form
      setName('');
      setPhone('');
      setInterest('');
      setStage('Initial Contact');
      setHot(false);
      setOwnerId('auto');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create lead:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to create lead.');
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete lead ${name}?`)) return;
    try {
      await api.delete(`/api/admin/leads/${id}`);
      await refreshLeads();
      if (selectedLeadIds.includes(id)) {
        setSelectedLeadIds(prev => prev.filter(x => x !== id));
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete these ${selectedLeadIds.length} leads?`)) return;
    try {
      await api.post('/api/admin/leads/bulk', { ids: selectedLeadIds, action: 'delete' });
      await refreshLeads();

      await createSierraNotification(
        'system',
        `Bulk Deleted: ${selectedLeadIds.length} Leads`,
        `Successfully deleted ${selectedLeadIds.length} leads via bulk-action administrative toolbar.`,
        `حذف جماعي للعملاء: عدد ${selectedLeadIds.length}`,
        `تم حذف عدد ${selectedLeadIds.length} عميل نهائياً عبر شريط العمليات الجماعية للمشرفين.`
      );

      setSelectedLeadIds([]);
    } catch (err) {
      console.error('Failed to bulk-delete leads:', err);
    }
  };

  const handleBulkArchive = async (archiveState: boolean) => {
    if (selectedLeadIds.length === 0) return;
    try {
      await api.post('/api/admin/leads/bulk', { ids: selectedLeadIds, action: 'update', patch: { archived: archiveState } });
      await refreshLeads();

      await createSierraNotification(
        'system',
        archiveState ? `Bulk Archived: ${selectedLeadIds.length} Leads` : `Bulk Restored: ${selectedLeadIds.length} Leads`,
        `Successfully updated archived state to ${archiveState} for ${selectedLeadIds.length} leads.`,
        archiveState ? `أرشفة جماعية للعملاء: عدد ${selectedLeadIds.length}` : `استعادة جماعية للعملاء: عدد ${selectedLeadIds.length}`,
        archiveState 
          ? `تم بنجاح نقل ${selectedLeadIds.length} عميل إلى الأرشيف عبر شريط العمليات الجماعية.`
          : `تم بنجاح استعادة ${selectedLeadIds.length} عميل إلى القائمة النشطة عبر شريط العمليات الجماعية.`
      );

      setSelectedLeadIds([]);
    } catch (err) {
      console.error('Failed to bulk-archive leads:', err);
    }
  };

  const handleBulkReassign = async (newStage: Lead['stage']) => {
    if (selectedLeadIds.length === 0) return;
    try {
      await api.post('/api/admin/leads/bulk', { ids: selectedLeadIds, action: 'update', patch: { stage: newStage } });
      await refreshLeads();

      await createSierraNotification(
        'system',
        `Bulk Reassigned: ${selectedLeadIds.length} Leads`,
        `Successfully transitioned ${selectedLeadIds.length} leads to stage "${newStage}".`,
        `إعادة تعيين جماعية لحالة العملاء: عدد ${selectedLeadIds.length}`,
        `تم نقل حالة ${selectedLeadIds.length} عميل بنجاح إلى مرحلة "${newStage}" عبر شريط العمليات الجماعية.`
      );

      setSelectedLeadIds([]);
    } catch (err) {
      console.error('Failed to bulk-reassign leads:', err);
    }
  };

  const handleBulkAutoAssign = async () => {
    if (selectedLeadIds.length === 0 || agents.length === 0) return;
    try {
      // Each lead can go to a different agent, so this can't use the uniform bulk-patch endpoint —
      // patch one lead at a time, tracking running counts locally same as before.
      const runningCounts: Record<string, number> = {};
      agents.forEach(a => {
        runningCounts[a.id] = 0;
      });

      leads.forEach(l => {
        if (l.ownerId && runningCounts[l.ownerId] !== undefined && !l.archived) {
          runningCounts[l.ownerId]++;
        }
      });

      for (const id of selectedLeadIds) {
        let minCount = Infinity;
        let selectedAgentId = '';

        agents.forEach(a => {
          const count = runningCounts[a.id];
          if (count < minCount) {
            minCount = count;
            selectedAgentId = a.id;
          }
        });

        if (selectedAgentId) {
          await api.patch(`/api/admin/leads/${id}`, { ownerId: selectedAgentId });
          runningCounts[selectedAgentId]++;
        }
      }

      await refreshLeads();

      await createSierraNotification(
        'system',
        `Bulk Auto-Assigned: ${selectedLeadIds.length} Leads`,
        `Successfully auto-distributed ${selectedLeadIds.length} leads matching the lowest operator load levels.`,
        `توزيع تلقائي للعملاء: عدد ${selectedLeadIds.length}`,
        `تم بنجاح توزيع ${selectedLeadIds.length} عميل تلقائياً على أنشط المشرفين والأقل عبئاً.`
      );

      setSelectedLeadIds([]);
    } catch (err) {
      console.error('Failed to bulk-auto-assign leads:', err);
    }
  };

  const stageChipClass = (s: Lead['stage']) => {
    switch (s) {
      case 'Viewing Scheduled':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'AI Matched':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10';
      case 'Contract Draft':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/10';
      case 'Initial Contact':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/10';
      case 'Negotiating':
        return 'bg-red-500/10 text-red-400 border border-red-500/10';
      default:
        return 'bg-[#C8961A]/10 text-[#E9C176]';
    }
  };

  const handleCSVExport = () => {
    const rows = filtered.map((l) => ({
      ID: l.id,
      Name: l.name,
      Phone: l.phone,
      Interest: l.interest,
      Stage: l.stage,
      Hot: l.hot ? 'Yes' : 'No',
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
    a.setAttribute('download', 'sierra_realty_leads.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCSVImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportSuccessMsg(null);
    setImportErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error("File is empty.");

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) throw new Error("No data lines found in CSV.");

        // Clean headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        
        // Find indices of columns
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('client'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('number'));
        const interestIdx = headers.findIndex(h => h.includes('interest') || h.includes('details'));
        const stageIdx = headers.findIndex(h => h.includes('stage') || h.includes('status'));
        const hotIdx = headers.findIndex(h => h.includes('hot') || h.includes('flag'));

        if (nameIdx === -1 || phoneIdx === -1) {
          throw new Error("CSV must include minimum headers: 'Name' (or 'Client') and 'Phone' (or 'Number').");
        }

        let importedCount = 0;
        const COLORS = ['#C8961A', '#1E88D9', '#34D399', '#7C3AED', '#E63946', '#E9C176'];

        // Initialize local counts tracker for active leads per agent for balancing the import batch
        const runningCounts: Record<string, number> = {};
        agents.forEach(a => {
          runningCounts[a.id] = 0;
        });
        leads.forEach(l => {
          if (l.ownerId && runningCounts[l.ownerId] !== undefined && !l.archived) {
            runningCounts[l.ownerId]++;
          }
        });

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;

          // Split line by commas, respecting quoted strings
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/^["']|["']$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^["']|["']$/g, ''));

          const lName = values[nameIdx] || 'Imported CRM Client';
          const lPhone = values[phoneIdx] || 'N/A';
          const lInterest = interestIdx !== -1 ? (values[interestIdx] || 'N/A') : 'N/A';
          const rawStage = stageIdx !== -1 ? (values[stageIdx] || 'Initial Contact') : 'Initial Contact';
          const rawHot = hotIdx !== -1 ? (values[hotIdx] || '') : '';

          // Normalize phase
          let lStage: Lead['stage'] = 'Initial Contact';
          const ns = rawStage.toLowerCase().replace(/[^a-z]/g, '');
          if (ns.includes('views') || ns.includes('sched')) {
            lStage = 'Viewing Scheduled';
          } else if (ns.includes('aimatch') || ns.includes('matched')) {
            lStage = 'AI Matched';
          } else if (ns.includes('contract') || ns.includes('draft')) {
            lStage = 'Contract Draft';
          } else if (ns.includes('negotiat')) {
            lStage = 'Negotiating';
          } else {
            lStage = 'Initial Contact';
          }

          const lHot = rawHot.toLowerCase().trim() === 'yes' || 
                       rawHot.toLowerCase().trim() === 'true' || 
                       rawHot === '1';

          const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

          // Select the agent with the lowest running lead count
          let minCount = Infinity;
          let selectedAgentId = '';
          agents.forEach(a => {
            const count = runningCounts[a.id];
            if (count < minCount) {
              minCount = count;
              selectedAgentId = a.id;
            }
          });

          if (selectedAgentId) {
            runningCounts[selectedAgentId]++;
          }

          await api.post('/api/admin/leads', {
            name: lName,
            phone: lPhone,
            interest: lInterest,
            stage: lStage,
            hot: lHot,
            color: randomColor,
            ownerId: selectedAgentId,
          });

          importedCount++;
        }

        await refreshLeads();

        await createSierraNotification(
          'lead',
          `CSV Leads Imported: ${importedCount} Leads`,
          `Successfully parsed and written ${importedCount} leads batch from CSV raw file.`,
          `تم استيراد جهات اتصال CSV: ${importedCount} عميل`,
          `تم بنجاح تحليل وإدراج دفعة من ${importedCount} عميل جديد من ملف CSV المرفوع.`
        );

        setImportSuccessMsg(`Successfully imported ${importedCount} CRM Leads!`);
      } catch (err: any) {
        console.error("CSV Import error:", err);
        setImportErrorMsg(err.message || "Could not parse or write leads CSV data.");
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setImportErrorMsg("Failed to read selection file correctly.");
      setImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Real-time Search Panel & Interest Status Filter Board */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search and filter triggers */}
          <div className="relative flex-1">
            <span className={`absolute inset-y-0 flex items-center text-slate-400 pointer-events-none text-sm ${isAr ? 'right-4' : 'left-4'}`}>
              🔍
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAr ? "ابحث باسم العميل أو رقم الهاتف أو الاهتمام العقاري..." : "Search leads by client name, phone, Interest status..."}
              className={`w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 text-xs text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all ${
                isAr ? 'pr-11 pl-10' : 'pl-11 pr-10'
              }`}
              id="leads-search-input"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className={`absolute inset-y-0 flex items-center text-slate-500 hover:text-white transition duration-150 text-xs px-3 ${
                  isAr ? 'left-1' : 'right-1'
                }`}
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap">
            {/* 🔥 Hot toggle pill */}
            <button
              onClick={() => setOnlyHot(!onlyHot)}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                onlyHot
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                  : 'bg-[#05080f]/40 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span>🔥</span>
              <span>{isAr ? 'الأكثر تفاعلاً فقط' : 'Hot Leads Only'}</span>
            </button>

            {/* 📁 Archived toggle pill */}
            <button
              onClick={() => {
                setShowArchived(!showArchived);
                setSelectedStage('All');
                setSelectedLeadIds([]);
              }}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                showArchived
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-[#05080f]/40 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              id="btn-archived-leads-toggle"
            >
              <span>📁</span>
              <span>{isAr ? 'عرض الأرشيف' : 'Show Archived'}</span>
            </button>

            {/* 🎯 Relevance toggle pill */}
            {q && (
              <button
                onClick={() => setSortByRelevance(!sortByRelevance)}
                className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                  sortByRelevance
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-[#05080f]/40 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                id="btn-relevance-sort-toggle"
              >
                <span>🎯</span>
                <span>{isAr ? 'ترتيب حسب الأهمية' : 'Sort by Relevance'}</span>
              </button>
            )}

            {/* WhatsApp Sender CTA */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('sierra_navigate_tab', { detail: 'whatsappSender' }))}
              className="px-4 py-2.5 text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 rounded-lg flex items-center gap-1.5 select-none transition cursor-pointer active:scale-95 duration-100 uppercase font-mono tracking-wider shadow-md"
              id="btn-whatsapp-sender-trigger"
            >
              <span>💬</span>
              <span>{isAr ? 'مراسل الواتساب' : 'WhatsApp Sender'}</span>
            </button>

            {/* Register lead CTA */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded-lg flex items-center gap-1.5 select-none transition cursor-pointer active:scale-95 duration-100"
              id="btn-add-lead-trigger"
            >
              <span>＋</span>
              <span>{isAr ? 'تسجيل عميل جديد' : 'Register CRM Lead'}</span>
            </button>
          </div>
        </div>

        {/* Hot Buttons / Horizontal Stage Filters */}
        <div className="border-t border-slate-900/60 pt-3.5 animate-fade-in-up">
          <p className={`text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 select-none ${isAr ? 'text-right' : 'text-left'}`}>
            ⚡ {isAr ? 'تصفية حسب حالة الاهتمام' : 'Filter by Interest Status (stage)'}
          </p>
          <div className={`flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
            {[
              { id: 'All', labelEn: 'All Leads', labelAr: 'كل العملاء' },
              { id: 'Initial Contact', labelEn: 'Initial Contact', labelAr: 'اتصال مبدئي' },
              { id: 'Viewing Scheduled', labelEn: 'Viewing Scheduled', labelAr: 'جدولة معاينات' },
              { id: 'AI Matched', labelEn: 'AI Matched', labelAr: 'موصى به بالذكاء' },
              { id: 'Contract Draft', labelEn: 'Contract Draft', labelAr: 'مسودة عقد' },
              { id: 'Negotiating', labelEn: 'Negotiating', labelAr: 'مفاوضات نشطة' },
            ].map((stg) => {
              const count = stageCounts[stg.id] || 0;
              const isActive = selectedStage === stg.id;
              return (
                <button
                  key={stg.id}
                  onClick={() => setSelectedStage(stg.id)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition duration-150 cursor-pointer shrink-0 border flex items-center gap-2 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{isAr ? stg.labelAr : stg.labelEn}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-mono font-bold ${
                    isActive ? 'bg-cyan-50 text-black' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action utility row for Import/Export */}
        <div className={`flex gap-5 font-mono text-[10px] items-center justify-between border-t border-slate-900/60 pt-3 ${isAr ? 'flex-row-reverse' : ''}`}>
          <div className="text-slate-500">
            {isAr ? (
              <span>يتم عرض <strong className="text-cyan-400">{filtered.length}</strong> من أصل <strong className="text-slate-400">{leads.length}</strong> عميل نشط</span>
            ) : (
              <span>Showing <strong className="text-cyan-400">{filtered.length}</strong> out of <strong className="text-slate-400">{leads.length}</strong> registered pipeline contacts</span>
            )}
          </div>
          <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handleCSVExport}
              className="py-1 px-3 bg-[#0a0f1d] hover:bg-slate-900 border border-slate-800 text-slate-300 rounded flex items-center gap-1.5 transition select-none cursor-pointer active:scale-95 duration-100"
              id="btn-export-leads-csv"
            >
              <span>⬇</span>
              <span>{T('exportCSV')}</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="py-1 px-3 bg-[#0a0f1d] hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded flex items-center gap-1.5 transition select-none cursor-pointer active:scale-95 duration-100"
              id="btn-import-leads-csv"
            >
              <span>⬆</span>
              <span>{T('importCSV')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main CRM Table */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 select-none">
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
            CRM SYSTEM · Core Leads Inventory
          </span>
          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
            {filtered.length} Leads Active
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          {loading ? (
            <div className="p-12 text-center font-mono text-slate-500 select-none">
              FETCHING REALTOR PIPELINE...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No leads matching the criteria. Registrars empty.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#05080f] font-mono text-[9px] text-cyan-400 uppercase tracking-wider">
                  <th className="p-4 w-10 text-center select-none">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every(l => selectedLeadIds.includes(l.id))}
                      onChange={() => {
                        const allSel = filtered.length > 0 && filtered.every(l => selectedLeadIds.includes(l.id));
                        if (allSel) {
                          const idsToRemove = filtered.map(l => l.id);
                          setSelectedLeadIds(prev => prev.filter(x => !idsToRemove.includes(x)));
                        } else {
                          const idsToAdd = filtered.map(l => l.id);
                          setSelectedLeadIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                        }
                      }}
                      className="rounded border-slate-850 text-cyan-500 focus:ring-0 bg-transparent cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                  <th className="p-4">{T('client')}</th>
                  <th className="p-4">{T('phone')}</th>
                  <th className="p-4">{T('interest')}</th>
                  <th className="p-4">{T('stage')}</th>
                  <th className="p-4">{isAr ? 'الوكيل المسؤول' : 'Assigned Agent'}</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((l) => {
                  const isSelected = selectedLeadIds.includes(l.id);
                  return (
                    <motion.tr
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      key={l.id}
                      className={`hover:bg-white/5 transition duration-100 border-b border-slate-800/50 cursor-pointer ${
                        isSelected ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : ''
                      }`}
                      onClick={() => recordAccess(l.id, 'leads')}
                    >
                      <td className="p-4 text-center select-none w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedLeadIds(prev =>
                                prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id]
                            );
                          }}
                          className="rounded border-slate-850 text-cyan-500 focus:ring-0 bg-transparent cursor-pointer w-3.5 h-3.5"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs select-none shadow text-[#05080f] shrink-0"
                            style={{ backgroundColor: l.color }}
                          >
                            {l.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white inline-flex items-center gap-1.5 uppercase tracking-wide">
                              <HighlightText text={l.name} highlight={searchQuery} />
                              {l.hot && <span className="text-[10px] animate-bounce shrink-0">🔥</span>}
                              {getRelevanceScore(l.id) > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-[9px] font-mono text-cyan-400 font-medium cursor-help" title={`Relevance Score: ${getRelevanceScore(l.id)}`} onClick={(e) => { e.stopPropagation(); }}>
                                  🎯 {getRelevanceScore(l.id)}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-400 hover:text-white transition duration-150 select-text">
                        <HighlightText text={l.phone} highlight={searchQuery} />
                      </td>
                      <td className="p-4 text-slate-300 max-w-[240px] truncate">
                        <HighlightText text={l.interest} highlight={searchQuery} />
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${stageChipClass(l.stage)}`}>
                          <HighlightText text={isAr ? T(getStageTranslationKey(l.stage)) : l.stage} highlight={searchQuery} />
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={l.ownerId || 'unassigned'}
                          onChange={async (e) => {
                            const newOwnerId = e.target.value === 'unassigned' ? '' : e.target.value;
                            try {
                              await api.patch(`/api/admin/leads/${l.id}`, { ownerId: newOwnerId });
                              await refreshLeads();
                              if (newOwnerId) {
                                const targetAg = agents.find(ag => ag.id === newOwnerId);
                                await createSierraNotification(
                                  'lead',
                                  `Lead Assigned: ${l.name}`,
                                  `Successfully delegated lead to ${targetAg?.name || 'an agent'}.`,
                                  `تم تعيين العميل: ${l.name}`,
                                  `تم بنجاح تفويض العميل للمشرف/الوكيل ${targetAg?.name || 'الوكيل'}.`
                                );
                              }
                            } catch (err) {
                              console.error(`Failed to reassign lead ${l.id}:`, err);
                            }
                          }}
                          className="bg-slate-950/60 border border-slate-850 hover:border-cyan-500/30 text-white rounded px-2 py-1 text-[10px] font-mono outline-none transition duration-150 cursor-pointer focus:border-cyan-500/50"
                        >
                          <option value="unassigned">👤 Unassigned</option>
                          {agents.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.emoji} {ag.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <a
                            href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="referrer"
                            className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-mono text-[10px] uppercase font-bold rounded border border-green-500/20 transition-all duration-150 shrink-0"
                          >
                            WhatsApp
                          </a>
                          <button
                            onClick={() => handleDeleteLead(l.id, l.name)}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono text-[10px] uppercase font-bold rounded border border-red-500/20 transition-all duration-150 shrink-0 select-none cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Register Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold select-none">
                📁 System Register · Lead Docket
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-500 hover:text-white transition duration-150 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-5 space-y-4">
              {formError && (
                <div className="text-red-400 text-xs py-1 px-3 bg-red-950/25 border border-red-500/15 rounded-lg select-none">
                  ⚠️ {formError}
                </div>
              )}

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahmed Fawzy"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-4 py-2 text-xs text-white outline-none focus:border-cyan-500/50 transition duration-150"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +20 100 111 2233"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-4 py-2 text-xs text-white outline-none focus:border-cyan-500/50 transition duration-150"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  Acquisition Interest
                </label>
                <input
                  type="text"
                  required
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  placeholder="e.g. Villa · Hyde Park · EGP 35M+"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-4 py-2 text-xs text-white outline-none focus:border-cyan-500/50 transition duration-150"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                    Acquisition Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as Lead['stage'])}
                    className="w-full bg-[#05080f] border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50 transition duration-150 cursor-pointer"
                  >
                    {['Viewing Scheduled', 'AI Matched', 'Contract Draft', 'Initial Contact', 'Negotiating'].map(
                      (stg) => (
                        <option key={stg} value={stg} className="bg-[#0a0f1d] text-white">
                          {stg}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="flex flex-col justify-end pb-1.5 pl-2">
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hot}
                      onChange={(e) => setHot(e.target.checked)}
                      className="rounded border-slate-800 text-cyan-500 focus:ring-0 bg-transparent shrink-0 cursor-pointer"
                    />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-400">Flag Hot 🔥</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  Representative Agent (Assignment)
                </label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full bg-[#05080f] border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50 transition duration-150 cursor-pointer"
                >
                  <option value="auto" className="bg-[#0a0f1d] text-cyan-400 font-bold">⚡ Auto-Assign (Lowest Lead Burden)</option>
                  <option value="unassigned" className="bg-[#0a0f1d] text-slate-400">👤 Unassigned</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="bg-[#0a0f1d] text-white">
                      {ag.emoji} {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded font-bold text-xs select-none transition duration-150 cursor-pointer"
                >
                  Commit Lead
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded text-xs font-bold transition select-none active:scale-98 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Simulator Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold select-none">
                📂 Import CSV Leads File
              </span>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportSuccessMsg(null);
                  setImportErrorMsg(null);
                }}
                className="p-1 text-slate-500 hover:text-white transition duration-150 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose a structured CSV file conforming to headers:
                <code className="block bg-slate-950/40 px-2.5 py-1 text-[10px] rounded border border-slate-800 mt-1 font-mono text-cyan-400">
                  Name, Phone, Interest, Stage, Hot
                </code>
              </p>

              {importSuccessMsg && (
                <div className="text-emerald-400 text-xs py-2 px-3 bg-emerald-950/20 border border-emerald-500/15 rounded-lg select-none">
                  🎉 {importSuccessMsg}
                </div>
              )}

              {importErrorMsg && (
                <div className="text-red-400 text-xs py-2 px-3 bg-red-950/20 border border-red-500/15 rounded-lg select-none">
                  ⚠️ {importErrorMsg}
                </div>
              )}

              <div className="p-6 border border-dashed border-slate-800 hover:border-cyan-500/40 rounded flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer hover:bg-white/1 transition duration-150 relative">
                {importing ? (
                  <>
                    <span className="text-2xl mt-1 select-none animate-spin">🔄</span>
                    <p className="text-xs font-medium text-slate-350">Processing file...</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Adding leads to CRM database</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mt-1 select-none">📂</span>
                    <p className="text-xs font-medium text-slate-300">Select spreadsheet CSV</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Click or drag a file here</p>
                    <input
                      type="file"
                      accept=".csv"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleCSVImportFile}
                    />
                  </>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportSuccessMsg(null);
                    setImportErrorMsg(null);
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded text-xs font-bold transition select-none cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Administrative Bulk Action Toolbar inside AnimatePresence */}
      <AnimatePresence>
        {selectedLeadIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0c1427]/95 border border-cyan-500/40 rounded-xl px-5 py-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.8),_0_0_20px_rgba(6,182,212,0.15)] z-40 flex flex-col md:flex-row items-center gap-4 text-xs select-none backdrop-blur-md"
            id="bulk-action-toolbar"
          >
            <div className={`flex items-center gap-2 font-semibold text-white ${isAr ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm">⚡</span>
              <span>
                {isAr 
                  ? `تم تحديد ${selectedLeadIds.length} من العملاء` 
                  : `${selectedLeadIds.length} leads selected`}
              </span>
            </div>

            <div className="h-px md:h-5 w-full md:w-px bg-slate-800" />

            <div className={`flex flex-wrap items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
              {/* Reassign select dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkReassign(e.target.value as Lead['stage']);
                      e.target.value = ''; // Reset select
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-cyan-500/50 cursor-pointer"
                  id="bulk-action-reassign-select"
                >
                  <option value="">
                    {isAr ? '🔗 نقل العملاء إلى...' : '🔗 Transition status...'}
                  </option>
                  <option value="Initial Contact">Initial Contact</option>
                  <option value="Viewing Scheduled">Viewing Scheduled</option>
                  <option value="AI Matched">AI Matched</option>
                  <option value="Contract Draft">Contract Draft</option>
                  <option value="Negotiating">Negotiating</option>
                </select>
              </div>

              {/* Archive / Restore Button */}
              <button
                onClick={() => handleBulkArchive(!showArchived)}
                className={`px-3 py-1.5 text-[11px] font-medium border rounded transition cursor-pointer select-none active:scale-95 duration-100 ${
                  showArchived
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                }`}
                id="bulk-action-archive-btn"
              >
                {showArchived 
                  ? (isAr ? '📥 استعادة إلى النشط' : '📥 Restore to Active')
                  : (isAr ? '📁 أرشفة جماعية' : '📁 Bulk Archive')}
              </button>

              {/* Bulk Auto-Assign Button */}
              <button
                onClick={handleBulkAutoAssign}
                className="px-3 py-1.5 text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/15 rounded transition cursor-pointer select-none active:scale-95 duration-100 uppercase tracking-wider font-mono"
                id="bulk-action-auto-assign-btn"
              >
                ⚡ {isAr ? 'توزيع تلقائي' : 'Auto-Assign'}
              </button>

              {/* Delete Button */}
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded transition cursor-pointer select-none active:scale-95 duration-100"
                id="bulk-action-delete-btn"
              >
                🗑️ {isAr ? 'حذف نهائي' : 'Delete Permanent'}
              </button>
            </div>

            <div className="hidden md:block h-5 w-px bg-slate-800" />

            {/* Clear Selection close button */}
            <button
              onClick={() => setSelectedLeadIds([])}
              className="text-slate-400 hover:text-white transition p-1 hover:bg-white/5 rounded cursor-pointer select-none active:scale-95 duration-100 font-mono text-xs inline-flex items-center gap-1"
              title="Clear selection"
              id="bulk-action-clear-btn"
            >
              ✕ <span className="text-[10px] uppercase font-mono">{isAr ? 'إلغاء' : 'Clear'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
