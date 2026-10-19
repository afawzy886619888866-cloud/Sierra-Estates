/**
 * Admin Portal — static data constants extracted from AdminPortal.tsx
 * These are the designer's placeholder data. Wire them to Firestore/API incrementally.
 */

export type TranslationFn = (key: string) => string;

export const LANG: Record<string, Record<string, string>> = {
  en: {
    brand:'SIERRA ESTATES 3.0', brandSub:'INTELLIGENCE OS',
    overview:'Intelligence OS', agents:'Agents & Bots', workflows:'Workflows',
    workflow_studio:'Workflow Studio', inventory_command:'Inventory Command',
    inventree_hub:'InvenTree Hub & RAG',
    workflow_ops:'Workflow Ops',
    inventory_os:'Inventory OS',
    openclaw:'OpenClaw Terminal', nexus:'Nexus-AI Telemetry', leads:'CRM · Leads',
    access_approvals:'Access Approvals',
    listings:'Listings Hub', curator:'The Curator', scribe:'The Scribe',
    closer:'Stage-9 Closer', reports:'Reports', intelligence:'Fleet Intelligence', settings:'System Config',
    main:'Main', operations:'Operations', analytics:'Analytics', system:'System',
    collapse:'Collapse', livesite:'Live Site', theme:'Theme', lang:'Language',
    addLead:'+ Add Lead', exportCSV:'Export CSV', importCSV:'Import CSV',
    search:'Search…', totalListings:'Total Listings', activeLeads:'Active Leads',
    avgDeal:'Avg Deal Value', dealsClosed:'Deals Closed', avgResponse:'Weighted Forecast',
    aiMatch:'AI Match Rate', pending:'Pending Reviews', eliteBrokers:'Elite Brokers',
    pipelineTitle:'Pipeline · S1→S10', hotLeads:'🔥 Hot Leads', agentStatus:'Agent Status',
    viewingScheduled:'Viewing Scheduled', aiMatched:'AI Matched', contractDraft:'Contract Draft',
    initialContact:'Initial Contact', negotiating:'Negotiating', online:'Online',
    running:'Running', idle:'Idle', load:'Load', totalTasks:'Total tasks',
    config:'Config', logs:'Logs', restart:'Restart', sendMsg:'Send',
    curator_title:'The Curator · S3–S5 Inventory & Valuation',
    scribe_title:'The Scribe · S1–S2 Raw Ingestion Parser',
    avm:'AVM Engine', priceAdj:'Price Adjustment', qualityScore:'Quality Score',
    rawInput:'Raw Listing Input (WhatsApp / Property Finder text)',
    parsedOutput:'Parsed & Structured Output', parseBtn:'Parse with AI',
    compound:'Compound', type:'Type', area:'Area', price:'Price', beds:'Beds',
    status:'Status', phone:'Phone', interest:'Interest', stage:'Stage', actions:'Actions',
    client:'Client', view:'View', whatsapp:'WhatsApp', source:'Source', allSources:'All Sources',
    monthlyDeals:'📊 Monthly Deals Closed', revPipeline:'💰 Revenue Pipeline',
    perfByCompound:'🗺️ Performance by Compound',
    excelMerger:'Excel Merger', processor:'Real Estate Processor',
    all_apps:'All Apps Hub', deployment:'Deployment CI/CD', api_gateway:'API Gateway',
    memory_brain:'Memory Brain & DeepSeek',
    cairo_plaza:'Cairo Plaza Media Hub',
    saveConfig:'Save Configuration', saved:'✓ Saved!', githubIntegration:'🔗 GitHub Integration',
    pullLatest:'Pull Latest', openRepo:'Open Repo', pushChanges:'Push Changes',
  },
  ar: {
    brand:'سييرا إستيتس 3.0', brandSub:'نظام الذكاء العقاري',
    overview:'لوحة التحكم', agents:'الوكلاء والبوتات', workflows:'سير العمل',
    workflow_studio:'استوديو سير العمل', inventory_command:'مركز المخزون الموحد',
    inventree_hub:'نظام إنفنتري والذاكرة المركزية',
    workflow_ops:'تشغيل سير العمل',
    inventory_os:'نظام المخزون OS',
    openclaw:'طرفية أوبن كلو', nexus:'نيكسوس · البث المباشر', leads:'إدارة العملاء والمهتمين',
    access_approvals:'طلبات الوصول',
    listings:'قاعدة العقارات', curator:'المنظم · Curate', scribe:'الكاتب · Scribe',
    closer:'المغلق · المرحلة 9', reports:'التقارير التحليلية', intelligence:'ذكاء أسطول الوكلاء', settings:'الإعدادات',
    memory_brain:'الذاكرة المركزية وDeepSeek',
    main:'رئيسي', operations:'العمليات', analytics:'التحليلات', system:'النظام',
    collapse:'طي القائمة', livesite:'الموقع المباشر', theme:'المظهر', lang:'اللغة',
    addLead:'+ إضافة عميل', exportCSV:'تصدير CSV', importCSV:'استيراد CSV',
    search:'بحث…', totalListings:'إجمالي الوحدات', activeLeads:'العملاء المهتمين',
    avgDeal:'متوسط قيمة الصفقة', dealsClosed:'الصفقات المغلقة', avgResponse:'التوقع المرجّح',
    aiMatch:'دقة المطابقة الذكية', pending:'قيد المراجعة', eliteBrokers:'الوسطاء المعتمدون',
    pipelineTitle:'مراحل الصفقات · S1→S10', hotLeads:'🔥 العملاء الأكثر جاهزية', agentStatus:'حالة الوكلاء',
    viewingScheduled:'معاينة مجدولة', aiMatched:'مطابقة ذكية بالـ AI', contractDraft:'مسودة عقد',
    initialContact:'تواصل أولي', negotiating:'مرحلة التفاوض', online:'متصل',
    running:'يعمل', idle:'خامل', load:'الحمل', totalTasks:'المهام الكلية',
    config:'إعداد', logs:'السجلات', restart:'إعادة تشغيل', sendMsg:'إرسال',
    curator_title:'المنظم · المراحل S3–S5 · المخزون والتقييم',
    scribe_title:'الكاتب · المراحل S1–S2 · محلل الإدخال الخام',
    avm:'محرك التقييم العقاري (AVM)', priceAdj:'تعديل السعر', qualityScore:'نقاط جودة العقار',
    rawInput:'إدخال وحدات خام (واتساب / بروبرتي فايندر)',
    parsedOutput:'المخرجات المنظمة', parseBtn:'تحليل بالذكاء الاصطناعي',
    compound:'الكمبوند / المنطقة', type:'نوع العقار', area:'المساحة', price:'السعر', beds:'غرف النوم',
    status:'الحالة', phone:'الهاتف', interest:'الاهتمام', stage:'المرحلة', actions:'الإجراءات',
    client:'العميل', view:'عرض', whatsapp:'واتساب', source:'المصدر', allSources:'كل المصادر',
    monthlyDeals:'📊 الصفقات الشهرية المغلقة', revPipeline:'💰 قيمة خط الصفقات المتوقع',
    perfByCompound:'🗺️ الأداء حسب الكمبوند',
    excelMerger:'دمج ملفات الإكسل', processor:'معالج بيانات العقارات',
    all_apps:'دليل التطبيقات المتكامل', deployment:'خطوط النشر CI/CD', api_gateway:'بوابة الـ API',
    cairo_plaza:'مشروع كايرو بلازا التجاري',
    saveConfig:'حفظ الإعدادات', saved:'✓ تم الحفظ!', githubIntegration:'🔗 تكامل GitHub',
    pullLatest:'سحب آخر التحديثات', openRepo:'فتح المستودع', pushChanges:'رفع التغييرات',
  }
};

