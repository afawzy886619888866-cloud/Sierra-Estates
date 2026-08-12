import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';

const INITIAL_LEADS = [
  {name:'Ahmed Al-Rashid',phone:'+20 100 111 2233',interest:'Villa · Hyde Park · EGP 20M+',stage:'Viewing Scheduled',color:'#C8961A',hot:true},
  {name:'Sara Mohamed',phone:'+20 101 222 3344',interest:'3-Bed · Mivida · Rent',stage:'AI Matched',color:'#1E88D9',hot:false},
  {name:'Khalid Mansour',phone:'+971 50 333 4455',interest:'Penthouse · Uptown · EGP 15M',stage:'Contract Draft',color:'#34D399',hot:true},
  {name:'Nadia Hassan',phone:'+20 112 444 5566',interest:'Apartment · Madinaty · EGP 5M',stage:'Initial Contact',color:'#7C3AED',hot:false},
  {name:'Omar Farouk',phone:'+20 100 555 6677',interest:'Twin House · Mountain View',stage:'Negotiating',color:'#E63946',hot:true},
  {name:'Layla Karim',phone:'+20 109 666 7788',interest:'Furnished 2-Bed · Eastown',stage:'AI Matched',color:'#E9C176',hot:false},
];

const INITIAL_AGENTS = [
  {name:'Sierra Bot',desc:'Primary AI concierge — handles client queries & property recommendations.',emoji:'🤖',color:'#C8961A',status:'Online',load:94,tasks:1203},
  {name:'Leila / Lola',desc:'Bilingual Arabic specialist — translates listings & handles Gulf negotiations.',emoji:'🐪',color:'#1E88D9',status:'Online',load:87,tasks:889},
  {name:'Stage-9 Closer',desc:'Automated deal engine — drafts contracts, DocuSign, Stripe deposits.',emoji:'💼',color:'#34D399',status:'Online',load:71,tasks:421},
  {name:'WhatsApp Scraper',desc:'Monitors Property Finder, OLX & WhatsApp groups.',emoji:'🕵️',color:'#7C3AED',status:'Running',load:55,tasks:2847},
  {name:'The Scribe',desc:'S1-S2 ingestion — parses raw listing data & normalizes to Sierra schema.',emoji:'✍️',color:'#E63946',status:'Idle',load:12,tasks:4821},
  {name:'The Curator',desc:'S3-S5 inventory management — deduplication, quality scoring & AVM pricing.',emoji:'🎨',color:'#E9C176',status:'Online',load:68,tasks:3102},
  {name:'Marketing Oracle',desc:'Auto-generates ad copy and configures Facebook/Instagram targeted campaigns.',emoji:'📈',color:'#f43f5e',status:'Idle',load:18,tasks:412},
  {name:'Data Enricher',desc:'Cross-references property data with external APIs for comprehensive details.',emoji:'🧠',color:'#6366f1',status:'Running',load:82,tasks:1980},
  {name:'Social Publisher',desc:'Schedules and formats automated social media posting across networks.',emoji:'📱',color:'#0ea5e9',status:'Online',load:45,tasks:754},
];

