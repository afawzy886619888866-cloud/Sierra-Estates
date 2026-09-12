/**
 * Admin Portal — static data constants extracted from AdminPortal.tsx
 * These are the designer's placeholder data. Wire them to Firestore/API incrementally.
 */

export type TranslationFn = (key: string) => string;

export const LANG: Record<string, Record<string, string>> = {
  en: {
    brand:'SIERRA ESTATES 3.0', brandSub:'INTELLIGENCE OS',
    overview:'Intelligence OS', agents:'Agents & Bots', workflows:'Workflows',
    openclaw:'OpenClaw Terminal', nexus:'Nexus-AI Telemetry', leads:'CRM · Leads',
    listings:'Listings Hub', curator:'The Curator', scribe:'The Scribe',
    closer:'Stage-9 Closer', reports:'Reports', intelligence:'Fleet Intelligence', settings:'System Config',
    main:'Main', operations:'Operations', analytics:'Analytics', system:'System',
    collapse:'Collapse', livesite:'Live Site', theme:'Theme', lang:'Language',
    addLead:'+ Add Lead', exportCSV:'Export CSV', importCSV:'Import CSV',
    search:'Search…', totalListings:'Total Listings', activeLeads:'Active Leads',
    avgDeal:'Avg Deal Value', dealsClosed:'Deals Closed', avgResponse:'Avg Response',
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
    saveConfig:'Save Configuration', saved:'✓ Saved!', githubIntegration:'🔗 GitHub Integration',
    pullLatest:'Pull Latest', openRepo:'Open Repo', pushChanges:'Push Changes',
  },
  ar: {
    brand:'سيير ايستيتس 3.0', brandSub:'نظام الذكاء',
    overview:'لوحة التحكم', agents:'الوكلاء والبوتات', workflows:'سير العمل',
    openclaw:'طرفية أوبن كلو', nexus:'نيكسوس · البث المباشر', leads:'إدارة العملاء',
    listings:'قاعدة العقارات', curator:'المنظم', scribe:'الكاتب',
    closer:'المغلق · المرحلة 9', reports:'التقارير', intelligence:'ذكاء أسطول الوكلاء', settings:'الإعدادات',
    main:'رئيسي', operations:'العمليات', analytics:'التحليلات', system:'النظام',
    collapse:'طي', livesite:'الموقع المباشر', theme:'المظهر', lang:'اللغة',
    addLead:'+ إضافة عميل', exportCSV:'تصدير CSV', importCSV:'استيراد CSV',
    search:'بحث…', totalListings:'إجمالي العقارات', activeLeads:'العملاء النشطين',
    avgDeal:'متوسط قيمة الصفقة', dealsClosed:'الصفقات المغلقة', avgResponse:'متوسط الاستجابة',
    aiMatch:'دقة الذكاء الاصطناعي', pending:'قيد المراجعة', eliteBrokers:'الوسطاء المميزون',
    pipelineTitle:'خط الأنابيب · S1→S10', hotLeads:'🔥 العملاء الساخنون', agentStatus:'حالة الوكلاء',
    viewingScheduled:'معاينة مجدولة', aiMatched:'مطابقة AI', contractDraft:'مسودة عقد',
    initialContact:'تواصل أولي', negotiating:'تفاوض', online:'متصل',
    running:'يعمل', idle:'خامل', load:'الحمل', totalTasks:'المهام الكلية',
    config:'إعداد', logs:'السجلات', restart:'إعادة تشغيل', sendMsg:'إرسال',
    curator_title:'المنظم · المراحل S3–S5 · المخزون والتقييم',
    scribe_title:'الكاتب · المراحل S1–S2 · محلل الإدخال الخام',
    avm:'محرك التقييم', priceAdj:'تعديل السعر', qualityScore:'نقاط الجودة',
    rawInput:'إدخال قوائم خام (واتساب / بروبيرتي فايندر)',
    parsedOutput:'المخرجات المنظمة', parseBtn:'تحليل بالذكاء الاصطناعي',
    compound:'المجمع', type:'النوع', area:'المساحة', price:'السعر', beds:'غرف',
    status:'الحالة', phone:'الهاتف', interest:'الاهتمام', stage:'المرحلة', actions:'الإجراءات',
    client:'العميل', view:'عرض', whatsapp:'واتساب', source:'المصدر', allSources:'كل المصادر',
    monthlyDeals:'📊 الصفقات الشهرية', revPipeline:'💰 خط الإيرادات',
    perfByCompound:'🗺️ الأداء حسب المجمع',
    excelMerger:'دمج الإكسل', processor:'معالج العقارات',
    all_apps:'دليل التطبيقات', deployment:'خطوط النشر', api_gateway:'بوابة الـ API',
    saveConfig:'حفظ الإعدادات', saved:'✓ تم الحفظ!', githubIntegration:'🔗 تكامل GitHub',
    pullLatest:'سحب آخر التحديثات', openRepo:'فتح المستودع', pushChanges:'رفع التغييرات',
  }
};

