import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Phone, MessageCircle, Mail, Users, Video, FileText,
  Plus, X, Check, Clock, AlertCircle, Trash2, RefreshCw
} from 'lucide-react';

interface Followup {
  id: string;
  leadId: string;
  agentId: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'viewing' | 'other';
  title: string;
  notes?: string;
  dueAt: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: string;
}

interface FollowupsPageProps {
  T: (key: string) => string;
  isAr?: boolean;
}

const TYPE_ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  viewing: Video,
  other: FileText,
};

const TYPE_COLORS = {
  call: 'text-blue-400',
  whatsapp: 'text-emerald-400',
  email: 'text-purple-400',
  meeting: 'text-amber-400',
  viewing: 'text-cyan-400',
  other: 'text-slate-400',
};

const PRIORITY_COLORS = {
  low:    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700',
  medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-900/50',
  high:   'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-900/50',
  urgent: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-900/50',
};

const STATUS_COLORS = {
  pending:    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  in_progress:'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  completed:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  cancelled:  'bg-slate-100 dark:bg-slate-800/50 text-slate-400 line-through',
  overdue:    'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
};

export default function FollowupsPage({ T, isAr = false }: FollowupsPageProps) {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [showNew, setShowNew] = useState(false);

  // New followup form
  const [newLeadId, setNewLeadId] = useState('');
  const [newType, setNewType] = useState<Followup['type']>('call');
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPriority, setNewPriority] = useState<Followup['priority']>('medium');
  const [newDueAt, setNewDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      const { success, followups, error: apiError } = await api.get<{ success: boolean; followups: Followup[]; error?: string }>(
        `/api/admin/followups?${params.toString()}`
      );
      if (!success) throw new Error(apiError || 'Failed to fetch');
      setFollowups(followups || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const handleCreate = async () => {
    if (!newLeadId || !newTitle) {
      alert(isAr ? 'العميل والعنوان مطلوبان' : 'Lead ID and title are required');
      return;
    }
    try {
      await api.post('/api/admin/followups', {
        leadId: newLeadId,
        type: newType,
        title: newTitle,
        notes: newNotes,
        priority: newPriority,
        dueAt: new Date(newDueAt).toISOString(),
      });
      setShowNew(false);
      setNewLeadId('');
      setNewTitle('');
      setNewNotes('');
      fetchFollowups();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    }
  };

  const handleComplete = async (f: Followup) => {
    try {
      await api.patch(`/api/admin/followups/${f.id}`, { status: 'completed' });
      fetchFollowups();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleDelete = async (f: Followup) => {
    if (!confirm('Delete this follow-up?')) return;
    try {
      await api.delete(`/api/admin/followups/${f.id}`);
      fetchFollowups();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'المتابعات' : 'Follow-ups'}
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            {isAr ? 'إدارة مهام المتابعة مع العملاء' : 'Manage follow-up tasks with leads'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFollowups}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md text-[13px] font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[13px] font-medium transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            {isAr ? 'متابعة جديدة' : 'New follow-up'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {['pending', 'in_progress', 'completed', 'overdue', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilterStatus(s)}
            className={`px-3 h-7 rounded-md text-[12px] font-medium transition ${
              filterStatus === s
                ? 'bg-slate-900 dark:bg-slate-800 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {s === '' ? (isAr ? 'الكل' : 'All') : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg">
          <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Follow-ups list */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <RefreshCw className="animate-spin mx-auto mb-3 text-slate-400" size={20} strokeWidth={1.75} />
            <p className="text-[13px]">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>
          </div>
        ) : followups.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Calendar className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={36} strokeWidth={1.25} />
            <p className="text-[13px]">{isAr ? 'لا توجد متابعات' : 'No follow-ups found'}</p>
          </div>
        ) : (
          followups.map((f, index) => {
            const Icon = TYPE_ICONS[f.type] || FileText;
            const due = new Date(f.dueAt);
            const isOverdue = due < new Date() && f.status === 'pending';
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.04 }}
                whileHover={{ y: -1, transition: { duration: 0.12 } }}
                className={`group bg-white dark:bg-slate-900 border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                  isOverdue
                    ? 'border-red-200 dark:border-red-900/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Type icon — single visual anchor on the left */}
                <div className={`shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${TYPE_COLORS[f.type]}`}>
                  <Icon size={18} strokeWidth={1.75} />
                </div>

                {/* Main content — title + meta on separate lines for breathing room */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className={`text-[14px] font-medium text-slate-900 dark:text-white leading-snug ${f.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                      {f.title}
                    </h4>
                    {/* Status badge — only one badge per row, on the right */}
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[f.status]}`}>
                      {f.status.replace('_', ' ')}
                    </span>
                  </div>

                  {f.notes && (
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{f.notes}</p>
                  )}

                  {/* Metadata row — muted, separated, single line */}
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${f.priority === 'urgent' ? 'bg-red-500' : f.priority === 'high' ? 'bg-amber-500' : f.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                      <span className="capitalize">{f.priority}</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono">{f.leadId.slice(0, 8)}…</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                      {isOverdue ? <AlertCircle size={11} strokeWidth={1.75} /> : <Clock size={11} strokeWidth={1.75} />}
                      {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Actions — only visible on hover, prevents visual noise */}
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.status !== 'completed' && (
                    <button
                      onClick={() => handleComplete(f)}
                      className="p-1.5 hover:bg-emerald-500/10 rounded-md text-slate-400 hover:text-emerald-500 transition"
                      title={isAr ? 'إكمال' : 'Complete'}
                    >
                      <Check size={15} strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(f)}
                    className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-400 hover:text-red-500 transition"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* New follow-up modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNew(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                  {isAr ? 'متابعة جديدة' : 'New follow-up'}
                </h3>
                <button onClick={() => setShowNew(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'معرّف العميل' : 'Lead ID'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLeadId}
                    onChange={(e) => setNewLeadId(e.target.value)}
                    placeholder="lead-doc-id"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      {isAr ? 'النوع' : 'Type'}
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as Followup['type'])}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
                    >
                      {Object.entries(TYPE_ICONS).map(([k]) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      {isAr ? 'الأولوية' : 'Priority'}
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as Followup['priority'])}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
                    >
                      {['low', 'medium', 'high', 'urgent'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'العنوان' : 'Title'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={isAr ? 'مثال: مكالمة متابعة بعد المعاينة' : 'e.g. Follow-up call after viewing'}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'ملاحظات' : 'Notes'}
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'موعد الاستحقاق' : 'Due at'}
                  </label>
                  <input
                    type="datetime-local"
                    value={newDueAt}
                    onChange={(e) => setNewDueAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <button
                  onClick={() => setShowNew(false)}
                  className="px-3 h-8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-[13px] font-medium transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreate}
                  className="px-3 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[13px] font-medium transition shadow-sm"
                >
                  {isAr ? 'إنشاء' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