const INITIAL_WORKFLOWS = [
  {
    name: 'Lead Ingestion → Firestore',
    nameAr: 'معالجة وتوجيه العملاء الجدد',
    desc: 'Processes raw WhatsApp text and routes parsed leads info into Firestore.',
    descAr: 'تحليل وتنسيق معلومات المعاينات من نصوص واتس اب الخام وتوجيهها إلى قاعدة البيانات.',
    status: 'active',
    runs: 12840,
    last: '2 min ago',
    color: '#34D399'
  },
  {
    name: 'WhatsApp Scraper Cron (30m)',
    nameAr: 'مراقب مجموعات الواتساب والمواقع',
    desc: 'Periodically audits WhatsApp broker communities for raw listing postings.',
    descAr: 'سحب البيانات التلقائي وعمل فحص دوري لمجموعات السماسرة والمواقع العقارية.',
    status: 'active',
    runs: 6420,
    last: '28 min ago',
    color: '#34D399'
  },
  {
    name: 'Listing Price AVM Sync',
    nameAr: 'مزامنة الأسعار مع محرك التقييم',
    desc: 'Synchronizes listing prices with actual Sierra valuation models.',
    descAr: 'مراجعة أسعار السوق المعروضة وتعديلها تلقائياً بالاعتماد على ذكاء نماذج سييرا.',
    status: 'active',
    runs: 3210,
    last: '1 hr ago',
    color: '#34D399'
  },
  {
    name: 'Stage-9 Contract Generator',
    nameAr: 'توليد العقود للمرحلة الختامية',
    desc: 'Prepares contract PDFs and logs legal signatures dynamic events.',
    descAr: 'إعداد مسودات العقود القانونية النهائية وتسجيل تواقيع العملاء وإيداع الدفعات.',
    status: 'active',
    runs: 421,
    last: '15 min ago',
    color: '#34D399'
  },
  {
    name: 'Broker KPI Report (Daily)',
    nameAr: 'تقرير مؤشرات الأداء اليومي للوسطاء',
    desc: 'Synthesizes daily metrics on agent activity and lead progression rates.',
    descAr: 'استخلاص وتقييم تقارير الأداء اليومية ونشاط الوكلاء ونسب الإغلاق الفعلي.',
    status: 'active',
    runs: 186,
    last: '6 hrs ago',
    color: '#1E88D9'
  },
  {
    name: 'Stale Listing Monitor',
    nameAr: 'مراقب العقود والوحدات الراكدة',
    desc: 'Audits old database entries and changes status of stale units to Review.',
    descAr: 'فلترة العقارات القديمة والوحدات غير المحدثة وتغيير حالتها تلقائياً للمراجعة.',
    status: 'warning',
    runs: 890,
    last: '2 hrs ago',
    color: '#f59e0b'
  },
  {
    name: 'Email Follow-Up Sequence',
    nameAr: 'سلسلة رسائل المتابعة البريدية',
    desc: 'Dispatches periodic reminders to prospects showing interest.',
    descAr: 'إرسال رسائل بريد تذكيرية آلية دورية للعملاء المهتمين بوحدات محددة.',
    status: 'paused',
    runs: 1240,
    last: '1 day ago',
    color: '#E63946'
  },
  {
    name: 'Telegram Alert Dispatcher',
    nameAr: 'مرسل تنبيهات تيليجرام للعمليات الإدارية',
    desc: 'Pushes high-priority bot matches instantly to team Telegram channels.',
    descAr: 'بث فوري لأحدث ترشيحات العقارات ومطابقة العملاء لقنوات العمل الإدارية.',
    status: 'active',
    runs: 5640,
    last: '4 min ago',
    color: '#34D399'
  }
];