export const KPI_DATA = (T: TranslationFn) => [
  {val:'1,547',lbl:T('totalListings'),delta:'+12% this week',up:true,color:'#00AEFF',spark:[42,55,48,70,62,85,95]},
  {val:'284',lbl:T('activeLeads'),delta:'+8 today',up:true,color:'#1E88D9',spark:[30,45,38,55,48,70,80]},
  {val:'EGP 6.2M',lbl:T('avgDeal'),delta:'+5% MoM',up:true,color:'#34D399',spark:[55,60,52,68,65,78,88]},
  {val:'97',lbl:T('dealsClosed'),delta:'This month',up:true,color:'#7C3AED',spark:[20,35,28,48,42,65,75]},
  {val:'4.1s',lbl:T('avgResponse'),delta:'-0.3s improved',up:true,color:'#00AEFF',spark:[70,65,60,55,50,45,40]},
  {val:'98.2%',lbl:T('aiMatch'),delta:'+0.4%',up:true,color:'#34D399',spark:[90,92,91,95,93,97,98]},
  {val:'23',lbl:T('pending'),delta:'3 urgent',up:false,color:'#E63946',spark:[10,18,12,22,17,25,23]},
  {val:'1,503',lbl:T('eliteBrokers'),delta:'+45 this month',up:true,color:'#5FC9FF',spark:[60,70,68,80,75,90,95]},
];