export const KPI_DATA = (T: TranslationFn) => [
  // ANTI-FABRICATION: placeholder values are honest "no data" markers. Real
  // values are merged in by OverviewPage from /api/admin/dashboard when live.
  {val:'—',lbl:T('totalListings'),delta:'Awaiting dashboard sync',up:null,color:'#C8961A',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('activeLeads'),delta:'Awaiting dashboard sync',up:null,color:'#1E88D9',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('avgDeal'),delta:'Awaiting dashboard sync',up:null,color:'#34D399',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('dealsClosed'),delta:'Awaiting dashboard sync',up:null,color:'#7C3AED',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('avgResponse'),delta:'Awaiting dashboard sync',up:null,color:'#C8961A',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('aiMatch'),delta:'Awaiting dashboard sync',up:null,color:'#34D399',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('pending'),delta:'Awaiting dashboard sync',up:null,color:'#E63946',spark:[0,0,0,0,0,0,0]},
  {val:'—',lbl:T('eliteBrokers'),delta:'Awaiting dashboard sync',up:null,color:'#E9C176',spark:[0,0,0,0,0,0,0]},
];
// NOTE on KPI_DATA labels: the fifth card historically read "Avg Response",
// but no message/response timestamps exist anywhere in the live schema to
// compute such a figure — so it was rewired to the "Weighted Forecast"
// (Σ deal_value × closing_probability over open public.deals rows), a real
// pipeline metric served by /api/admin/dashboard → crmPipeline.

