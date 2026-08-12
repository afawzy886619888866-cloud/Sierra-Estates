/* Sierra Estates × Houzez portal — shared chrome, i18n, theme, motion */
(function () {
  var D = window.HZDATA;

  /* ── i18n ── */
  var I18N = {
    en: {
      dir: 'ltr',
      brandSub: 'Future of Real Estate',
      navHome: 'Home', navProps: 'Properties', navCpds: 'Show Map', navAgents: 'Agents', navContact: 'Contact', navAI: 'AI Tools',
      addListing: 'Add Listing', signIn: 'Sign In', langBtn: 'العربية',
      themeLight: 'Light', themeDark: 'Dark',
      addr: 'Banafseg 2, Villa 402, New Cairo',
      heroEyebrow: 'AI Driven · New Cairo 2026',
      heroSub: '50+ compounds · 1,900+ units · AI-curated for you.',
      q1: '1,900+ verified listings', q2: '50+ compounds', q3: 'RERA-licensed brokers',
      exploreMapBtn: 'Explore compounds on the map',
      tabBuy: 'Resale', tabRent: 'Rent', tabNew: 'New Projects',
      fLoc: 'Location', fType: 'Property Type', fBeds: 'Bedrooms', fPrice: 'Max Price', search: 'Search',
      vLoc: 'New Cairo, Egypt', vType: 'Villa', vBeds: '4+ Beds', vPrice: 'EGP 25M',
      eyeList: 'AI-curated inventory', featTit: 'Featured Properties',
      featSub: 'The most sought-after homes on the market this week across New Cairo.', viewAll: 'View all listings',
      eyeCpd: 'Explore by area', cpdTit: 'Browse New Cairo Compounds',
      cpdSub: 'From gated family communities to waterfront lifestyle districts.', allCpds: 'All 50+ compounds',
      eyeTour: 'Immersive 360° tour', tourTit: 'Tour a signature luxury villa in 360°', tourSub: 'Walk through our flagship New Cairo villa — drag to look around every room.',
      stat1: 'Active Listings', stat2: 'Compounds Covered', stat3: 'Licensed Agents', stat4: 'Closed in 2025',
      eyeWhy: 'The Sierra advantage', whyTit: 'Why Sierra Estates',
      whySub: 'Verified listings, live-market pricing, and a broker who knows the compound — powered by the widest deal network in New Cairo.',
      netEye: 'The most powerful thing about Sierra', netTit: 'We don\u2019t sell only our own units — we search the entire market for you',
      netBody: 'Sierra isn\u2019t limited to its own inventory. We\u2019re connected to 1,500+ independent brokers and 240+ brokerage firms — every one of them working New Cairo. Our AI gathers their live listings into one place and benchmarks every deal, so what reaches you is the single best option on the market, not just what we happen to hold.',
      netS1: '1,500+', netS1L: 'Partner freelance brokers', netS2: '240+', netS2L: 'Brokerage firms', netS3: '100%', netS3L: 'Focused on New Cairo',
      w1t: 'One market, one search', w1s: 'Aggregated inventory from 1,700+ sources — AI-scanned daily so the best deal surfaces first, wherever it sits.',
      w2t: 'Precise AVM Pricing', w2s: 'Real-time valuation engine benchmarks every unit against 25 compounds. No overpaying.',
      w3t: 'Human + AI Closing', w3s: 'AI-sourced opportunities paired with expert advisors. First match to signed contract in 48h.',
      w4t: 'Verified Inventory', w4s: 'Every listing personally verified on-site before appearing in your feed.',
      ctaTit: 'Have a property in New Cairo to sell or rent?', ctaSub: 'List with Sierra Estates and reach 40,000+ qualified buyers every month.',
      ctaBtn1: 'List your property', ctaBtn2: 'Talk to an agent',
      footBlurb: 'Curated luxury rentals and resale across New Cairo\u2019s premier compounds. Verified listings, licensed brokers, real market data.',
      footNews: 'Get new listings by email',
      fExplore: 'Explore', fBuy: 'Buy a home', fRent: 'Rent a home', fNew: 'New projects', fCpds: 'Compounds', fAgent: 'Find an agent',
      fCompany: 'Company', fAbout: 'About Sierra', fBrokers: 'Our brokers', fJournal: 'Journal', fCareers: 'Careers', fContact: 'Contact',
      fTouch: 'Get in touch', fAddr: 'Banafseg 2, Villa 402, New Cairo, Egypt',
      rights: '© 2026 Sierra Estates. All rights reserved.',
      crumbHome: 'Home',
      propsTit: 'Properties', propsSub: 'AI-curated rent & resale inventory across New Cairo — every unit verified on-site.',
      cpdsTit: 'Compound Intelligence Map', cpdsSub: 'Live — 50+ compounds across New Cairo, Madinaty & Shorouk, benchmarked by AI score, growth and price.',
      searchCpdPh: 'Search by compound name…', filterByZone: 'Filter by zone', allZones: 'All zones', browseMap: 'Browse map', noCpd: 'No compounds match your filters.', cpdCount: 'compounds',
      filterAll: 'All', filterVilla: 'Villas', filterApt: 'Apartments', filterTown: 'Townhouses & Twins', filterPent: 'Penthouses & Duplex',
      modeAll: 'All', modeSale: 'Resale', modeRent: 'Rent',
      results: 'results', sortBy: 'Sort: AI Score',
      mapHint: 'Choose a compound — or tap a spot on the map — and its available units will appear.', beds: 'Beds', baths: 'Baths', avg: 'Avg. villa', growth: 'YoY growth', aiScore: 'AI Score', rentAvg: 'Rent avg.',
      backProps: 'Back to properties', schedule: 'Schedule a viewing', wa: 'WhatsApp', call: 'Call Agent',
      overview: 'Overview', gallery: 'Gallery', location: 'Location', similar: 'Similar homes', advisor: 'Listing Advisor',
      eyeLife: 'Explore lifestyles', lifeTit: 'Browse by property type', lifeSub: 'From compact apartments to signature villas — every type, verified.',
      lVilla: 'Villas', lApt: 'Apartments', lTwin: 'Twin & Townhouses', lPent: 'Penthouses & Duplexes', listingsWord: 'listings',
      eyeZone: 'Explore zones', zoneTit: 'Neighborhoods we cover', zoneSub: 'New Cairo, Madinaty & Shorouk — one curated market.', cpdsWord: 'compounds',
      z1: '5th Settlement', z2: 'Katameya', z3: 'New Cairo Core', z4: 'Mostakbal City', z5: 'Madinaty', z6: 'Shorouk',
      eyeTesti: 'Client stories', testiTit: 'What our clients say', testiSub: 'Real moves, closed by Sierra advisors.',
      t1q: 'Sierra\u2019s AI match found our Hyde Park villa in two days — after three months of searching everywhere else.', t1n: 'Ahmed & Dina El-Shazly', t1r: 'Bought in Hyde Park',
      t2q: 'The AVM pricing report saved us from overpaying by EGP 2M. Data first, pressure never.', t2n: 'Mohamed Ezz', t2r: 'Bought in Mivida',
      t3q: 'Listed on Monday, three qualified viewings by Thursday, signed within the week.', t3n: 'Sara Mansour', t3r: 'Rented out in Eastown',
      eyePerfect: 'Why choose us', perfTit: 'Sierra is the perfect choice', perfSub: 'Three reasons New Cairo\u2019s smartest buyers start here.',
      pc1t: 'Largest verified inventory', pc1s: '1,900+ rent & resale units across 50+ compounds — every one walked and photographed by our team.',
      pc2t: 'Data you can act on', pc2s: 'Live AVM valuations, growth benchmarks and AI scores on every unit — not broker guesswork.',
      pc3t: 'Advisors, not salespeople', pc3s: 'RERA-licensed compound specialists paid on your satisfaction, not just the close.',
      inqTit: 'Real-estate inquiry', inqSub: 'Tell us what you need — an advisor replies within 2 hours.',
      inqLook: 'I\u2019m looking to', inqBuy: 'Buy', inqRent: 'Rent', inqSell: 'Sell',
      inqName: 'Full name', inqEmail: 'Email', inqPhone: 'Phone', inqZone: 'Preferred zone', inqType2: 'Property type', inqBudget: 'Budget (EGP)', inqSend: 'Send inquiry',
      partEye: 'Trusted developer partners',
      fDiscover: 'Discover',
      aiEye: 'AI · 7 tools online', aiTit: 'First AI real-estate ecosystem in the Middle East', aiSub: 'Live AI tools for every step of your property journey.',
      ai1t: 'AI Engine 3.0', ai1s: 'Real-time AVM pricing, ROI signals & Q2 2026 market data.',
      ai2t: 'Smart Match', ai2s: 'AI pairs your criteria to the perfect listing.',
      ai3t: 'ROI Analysis', ai3s: 'Yield leaderboard, cap rate & cashflow.',
      ai4t: 'Precise Pricing', ai4s: 'AVM-calibrated fair-market price range.',
      ai5t: 'Dream Home Finder', ai5s: '4 questions → your compound match.',
      ai6t: 'Intelligence Map', ai6s: 'Live compound map — tap any pin to explore units.',
      ai7t: 'Virtual Tour', ai7s: '360° immersive walkthrough of top units.',
      aiLive: 'Live', aiTryTool: 'Open tool',
      tourEye: 'Immersive 360°', tourLaunchTit: 'Launch 3D virtual tour', tourLaunchSub: 'Three.js · 360° drag · 6 rooms', tourLaunch: 'Start tour',
      unitsAvail: 'Units available', unitsTit: 'Available units', unitsSub: 'Live inventory — click any row to open full specs.',
      thCode: 'Code', thType: 'Type', thBeds: 'Beds', thBath: 'Baths', thArea: 'Area', thFloor: 'Floor', thPrice: 'Price', thAI: 'AI', thStatus: 'Status',
      stAvail: 'Available', stReserved: 'Reserved', closeWord: 'Close', unitsWord: 'units',
      shCompound: 'Compound', shBeds: 'Bedrooms', shAnyBeds: 'Any', shShowing: 'Showing', shOf: 'of', shNoUnits: 'No units match these filters.',
      nearHint: 'Or tap anywhere on the map — we\u2019ll find the compounds nearest to that spot.', nearTit: 'Nearest compounds', nearSub: 'Closest to the point you tapped', kmAway: 'km away', viewUnitsBtn: 'View units', clearPin: 'Clear'
    },
    ar: {
      dir: 'rtl',
      brandSub: 'مستقبل العقارات',
      navHome: 'الرئيسية', navProps: 'العقارات', navCpds: 'اعرض الخريطة', navAgents: 'المستشارون', navContact: 'تواصل', navAI: 'أدوات الذكاء',
      addListing: 'أضف عقارك', signIn: 'دخول', langBtn: 'English',
      themeLight: 'فاتح', themeDark: 'غامق',
      addr: 'البنفسج 2، فيلا 402، القاهرة الجديدة',
      heroEyebrow: 'ذكاء اصطناعي · القاهرة الجديدة 2026',
      heroSub: '+50 كمبوند · +1900 وحدة · منتقاة بالذكاء الاصطناعي.',
      q1: '+1900 عقار موثّق', q2: '+50 كمبوند', q3: 'وسطاء مرخّصون',
      exploreMapBtn: 'استكشف الكمبوندات على الخريطة',
      tabBuy: 'بيع', tabRent: 'إيجار', tabNew: 'مشروعات جديدة',
      fLoc: 'الموقع', fType: 'نوع العقار', fBeds: 'الغرف', fPrice: 'أقصى سعر', search: 'ابحث',
      vLoc: 'القاهرة الجديدة، مصر', vType: 'فيلا', vBeds: '+4 غرف', vPrice: '25 مليون جنيه',
      eyeList: 'المخزون بالذكاء الاصطناعي', featTit: 'عقارات مميزة',
      featSub: 'أكثر المنازل طلباً هذا الأسبوع في القاهرة الجديدة.', viewAll: 'عرض كل العقارات',
      eyeCpd: 'استكشف حسب المنطقة', cpdTit: 'تصفح كمبوندات القاهرة الجديدة',
      cpdSub: 'من مجتمعات عائلية مغلقة إلى أحياء حياة عصرية.', allCpds: 'كل الكمبوندات (+50)',
      eyeTour: 'جولة 360° غامرة', tourTit: 'جولة 360° داخل فيلا فاخرة', tourSub: 'تجول داخل فيلا القاهرة الجديدة — اسحب لتستكشف كل غرفة.',
      stat1: 'عقار نشط', stat2: 'كمبوند', stat3: 'مستشار مرخّص', stat4: 'مبيعات 2025',
      eyeWhy: 'ميزة سيرا', whyTit: 'لماذا سيرا إستيتس',
      whySub: 'عقارات موثّقة، تسعير بأسعار السوق الحية، ومستشار يعرف الكمبوند — مدعومة بأوسع شبكة صفقات في القاهرة الجديدة.',
      netEye: 'أقوى ما يميز سيرا', netTit: 'لا نبيع وحداتنا فقط — بل نبحث في السوق كله من أجلك',
      netBody: 'سيرا لا تقتصر على مخزونها الخاص. نحن متصلون بأكثر من 1500 وسيط مستقل وأكثر من 240 شركة وساطة — جميعهم يعملون في القاهرة الجديدة. ذكاؤنا الاصطناعي يجمع عروضهم الحية في مكان واحد ويقيّم كل صفقة، ليصلك أفضل خيار في السوق — لا مجرد ما نملكه.',
      netS1: '+1500', netS1L: 'وسيط مستقل شريك', netS2: '+240', netS2L: 'شركة وساطة', netS3: '100%', netS3L: 'تركيز على القاهرة الجديدة',
      w1t: 'سوق واحد، بحث واحد', w1s: 'مخزون مجمّع من +1700 مصدر — يفحصه الذكاء يومياً ليظهر أفضل عرض أولاً، أينما كان.',
      w2t: 'تسعير AVM دقيق', w2s: 'محرك تقييم فوري يقارن كل وحدة مع 25 كمبوند في الوقت الفعلي.',
      w3t: 'إغلاق بشري + ذكاء', w3s: 'فرص يكتشفها الذكاء الاصطناعي مع مستشارين خبراء. من التوافق حتى التوقيع خلال 48 ساعة.',
      w4t: 'مخزون موثّق', w4s: 'كل عقار يُعاين ميدانياً قبل ظهوره أمامك.',
      ctaTit: 'لديك عقار في القاهرة الجديدة للبيع أو الإيجار؟', ctaSub: 'اعرضه مع سيرا إستيتس وصِل إلى +40 ألف مشترٍ جاد شهرياً.',
      ctaBtn1: 'اعرض عقارك', ctaBtn2: 'تحدث مع مستشار',
      footBlurb: 'إيجار وبيع فاخر منتقى في أرقى كمبوندات القاهرة الجديدة. عقارات موثّقة، وسطاء مرخّصون، بيانات سوق حقيقية.',
      footNews: 'استقبل العقارات الجديدة بالبريد',
      fExplore: 'استكشف', fBuy: 'اشترِ منزلاً', fRent: 'استأجر منزلاً', fNew: 'مشروعات جديدة', fCpds: 'الكمبوندات', fAgent: 'ابحث عن مستشار',
      fCompany: 'الشركة', fAbout: 'عن سيرا', fBrokers: 'مستشارونا', fJournal: 'المدونة', fCareers: 'وظائف', fContact: 'تواصل',
      fTouch: 'تواصل معنا', fAddr: 'البنفسج 2، فيلا 402، القاهرة الجديدة، مصر',
      rights: '© 2026 سيرا إستيتس. جميع الحقوق محفوظة.',
      crumbHome: 'الرئيسية',
      propsTit: 'العقارات', propsSub: 'مخزون إيجار وبيع منتقى بالذكاء الاصطناعي في القاهرة الجديدة — كل وحدة موثّقة ميدانياً.',
      cpdsTit: 'خريطة الذكاء العقاري', cpdsSub: 'مباشر — +50 كمبوند في القاهرة الجديدة ومدينتي والشروق، مقيّمة بالذكاء الاصطناعي والنمو والسعر.',
      searchCpdPh: 'ابحث باسم الكمبوند…', filterByZone: 'تصفية حسب المنطقة', allZones: 'كل المناطق', browseMap: 'تصفح الخريطة', noCpd: 'لا توجد كمبوندات مطابقة.', cpdCount: 'كمبوند',
      filterAll: 'الكل', filterVilla: 'فيلات', filterApt: 'شقق', filterTown: 'تاون هاوس وتوين', filterPent: 'بنتهاوس ودوبلكس',
      modeAll: 'الكل', modeSale: 'بيع', modeRent: 'إيجار',
      results: 'نتيجة', sortBy: 'ترتيب: تقييم الذكاء',
      mapHint: 'اختر كمبونداً — أو اضغط على مكان في الخريطة — وستظهر لك الوحدات المتاحة.', beds: 'غرف', baths: 'حمامات', avg: 'متوسط الفيلا', growth: 'نمو سنوي', aiScore: 'تقييم الذكاء', rentAvg: 'متوسط الإيجار',
      backProps: 'عودة إلى العقارات', schedule: 'احجز معاينة', wa: 'واتساب', call: 'اتصل بالمستشار',
      overview: 'نظرة عامة', gallery: 'المعرض', location: 'الموقع', similar: 'منازل مشابهة', advisor: 'مستشار العقار',
      eyeLife: 'استكشف أنماط السكن', lifeTit: 'تصفح حسب نوع العقار', lifeSub: 'من الشقق العملية إلى الفيلات المميزة — كل الأنواع، موثّقة.',
      lVilla: 'فيلات', lApt: 'شقق', lTwin: 'توين وتاون هاوس', lPent: 'بنتهاوس ودوبلكس', listingsWord: 'عقار',
      eyeZone: 'استكشف المناطق', zoneTit: 'المناطق التي نغطيها', zoneSub: 'القاهرة الجديدة ومدينتي والشروق — سوق واحد منتقى.', cpdsWord: 'كمبوند',
      z1: 'التجمع الخامس', z2: 'القطامية', z3: 'قلب القاهرة الجديدة', z4: 'مدينة المستقبل', z5: 'مدينتي', z6: 'الشروق',
      eyeTesti: 'قصص عملائنا', testiTit: 'ماذا يقول عملاؤنا', testiSub: 'صفقات حقيقية أغلقها مستشارو سيرا.',
      t1q: 'توافق سيرا الذكي وجد فيلتنا في هايد بارك خلال يومين — بعد ثلاثة أشهر من البحث في كل مكان.', t1n: 'أحمد ودينا الشاذلي', t1r: 'شراء في هايد بارك',
      t2q: 'تقرير التسعير AVM وفّر علينا مليوني جنيه. بيانات أولاً، ولا ضغوط إطلاقاً.', t2n: 'محمد عز', t2r: 'شراء في ميفيدا',
      t3q: 'عرضنا الوحدة الإثنين، ثلاث معاينات جادة الخميس، ووقّعنا خلال أسبوع.', t3n: 'سارة منصور', t3r: 'تأجير في إيستاون',
      eyePerfect: 'لماذا نحن', perfTit: 'سيرا هي الاختيار الأمثل', perfSub: 'ثلاثة أسباب تجعل أذكى المشترين يبدأون من هنا.',
      pc1t: 'أكبر مخزون موثّق', pc1s: '+1900 وحدة إيجار وبيع في +50 كمبوند — كل وحدة عوينت وصوّرت ميدانياً.',
      pc2t: 'بيانات قابلة للتنفيذ', pc2s: 'تقييمات AVM حية ومؤشرات نمو وتقييم ذكاء لكل وحدة — لا تخمينات وسطاء.',
      pc3t: 'مستشارون لا بائعون', pc3s: 'متخصصو كمبوندات مرخّصون يُقيّمون برضاك، لا بالإغلاق فقط.',
      inqTit: 'طلب عقاري', inqSub: 'أخبرنا بما تحتاج — يرد مستشار خلال ساعتين.',
      inqLook: 'أبحث عن', inqBuy: 'شراء', inqRent: 'إيجار', inqSell: 'بيع',
      inqName: 'الاسم بالكامل', inqEmail: 'البريد الإلكتروني', inqPhone: 'الهاتف', inqZone: 'المنطقة المفضلة', inqType2: 'نوع العقار', inqBudget: 'الميزانية (جنيه)', inqSend: 'أرسل الطلب',
      partEye: 'شركاء التطوير الموثوقون',
      fDiscover: 'اكتشف',
      aiEye: 'ذكاء اصطناعي · 7 أدوات تعمل', aiTit: 'أول نظام ذكاء عقاري في الشرق الأوسط', aiSub: 'أدوات ذكاء اصطناعي حية لكل خطوة في رحلتك العقارية.',
      ai1t: 'محرك الذكاء 3.0', ai1s: 'تسعير AVM لحظي، مؤشرات عائد، وبيانات سوق 2026.',
      ai2t: 'التوافق الذكي', ai2s: 'يطابق الذكاء معاييرك مع العقار المثالي.',
      ai3t: 'تحليل العائد', ai3s: 'قوائم العائد ومعدل الربح والتدفق النقدي.',
      ai4t: 'تسعير دقيق', ai4s: 'نطاق سعر عادل معاير بـ AVM.',
      ai5t: 'مستشار منزل الأحلام', ai5s: '4 أسئلة ← الكمبوند المثالي لك.',
      ai6t: 'خريطة الذكاء', ai6s: 'خريطة كمبوندات حية — اضغط أي علامة لاستكشاف الوحدات.',
      ai7t: 'جولة افتراضية', ai7s: 'جولة 360° غامرة في أفضل الوحدات.',
      aiLive: 'مباشر', aiTryTool: 'افتح الأداة',
      tourEye: 'جولة 360° غامرة', tourLaunchTit: 'ابدأ الجولة الثلاثية الأبعاد', tourLaunchSub: 'Three.js · 360° · 6 غرف', tourLaunch: 'ابدأ الجولة',
      unitsAvail: 'الوحدات المتاحة', unitsTit: 'الوحدات المتاحة', unitsSub: 'مخزون مباشر — اضغط أي صف لفتح المواصفات كاملة.',
      thCode: 'الكود', thType: 'النوع', thBeds: 'غرف', thBath: 'حمامات', thArea: 'المساحة', thFloor: 'الدور', thPrice: 'السعر', thAI: 'ذكاء', thStatus: 'الحالة',
      stAvail: 'متاحة', stReserved: 'محجوزة', closeWord: 'إغلاق', unitsWord: 'وحدة',
      shCompound: 'الكمبوند', shBeds: 'غرف النوم', shAnyBeds: 'الكل', shShowing: 'عرض', shOf: 'من', shNoUnits: 'لا توجد وحدات مطابقة.',
      nearHint: 'أو اضغط في أي مكان على الخريطة — وسنجد أقرب الكمبوندات لتلك النقطة.', nearTit: 'أقرب الكمبوندات', nearSub: 'الأقرب إلى النقطة التي حددتها', kmAway: 'كم', viewUnitsBtn: 'عرض الوحدات', clearPin: 'مسح'
    }
  };

  var lang = localStorage.getItem('hzp-lang') || 'en';
  var theme = localStorage.getItem('hzp-theme') || 'light';

  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }

  /* ── chrome templates ── */
  function chromeHTML(active) {
    function act(k) { return active === k ? ' class="active"' : ''; }
    return '' +
    '<div class="topbar"><div class="wrap">' +
      '<div class="tb-left">' +
        '<span><i data-lucide="phone" class="i" style="width:14px;height:14px"></i> +2 01092048333</span>' +
        '<span><i data-lucide="mail" class="i" style="width:14px;height:14px"></i> Info@sierra-estates.net</span>' +
        '<span><i data-lucide="map-pin" class="i" style="width:14px;height:14px"></i> <span data-i18n="addr">' + t('addr') + '</span></span>' +
      '</div>' +
      '<div class="tb-right">' +
        '<button class="tb-toggle" id="theme-toggle" type="button"><i data-lucide="' + (theme === 'dark' ? 'sun' : 'moon') + '" class="i"></i><span id="theme-label">' + (theme === 'dark' ? t('themeLight') : t('themeDark')) + '</span></button>' +
        '<button class="tb-toggle" id="lang-toggle" type="button"><i data-lucide="languages" class="i"></i><span>' + t('langBtn') + '</span></button>' +
        '<div class="divider"></div>' +
        '<a href="#"><i data-lucide="user" class="i" style="width:14px;height:14px"></i> <span data-i18n="signIn">' + t('signIn') + '</span></a>' +
      '</div>' +
    '</div></div>' +
    '<nav class="nav" id="main-nav"><div class="wrap">' +
      '<a href="index.html" class="brand">' +
        '<span class="mark logo"><img src="logo-gold.png" alt="Sierra Estates"/></span>' +
        '<span><b>Sierra Estates</b><small data-i18n="brandSub">' + t('brandSub') + '</small></span>' +
      '</a>' +
      '<div class="menu">' +
        '<a href="index.html"' + act('home') + ' data-i18n="navHome">' + t('navHome') + '</a>' +
        '<a href="properties.html"' + act('props') + ' data-i18n="navProps">' + t('navProps') + '</a>' +
        '<a href="compounds.html"' + act('cpds') + ' data-i18n="navCpds">' + t('navCpds') + '</a>' +
        '<a href="index.html#ai" data-i18n="navAI">' + t('navAI') + '</a>' +
        '<a href="index.html#agents"' + ' data-i18n="navAgents">' + t('navAgents') + '</a>' +
        '<a href="index.html#contact" data-i18n="navContact">' + t('navContact') + '</a>' +
      '</div>' +
      '<div class="nav-right">' +
        '<a href="#" class="nav-icon"><i data-lucide="heart" class="i" style="width:21px;height:21px"></i><span class="dot">3</span></a>' +
        '<button class="btn btn-pri" type="button"><i data-lucide="plus" class="i"></i> <span data-i18n="addListing">' + t('addListing') + '</span></button>' +
      '</div>' +
    '</div></nav>';
  }

  function footerHTML() {
    return '' +
    '<div class="wrap">' +
      '<div class="foot-grid">' +
        '<div>' +
          '<a href="index.html" class="brand">' +
            '<span class="mark logo"><img src="logo-gold.png" alt="Sierra Estates"/></span>' +
            '<span><b>Sierra Estates</b><small data-i18n="brandSub">' + t('brandSub') + '</small></span>' +
          '</a>' +
          '<p class="blurb" data-i18n="footBlurb">' + t('footBlurb') + '</p>' +
          '<div class="news"><input data-i18n-ph="footNews" placeholder="' + t('footNews') + '"/><button type="button"><i data-lucide="arrow-right" class="i"></i></button></div>' +
        '</div>' +
        '<div class="fcol"><h5 data-i18n="fExplore">' + t('fExplore') + '</h5>' +
          '<a href="properties.html" data-i18n="fBuy">' + t('fBuy') + '</a><a href="properties.html" data-i18n="fRent">' + t('fRent') + '</a>' +
          '<a href="properties.html" data-i18n="fNew">' + t('fNew') + '</a><a href="compounds.html" data-i18n="fCpds">' + t('fCpds') + '</a>' +
          '<a href="#" data-i18n="fAgent">' + t('fAgent') + '</a></div>' +
        '<div class="fcol"><h5 data-i18n="fCompany">' + t('fCompany') + '</h5>' +
          '<a href="#" data-i18n="fAbout">' + t('fAbout') + '</a><a href="#" data-i18n="fBrokers">' + t('fBrokers') + '</a>' +
          '<a href="#" data-i18n="fJournal">' + t('fJournal') + '</a><a href="#" data-i18n="fCareers">' + t('fCareers') + '</a>' +
          '<a href="#" data-i18n="fContact">' + t('fContact') + '</a></div>' +
        '<div class="fcol"><h5 data-i18n="fDiscover">' + t('fDiscover') + '</h5>' +
          '<a href="compounds.html" data-i18n="z1">' + t('z1') + '</a><a href="compounds.html" data-i18n="z2">' + t('z2') + '</a>' +
          '<a href="compounds.html" data-i18n="z3">' + t('z3') + '</a><a href="compounds.html" data-i18n="z4">' + t('z4') + '</a></div>' +
        '<div class="fcol"><h5 data-i18n="fTouch">' + t('fTouch') + '</h5>' +
          '<div class="contact-line"><i data-lucide="map-pin" class="i"></i><span data-i18n="fAddr">' + t('fAddr') + '</span></div>' +
          '<div class="contact-line"><i data-lucide="phone" class="i"></i><span>+2 01092048333</span></div>' +
          '<div class="contact-line"><i data-lucide="mail" class="i"></i><span>Info@sierra-estates.net</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="foot-bottom">' +
        '<span data-i18n="rights">' + t('rights') + '</span>' +
        '<div class="socials">' +
          '<a href="#"><i data-lucide="facebook" class="i"></i></a><a href="#"><i data-lucide="instagram" class="i"></i></a>' +
          '<a href="#"><i data-lucide="linkedin" class="i"></i></a><a href="#"><i data-lucide="twitter" class="i"></i></a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── property card ── */
  function pcard(p, i) {
    var initials = p.agent.split(' ').map(function (w) { return w[0]; }).join('');
    var modeTag = p.mode === 'rent' ? '<span class="tag rent" data-i18n="modeRent">' + t('modeRent') + '</span>' : '<span class="tag sale" data-i18n="modeSale">' + t('modeSale') + '</span>';
    var extra = p.tag ? '<span class="tag featured">' + p.tag + '</span>' : '';
    return '<article class="pcard rv d' + ((i % 3) + 1) + '" data-type="' + p.type + '" data-mode="' + p.mode + '">' +
      '<div class="photo">' +
        '<a href="property.html?id=' + p.id + '"><img src="' + p.img + '" alt="' + p.type + ' in ' + p.cmp + '" loading="lazy"/></a>' +
        '<div class="badges">' + extra + modeTag + '</div>' +
        '<div class="heart" onclick="this.classList.toggle(\'on\')"><i data-lucide="heart" class="i" style="width:18px;height:18px"></i></div>' +
        '<div class="price-float">' + D.price(p) + '</div>' +
        '<div class="ai-score">AI ' + p.ai.toFixed(1) + '</div>' +
      '</div>' +
      '<div class="body">' +
        '<div class="ptype">' + p.code + ' · ' + p.type + '</div>' +
        '<h3><a href="property.html?id=' + p.id + '">' + p.type + ' in ' + p.cmp + '</a></h3>' +
        '<div class="addr"><i data-lucide="map-pin" class="i"></i> ' + p.cmp + ', ' + p.zone + '</div>' +
        '<div class="specs">' +
          '<div><i data-lucide="bed-double" class="i"></i><b>' + p.beds + '</b><span data-i18n="beds">' + t('beds') + '</span></div>' +
          '<div><i data-lucide="bath" class="i"></i><b>' + p.bath + '</b><span data-i18n="baths">' + t('baths') + '</span></div>' +
          '<div><i data-lucide="scaling" class="i"></i><b>' + p.area + '</b><span>m²</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="foot">' +
        '<div class="agent"><span class="av">' + initials + '</span><small><b>' + p.agent + '</b>' + p.ago + '</small></div>' +
        '<div class="foot-icons">' +
          '<a href="#"><i data-lucide="git-compare" class="i"></i></a>' +
          '<a href="#"><i data-lucide="share-2" class="i"></i></a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ── reveal on scroll ── */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.rv:not(.in)').forEach(function (el) { io.observe(el); });
    window.HZ._io = io;
  }

  /* ── animated counters ── */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, target = parseFloat(el.getAttribute('data-count'));
        var prefix = el.getAttribute('data-prefix') || '', suffix = el.getAttribute('data-suffix') || '';
        var dec = (String(target).split('.')[1] || '').length;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var pr = Math.min((ts - start) / 1400, 1);
          var eased = 1 - Math.pow(1 - pr, 3);
          el.textContent = prefix + (target * eased).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
          if (pr < 1) requestAnimationFrame(step);
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          el.textContent = prefix + target.toLocaleString() + suffix;
        } else { requestAnimationFrame(step); }
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── toggles ── */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
  }
  function applyLang() {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', I18N[lang].dir);
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    document.dispatchEvent(new CustomEvent('hzp:lang', { detail: lang }));
  }

  /* ── mount ── */
  function mount(active) {
    applyTheme();
    var top = document.getElementById('site-chrome');
    if (top) top.innerHTML = chromeHTML(active);
    var foot = document.getElementById('site-footer');
    if (foot) foot.innerHTML = footerHTML();

    document.getElementById('theme-toggle').addEventListener('click', function () {
      theme = theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('hzp-theme', theme);
      applyTheme();
      this.querySelector('i, svg').outerHTML = '<i data-lucide="' + (theme === 'dark' ? 'sun' : 'moon') + '" class="i"></i>';
      document.getElementById('theme-label').textContent = theme === 'dark' ? t('themeLight') : t('themeDark');
      if (window.lucide) lucide.createIcons();
      document.dispatchEvent(new CustomEvent('hzp:theme', { detail: theme }));
    });
    document.getElementById('lang-toggle').addEventListener('click', function () {
      lang = lang === 'en' ? 'ar' : 'en';
      localStorage.setItem('hzp-lang', lang);
      location.reload();
    });

    var nav = document.getElementById('main-nav');
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });

    applyLang();
    if (window.lucide) lucide.createIcons();
    initReveal();
    initCounters();
  }

  window.HZ = { mount: mount, t: t, pcard: pcard, lang: function () { return lang; }, theme: function () { return theme; }, refreshIcons: function () { if (window.lucide) lucide.createIcons(); }, reveal: initReveal };
})();