export const AGENTS_DATA = (T: TranslationFn) => [
  {name:'Sierra Bot',desc:T('lang')==='ar'?'الوكيل الرئيسي للذكاء الاصطناعي — يتعامل مع استفسارات العملاء':'Primary AI concierge — handles client queries & property recommendations.',emoji:'🤖',color:'#00AEFF',status:'Online',load:94,tasks:1203},
  {name:'Leila / Lola',desc:T('lang')==='ar'?'متخصصة عربية ثنائية اللغة — ترجمة وتفاوض':'Bilingual Arabic specialist — translates listings & handles Gulf negotiations.',emoji:'🐪',color:'#1E88D9',status:'Online',load:87,tasks:889},
  {name:'Stage-9 Closer',desc:T('lang')==='ar'?'محرك الصفقات الآلي — عقود ومدفوعات':'Automated deal engine — drafts contracts, DocuSign, Stripe deposits.',emoji:'💼',color:'#34D399',status:'Online',load:71,tasks:421},
  {name:'WhatsApp Scraper',desc:T('lang')==='ar'?'يرصد مجموعات واتساب وبروبيرتي فايندر':'Monitors Property Finder, OLX & WhatsApp groups.',emoji:'🕵️',color:'#7C3AED',status:'Running',load:55,tasks:2847},
  {name:'The Scribe',desc:T('lang')==='ar'?'خط استيعاب S1-S2 — يحلل بيانات القوائم الخام':'S1-S2 ingestion — parses raw listing data & normalizes to Sierra schema.',emoji:'✍️',color:'#E63946',status:'Idle',load:12,tasks:4821},
  {name:'The Curator',desc:T('lang')==='ar'?'إدارة المخزون S3-S5 — تسعير وتقييم':'S3-S5 inventory management — deduplication, quality scoring & AVM pricing.',emoji:'🎨',color:'#5FC9FF',status:'Online',load:68,tasks:3102},
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

export const LEADS_DATA = [
  {name:'Ahmed Al-Rashid',phone:'+20 100 111 2233',source:'property-finder',interest:'Villa · Hyde Park · EGP 20M+',stage:'Viewing Scheduled',color:'#00AEFF',hot:true},
  {name:'Sara Mohamed',phone:'+20 101 222 3344',source:'website',interest:'3-Bed · Mivida · Rent',stage:'AI Matched',color:'#1E88D9',hot:false},
  {name:'Khalid Mansour',phone:'+971 50 333 4455',source:'whatsapp',interest:'Penthouse · Uptown · EGP 15M',stage:'Contract Draft',color:'#34D399',hot:true},
  {name:'Nadia Hassan',phone:'+20 112 444 5566',source:'website',interest:'Apartment · Madinaty · EGP 5M',stage:'Initial Contact',color:'#7C3AED',hot:false},
  {name:'Omar Farouk',phone:'+20 100 555 6677',source:'referral',interest:'Twin House · Mountain View',stage:'Negotiating',color:'#E63946',hot:true},
  {name:'Layla Karim',phone:'+20 109 666 7788',source:'property-finder',interest:'Furnished 2-Bed · Eastown',stage:'AI Matched',color:'#5FC9FF',hot:false},
];

export const COMPOUNDS_DATA: Record<string, {units:number; avgM:string; growth:string; zone:string; ai:number; color:string}> = {
  'Mountain View iCity':{units:1820,avgM:'EGP 11.2M',growth:'+24%',zone:'5th Settlement',ai:9.6,color:'#00AEFF'},
  'Hyde Park':{units:2100,avgM:'EGP 18.5M',growth:'+22%',zone:'5th Settlement',ai:9.8,color:'#1E88D9'},
  'Mivida':{units:2400,avgM:'EGP 5.8M',growth:'+18%',zone:'5th Settlement',ai:9.1,color:'#34D399'},
  'Uptown Cairo':{units:3200,avgM:'EGP 9.4M',growth:'+31%',zone:'Uptown',ai:9.4,color:'#7C3AED'},
  'Madinaty':{units:8500,avgM:'EGP 4.5M',growth:'+15%',zone:'Madinaty',ai:8.8,color:'#E63946'},
  'Eastown':{units:1600,avgM:'EGP 8.2M',growth:'+19%',zone:'5th Settlement',ai:9.0,color:'#5FC9FF'},
  'Villette':{units:880,avgM:'EGP 9.8M',growth:'+20%',zone:'5th Settlement',ai:9.3,color:'#00AEFF'},
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

export const NAV_ITEMS = (T: TranslationFn): NavItem[] => [
  {id:'overview',label:T('overview'),icon:'🏠',section:T('main')},
  {id:'all_apps',label:T('all_apps'),icon:'✨',section:T('main'),badge:'APPS',badgeCls:'nb-green'},
  {id:'health',label:T('lang')==='ar'?'صحة النظام':'System Health',icon:'🩺',section:T('main'),badge:'OK',badgeCls:'nb-green'},
  {id:'monitoring',label:T('lang')==='ar'?'المراقبة المباشرة':'Live Monitoring',icon:'📡',section:T('main'),badge:'LIVE',badgeCls:'nb-blue'},
  {id:'recommendations',label:T('lang')==='ar'?'التوصيات الذكية':'Recommendations',icon:'✨',section:T('main'),badge:'AI',badgeCls:'nb-green'},
  {id:'alerts',label:T('lang')==='ar'?'التنبيهات':'Alerts',icon:'🔔',section:T('main'),badge:'2',badgeCls:'nb-red'},
  {id:'agents',label:T('agents'),icon:'🤖',section:T('main'),badge:'6',badgeCls:'nb-green'},
  {id:'workflows',label:T('workflows'),icon:'⚡',section:T('main'),badge:'8',badgeCls:'nb-blue'},
  {id:'automations',label:T('lang')==='ar'?'الأتمتة':'Automations',icon:'🪄',section:T('main'),badge:'3',badgeCls:'nb-green'},
  {id:'openclaw',label:T('openclaw'),icon:'⚙️',section:T('main')},
  {id:'nexus',label:T('nexus'),icon:'📡',section:T('main'),badge:'LIVE',badgeCls:'nb-green'},
  {id:'leads',label:T('leads'),icon:'👥',section:T('operations'),badge:'23',badgeCls:'nb-red'},
  {id:'pipeline',label:T('lang')==='ar'?'الصفقات':'Pipeline',icon:'💼',section:T('operations')},
  {id:'tasks',label:T('lang')==='ar'?'المهام':'Tasks',icon:'✅',section:T('operations'),badge:'5',badgeCls:'nb-blue'},
  {id:'listings',label:T('listings'),icon:'🏘️',section:T('operations')},
  {id:'whatsapp_outreach',label:T('lang')==='ar'?'مرسل الواتساب':'WhatsApp Sender',icon:'💬',section:T('operations'),badge:'PRO',badgeCls:'nb-green'},
  {id:'excel_merger',label:T('excelMerger'),icon:'🗂️',section:T('operations'),badge:'NEW',badgeCls:'nb-green'},
  {id:'real_estate_processor',label:T('processor'),icon:'🏘️',section:T('operations'),badge:'SKILL',badgeCls:'nb-blue'},
  {id:'curator',label:T('curator'),icon:'🎨',section:T('operations')},
  {id:'scribe',label:T('scribe'),icon:'✍️',section:T('operations')},
  {id:'closer',label:T('closer'),icon:'💼',section:T('operations')},
  {id:'roles',label:T('lang')==='ar'?'الصلاحيات':'Role Manager',icon:'🛡️',section:T('system')},
  {id:'security',label:T('lang')==='ar'?'الأمان والتدقيق':'Security & Audit',icon:'🔒',section:T('system')},
  {id:'deployment',label:T('deployment'),icon:'🚀',section:T('system'),badge:'CI/CD',badgeCls:'nb-green'},
  {id:'api_gateway',label:T('api_gateway'),icon:'🌐',section:T('system'),badge:'REST',badgeCls:'nb-blue'},
  {id:'deep_insights',label:T('lang')==='ar'?'الرؤى العميقة':'Deep Insights',icon:'📈',section:T('analytics')},
  {id:'reports',label:T('reports'),icon:'📊',section:T('analytics')},
  {id:'intelligence',label:T('intelligence'),icon:'🧠',section:T('analytics'),badge:'AI',badgeCls:'nb-green'},
  {id:'notebookllm',label:T('lang')==='ar'?'NotebookLM Studio':'NotebookLM Studio',icon:'🎙️',section:T('analytics'),badge:'AI',badgeCls:'nb-green'},
  {id:'contracts',label:T('lang')==='ar'?'العقود الإلكترونية':'Digital Contracts',icon:'📜',section:T('operations'),badge:'E-SIGN',badgeCls:'nb-green'},
  {id:'heatmap',label:T('lang')==='ar'?'خريطة العوائد':'Yield Heatmap',icon:'🗺️',section:T('analytics'),badge:'NEW',badgeCls:'nb-blue'},
  {id:'easy_listing',label:T('lang')==='ar'?'إنشاء قائمة':'Easy Listing Studio',icon:'🏷️',section:T('operations'),badge:'NEW',badgeCls:'nb-blue'},
  {id:'settings',label:T('settings'),icon:'🔧',section:T('system')},
];

export const OPENCLAW_LOGS = [
  {t:'dim',l:'OpenClaw v3.2.1 · Sierra Estates Intelligence OS'},
  {t:'dim',l:'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'},
  {t:'green',l:'[✓] Firebase Auth connection established'},
  {t:'green',l:'[✓] Firestore rules validated — 4 collections active'},
  {t:'green',l:'[✓] Sierra Bot online — 1,203 sessions this month'},
  {t:'green',l:'[✓] Leila/Lola agent — Arabic routing active'},
  {t:'green',l:'[✓] Stage-9 Closer — 97 deals processed this month'},
  {t:'blue',l:'[~] WhatsApp Scraper — scanning Property Finder (ETA 2 min)'},
  {t:'blue',l:'[~] AVM Engine — pricing 23 new listings...'},
  {t:'',l:''},
  {t:'prompt',l:'sierra status --all-agents'},
  {t:'green',l:'  Sierra Bot      Online    94%     1,203'},
  {t:'green',l:'  Leila/Lola      Online    87%     889'},
  {t:'green',l:'  Stage-9 Closer  Online    71%     421'},
  {t:'green',l:'  Scraper         Running   55%     2,847'},
  {t:'blue',l:'  The Scribe      Idle      12%     4,821'},
  {t:'green',l:'  The Curator     Online    68%     3,102'},
  {t:'dim',l:'Last sync: 2026-06-07 · All systems nominal'},
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