export const AGENTS_DATA = (T: TranslationFn) => [
  {name:'Sierra Bot',desc:T('lang')==='ar'?'الوكيل الرئيسي للذكاء الاصطناعي — يتعامل مع استفسارات العملاء':'Primary AI concierge — handles client queries & property recommendations.',emoji:'🤖',color:'#C8961A',status:'Online',load:94,tasks:1203},
  {name:'Leila / Lola',desc:T('lang')==='ar'?'متخصصة عربية ثنائية اللغة — ترجمة وتفاوض':'Bilingual Arabic specialist — translates listings & handles Gulf negotiations.',emoji:'🐪',color:'#1E88D9',status:'Online',load:87,tasks:889},
  {name:'Stage-9 Closer',desc:T('lang')==='ar'?'محرك الصفقات الآلي — عقود ومدفوعات':'Automated deal engine — drafts contracts, DocuSign, Stripe deposits.',emoji:'💼',color:'#34D399',status:'Online',load:71,tasks:421},
  {name:'Vertex Omni',desc:T('lang')==='ar'?'فحص جودة وتصنيف الصور بالذكاء الاصطناعي':'Computer vision radar — analyzes room tags, photos and image resolution.',emoji:'📷',color:'#EC4899',status:'Online',load:72,tasks:2450},
  {name:'PF Syndicator',desc:T('lang')==='ar'?'مزامنة قنوات بروبرتي فايندر واستقبال العملاء':'Portal feed sync engine — rapid lead ingestion & Property Finder sync in <45s.',emoji:'🏢',color:'#8B5CF6',status:'Online',load:82,tasks:5200},
  {name:'WhatsApp Scraper',desc:T('lang')==='ar'?'يرصد مجموعات واتساب وبروبيرتي فايندر':'Monitors Property Finder, OLX & WhatsApp groups.',emoji:'🕵️',color:'#7C3AED',status:'Running',load:55,tasks:2847},
  {name:'The Curator',desc:T('lang')==='ar'?'إدارة المخزون S3-S5 — تسعير وتقييم':'S3-S5 inventory management — deduplication, quality scoring & AVM pricing.',emoji:'🎨',color:'#E9C176',status:'Online',load:68,tasks:3102},
  {name:'The Scribe',desc:T('lang')==='ar'?'خط استيعاب S1-S2 — يحلل بيانات القوائم الخام':'S1-S2 ingestion — parses raw listing data & normalizes to Sierra schema.',emoji:'✍️',color:'#E63946',status:'Idle',load:45,tasks:4821},
  {name:'Market Insights',desc:T('lang')==='ar'?'تحليلات سيولة السوق وعوائد الاستثمار':'DeepSeek AVM market liquidity, investor briefs and compound rental yields.',emoji:'📈',color:'#10B981',status:'Online',load:58,tasks:1850},
  {name:'Sierra Ops',desc:T('lang')==='ar'?'عمليات النشر والبنية التحتية والمراقبة':'CI/CD pipeline, Vercel deployments, Sentry logs and fleet self-healing.',emoji:'🚀',color:'#6366F1',status:'Ready',load:30,tasks:980},
];