const INITIAL_LISTINGS = [
  {code:'SE-HYP-VLA-0001',cmp:'Hyde Park',type:'Villa',beds:5,area:420,price:'EGP 35M',ai:9.8,status:'Active',img:0},
  {code:'SE-HYP-TWH-0002',cmp:'Hyde Park',type:'Twin House',beds:4,area:280,price:'EGP 22M',ai:9.5,status:'Active',img:1},
  {code:'SE-HYP-APT-0003',cmp:'Hyde Park',type:'Apartment',beds:3,area:165,price:'EGP 12.5M',ai:9.2,status:'Review',img:2},
  {code:'SE-MVI-VLA-0004',cmp:'Mountain View iCity',type:'Villa',beds:6,area:550,price:'EGP 42M',ai:9.6,status:'Active',img:3},
  {code:'SE-MVI-PTH-0005',cmp:'Mountain View iCity',type:'Penthouse',beds:4,area:320,price:'EGP 18M',ai:9.4,status:'Active',img:4},
  {code:'SE-MVD-VLA-0006',cmp:'Mivida',type:'Villa',beds:3,area:195,price:'EGP 8.5M',ai:9.1,status:'Active',img:0},
  {code:'SE-MVD-APT-0007',cmp:'Mivida',type:'Apartment',beds:2,area:110,price:'EGP 5.2M',ai:8.9,status:'Active',img:1},
  {code:'SE-UPC-VLA-0008',cmp:'Uptown Cairo',type:'Villa',beds:4,area:360,price:'EGP 28M',ai:9.4,status:'Active',img:2},
  {code:'SE-UPC-DPX-0009',cmp:'Uptown Cairo',type:'Duplex',beds:3,area:220,price:'EGP 16.5M',ai:9.2,status:'Review',img:3},
  {code:'SE-MDN-APT-0010',cmp:'Madinaty',type:'Apartment',beds:3,area:165,price:'EGP 4.8M',ai:8.8,status:'Active',img:4},
  {code:'SE-MDN-VLA-0011',cmp:'Madinaty',type:'Villa',beds:4,area:280,price:'EGP 9.5M',ai:9.0,status:'Active',img:0},
  {code:'SE-MDN-APT-0012',cmp:'Madinaty',type:'Apartment',beds:2,area:120,price:'EGP 3.8M',ai:8.6,status:'Active',img:1},
  {code:'SE-EST-APT-0013',cmp:'Eastown',type:'Apartment',beds:3,area:155,price:'EGP 7.2M',ai:9.0,status:'Active',img:2},
  {code:'SE-EST-TWH-0014',cmp:'Eastown',type:'Townhouse',beds:4,area:265,price:'EGP 14M',ai:9.1,status:'Active',img:3},
  {code:'SE-VLT-VLA-0015',cmp:'Villette',type:'Villa',beds:5,area:380,price:'EGP 31M',ai:9.3,status:'Active',img:4},
  {code:'SE-PHN-VLA-0016',cmp:'Palm Hills NC',type:'Villa',beds:4,area:320,price:'EGP 24M',ai:9.2,status:'Active',img:0},
  {code:'SE-PHN-TWH-0017',cmp:'Palm Hills NC',type:'Twin House',beds:3,area:200,price:'EGP 15M',ai:9.0,status:'Review',img:1},
  {code:'SE-ALR-APT-0018',cmp:'Al Rehab',type:'Apartment',beds:3,area:145,price:'EGP 4.2M',ai:8.7,status:'Active',img:2},
  {code:'SE-ALR-APT-0019',cmp:'Al Rehab',type:'Apartment',beds:2,area:110,price:'EGP 3.5M',ai:8.5,status:'Active',img:3},
  {code:'SE-SDC-VLA-0020',cmp:'SODIC East',type:'Villa',beds:4,area:310,price:'EGP 26M',ai:9.3,status:'Active',img:4},
  {code:'SE-TAJ-APT-0021',cmp:'Taj City',type:'Apartment',beds:3,area:155,price:'EGP 6.8M',ai:8.9,status:'Active',img:0},
  {code:'SE-SAR-VLA-0022',cmp:'Sarai',type:'Villa',beds:4,area:300,price:'EGP 19.5M',ai:9.1,status:'Active',img:1},
  {code:'SE-SHR-VLA-0023',cmp:'El Shorouk',type:'Villa',beds:3,area:220,price:'EGP 8M',ai:8.8,status:'Active',img:2},
  {code:'SE-FSQ-APT-0024',cmp:'Fifth Square',type:'Apartment',beds:3,area:145,price:'EGP 7.5M',ai:9.0,status:'Active',img:3},
  {code:'SE-BLM-VLA-0025',cmp:'Bloomfields',type:'Villa',beds:4,area:280,price:'EGP 22M',ai:9.2,status:'Review',img:4},
  {code:'SE-KTH-VLA-0026',cmp:'Katameya Heights',type:'Villa',beds:5,area:450,price:'EGP 38M',ai:9.5,status:'Active',img:0},
];

  export async function seedFirestore() {
  // 1. Leads
  try {
    const leadsSnap = await getDocs(collection(db, 'leads'));
    if (leadsSnap.empty) {
      console.log('Seeding leads...');
      const batch = writeBatch(db);
      INITIAL_LEADS.forEach((lead, i) => {
        const docRef = doc(db, 'leads', `lead-${i + 1}`);
        batch.set(docRef, {
          ...lead,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      await batch.commit();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("permission")) {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    } else {
      handleFirestoreError(error, OperationType.WRITE, 'leads');
    }
    // Continue
  }


  // 2. Agents
  try {
    const agentsSnap = await getDocs(collection(db, 'agents'));
    console.log('Seeding agents...');
    const batch = writeBatch(db);
    INITIAL_AGENTS.forEach((agent, i) => {
      const docRef = doc(db, 'agents', `agent-${i + 1}`);
      batch.set(docRef, {
        ...agent,
        updatedAt: new Date()
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'agents');
    // Continue
  }

  // 3. Workflows
  try {
    const workflowsSnap = await getDocs(collection(db, 'workflows'));
    if (workflowsSnap.empty) {
      console.log('Seeding workflows...');
      const batch = writeBatch(db);
      INITIAL_WORKFLOWS.forEach((wf, i) => {
        const docRef = doc(db, 'workflows', `wf-${i + 1}`);
        batch.set(docRef, {
          ...wf,
          updatedAt: new Date()
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workflows');
    return;
  }

  // 4. Listings
  try {
    const listingsSnap = await getDocs(collection(db, 'listings'));
    if (listingsSnap.empty) {
      console.log('Seeding listings...');
      // Split into batches of 50 just in case
      const batch = writeBatch(db);
      INITIAL_LISTINGS.forEach((lst, i) => {
        const docRef = doc(db, 'listings', `lst-${i + 1}`);
        batch.set(docRef, {
          ...lst,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'listings');
  }

  // 5. System Logs
  try {
    const logsSnap = await getDocs(collection(db, 'system_logs'));
    if (logsSnap.empty) {
      console.log('Seeding system logs...');
      const batch = writeBatch(db);
      
      const logs = [
        { action: "Lead Ahmed Al-Rashid assigned to Sierra Bot", category: "lead", operator: "Sierra Bot", timestamp: new Date(Date.now() - 5 * 60000) },
        { action: "New listing added: 3-Bed Lakeview Townhouse, Hyde Park", category: "listing", operator: "The Curator", timestamp: new Date(Date.now() - 15 * 60000) },
        { action: "Workflow WhatsApp Scraper Cron (30m) completed successfully", category: "workflow", operator: "System Daemon", timestamp: new Date(Date.now() - 28 * 60000) },
        { action: "AI Matched Sara Mohamed to 3-Bed Mivida Rental", category: "lead", operator: "Leila / Lola", timestamp: new Date(Date.now() - 45 * 60000) },
        { action: "AVM pricing update for Mountain View Compound initiated", category: "system", operator: "The Scribe", timestamp: new Date(Date.now() - 120 * 60000) },
        { action: "User emeraldestatesegypt@gmail.com signed in to Sierra Core Panel", category: "system", operator: "Security Service", timestamp: new Date(Date.now() - 240 * 60000) }
      ];

      logs.forEach((log, i) => {
        const docRef = doc(db, 'system_logs', `log-${i + 1}`);
        batch.set(docRef, log);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'system_logs');
  }

  // 6. System Health
  try {
    const healthSnap = await getDocs(collection(db, 'system_health'));
    if (healthSnap.empty) {
      console.log('Seeding system health...');
      const docRef = doc(db, 'system_health', 'current_status');
      await setDoc(docRef, {
        dbLatency: 12,
        authUptime: 99.98,
        storageQuota: 24,
        updatedAt: new Date()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'system_health');
  }
}
