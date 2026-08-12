import React from 'react';
import {
  LogOut, Languages, PanelLeftClose, PanelLeftOpen, X,
  LayoutDashboard, Users, Building2, CalendarCheck, BarChart3,
  FileText, Bot, Workflow, Zap, Settings, RefreshCw, Database,
  Sun, Moon,
  Briefcase, CheckSquare, Palette, PenLine, Gavel, Activity, TerminalSquare, BarChart2, Settings2,
  ScrollText, UserCog, ShieldAlert, CopyX, ClockAlert, MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  T: (key: string) => string;
  tab: string;
  setTab: (t: string) => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: (() => void) | null;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  langKey: string;
  setLangKey: React.Dispatch<React.SetStateAction<string>>;
  mobileOpen?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  labelAr: string;
  icon: LucideIcon;
  section: 'core' | 'operations' | 'automation' | 'intelligence' | 'integrations' | 'system';
  badge?: string;
  badgeTone?: 'success' | 'info';
}

// Professional nav items — Lucide icons, no emojis.
// Each item carries EN + AR labels so the sidebar re-renders cleanly on
// language switch without re-deriving the labels via the T() lookup.
// Consolidated from all 3 admin sources (Next.js Admin A + Vite Admin B +
// orphan Admin C) — every section that existed in any admin is wired here.
export const NAV_ITEMS: NavItem[] = [
  // ── Core operations (MegaDashboard scroll targets) ────────────────
  { id: 'overview',       label: 'Live Dashboard',    labelAr: 'لوحة التحكم',           icon: LayoutDashboard, section: 'core' },
  { id: 'leads',          label: 'Leads & CRM',       labelAr: 'العملاء و CRM',         icon: Users,           section: 'core' },
  { id: 'listings',       label: 'Property Inventory',labelAr: 'العقارات',              icon: Building2,       section: 'core' },
  { id: 'followups',      label: 'Follow-ups',        labelAr: 'المتابعات',             icon: CalendarCheck,   section: 'core' },
  { id: 'searchInsights', label: 'Search Insights',   labelAr: 'تحليلات البحث',         icon: BarChart3,       section: 'core' },
  { id: 'pageEditor',     label: 'Page Editor',       labelAr: 'محرر الصفحات',          icon: FileText,        section: 'core' },
  // ── Operations (Pipeline + Tasks + Curator/Scribe/Closer from Admin A) ──
  { id: 'pipeline',       label: 'Deal Pipeline',     labelAr: 'خط الصفقات',            icon: Briefcase,       section: 'operations' },
  { id: 'tasks',          label: 'Tasks',             labelAr: 'المهام',                icon: CheckSquare,     section: 'operations', badge: '5', badgeTone: 'info' },
  { id: 'curator',        label: 'The Curator',       labelAr: 'المنظم',                icon: Palette,         section: 'operations' },
  { id: 'scribe',         label: 'The Scribe',        labelAr: 'الكاتب',                icon: PenLine,         section: 'operations' },
  { id: 'closer',         label: 'Stage-9 Closer',    labelAr: 'الإغلاق',               icon: Gavel,           section: 'operations' },
  { id: 'commission',     label: 'Commission Ledger', labelAr: 'سجل العمولات',          icon: ScrollText,      section: 'operations' },
  { id: 'actionProtocols',label: 'Action Protocols',  labelAr: 'بروتوكولات العمل',        icon: ShieldAlert,     section: 'operations' },
  // ── Automation & agents ────────────────────────────────────────────
  { id: 'bots',           label: 'Bots Control',      labelAr: 'التحكم بالبوتات',       icon: Bot,             section: 'automation' },
  { id: 'agents',         label: 'AI Agents',         labelAr: 'وكلاء الذكاء',          icon: Bot,             section: 'automation', badge: '6', badgeTone: 'success' },
  { id: 'workflows',      label: 'Workflows',         labelAr: 'سير العمل',             icon: Workflow,        section: 'automation', badge: '8', badgeTone: 'info' },
  // ── Intelligence (telemetry + reports from Admin A) ────────────────
  { id: 'nexus',          label: 'Nexus-AI Telemetry',labelAr: 'نيكسوس',                icon: Activity,        section: 'intelligence', badge: 'LIVE', badgeTone: 'success' },
  { id: 'openclaw',       label: 'OpenClaw Terminal', labelAr: 'أوبن كلو',              icon: TerminalSquare,  section: 'intelligence' },
  { id: 'reports',        label: 'Reports',           labelAr: 'التقارير',              icon: BarChart2,       section: 'intelligence' },
  { id: 'dedupe',         label: 'Dedupe Queue',      labelAr: 'طابور التكرار',         icon: CopyX,           section: 'intelligence' },
  { id: 'staleData',      label: 'Stale Monitor',     labelAr: 'مراقب البيانات',        icon: ClockAlert,      section: 'intelligence' },
  // ── Integrations ───────────────────────────────────────────────────
  { id: 'whatsappSender', label: 'WhatsApp Sender',   labelAr: 'مراسل الواتساب',        icon: MessageCircle,   section: 'integrations', badge: 'PRO', badgeTone: 'success' },
  { id: 'easyListing',    label: 'Easy Listing',      labelAr: 'إدراج سريع',            icon: Zap,             section: 'integrations' },
  { id: 'automation',     label: 'Automation Portal', labelAr: 'بوابة الأتمتة',         icon: Settings,        section: 'integrations' },
  { id: 'dataSync',       label: 'Data Sync',         labelAr: 'مزامنة البيانات',       icon: RefreshCw,       section: 'integrations' },
  // ── System ─────────────────────────────────────────────────────────
  { id: 'dbEditor',       label: 'DB Editor',         labelAr: 'محرر قاعدة البيانات',   icon: Database,        section: 'system' },
  { id: 'auditLogs',      label: 'Audit Logs',        labelAr: 'سجل العمليات',          icon: ScrollText,      section: 'system' },
  { id: 'usersManager',   label: 'User Management',   labelAr: 'إدارة المشرفين',        icon: UserCog,         section: 'system' },
  { id: 'settings',       label: 'System Config',     labelAr: 'إعدادات النظام',        icon: Settings2,       section: 'system' },
];

