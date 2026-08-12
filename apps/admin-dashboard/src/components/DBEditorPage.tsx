import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Edit3, Trash2, Plus, X, Search, AlertTriangle } from 'lucide-react';

interface DBDoc {
  id: string;
  [key: string]: any;
}

interface DBEditorPageProps {
  T: (key: string) => string;
  isAr?: boolean;
}

const COLLECTION_PRESETS = [
  'users', 'units', 'stakeholders', 'leads', 'sales', 'followups',
  'pages', 'automation_workflows', 'audit_log', 'viewing_requests',
  'search_queries', 'bot_commands', 'system_status',
];

export default function DBEditorPage({ T, isAr = false }: DBEditorPageProps) {
  const [collection, setCollection] = useState('users');
  const [customCollection, setCustomCollection] = useState('');
  const [docs, setDocs] = useState<DBDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [where, setWhere] = useState('');
  const [order, setOrder] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DBDoc | null>(null);
  const [editingDoc, setEditingDoc] = useState<DBDoc | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocText, setNewDocText] = useState('{}');

  const activeCollection = customCollection || collection;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (where) params.set('where', where);
      if (order) params.set('order', order);
      params.set('limit', '100');
      const { success, docs, error: apiError } = await api.get<{ success: boolean; docs: DBDoc[]; error?: string }>(
        `/api/admin/db/${activeCollection}?${params.toString()}`
      );
      if (!success) throw new Error(apiError || 'Failed to fetch');
      setDocs(docs || []);
    } catch (err: any) {
      setError(err.message);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [activeCollection, where, order]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleEdit = (doc: DBDoc) => {
    // Strip id from the editable JSON (id is the doc key, not a field)
    const { id, ...data } = doc;
    setEditingDoc(doc);
    setEditText(JSON.stringify(data, null, 2));
  };

  const handleSave = async () => {
    if (!editingDoc) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(editText);
      await api.patch(`/api/admin/db/${activeCollection}/${editingDoc.id}`, parsed);
      setEditingDoc(null);
      fetchDocs();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: DBDoc) => {
    if (!confirm(`Delete ${doc.id} from ${activeCollection}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/db/${activeCollection}/${doc.id}`);
      fetchDocs();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(newDocText);
      await api.post(`/api/admin/db/${activeCollection}`, parsed);
      setShowNewDoc(false);
      setNewDocText('{}');
      fetchDocs();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'محرر قاعدة البيانات' : 'Database Editor'}
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            {isAr
              ? 'تصفح وحرّر أي مجموعة في Firestore (يتطلب صلاحية superadmin)'
              : 'Browse and edit any Firestore collection (requires superadmin)'}
          </p>
        </div>
        <button
          onClick={fetchDocs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md text-[13px] font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Security warning */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg">
        <AlertTriangle className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" size={16} strokeWidth={1.75} />
        <p className="text-[12px] text-amber-700 dark:text-amber-300">
          {isAr
            ? 'تحذير: هذا يمنح وصولاً مباشراً لقاعدة البيانات. التعديلات فورية ولا يمكن التراجع عنها.'
            : 'Warning: this grants raw DB access. Changes are immediate and irreversible.'}
        </p>
      </div>

      {/* Collection picker + filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {isAr ? 'المجموعة' : 'Collection'}
          </label>
          <select
            value={collection}
            onChange={(e) => { setCollection(e.target.value); setCustomCollection(''); }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
          >
            {COLLECTION_PRESETS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {isAr ? 'أو اسم مخصص' : 'Or custom name'}
          </label>
          <input
            type="text"
            value={customCollection}
            onChange={(e) => setCustomCollection(e.target.value)}
            placeholder="e.g. custom_collection"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {isAr ? 'تصفية (field==value)' : 'Where (field==value)'}
          </label>
          <input
            type="text"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="role==admin"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {isAr ? 'ترتيب (field:desc)' : 'Order (field:desc)'}
          </label>
          <input
            type="text"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="createdAt:desc"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Docs table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-800">
          <span className="text-xs text-slate-400">
            {docs.length} {isAr ? 'مستند' : 'documents'} {isAr ? 'في' : 'in'}{' '}
            <span className="text-blue-600 dark:text-blue-400 font-mono">{activeCollection}</span>
          </span>
          <button
            onClick={() => setShowNewDoc(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-xs font-semibold transition"
          >
            <Plus size={12} />
            {isAr ? 'مستند جديد' : 'New doc'}
          </button>
        </div>
        <div className="max-h-[600px] overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
              {isAr ? 'جارٍ التحميل…' : 'Loading...'}
            </div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {isAr ? 'لا توجد مستندات' : 'No documents found'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 sticky top-0">
                <tr className="text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">id</th>
                  <th className="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">data (preview)</th>
                  <th className="text-right px-4 py-2.5 w-20 text-[11px] uppercase tracking-wide text-slate-500">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const preview = Object.entries(doc)
                    .filter(([k]) => k !== 'id')
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : String(v).slice(0, 30)}`)
                    .join(' · ');
                  return (
                    <tr key={doc.id} className="group border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 align-top text-[12px]">{doc.id}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono break-all text-[12px]">{preview}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(doc)}
                            className="p-1.5 hover:bg-blue-500/10 rounded-md text-slate-400 hover:text-blue-500 transition"
                            title="Edit"
                          >
                            <Edit3 size={13} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-400 hover:text-red-500 transition"
                            title="Delete"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'تحرير مستند' : 'Edit doc'}{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-mono">{editingDoc.id}</span>
                </h3>
                <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full h-96 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3 text-xs font-mono text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition resize-none"
                  spellCheck={false}
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  {isAr
                    ? 'عدّل JSON ثم اضغط حفظ. سيتم دمج الحقول.'
                    : 'Edit JSON then click Save. Fields will be merged.'}
                </p>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <button
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                >
                  {saving ? '...' : isAr ? 'حفظ' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New doc modal */}
      <AnimatePresence>
        {showNewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewDoc(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'مستند جديد في' : 'New doc in'}{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-mono">{activeCollection}</span>
                </h3>
                <button onClick={() => setShowNewDoc(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <textarea
                  value={newDocText}
                  onChange={(e) => setNewDocText(e.target.value)}
                  className="w-full h-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3 text-xs font-mono text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition resize-none"
                  spellCheck={false}
                />
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <button
                  onClick={() => setShowNewDoc(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                >
                  {saving ? '...' : isAr ? 'إنشاء' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
