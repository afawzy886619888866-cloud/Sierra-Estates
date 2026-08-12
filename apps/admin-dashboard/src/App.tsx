import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Mic, Search, X, Menu } from 'lucide-react';
import { auth, db, createSierraNotification } from './firebase';
import { api } from './lib/apiClient';
import { seedFirestore } from './seed';
import { motion, AnimatePresence } from 'motion/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Modular Component Imports
import LoginPage from './components/LoginPage';
import Sidebar, { NAV_ITEMS } from './components/Sidebar';
// NAV_ITEMS is now a static array (Lucide icons, bilingual labels baked in).
// langKey drives which label is shown — the T() function is still used by
// child components for backwards compatibility.
import OverviewPage from './components/OverviewPage';
import AgentsPage from './components/AgentsPage';
import WorkflowsPage from './components/WorkflowsPage';
import OpenClawPage from './components/OpenClawPage';
import LeadsPage from './components/LeadsPage';
import ListingsHubPage from './components/ListingsHubPage';
import CuratorPage from './components/CuratorPage';
import ScribePage from './components/ScribePage';
import NexusAIPage from './components/NexusAIPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import Stage9CloserPage from './components/Stage9CloserPage';
import NotificationCenter from './components/NotificationCenter';
import AutomationToolsPage from './components/AutomationToolsPage';
import EasyListingPage from './components/EasyListingPage';
import WhatsAppSenderPage from './components/WhatsAppSenderPage';
import DataSyncHubPage from './components/DataSyncHubPage';
import SearchInsightsPage from './components/SearchInsightsPage';
import DBEditorPage from './components/DBEditorPage';
import AuditLogsPage from './components/AuditLogsPage';
import UsersManagerPage from './components/UsersManagerPage';
import PageEditorPage from './components/PageEditorPage';
import FollowupsPage from './components/FollowupsPage';
import BotsControlPage from './components/BotsControlPage';
import MegaDashboard from './components/MegaDashboard';
import PipelinePage from './components/PipelinePage';
import TasksPage from './components/TasksPage';

import GlobalProgressTracker from './components/GlobalProgressTracker';
import AdminHealthMonitor from './components/AdminHealthMonitor';

// Newly Ported Admin Components
import CommissionLedger from './components/CommissionLedger';
import ActionProtocols from './components/ActionProtocols';
import DedupeReviewQueue from './components/DedupeReviewQueue';
import StaleDataMonitor from './components/StaleDataMonitor';