export const WORKFLOWS_DATA = [
  {name:'Lead Ingestion → Firestore',status:'active',runs:12840,last:'2 min ago',color:'#34D399'},
  {name:'WhatsApp Scraper Cron (30m)',status:'active',runs:6420,last:'28 min ago',color:'#34D399'},
  {name:'Listing Price AVM Sync',status:'active',runs:3210,last:'1 hr ago',color:'#34D399'},
  {name:'Stage-9 Contract Generator',status:'active',runs:421,last:'15 min ago',color:'#34D399'},
  {name:'Broker KPI Report (Daily)',status:'active',runs:186,last:'6 hrs ago',color:'#1E88D9'},
  {name:'Stale Listing Monitor',status:'warning',runs:890,last:'2 hrs ago',color:'#f59e0b'},
  {name:'Email Follow-Up Sequence',status:'paused',runs:1240,last:'1 day ago',color:'#E63946'},
  {name:'Telegram Alert Dispatcher',status:'active',runs:5640,last:'4 min ago',color:'#34D399'},
];

// ANTI-FABRICATION (Master Rule 5): fabricated demo leads with fake PII were
// previously rendered whenever the leads API failed. The CRM now shows an
// honest empty/loading state instead. Real leads come from /api/admin/leads.
export const LEADS_DATA: any[] = [];

export const COMPOUNDS_DATA: Record<string, {units:number; avgM:string; growth:string; zone:string; ai:number; color:string}> = {
  'Mountain View iCity':{units:1820,avgM:'EGP 11.2M',growth:'+24%',zone:'5th Settlement',ai:9.6,color:'#C8961A'},
  'Hyde Park':{units:2100,avgM:'EGP 18.5M',growth:'+22%',zone:'5th Settlement',ai:9.8,color:'#1E88D9'},
  'Mivida':{units:2400,avgM:'EGP 5.8M',growth:'+18%',zone:'5th Settlement',ai:9.1,color:'#34D399'},
  'Uptown Cairo':{units:3200,avgM:'EGP 9.4M',growth:'+31%',zone:'Uptown',ai:9.4,color:'#7C3AED'},
  'Madinaty':{units:8500,avgM:'EGP 4.5M',growth:'+15%',zone:'Madinaty',ai:8.8,color:'#E63946'},
  'Eastown':{units:1600,avgM:'EGP 8.2M',growth:'+19%',zone:'5th Settlement',ai:9.0,color:'#E9C176'},
  'Villette':{units:880,avgM:'EGP 9.8M',growth:'+20%',zone:'5th Settlement',ai:9.3,color:'#C8961A'},
  'Palm Hills NC':{units:1200,avgM:'EGP 12.4M',growth:'+21%',zone:'5th Settlement',ai:9.2,color:'#1E88D9'},
};

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  section: string;
  badge?: string;
  badgeCls?: string;
}

