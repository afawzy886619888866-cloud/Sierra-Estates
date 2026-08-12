import React, { useState, useEffect } from 'react';
import { createSierraNotification } from '../firebase';
import { api } from '../lib/apiClient';
import { AdminUser } from '../types';

const ROLE_TO_BACKEND: Record<'Admin' | 'Superadmin', string> = { Admin: 'admin', Superadmin: 'superadmin' };
const BACKEND_TO_ROLE: Record<string, 'Admin' | 'Superadmin'> = { admin: 'Admin', superadmin: 'Superadmin' };

interface SettingsPageProps {
  T: (key: string) => string;
  isAr?: boolean;
  currentUser?: any;
}

export default function SettingsPage({ T, isAr = false, currentUser }: SettingsPageProps) {
  const [saved, setSaved] = useState(false);
  const [projectId, setProjectId] = useState('sierra-blu-realty');
  const [geminiKey, setGeminiKey] = useState('AIza••••••••••••••');
  const [whatsappToken, setWhatsappToken] = useState('EAAx••••••••••');
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.sierra-blu.com/webhook');
  const [telegramToken, setTelegramToken] = useState('6847••••••:AAH•••••');

  // Real-time admins list
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'adminControl'>('adminControl');

  // New admin form input fields
  const [newUid, setNewUid] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Superadmin'>('Admin');
  const [actionLoading, setActionLoading] = useState(false);

  // No self-service "pending" request queue in the unified backend model — an existing
  // admin must add new operators directly via this form (see ARCHITECTURE_INTEGRATION.md).
  const approvedAdmins = admins;
  const pendingRequests: AdminUser[] = [];

  const refreshAdmins = async () => {
    try {
      const { team } = await api.get<{ team: any[] }>('/api/admin/team');
      setAdmins(
        team
          .filter((u) => u.role === 'admin' || u.role === 'superadmin')
          .map((u) => ({
            id: u.id,
            email: u.email || '',
            role: BACKEND_TO_ROLE[u.role] || 'Admin',
            status: 'approved',
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          }))
      );
    } catch (err) {
      console.error('Failed to fetch admin team:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    refreshAdmins();
    const interval = setInterval(refreshAdmins, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim() || !newEmail.trim()) {
      alert(isAr ? 'الرجاء ملء حقل المعرّف الفريد والبريد الإلكتروني!' : 'Please fill out both the UID and Email fields!');
      return;
    }

    // UID validation match (no special chars besides '-' or '_', safe length)
    const uidRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!uidRegex.test(newUid)) {
      alert(isAr ? 'معرف المستخدم (UID) غير صالح! يجب أن يحتوي فقط على حروف وأرقام وعلامات "-" أو "_".' : 'Invalid UID identifier! Can only contain alphanumeric characters, "-" or "_".');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/api/admin/team', {
        id: newUid.trim(),
        name: newName.trim() || newEmail.trim(),
        email: newEmail.trim().toLowerCase(),
        role: ROLE_TO_BACKEND[newRole],
      });
      await refreshAdmins();

      await createSierraNotification(
        'system',
        `Admin Role Granted: ${newEmail}`,
        `Successfully registered user "${newEmail}" with ${newRole} role under UID ${newUid}.`,
        `تم منح صلاحية المشرف: ${newEmail}`,
        `تم تسجيل المستخدم بنجاح البريد "${newEmail}" بصلاحية ${newRole} تحت المعرّف الفريد ${newUid}.`
      );

      // Clear form inputs
      setNewUid('');
      setNewName('');
      setNewEmail('');
      setNewRole('Admin');
    } catch (err) {
      console.error('Failed to register admin:', err);
      alert(err instanceof Error ? err.message : 'Failed to register admin.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAdmin = async (id: string, email: string) => {
    const emailLower = email.toLowerCase();
    if (emailLower === 'a.fawzy8866@gmail.com' || emailLower === 'emeraldestatesegypt@gmail.com') {
      alert(isAr ? 'لا يمكن إلغاء صلاحيات حساب الإدارة الرئيسي المستنسخ!' : 'Cannot revoke pre-bootstrapped primary Superadmin authorization!');
      return;
    }

    const confirmMsg = isAr
      ? `هل أنت متأكد من رغبتك في إلغاء صلاحيات المشرف بالبريد الإلكتروني ${email}؟`
      : `Are you sure you want to revoke admin credentials for ${email}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.delete(`/api/admin/team?id=${encodeURIComponent(id)}`);
      await refreshAdmins();

      await createSierraNotification(
        'system',
        `Admin Credentials Revoked`,
        `Successfully removed administrator privileges for ${email}.`,
        `إلغاء الصلاحيات الإدارية لمشرف`,
        `تم بنجاح سحب صلاحيات لوحة المشرفين عن الحساب ذو البريد ${email}.`
      );
    } catch (err) {
      console.error(`Failed to revoke admin ${id}:`, err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up font-sans">
      {/* Settings Sub-page Tabs */}
      <div className="flex border border-slate-800 p-1 bg-slate-950/60 rounded-xl gap-2 font-mono">
        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer text-center ${
            activeSubTab === 'config'
              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-settings-config"
        >
          🔧 {isAr ? 'إعدادات النظام والمفاتيح' : 'Keys & Server Config'}
        </button>
        <button
          onClick={() => setActiveSubTab('adminControl')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer text-center relative flex justify-center items-center gap-2 ${
            activeSubTab === 'adminControl'
              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-settings-admin-control"
        >
          <span>🔑 {isAr ? 'لوحة التحكم بالمشرفين' : 'Admin Control'}</span>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-500 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-bounce shadow">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'adminControl' && (
        <div className="space-y-6 animate-fade-in">
      {/* 3-Layers Security Information Board */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
            {isAr ? 'مركز الحماية ونموذج الصلاحيات ثلاثي الطبقات' : 'Security Architecture & 3-Tier Access Layers'}
          </span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            {isAr ? (
              <span>
                نظام إدارة علاقات العملاء الذكي (Sierra Intelligence OS) يتبنى نموذجاً صارماً للأمان وحماية البيانات يتكون من <strong>ثلاثة مستويات منفصلة للصلاحيات</strong> مفروضة على مستوى السحابة وقواعد البيانات (Google Firestore Rules):
              </span>
            ) : (
              <span>
                The Sierra Estates Intelligence OS enforces a rigid Zero-Trust operational framework divided into <strong>three distinct security layers</strong> mapped directly from database schema constraints validation:
              </span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Layer 1 */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-[10px] font-mono">1</span>
                <h4 className="font-semibold text-white text-xs">{isAr ? 'المدير العام المسبق' : 'Superadmin (Tier 1)'}</h4>
              </div>
              <p className="text-[11px] text-slate-450 leading-relaxed">
                {isAr 
                  ? 'بريد رئيسي مدمج مسبقاً (A.fawzy8866@gmail.com) يتجاوز الفحوصات ولديه وصول مطلق ودائم للتحكم بالأنظمة وإضافة عملاء/مشرفين.' 
                  : 'Pre-bootstrapped primary email (A.fawzy8866@gmail.com) which skips registration. Ultimate master controls with read/write on everything.'}
              </p>
            </div>

            {/* Layer 2 */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px] font-mono">2</span>
                <h4 className="font-semibold text-white text-xs">{isAr ? 'المشرفون المسجلون' : 'Registered Admins (Tier 2)'}</h4>
              </div>
              <p className="text-[11px] text-slate-450 leading-relaxed">
                {isAr 
                  ? 'حسابات يتم تسجيلها يدوياً برقم المعرّف السحابي (UID) والبريد الإلكتروني. تتيح إدخال البيانات ومتابعة العمليات المعقدة.' 
                  : 'Manually authorized accounts mapped directly by user UID and verified email. Full CRM operation, pipeline management, and scrapers.'}
              </p>
            </div>

            {/* Layer 3 */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-[10px] font-mono">3</span>
                <h4 className="font-semibold text-white text-xs">{isAr ? 'المشاهدون والوسطاء' : 'Viewers / Brokers (Tier 3)'}</h4>
              </div>
              <p className="text-[11px] text-slate-450 leading-relaxed">
                {isAr 
                  ? 'أي حساب مسجل خارج لوحة التحكم. يحصل الحساب فقط على صلاحيات القراءة لكتالوجات العرض العادي، دون إمكانية الاطلاع على بيانات العملاء.' 
                  : 'Any authenticated user not whitelisting inside the directory. Granted standard public-facing listings query capabilities.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Real-time whitelist UI and list */}
        <div className="lg:col-span-3 bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
                👥 {isAr ? 'سجل المستخدمين والمشرفين النشطين (طبقة 2)' : 'Registered System Operators (Layer 2)'}
              </span>
              <span className="px-2 py-0.5 text-[9px] rounded-full font-mono bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/20">
                {approvedAdmins.length + 2} {isAr ? 'مشرفين معتمدين' : 'Authorized'}
              </span>
            </div>

            <div className="p-5 space-y-3">
              {/* Primary Master Admin row is hardcoded since it is bootstrapped */}
              <div className="flex items-center justify-between p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-lg">
                <div className="min-w-0 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="font-bold text-xs text-white">A.fawzy8866@gmail.com</span>
                  </div>
                  <p className="font-mono text-[9px] text-slate-500 mt-1 select-all">UID: Pre-bootstrapped Master System Entry</p>
                </div>
                <div className="shrink-0 font-sans">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500 text-black uppercase tracking-wide">
                    {isAr ? 'المدير العام' : 'Superadmin'}
                  </span>
                </div>
              </div>

              {/* Secondary Master Admin row is hardcoded since it is bootstrapped */}
              <div className="flex items-center justify-between p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-lg">
                <div className="min-w-0 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="font-bold text-xs text-white">emeraldestatesegypt@gmail.com</span>
                  </div>
                  <p className="font-mono text-[9px] text-slate-500 mt-1 select-all">UID: Pre-bootstrapped Master System Entry</p>
                </div>
                <div className="shrink-0 font-sans">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500 text-black uppercase tracking-wide">
                    {isAr ? 'المدير العام' : 'Superadmin'}
                  </span>
                </div>
              </div>

              {loadingAdmins ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-cyan-500/20 border-t-cyan-500 animate-spin" />
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Querying database directory...</p>
                </div>
              ) : approvedAdmins.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-850 rounded-lg text-center text-xs text-slate-500 font-mono">
                  {isAr ? 'لا يوجد مشرفين ثانويين معتمدين بعد.' : 'No secondary workspace operators approved yet.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {approvedAdmins.map((adm) => (
                    <div key={adm.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-800 transition">
                      <div className="min-w-0 pr-2 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded bg-emerald-500" />
                          <span className="font-semibold text-xs text-white truncate">{adm.email}</span>
                        </div>
                        <p className="font-mono text-[9px] text-slate-500 mt-1 truncate select-all">UID: {adm.id}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-sans">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide ${
                          adm.role === 'Superadmin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {adm.role}
                        </span>
                        <button
                          onClick={() => handleRevokeAdmin(adm.id, adm.email)}
                          className="p-1 px-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-bold font-mono text-[9px] transition cursor-pointer"
                          title="Revoke and delete admin account"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-t border-slate-900 bg-[#05080f]/50">
            <h5 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 select-none font-semibold">ℹ️ {isAr ? 'آلية تسجيل الدخول' : 'SSO Connection Protocol'}</h5>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              {isAr ? (
                <span>
                  لا يعتمد هذا النظام على كلمات مرور محلية تقليدية. بدلاً من ذلك، يقوم المستخدمون بتسجيل الدخول بأمان عبر <strong>Google Sign-In</strong>. لتفويض مستخدم جديد، كل ما على المدير فعله هو إضافة معرف المستخدم الفريد (UID) الخاص به وبريده هنا. يمكن الحصول على UID في لوحة تحكّم Firebase Authentication أو بمجرد محاولة المستخدم تسجيل الدخول أولى مسببة رسالة رفض تحتوي معرّفه.
                </span>
              ) : (
                <span>
                  Administrators authenticate using <strong>Google Auth SSO</strong>. Direct emails and corresponding user credentials are white-listed through security directories. To authorize access for any broker or operator, request their Firebase UID and enter it inside the right config terminal.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Manage & Whitelist Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
                🔑 {isAr ? 'بوابة تفويض حساب جديد' : 'Authorize New Operator'}
              </span>
            </div>
            <form onSubmit={handleRegisterAdmin} className="p-5 space-y-4">
              <div>
                <label className="block text-[8.5px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  {isAr ? 'معرّف المستخدم السحابي (Firebase UID)' : 'Firebase Authentication UID'}
                </label>
                <input
                  type="text"
                  required
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  placeholder="e.g. jB7W2pS0rXa9gK..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded px-4 py-2 text-xs text-white font-mono placeholder:text-slate-700 outline-none transition duration-150"
                  id="admin-new-uid-input"
                />
              </div>

              <div>
                <label className="block text-[8.5px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  {isAr ? 'الاسم' : 'Name'}
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Mona Hassan"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded px-4 py-2 text-xs text-white font-mono placeholder:text-slate-700 outline-none transition duration-150"
                  id="admin-new-name-input"
                />
              </div>

              <div>
                <label className="block text-[8.5px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  {isAr ? 'البريد الإلكتروني المعتمد بالكامل' : 'Registered Google Admin Email'}
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. operator@sierra-estates.com"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded px-4 py-2 text-xs text-white font-mono placeholder:text-slate-700 outline-none transition duration-150"
                  id="admin-new-email-input"
                />
              </div>

              <div>
                <label className="block text-[8.5px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                  {isAr ? 'الصلاحيات الإدارية الممنوحة' : 'Operational Access Role'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'Admin' | 'Superadmin')}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded px-4 py-2 text-xs text-white selection:bg-cyan-500/30 outline-none transition duration-150 cursor-pointer"
                  id="admin-new-role-select"
                >
                  <option value="Admin">Admin (Layer 2 Broker/Manager)</option>
                  <option value="Superadmin">Superadmin (Layer 1 Full Master)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded flex items-center justify-center gap-1.5 select-none cursor-pointer duration-100 disabled:opacity-50"
                  id="btn-register-admin"
                >
                  {actionLoading ? (
                    <span>{isAr ? 'جاري التحقق والمنح...' : 'Enrolling into Secure Chain...'}</span>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>{isAr ? 'منح وتفويض الصلاحيات السحابية' : 'Authorize Admin Credentials'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
        </div>
      )}

      {activeSubTab === 'config' && (
        <div className="space-y-6 animate-fade-in font-sans">
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
            🔧 {T('settings')} · Server Config Keys
          </span>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Firebase Project ID', val: projectId, setVal: setProjectId, type: 'text' },
            { label: 'Gemini AI API Key', val: geminiKey, setVal: setGeminiKey, type: 'password' },
            { label: 'WhatsApp Business API Server Token', val: whatsappToken, setVal: setWhatsappToken, type: 'password' },
            { label: 'n8n Ingestion Webhook URL', val: webhookUrl, setVal: setWebhookUrl, type: 'text' },
            { label: 'Telegram Bot Alert Channel Token', val: telegramToken, setVal: setTelegramToken, type: 'password' },
          ].map((item, i) => (
            <div key={i}>
              <label className="block text-[8.5px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 select-none">
                {item.label}
              </label>
              <input
                type={item.type}
                value={item.val}
                onChange={(e) => item.setVal(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500/50 rounded px-4 py-2 text-xs text-white selection:bg-cyan-500/30 outline-none transition duration-150"
              />
            </div>
          ))}

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded select-none cursor-pointer duration-100"
              id="btn-save-secrets-settings"
            >
              {saved ? T('saved') : T('saveConfig')}
            </button>
          </div>
        </div>
      </div>

      {/* GitHub project link card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
            {T('githubIntegration')}
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3.5 p-4 bg-slate-900/40 border border-slate-800 rounded">
            <span className="text-2xl shrink-0 select-none">⭐</span>
            <div className="flex-1 min-w-0 font-mono text-xs">
              <div className="font-bold text-white truncate uppercase select-all">Sierra-Estates-Final</div>
              <div className="text-slate-550 mt-1 select-all truncate text-[10px]">
                github.com/ahmedfawzy8866/Sierra-Estates-Final.git
              </div>
            </div>
            <span className="text-[9px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0 select-none">
              CONNECTED ✓
            </span>
          </div>

          <div className="flex gap-2.5 flex-wrap">
            <button className="px-4 py-2 text-xs font-mono bg-white/5 border border-white/10 text-slate-300 rounded hover:bg-white/10 transition select-none cursor-pointer active:scale-95">
              Pull Remote
            </button>
            <button className="px-4 py-2 text-xs font-mono bg-white/5 border border-white/10 text-slate-300 rounded hover:bg-white/10 transition select-none cursor-pointer active:scale-95">
              Diff Changes
            </button>
            <button className="px-4 py-2 text-xs font-bold bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 rounded hover:bg-cyan-500/20 transition select-none cursor-pointer active:scale-95 uppercase font-mono tracking-wider">
              Push Repository
            </button>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