// Text translations conforming to standard arabic/english requirements
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    brand: 'SIERRA ESTATES 3.0',
    brandSub: 'INTELLIGENCE OS',
    overview: 'Intelligence OS',
    agents: 'Agents & Bots',
    workflows: 'Workflows',
    openclaw: 'OpenClaw Terminal',
    nexus: 'Nexus-AI Telemetry',
    leads: 'CRM · Leads',
    listings: 'Listings Hub',
    curator: 'The Curator',
    scribe: 'The Scribe',
    closer: 'Stage-9 Closer',
    reports: 'Reports',
    searchInsights: 'Search Insights',
    followups: 'Follow-ups',
    bots: 'Bots Control',
    pageEditor: 'Page Editor (CMS)',
    dbEditor: 'DB Editor (Raw)',
    settings: 'System Config',
    main: 'Main',
    operations: 'Operations',
    analytics: 'Analytics',
    system: 'System',
    collapse: 'Collapse',
    livesite: 'Live Site',
    theme: 'Theme',
    lang: 'Language',
    addLead: '+ Add Lead',
    exportCSV: 'Export CSV',
    importCSV: 'Import CSV',
    search: 'Search…',
    totalListings: 'Total Listings',
    activeLeads: 'Active Leads',
    avgDeal: 'Avg Deal Value',
    dealsClosed: 'Deals Closed',
    avgResponse: 'Avg Response',
    aiMatch: 'AI Match Rate',
    pending: 'Pending Reviews',
    eliteBrokers: 'Elite Brokers',
    pipelineTitle: 'Pipeline · S1→S10',
    hotLeads: '🔥 Hot Leads',
    agentStatus: 'Agent Status',
    viewingScheduled: 'Viewing Scheduled',
    aiMatched: 'AI Matched',
    contractDraft: 'Contract Draft',
    initialContact: 'Initial Contact',
    negotiating: 'Negotiating',
    online: 'Online',
    running: 'Running',
    idle: 'Idle',
    load: 'Load',
    totalTasks: 'Total tasks',
    config: 'Config',
    logs: 'Logs',
    restart: 'Restart',
    sendMsg: 'Send',
    curator_title: 'The Curator · S3–S5 Inventory & Valuation',
    scribe_title: 'The Scribe · S1–S2 Ingestion Parser',
    avm: 'AVM Engine',
    priceAdj: 'Price Adjustment',
    qualityScore: 'Quality Score',
    rawInput: 'Raw Listing Input (WhatsApp / Prop Finder text)',
    parsedOutput: 'Parsed & Structured Output',
    parseBtn: 'Parse with Scribe',
    compound: 'Compound',
    type: 'Type',
    area: 'Area',
    price: 'Price',
    beds: 'Beds',
    status: 'Status',
    phone: 'Phone',
    interest: 'Interest',
    stage: 'Stage',
    actions: 'Actions',
    client: 'Client',
    view: 'View',
    whatsapp: 'WhatsApp',
    monthlyDeals: '📊 Monthly Deals Closed',
    revPipeline: '💰 Revenue Pipeline',
    perfByCompound: '🗺️ Performance by Compound',
    saveConfig: 'Save Configuration',
    saved: '✓ Saved!',
    githubIntegration: '🔗 GitHub Integration',
    pullLatest: 'Pull Latest',
    openRepo: 'Open Repo',
    pushChanges: 'Push Changes',
    voiceSearch: 'Voice Search',
    listening: 'Listening...',
    speechNotSupported: 'Speech Recognition not supported in this browser.',
  },
  ar: {
    brand: 'سييرا إيستيتس 3.0',
    brandSub: 'نظام التشغيل الذكي',
    overview: 'لوحة التحكم والذكاء',
    agents: 'الوكلاء والبوتات',
    workflows: 'سير العمل',
    openclaw: 'طرفية أوبن كلو',
    nexus: 'نيكسوس · البث المباشر',
    leads: 'إدارة العملاء',
    listings: 'قاعدة العقارات',
    curator: 'المنظم المالي',
    scribe: 'الكاتب اللغوي',
    closer: 'المغلق · المرحلة 9',
    reports: 'التقارير التحليلية',
    searchInsights: 'تحليلات البحث',
    followups: 'المتابعات',
    bots: 'التحكم بالبوتات',
    pageEditor: 'محرر الصفحات',
    dbEditor: 'محرر قاعدة البيانات',
    settings: 'إعدادات النظام',
    main: 'رئيسي',
    operations: 'العمليات',
    analytics: 'التحليلات والمحاسبة',
    system: 'النظام المستقر',
    collapse: 'طي القائمة',
    livesite: 'موقع المعاينة',
    theme: 'المظهر والسمات',
    lang: 'اللغة الحالية',
    addLead: '+ إضافة عميل جديد',
    exportCSV: 'تصدير جدول CSV',
    importCSV: 'استيراد CSV',
    search: 'بحث…',
    totalListings: 'إجمالي العقارات',
    activeLeads: 'العملاء النشطين',
    avgDeal: 'متوسط قيمة الصفقة',
    dealsClosed: 'الصفقات المغلقة',
    avgResponse: 'متوسط الاستجابة بالثانية',
    aiMatch: 'دقة الذكاء الاصطناعي',
    pending: 'قيد المراجعة',
    eliteBrokers: 'الوسطاء النخبة',
    pipelineTitle: 'مراحل خط الأنابيب',
    hotLeads: '🔥 العملاء الساخنين',
    agentStatus: 'نشاط الوكلاء',
    viewingScheduled: 'معاينة مجدولة',
    aiMatched: 'مطابقة ذكية',
    contractDraft: 'مسودة عقد',
    initialContact: 'تواصل أولي',
    negotiating: 'مفاوضات هامة',
    online: 'متصل وجاهز',
    running: 'قيد التشغيل',
    idle: 'مستقر خامل',
    load: 'الحمل الفعلي',
    totalTasks: 'إجمالي المهام المنجزة',
    config: 'إعداد المعايير',
    logs: 'السجلات السرية',
    restart: 'إعادة التشغيل',
    sendMsg: 'إرسال',
    curator_title: 'المنظم المالي · مخزون ميفيدا وبالم هيلز',
    scribe_title: 'الكاتب اللغوي · إدخال وتحليل نصوص واتس اب',
    avm: 'محرك التقييم الآلي AVM',
    priceAdj: 'تعديل أسعار السوق',
    qualityScore: 'نقاط الجودة والتقييم',
    rawInput: 'نص إدخال الواتساب الخام',
    parsedOutput: 'المخرجات المنظمة بقاعدة البيانات',
    parseBtn: 'تحليل النص بالكاتب',
    compound: 'المجمع السكني',
    type: 'نوع العقار',
    area: 'المساحة الإجمالية',
    price: 'سعر السوق المطلوب',
    beds: 'غرف النوم',
    status: 'حالة الإعلان',
    phone: 'رقم هاتف العميل',
    interest: 'تفاصيل الاهتمام',
    stage: 'المرحلة الحالية',
    actions: 'إجراءات لوحة التحكم',
    client: 'العميل المستهدف',
    view: 'عرض التفاصيل',
    whatsapp: 'واتساب',
    monthlyDeals: '📊 الصفقات الشهرية المغلقة',
    revPipeline: '💰 خط الإيرادات المالية',
    perfByCompound: '🗺️ الأداء حسب المجمع السكني',
    saveConfig: 'حفظ الإعدادات الفنية',
    saved: '✓ تم الحفظ بنجاح!',
    githubIntegration: '🔗 تكامل مستودع GitHub',
    pullLatest: 'سحب آخر التحديثات',
    openRepo: 'فتح المستودع الفرعي',
    pushChanges: 'رفع التغييرات الفورية',
    voiceSearch: 'البحث الصوتي',
    listening: 'جاري الاستماع...',
    speechNotSupported: 'البحث الصوتي غير مدعوم في هذا المتصفح',
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const navigate = useNavigate();
  const location = useLocation();

  // App layouts states
  const [tab, setTab] = useState<string>(() => localStorage.getItem('sierra_admin_tab') || 'overview');
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('sierra_admin_theme') || 'dark');
  const [langKey, setLangKey] = useState<string>(() => localStorage.getItem('sierra_admin_lang') || 'en');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<'all' | 'leads' | 'listings' | 'agents' | 'workflows'>('all');
  const [showScopeDropdown, setShowScopeDropdown] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [pendingVoiceTranscript, setPendingVoiceTranscript] = useState<string | null>(null);
  const [voiceCountdown, setVoiceCountdown] = useState<number>(2);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Custom event listener for global tab navigation (e.g. switching to easyListing)
  useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail) {
        setTab(customEvt.detail);
        localStorage.setItem('sierra_admin_tab', customEvt.detail);
      }
    };
    window.addEventListener('sierra_navigate_tab', handleNav);
    return () => window.removeEventListener('sierra_navigate_tab', handleNav);
  }, []);

  // Global keyboard shortcuts hook (CMD+K / CTRL+K for search, '/' to toggle sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. CMD+K / CTRL+K: Focus search input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }

      // 2. '/': Toggle sidebar, unless inside focused text/input fields
      if (e.key === '/') {
        const activeEl = document.activeElement;
        const isInputField = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          activeEl.getAttribute('contenteditable') === 'true'
        );
        if (!isInputField) {
          e.preventDefault();
          setCollapsed((prev) => !prev);
        }
      }

      // 3. 'Escape' key: blur focus from inputs
      if (e.key === 'Escape') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          activeEl.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Translate handler callback
  const T = useCallback((key: string) => TRANSLATIONS[langKey]?.[key] || key, [langKey]);
  const isAr = langKey === 'ar';

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      setRecognition(rec);
    }
  }, []);

  const toggleVoiceSearch = useCallback(() => {
    if (!recognition) {
       setSpeechError(T('speechNotSupported'));
       setTimeout(() => setSpeechError(null), 3000);
       return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    recognition.lang = langKey === 'ar' ? 'ar-EG' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setPendingVoiceTranscript(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError(isAr ? 'الرجاء تمكين الميكروفون لاستخدام هذه الميزة' : 'Please enable microphone access.');
      } else {
        setSpeechError(event.error);
      }
      setTimeout(() => setSpeechError(null), 3500);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start SpeechRecognition:', e);
      setIsListening(false);
    }
  }, [recognition, isListening, langKey, T, isAr, setPendingVoiceTranscript]);

  const handleSelectScope = useCallback((scope: 'all' | 'leads' | 'listings' | 'agents' | 'workflows') => {
    setSearchScope(scope);
    setShowScopeDropdown(false);
    if (scope !== 'all') {
      setTab(scope);
    }
  }, []);

  useEffect(() => {
    // Core document layouts configuration updates
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    localStorage.setItem('sierra_admin_theme', theme);
    localStorage.setItem('sierra_admin_lang', langKey);
  }, [theme, langKey, isAr]);

  useEffect(() => {
    localStorage.setItem('sierra_admin_tab', tab);
    setSearchQuery(''); // Reset search input on navigation change
    if (['leads', 'listings', 'agents', 'workflows'].includes(tab)) {
      setSearchScope(tab as any);
    } else {
      setSearchScope('all');
    }
  }, [tab]);

  // Voice command delay, visual countdown and cancellation handling
  useEffect(() => {
    if (!pendingVoiceTranscript) return;

    setVoiceCountdown(2);

    const interval = setInterval(() => {
      setVoiceCountdown((prev) => {
        if (prev <= 1) {
          localStorage.setItem('sierra_voice_search_pending', 'true');
          setSearchQuery(pendingVoiceTranscript);
          setPendingVoiceTranscript(null);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingVoiceTranscript]);

  // Synchronize debounced searches into Firestore as analytical logs
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) return;
    const qRaw = searchQuery.trim();
    if (qRaw.length < 2) return; // Skip extremely short partial typings
    
    // De-duplicate immediately identical sequential search queries
    const lastSearch = localStorage.getItem('sierra_last_logged_search');
    if (lastSearch === qRaw) return;

    const isVoice = localStorage.getItem('sierra_voice_search_pending') === 'true';

    const timer = setTimeout(async () => {
      try {
        await addDoc(collection(db, 'searches'), {
          query: qRaw.substring(0, 200),
          scope: searchScope,
          timestamp: new Date(),
          userId: currentUser?.uid || 'anonymous',
          isVoice: isVoice
        });
        localStorage.removeItem('sierra_voice_search_pending');
        localStorage.setItem('sierra_last_logged_search', qRaw);
      } catch (err) {
        console.error('Failed to log search telemetry:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchScope, currentUser]);

  // Auth changes listener — admin status now comes from the backend's
  // users/{uid}.role check (verifyAdminRequest), not a local Firestore lookup.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        let passesAdminRule = false;
        
        // Hardcoded admin emails — case-insensitive match
        const adminEmails = ['a.fawzy8866@gmail.com', 'emeraldestatesegypt@gmail.com'];
        const userEmail = (user.email || '').toLowerCase().trim();
        if (userEmail && adminEmails.includes(userEmail)) {
          passesAdminRule = true;
        } else {
          // Fallback: call the backend verify endpoint
          try {
            const result = await api.get<{ isAdmin: boolean }>('/api/admin/auth/verify');
            passesAdminRule = !!result.isAdmin;
          } catch (e) {
            console.warn('Admin verification API unavailable, using email-only check:', e);
            // If the API is unreachable, rely solely on the email check above
          }
        }

        setIsAdminUser(passesAdminRule);

        if (passesAdminRule) {
          try {
            // Pre-seed clean Firebase indexes on absolute initial setup run
            await seedFirestore();
          } catch (seedErr) {
            console.warn("Seeding process skipped or failed:", seedErr);
          }
        } else {
          await createSierraNotification(
            'error',
            'Intrusion Warning: Access Denied',
            `Unauthorized login attempt from ${user.email || 'anonymous-user'}. Resource access blocked.`,
            'تحذير اختراق: تم رفض الدخول',
            `محاولة دخول غير مصرح بها من ${user.email || 'مجهول'}. تم حجب الوصول بنجاح.`
          );
        }
      } else {
        setIsAdminUser(false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const renderActiveProductPage = () => {
    // These tabs are heavily customized full-screen tools, they remain separate.
    if (tab === 'easyListing') return <EasyListingPage />;
    if (tab === 'whatsappSender') return <WhatsAppSenderPage isAr={isAr} />;
    if (tab === 'automation') return <AutomationToolsPage />;
    if (tab === 'dataSync') return <DataSyncHubPage />;
    if (tab === 'pageEditor') return <PageEditorPage T={T} isAr={isAr} />;
    if (tab === 'dbEditor') return <DBEditorPage T={T} isAr={isAr} />;
    if (tab === 'agents') return <AgentsPage T={T} searchQuery={searchQuery} />;

    // Operations section — ported from Admin A (Next.js) with real Firestore wiring
    if (tab === 'pipeline') return <PipelinePage T={T} isAr={isAr} />;
    if (tab === 'tasks') return <TasksPage T={T} isAr={isAr} />;
    if (tab === 'curator') return <CuratorPage T={T} />;
    if (tab === 'scribe') return <ScribePage T={T} />;
    if (tab === 'closer') return <Stage9CloserPage />;
    if (tab === 'commission') return <CommissionLedger />;
    if (tab === 'actionProtocols') return <ActionProtocols />;

    // Intelligence section — telemetry + reports + terminals (from Admin A)
    if (tab === 'nexus') return <NexusAIPage />;
    if (tab === 'openclaw') return <OpenClawPage />;
    if (tab === 'reports') return <ReportsPage T={T} isAr={isAr} />;
    if (tab === 'dedupe') return <DedupeReviewQueue />;
    if (tab === 'staleData') return <StaleDataMonitor />;

    // System section
    if (tab === 'auditLogs') return <AuditLogsPage isAr={isAr} T={T} />;
    if (tab === 'usersManager') return <UsersManagerPage isAr={isAr} T={T} />;
    if (tab === 'settings') return <SettingsPage T={T} isAr={isAr} currentUser={currentUser} />;

    // All core operations (Overview, Leads, Listings, Bots, Workflows, Search Insights, Followups)
    // are now unified into the MegaDashboard. The Sidebar will handle scrolling to them.
    return <MegaDashboard T={T} isAr={isAr} searchQuery={searchQuery} />;
  };

  // NAV_ITEMS is now a static array (Lucide icons + bilingual labels baked in)
  const activeItem = NAV_ITEMS.find((n) => n.id === tab);
  const activeTitle = activeItem
    ? (langKey === 'ar' ? activeItem.labelAr : activeItem.label)
    : (langKey === 'ar' ? 'لوحة سييرا إستيتس' : 'Sierra Estates Console');

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#05080f] text-white">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/15 border-t-cyan-500 animate-spin mb-4" />
        <p className="font-mono text-xs tracking-widest text-slate-500 select-none uppercase">Booting SIERRA OS...</p>
      </div>
    );
  }

  // Admin Portal View
  const AdminPortal = () => {
    if (!currentUser || !isAdminUser) {
      return (
        <LoginPage
          onLoginSuccess={() => setTab('overview')}
          isAdminUser={isAdminUser}
          currentUser={currentUser}
          loading={loading}
        />
      );
    }

    return (
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-300">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          tab={tab}
          setTab={setTab}
          langKey={langKey}
          setLangKey={setLangKey}
          theme={theme}
          setTheme={setTheme}
          T={T}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        
        {/* Mobile overlay */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        
        <div className="flex-1 flex flex-col min-w-0" style={{ zIndex: 10 }}>
          {/* Header — refined, professional, no emojis */}
          <header className="h-14 border-b border-slate-200 dark:border-slate-800/50 bg-white/90 dark:bg-[#030712]/80 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 transition-all z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Active page title + breadcrumb-style subtitle */}
              <div className="flex items-baseline gap-2.5 min-w-0">
                <h1 className="font-semibold text-[15px] tracking-tight text-slate-900 dark:text-white select-none truncate">
                  {activeTitle}
                </h1>
                <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-600 font-medium uppercase tracking-wider">
                  {langKey === 'ar' ? 'سييرا إستيتس' : 'Sierra Estates'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <AdminHealthMonitor />
              <GlobalProgressTracker />

              {/* Voice command — subtle, no glow */}
              <button
                onClick={toggleVoiceSearch}
                className={`relative p-2 rounded-md border transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500/10 border-red-500/40 text-red-500'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={T('voiceSearch')}
                aria-label={T('voiceSearch')}
              >
                <Mic className="w-4 h-4" strokeWidth={1.75} />
              </button>

              {/* Global search — refined input */}
              <form
                onSubmit={(e) => e.preventDefault()}
                className="relative hidden sm:flex items-center group"
              >
                <Search
                  className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-600 dark:group-focus-within:text-slate-300 transition-colors pointer-events-none"
                  strokeWidth={1.75}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={pendingVoiceTranscript ? T('listening') : (langKey === 'ar' ? 'بحث...' : 'Search...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-56 lg:w-64 bg-slate-100 dark:bg-slate-900 border rounded-md py-1.5 pl-8 pr-12 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 ${
                    pendingVoiceTranscript ? 'border-cyan-500/40' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
                <kbd className="absolute right-2 text-[10px] font-mono text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 select-none">
                  ⌘K
                </kbd>

                {speechError && (
                  <div className="absolute top-11 right-0 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-[11px] px-2.5 py-1.5 rounded-md shadow-sm whitespace-nowrap z-50">
                    {speechError}
                  </div>
                )}
                {pendingVoiceTranscript && voiceCountdown > 0 && (
                  <div className="absolute top-11 right-0 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] px-2.5 py-1.5 rounded-md shadow-sm whitespace-nowrap z-50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    {voiceCountdown}s
                  </div>
                )}

                {searchQuery && !pendingVoiceTranscript && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-9 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    aria-label="Clear"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </form>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar bg-slate-50 dark:bg-[#030712]">
            <AnimatePresence mode="wait">
              <motion.div
                key={['overview', 'leads', 'listings', 'bots', 'workflows', 'searchInsights', 'followups'].includes(tab) ? 'mega-dashboard' : tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="h-full w-full mx-auto max-w-7xl"
              >
                {renderActiveProductPage()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    );
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<AdminPortal />} />
      </Routes>
      <SpeedInsights />
    </>
  );
}