export const NAV_ITEMS = (T: TranslationFn, role?: unknown): NavItem[] => {
  const isPartner = typeof role === 'string' && role.trim().toLowerCase() === 'partner';
  const isAr = T('lang') === 'ar';

  if (isPartner) {
    return [
      { id: 'inventory_os', label: isAr ? 'المخزون العقاري المخصص' : 'Scoped Inventory OS', icon: '🏛️', section: isAr ? 'العمليات' : 'Operations', badge: 'v2', badgeCls: 'nb-green' },
      { id: 'listings', label: isAr ? 'قاعدة العقارات والاستوديو' : 'Listings & Studio', icon: '🏘️', section: isAr ? 'العمليات' : 'Operations' },
      { id: 'leads', label: isAr ? 'إدارة العملاء المهتمين' : 'Leads CRM', icon: '👥', section: isAr ? 'العمليات' : 'Operations', badge: 'Active', badgeCls: 'nb-red' },
    ];
  }

  return [
    // 1. Executive Suite (Main command KPIs, revenue pipeline, deals closed, performance)
    {
      id: 'overview',
      label: isAr ? 'القيادة والتحليلات العليا' : 'Executive Suite',
      icon: '🏛️',
      section: isAr ? 'القيادة التنفيذية' : 'Executive Command',
      badge: 'KPIs',
      badgeCls: 'nb-gold',
    },
    // 2. Unified Inventory OS (All Master Units: Rent & Resale, Direct Owners & Brokers, Account Managers, Studio, Excel Sync, 3D Map)
    {
      id: 'inventory_command',
      label: isAr ? 'منظومة المخزون الموحد' : 'Unified Inventory OS',
      icon: '🏢',
      section: isAr ? 'العمليات العقارية' : 'Core Real Estate',
      badge: '21.3k',
      badgeCls: 'nb-green',
    },
    // 3. Sales, CRM & Viewing Ops (Leads, Pipeline S1-S10, Tasks, Viewings & Feedback, Stage-9 Closer, Contracts)
    {
      id: 'leads',
      label: isAr ? 'العملاء والمعاينات والصفقات' : 'Sales, CRM & Viewings',
      icon: '💼',
      section: isAr ? 'العمليات العقارية' : 'Core Real Estate',
      badge: 'Pipeline',
      badgeCls: 'nb-blue',
    },
    // 3b. Deals Pipeline — the live kanban on public.deals (GET/PATCH
    // /api/admin/deals). Previously this board hid inside the app-switcher
    // flyout; the sales team gets a first-class sidebar slot. Permission-gated
    // by NAV_REQUIRED_PERMISSIONS.pipeline = ['leads:read:all'].
    {
      id: 'pipeline',
      label: isAr ? 'مراحل الصفقات (لوحة مباشرة)' : 'Deals Pipeline',
      icon: '📋',
      section: isAr ? 'العمليات العقارية' : 'Core Real Estate',
      badge: 'Live',
      badgeCls: 'nb-green',
    },
    // 4. WhatsApp Command & Outreach (Multi-Host Runner, 24h Scheduler, Chat Harvester)
    {
      id: 'whatsapp_outreach',
      label: isAr ? 'غرفة عمليات الواتساب' : 'WhatsApp Operations',
      icon: '💬',
      section: isAr ? 'المراسلات والتسويق' : 'Outreach & Comms',
      badge: 'Multi-Host',
      badgeCls: 'nb-green',
    },
    // 5. AI Intelligence Hub (Autonomous Fleet, Workflows & Studio, Memory Brain, DeepSeek, NotebookLM)
    {
      id: 'intelligence',
      label: isAr ? 'أسطول الذكاء الاصطناعي' : 'AI Intelligence Hub',
      icon: '🧠',
      section: isAr ? 'الذكاء والأسطول' : 'AI Fleet & Insights',
      badge: '10 Agents',
      badgeCls: 'nb-gold',
    },
    // 6. Platform Administration & Governance (Roles & RBAC, Health, Security, Deployment CI/CD, API)
    {
      id: 'settings',
      label: isAr ? 'إدارة النظام والحوكمة' : 'Platform & Governance',
      icon: '🛡️',
      section: isAr ? 'الحوكمة والإدارة' : 'Platform Governance',
      badge: 'RBAC',
      badgeCls: 'nb-green',
    },
    // 7. Access Approvals Queue (Superadmin-only gated queue for elevated role and access requests)
    {
      id: 'access_approvals',
      label: isAr ? 'طلبات وترقيات الوصول' : 'Access Approvals',
      icon: '✅',
      section: isAr ? 'الحوكمة والإدارة' : 'Platform Governance',
      badge: 'P7',
      badgeCls: 'nb-red',
    },
  ];
};

