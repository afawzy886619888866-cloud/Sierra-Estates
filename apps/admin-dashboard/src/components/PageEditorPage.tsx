import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Edit3, Trash2, Plus, X, Eye, EyeOff, Globe } from 'lucide-react';

interface CMSPage {
  id: string;
  slug: string;
  locale: 'en' | 'ar';
  sections: Record<string, any>;
  published: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

interface PageEditorPageProps {
  T: (key: string) => string;
  isAr?: boolean;
}

const PAGE_SLUGS = [
  'home', 'about', 'listings', 'contact', 'invest',
  'concierge', 'careers', 'pricing', 'blog', 'success-stories',
  'roi', 'virtual-tour', 'dream-decision',
];

const SECTION_TEMPLATES = {
  hero: { title: '', subtitle: '', ctaText: '', ctaHref: '', backgroundImage: '' },
  about: { title: '', body: '', image: '' },
  testimonials: { title: '', items: [] },
  cta: { title: '', subtitle: '', buttonText: '', buttonHref: '' },
  contact: { title: '', phone: '', email: '', address: '', whatsapp: '' },
};

export default function PageEditorPage({ T, isAr = false }: PageEditorPageProps) {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [editSections, setEditSections] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageSlug, setNewPageSlug] = useState('home');
  const [newPageLocale, setNewPageLocale] = useState<'en' | 'ar'>('en');

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { success, pages, error: apiError } = await api.get<{ success: boolean; pages: CMSPage[]; error?: string }>(
        '/api/admin/pages'
      );
      if (!success) throw new Error(apiError || 'Failed to fetch');
      setPages(pages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleEdit = (page: CMSPage) => {
    setEditingPage(page);
    setEditSections(JSON.stringify(page.sections || {}, null, 2));
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(editSections);
      await api.patch(`/api/admin/pages/${editingPage.id}`, { sections: parsed });
      setEditingPage(null);
      fetchPages();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (page: CMSPage) => {
    try {
      await api.patch(`/api/admin/pages/${page.id}`, { published: !page.published });
      fetchPages();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleDelete = async (page: CMSPage) => {
    if (!confirm(`Delete ${page.slug} (${page.locale})? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/pages/${page.id}`);
      fetchPages();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/api/admin/pages', {
        slug: newPageSlug,
        locale: newPageLocale,
        sections: { hero: SECTION_TEMPLATES.hero },
        published: false,
      });
      setShowNewPage(false);
      fetchPages();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'محرر صفحات العميل' : 'Client Page Editor'}
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            {isAr
              ? 'حرّر عناوين ونصوص صفحات الموقع العام بدون نشر كود'
              : 'Edit public site copy and CTAs without a code deploy'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPages}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md text-[13px] font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowNewPage(true)}
            className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[13px] font-medium transition shadow-sm"
          >
            <Plus size={14} />
            {isAr ? 'صفحة جديدة' : 'New page'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Pages grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-500">
            <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
            {isAr ? 'جارٍ التحميل…' : 'Loading...'}
          </div>
        ) : pages.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500">
            {isAr ? 'لا توجد صفحات بعد. أنشئ أول صفحة!' : 'No pages yet. Create your first one!'}
          </div>
        ) : (
          pages.map((page, index) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.05 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              {/* Top row: slug + status badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-mono text-[14px] font-medium text-blue-600 dark:text-blue-400">{page.slug}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                    <Globe size={11} strokeWidth={1.75} />
                    <span className="uppercase tracking-wide">{page.locale}</span>
                  </div>
                </div>
                {page.published ? (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                    {isAr ? 'منشور' : 'Live'}
                  </span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium">
                    {isAr ? 'مسودة' : 'Draft'}
                  </span>
                )}
              </div>

              {/* Metadata — single muted line */}
              <div className="text-[12px] text-slate-500 mb-4">
                {Object.keys(page.sections || {}).length} {isAr ? 'أقسام' : 'sections'}
                {page.updatedAt && (
                  <span className="text-slate-400 dark:text-slate-600"> · {isAr ? 'آخر تحديث' : 'updated'} {new Date(page.updatedAt).toLocaleDateString()}</span>
                )}
              </div>

              {/* Actions — hover-only Edit, always-visible publish toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleEdit(page)}
                  className="flex items-center gap-1.5 px-2.5 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-md text-[12px] font-medium transition"
                >
                  <Edit3 size={12} strokeWidth={1.75} />
                  {isAr ? 'تحرير' : 'Edit'}
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleTogglePublish(page)}
                    className={`flex items-center justify-center p-1.5 rounded-md transition ${
                      page.published
                        ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                        : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                    title={page.published ? (isAr ? 'إلغاء النشر' : 'Unpublish') : (isAr ? 'نشر' : 'Publish')}
                  >
                    {page.published ? <EyeOff size={13} strokeWidth={1.75} /> : <Eye size={13} strokeWidth={1.75} />}
                  </button>
                  <button
                    onClick={() => handleDelete(page)}
                    className="flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editingPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingPage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                  <span className="text-purple-400 font-mono">{editingPage.slug}</span>
                  <span className="text-slate-500 mx-2">·</span>
                  <span className="text-slate-400 uppercase text-xs">{editingPage.locale}</span>
                </h3>
                <button onClick={() => setEditingPage(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto">
                <p className="text-xs text-slate-400 mb-2">
                  {isAr
                    ? 'حرّر أقسام الصفحة (JSON). سيظهر للزوار فور النشر.'
                    : 'Edit page sections (JSON). Goes live when you publish.'}
                </p>
                <textarea
                  value={editSections}
                  onChange={(e) => setEditSections(e.target.value)}
                  className="w-full h-96 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3 text-xs font-mono text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition resize-none"
                  spellCheck={false}
                />
                <div className="mt-3 p-3 bg-slate-950/50 rounded border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    {isAr ? 'أقسام نموذجية' : 'Section templates'}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                    <div>hero: {`{ title, subtitle, ctaText, ctaHref, backgroundImage }`}</div>
                    <div>about: {`{ title, body, image }`}</div>
                    <div>cta: {`{ title, subtitle, buttonText, buttonHref }`}</div>
                    <div>contact: {`{ title, phone, email, address, whatsapp }`}</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <button
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                >
                  {saving ? '...' : isAr ? 'حفظ الأقسام' : 'Save sections'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New page modal */}
      <AnimatePresence>
        {showNewPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewPage(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                  {isAr ? 'صفحة جديدة' : 'New page'}
                </h3>
                <button onClick={() => setShowNewPage(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    {isAr ? 'الصفحة' : 'Slug'}
                  </label>
                  <select
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  >
                    {PAGE_SLUGS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    {isAr ? 'اللغة' : 'Locale'}
                  </label>
                  <div className="flex gap-2">
                    {(['en', 'ar'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setNewPageLocale(l)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition ${
                          newPageLocale === l
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {l === 'en' ? '🇬🇧 English' : '🇪🇬 العربية'}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  {isAr
                    ? 'سيبدأ بقالب hero افتراضي. يمكنك تعديله بعد الإنشاء.'
                    : 'Starts with a default hero template. You can edit it after creation.'}
                </p>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <button
                  onClick={() => setShowNewPage(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
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