const SECTION_LABELS: Record<NavItem['section'], { en: string; ar: string }> = {
  core:         { en: 'Operations',   ar: 'العمليات' },
  operations:   { en: 'Pipeline',     ar: 'الصفقات' },
  automation:   { en: 'Automation',   ar: 'الأتمتة' },
  intelligence: { en: 'Intelligence', ar: 'الاستخبارات' },
  integrations: { en: 'Integrations', ar: 'التكاملات' },
  system:       { en: 'System',       ar: 'النظام' },
};

const BADGE_TONES: Record<NonNullable<NavItem['badgeTone']>, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20',
  info:    'bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20',
};

export default function Sidebar({
  T,
  tab,
  setTab,
  collapsed,
  setCollapsed,
  onClose,
  theme,
  setTheme,
  langKey,
  setLangKey,
  mobileOpen,
}: SidebarProps) {
  const isAr = langKey === 'ar';
  const sections: NavItem['section'][] = ['core', 'operations', 'automation', 'intelligence', 'integrations', 'system'];

  const handleSignOut = async () => {
    if (confirm(isAr ? 'تسجيل الخروج من لوحة التحكم؟' : 'Sign out of admin session?')) {
      await signOut(auth);
    }
  };

  const handleItemClick = (id: string) => {
    setTab(id);
    
    // If it's a mega-dashboard section, scroll to it smoothly.
    // Other tabs (pipeline, tasks, curator, scribe, closer, nexus, openclaw,
    // reports, settings, easyListing, automation, dataSync, pageEditor,
    // dbEditor, agents) are rendered as separate pages by renderActiveProductPage()
    // — clicking them just sets the tab; no scroll needed.
    if (['overview', 'leads', 'listings', 'bots', 'workflows', 'searchInsights', 'followups'].includes(id)) {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    if (onClose) onClose();
  };

  return (
    <aside
      className={`flex flex-col h-full bg-[#030712]/80 backdrop-blur-xl border-r border-slate-800/80 overflow-hidden transition-all duration-300 ease-out
        ${collapsed ? 'w-[60px]' : 'w-[244px]'}
        ${mobileOpen ? 'translate-x-0 fixed inset-y-0 left-0 z-50 shadow-2xl' : '-translate-x-full absolute'}
        md:relative md:translate-x-0
      `}
      id="admin-sidebar"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ── Brand header ──────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/80 px-3 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Logo mark — refined, not glowing */}
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-slate-100 to-slate-300 flex items-center justify-center shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M4 20L12 4L20 20H4Z" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 14H15" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && (
            <div className="select-none overflow-hidden">
              <div className="font-semibold text-[13px] text-white tracking-tight leading-none">
                {isAr ? 'سييرا إستيتس' : 'Sierra Estates'}
              </div>
              <div className="text-[9px] tracking-[0.18em] text-slate-500 uppercase mt-1 font-medium">
                {isAr ? 'لوحة التحكم' : 'Admin Console'}
              </div>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition lg:hidden"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
        {sections.map((section) => {
          const sectionItems = NAV_ITEMS.filter((i) => i.section === section);
          if (sectionItems.length === 0) return null;
          return (
            <div key={section} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2 mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase select-none">
                  {isAr ? SECTION_LABELS[section].ar : SECTION_LABELS[section].en}
                </div>
              )}
              {sectionItems.map((item) => {
                const isActive = tab === item.id;
                const Icon = item.icon;
                const label = isAr ? item.labelAr : item.label;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    title={collapsed ? label : undefined}
                    className={`group w-full flex items-center gap-2.5 px-2.5 h-11 rounded-md text-[13px] font-medium cursor-pointer transition-all duration-300 relative ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-300 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Active indicator bar — subtle, left edge */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                      strokeWidth={1.75}
                    />
                    {!collapsed && (
                      <>
                        <span className="truncate select-none flex-1 text-left">{label}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded select-none ${
                              BADGE_TONES[item.badgeTone ?? 'info']
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer controls ──────────────────────────────────────────── */}
      <div className="border-t border-slate-800/80 p-2 space-y-0.5 shrink-0">
        {/* Theme toggle (light / dark) — clean Lucide icons */}
        <button
          onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 'clay' : 'dark'))}
          className="group w-full flex items-center gap-2.5 px-2.5 h-11 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition select-none"
          title={isAr ? 'تغيير المظهر (داكن / فاتح / كلاي)' : 'Toggle Theme (Dark / Light / Clay)'}
          id="sidebar-theme-toggle"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.75} />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={1.75} />
          ) : (
            <Palette className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={1.75} />
          )}
          {!collapsed && (
            <span className="text-[13px] font-medium">
              {theme === 'dark'
                ? (isAr ? 'الوضع الداكن' : 'Dark mode')
                : theme === 'light'
                ? (isAr ? 'الوضع الفاتح' : 'Light mode')
                : (isAr ? 'ثيم كلاي الضوئي' : 'Clay Light')}
            </span>
          )}
        </button>

        {/* Language toggle */}
        <button
          onClick={() => setLangKey((prev) => (prev === 'ar' ? 'en' : 'ar'))}
          className="group w-full flex items-center gap-2.5 px-2.5 h-11 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition select-none"
          title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
        >
          <Languages className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" strokeWidth={1.75} />
          {!collapsed && (
            <span className="text-[13px] font-medium flex items-center justify-between w-full">
              <span>{isAr ? 'اللغة' : 'Language'}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                {isAr ? 'ع' : 'EN'}
              </span>
            </span>
          )}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="group w-full flex items-center gap-2.5 px-2.5 h-11 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition select-none"
          title={isAr ? 'تسجيل الخروج' : 'Sign out'}
          id="sidebar-logout"
        >
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400 shrink-0" strokeWidth={1.75} />
          {!collapsed && (
            <span className="text-[13px] font-medium">{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="group w-full flex items-center gap-2.5 px-2.5 h-11 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/50 transition select-none"
          title={`${isAr ? 'طيّ الشريط' : 'Collapse'} [/]`}
          id="btn-sidebar-toggle"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          )}
          {!collapsed && (
            <div className="flex items-center justify-between w-full select-none">
              <span className="text-[13px] font-medium">{isAr ? 'طيّ الشريط' : 'Collapse'}</span>
              <kbd className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-600 font-mono">/</kbd>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