export const OPENCLAW_LOGS = [
  {t:'dim',l:'OpenClaw v3.2.1 · Sierra Estates Intelligence OS'},
  {t:'dim',l:'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'},
  {t:'green',l:'[✓] Supabase Auth connection established'},
  {t:'green',l:'[✓] Supabase RLS policies validated — 4 collections active'},
  {t:'green',l:'[✓] Sierra Bot online — 1,203 sessions this month'},
  {t:'green',l:'[✓] Leila/Lola agent — Arabic routing active'},
  {t:'green',l:'[✓] Stage-9 Closer — 97 deals processed this month'},
  {t:'green',l:'[✓] Vertex Omni — 2,450 photos verified & room tagged'},
  {t:'green',l:'[✓] Property Finder Syndicator — feeds live (<45s lead ingestion)'},
  {t:'blue',l:'[~] WhatsApp Scraper — scanning Property Finder (ETA 2 min)'},
  {t:'blue',l:'[~] AVM Engine — pricing 23 new listings...'},
  {t:'',l:''},
  {t:'prompt',l:'sierra status --all-agents'},
  {t:'green',l:'  Sierra Bot      Online    94%     1,203'},
  {t:'green',l:'  Leila/Lola      Online    87%     889'},
  {t:'green',l:'  Stage-9 Closer  Online    71%     421'},
  {t:'green',l:'  Vertex Omni     Online    72%     2,450'},
  {t:'green',l:'  PF Syndicator   Online    82%     5,200'},
  {t:'green',l:'  Scraper         Running   55%     2,847'},
  {t:'green',l:'  The Curator     Online    68%     3,102'},
  {t:'blue',l:'  The Scribe      Idle      45%     4,821'},
  {t:'green',l:'  Market Insights Online    58%     1,850'},
  {t:'green',l:'  Sierra Ops      Ready     30%     980'},
  {t:'dim',l:'Last sync: 2026-06-07 · All systems nominal · 10/10 Agents Active'},
];

export interface NexusEntry {
  id: string;
  ts: string;
  src: string;
  raw: string;
  compound: string;
  type: string;
  code: string;
  status: string;
}

export const NEXUS_INIT: NexusEntry[] = [
  {id:'WA-0041',ts:'14:23:01',src:'Group: New Cairo Properties',raw:'شقة 3 غرف ميفيدا · دور 3 · 95م² · 14,500/شهر',compound:'Mivida',type:'Apartment',code:'SE-MVD-APT-0041-2026',status:'parsed'},
  {id:'WA-0040',ts:'14:19:44',src:'PropertyFinder Monitor',raw:'Villa Hyde Park · 5+1 BHK · 450m² · private pool · EGP 35M',compound:'Hyde Park',type:'Villa',code:'SE-HYP-VLA-0040-2026',status:'parsed'},
  {id:'WA-0039',ts:'14:17:12',src:'OLX Scraper',raw:'Penthouse Uptown Cairo · 320m · 4bed+maid · lake view · EGP 18.5M',compound:'Uptown Cairo',type:'Penthouse',code:'SE-UPC-PTH-0039-2026',status:'parsed'},
  {id:'WA-0038',ts:'14:14:55',src:'Group: Cairo Rentals',raw:'توين هاوس ماونتن فيو · 240م · 4 غرف · 28,000/شهر',compound:'Mountain View iCity',type:'Twin House',code:'SE-MVI-TWH-0038-2026',status:'processing'},
  {id:'WA-0037',ts:'14:11:03',src:'Telegram: MadinatyGroups',raw:'Apartment Madinaty B10 · 165m · 3bed · EGP 4.2M · owner direct',compound:'Madinaty',type:'Apartment',code:'SE-MDN-APT-0037-2026',status:'parsed'},
];
