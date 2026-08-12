/* Sierra Estates — Client Portal data (translations, compounds, units, listings, tour rooms) */
/* ── TRANSLATIONS ── */
const LANG = {
  en: {
    brand: 'SIERRA ESTATES', brandSub: 'FUTURE OF REAL ESTATES',
    claim: 'Claim', claimSub: 'Service fee · First 50 clients · +10% non-EG', reqNow: 'Request Now',
    eyeHero: 'AI DRIVEN · NEW CAIRO 2026',
    h1a: 'Find Your', h1b: 'Dream Home', h1c: 'Rent & Resale.',
    heroSub: '21 compounds · 1,200+ units · AI-curated for you.',
    resale: 'Resale', rent: 'Rent', srch: 'Search compounds…', beds: 'Beds:', any: 'Any', req: 'Request',
    s1: 'Props', s2: 'AI', s3: 'Areas', s4: 'Reply',
    eyeTour: 'IMMERSIVE 360° TOUR', tourTit: '3D Virtual Tour — Coming Soon', drag: '360° Drag to explore',
    eyeList: 'AI-CURATED INVENTORY', propTit: 'Properties', viewAll: 'View All',
    eyeMap: 'COMPOUND INTELLIGENCE MAP', mapTit: 'New Cairo · Live',
    pickCpd: '← Choose compounds — units appear on map', tapBadge: 'TAP BADGE → UNIT TABLE',
    sel: 'selected', allCpd: 'All Compounds', nSel: ' compound selected', ' nSelP': ' compounds selected',
    eyeAI: 'AI SERVICES · 7 TOOLS', aiTit: 'Intelligence Hub',
    aiOn: 'Online · Gemini 2.0 Flash', aiName: 'Sierra AI',
    aiPh: 'Ask Sierra about New Cairo…',
    c1: 'Best ROI', c2: 'Hyde Park', c3: 'Mivida rent', c4: 'Compare', c5: 'Invest 2026',
    eyeWhy: 'OUR ADVANTAGE · AI-POWERED', whyTit: 'Why Sierra Estates',
    w1t: 'AI Opportunity Scanner', w1s: 'Sierra scans 1,200+ units daily using 6 AI tools — ROI, AVM pricing, smart matching — to surface best deals first.',
    w2t: 'AI Dream Home Wizard', w2s: 'Answer 4 questions and Sierra recommends the exact compound and unit type for your budget and goals.',
    w3t: 'Precise AVM Pricing', w3s: 'Real-time valuation engine benchmarks every unit against 25 compounds. No overpaying.',
    w4t: 'Human + AI Closing', w4s: 'AI-sourced opportunities paired with expert advisors. First match to signed contract in 48h.',
    w5t: 'Verified Inventory', w5s: 'Every listing personally verified on-site before appearing in your feed.',
    w6t: '4-Second Response', w6s: 'Sierra AI always on. Human agents follow up within 4 hours.',
    nav: ['Home', 'Search', 'Map', 'AI Hub', 'Saved'],
    wa: 'WhatsApp', call: 'Call Agent',
    tId: 'ID', tType: 'Type', tBd: 'Bd', tArea: 'm²', tPrice: 'Price', tAI: 'AI', tStatus: 'Status', tCTA: 'CTA',
    sAll: 'All', sAv: 'Available', sUO: 'Under Offer', sSold: 'Sold',
    pAv: 'Avail', pUO: 'Offer', pSold: 'Sold', allBeds: 'All Beds',
    reqTit: 'Request a Property', reqSub: 'Service fees · First 50 users',
    nm: 'Full Name *', nmPh: 'Your full name', ph: 'WhatsApp Number *', phPh: '+20 1XX XXX XXXX', cmt: 'Comment (optional)', cmtPh: 'Tell us what you\'re looking for…',
    rooms: 'No. of Rooms', cmps: 'Compounds (multi-select)', budget: 'Budget', photo: 'Property Photo (optional)', photoBtn: 'Upload a photo',
    nationality: 'Purpose', natEg: 'Rent', natNonEg: 'Resale',
    nonEgOffer: '🌍 Non-Egyptian? Extra 10% off — limited spots.',
    budgets: ['Any', 'Under EGP 5M', 'EGP 5–10M', 'EGP 10–20M', 'EGP 20M+', 'Under $1K/mo', '$1K–$3K/mo', '$3K+/mo'],
    submit: 'Submit Request — 25% OFF', close: 'Close',
    doneTit: 'Request Received!', doneSub: 'Our team contacts you within 24 hours.',
    roiTit: 'ROI Analysis', roiCalc: 'Yield Calculator', roiPrice: 'Purchase price', roiRent: 'Monthly rent',
    roiG: 'Gross Yield', roiN: 'Net Yield', roi5: '5yr Appreciation', roiCash: 'Annual Cash',
    priceTit: 'Precise Pricing', priceSub: 'Egypt-calibrated AVM — instant fair-market range',
    priceCpd: 'Compound', priceArea: 'Area (m²)', priceBeds: 'Bedrooms', priceFinish: 'Finishing',
    finOpts: ['Standard', 'Premium', 'Ultra Luxury'], priceResult: 'Estimated Price', priceConf: 'AI Confidence',
    matchTit: 'Smart Match', matchSub: 'AI-ranked units matched to your criteria',
    dreamTit: 'Dream Home Advisor', dreamSub: '4 questions → AI recommends your compound',
    dreamNext: 'Next →', dreamBack: '← Back',
    dq: ["What matters most?", "What's your budget?", "Lifestyle preference?", "How many rooms?"],
    dh: ['Your top priority shapes the match.', 'Set your comfortable range.', 'Where do you see yourself?', 'How many bedrooms?'],
    do: [
    [{ ic: '📈', t: 'High ROI', d: 'Investment-first' }, { ic: '🏡', t: 'Family Life', d: 'Space & community' }, { ic: '🚗', t: 'Location', d: 'Commute & access' }, { ic: '🎨', t: 'Luxury Feel', d: 'Prestige & design' }],
    [{ ic: '💰', t: 'Under EGP 5M', d: 'Entry level' }, { ic: '🏠', t: 'EGP 5–15M', d: 'Mid range' }, { ic: '🌟', t: 'EGP 15–30M', d: 'Premium' }, { ic: '💎', t: 'EGP 30M+', d: 'Ultra luxury' }],
    [{ ic: '🏙️', t: 'Urban & Connected', d: 'Close to everything' }, { ic: '🌿', t: 'Green & Quiet', d: 'Nature & peace' }, { ic: '🏊', t: 'Resort Living', d: 'Amenities & clubs' }, { ic: '👨‍👩‍👧', t: 'Family Compound', d: 'Schools & safety' }],
    [{ ic: '1️⃣', t: 'Studio / 1 Bed', d: 'Solo or couple' }, { ic: '2️⃣', t: '2–3 Beds', d: 'Small family' }, { ic: '3️⃣', t: '4–5 Beds', d: 'Growing family' }, { ic: '🏰', t: '6+ Beds', d: 'Villa / mansion' }]],

    dreamRes: {
      'High ROI': ['Uptown Cairo', 'AI 9.4 · +31% growth', 'Best capital appreciation in New Cairo.'],
      'Family Life': ['Hyde Park', 'AI 9.8 · 5th Settlement', 'Top schools, green spaces, premium community.'],
      'Location': ['Mivida', 'AI 9.1 · Emaar', 'Central 5th Settlement, best Ring Road access.'],
      'Luxury Feel': ['Taj City', 'AI 9.5 · New Cairo', 'Ultra luxury branded villas, resort amenities.']
    },
    aiResp: {
      def: "I'm Sierra, your AI concierge for New Cairo. Ask me about compounds, ROI, pricing or viewings.",
      hyde: 'Hyde Park (AI 9.8) — 5 units from EGP 8.8M. Capital appreciation +22% YoY. Best for luxury buyers.',
      mivida: 'Mivida by Emaar — best rental yield in 5th Settlement at 7.2%. 8 units from EGP 3.4M.',
      roi: 'Top ROI: ① Uptown Cairo +31% ② Mountain View +24% ③ Hyde Park +22% ④ Villette +20%.',
      rent: 'Best rentals: Al Rehab $600/mo · Madinaty $650/mo · Mivida $850/mo · Hyde Park $5,200/mo.',
      compare: 'Hyde Park vs Mivida: Hyde wins ROI (+22% vs +18%). Mivida wins rental yield (7.2%).',
      invest: 'Top 2026 picks: Uptown Cairo (+31%), Mountain View (+24%), Villette (+20%).'
    }
  },
  ar: {
    brand: 'سيرا إستيتس', brandSub: 'مستقبل العقارات',
    claim: 'احصل على', claimSub: 'رسوم الخدمة · أول 50 عميل · +10% لغير المصريين', reqNow: 'اطلب الآن',
    eyeHero: 'ذكاء اصطناعي · القاهرة الجديدة 2026',
    h1a: 'اعثر على', h1b: 'منزل أحلامك', h1c: 'إيجار وبيع.',
    heroSub: '21 كمبوند · +1200 وحدة · منتقاة بالذكاء الاصطناعي.',
    resale: 'بيع', rent: 'إيجار', srch: 'ابحث…', beds: 'غرف:', any: 'الكل', req: 'اطلب',
    s1: 'عقار', s2: 'توافق', s3: 'منطقة', s4: 'رد',
    eyeTour: 'جولة 360°', tourTit: 'جولة افتراضية', drag: 'اسحب 360° للاستكشاف',
    eyeList: 'المخزون بالذكاء', propTit: 'عقارات', viewAll: 'عرض الكل',
    eyeMap: 'خريطة الذكاء العقاري', mapTit: 'القاهرة الجديدة · مباشر',
    pickCpd: '← اختر كمبوندات — تظهر الوحدات على الخريطة', tapBadge: 'اضغط الشارة ← جدول الوحدات',
    sel: 'محدد', allCpd: 'كل الكمبوندات', nSel: ' كمبوند محدد', ' nSelP': ' كمبوندات محددة',
    eyeAI: 'خدمات الذكاء · 7 أدوات', aiTit: 'مركز الذكاء',
    aiOn: 'متصل · Gemini 2.0 Flash', aiName: 'سيرا الذكي',
    aiPh: 'اسأل سيرا عن القاهرة الجديدة…',
    c1: 'أفضل عائد', c2: 'هايد بارك', c3: 'إيجار ميفيدا', c4: 'قارن', c5: 'استثمر 2026',
    eyeWhy: 'مزايانا · بالذكاء الاصطناعي', whyTit: 'لماذا سيرا إستيتس',
    w1t: 'ماسح الفرص الذكي', w1s: 'سيرا يفحص +1200 وحدة يومياً بـ 6 أدوات ذكاء اصطناعي لإيجاد أفضل الفرص أولاً.',
    w2t: 'مستشار المنزل المثالي', w2s: 'أجب على 4 أسئلة وسيرا يوصي بالكمبوند والوحدة المثالية لميزانيتك وأهدافك.',
    w3t: 'تسعير AVM دقيق', w3s: 'محرك تقييم فوري يقارن كل وحدة مع 25 كمبوند في الوقت الفعلي.',
    w4t: 'إغلاق بشري + ذكاء', w4s: 'فرص يكتشفها الذكاء الاصطناعي + مستشارون خبراء. من أول توافق حتى التوقيع خلال 48 ساعة.',
    w5t: 'مخزون موثق', w5s: 'كل قائمة يتم التحقق منها شخصياً في الموقع قبل ظهورها.',
    w6t: 'رد في 4 ثوان', w6s: 'سيرا الذكي دائماً متصل. الوكلاء يتابعون خلال 4 ساعات.',
    nav: ['الرئيسية', 'بحث', 'خريطة', 'الذكاء', 'محفوظ'],
    wa: 'واتساب', call: 'اتصل',
    tId: 'رقم', tType: 'نوع', tBd: 'غرف', tArea: 'م²', tPrice: 'سعر', tAI: 'ذكاء', tStatus: 'الحالة', tCTA: 'تواصل',
    sAll: 'الكل', sAv: 'متاح', sUO: 'معروض', sSold: 'مُباع',
    pAv: 'متاح', pUO: 'معروض', pSold: 'مُباع', allBeds: 'كل الغرف',
    reqTit: 'اطلب عقاراً', reqSub: 'رسوم الخدمة · أول 50 مستخدم',
    nm: 'الاسم الكامل *', nmPh: 'اسمك الكامل', ph: 'رقم واتساب *', phPh: '+20 1XX XXX XXXX', cmt: 'تعليق (اختياري)', cmtPh: 'أخبرنا عن طلبك…',
    rooms: 'عدد الغرف', cmps: 'الكمبوندات (اختر أكثر)', budget: 'الميزانية', photo: 'صورة العقار (اختياري)', photoBtn: 'ارفع صورة',
    nationality: 'الغرض', natEg: 'إيجار', natNonEg: 'بيع',
    nonEgOffer: '🌍 غير مصري؟ خصم إضافي 10% — أماكن محدودة.',
    budgets: ['الكل', 'أقل من 5 مليون', '5-10 مليون', '10-20 مليون', 'أكثر من 20 مليون', 'أقل من 1000$', '1000-3000$', 'أكثر من 3000$'],
    submit: 'أرسل الطلب — خصم 25%', close: 'إغلاق',
    doneTit: 'تم استلام الطلب!', doneSub: 'سيتواصل معك فريقنا خلال 24 ساعة.',
    roiTit: 'تحليل العائد', roiCalc: 'حاسبة العائد', roiPrice: 'سعر الشراء', roiRent: 'الإيجار الشهري',
    roiG: 'العائد الإجمالي', roiN: 'العائد الصافي', roi5: 'ارتفاع 5 سنوات', roiCash: 'نقد سنوي',
    priceTit: 'التسعير الدقيق', priceSub: 'تقييم AVM مصري — نطاق سعر فوري',
    priceCpd: 'الكمبوند', priceArea: 'المساحة (م²)', priceBeds: 'عدد الغرف', priceFinish: 'التشطيب',
    finOpts: ['عادي', 'بريميوم', 'فاخر جداً'], priceResult: 'السعر المقدر', priceConf: 'ثقة الذكاء',
    matchTit: 'التوافق الذكي', matchSub: 'وحدات مرتبة بالذكاء الاصطناعي',
    dreamTit: 'مستشار المنزل المثالي', dreamSub: '4 أسئلة → توصية كمبوند مثالي',
    dreamNext: 'التالي →', dreamBack: '← السابق',
    dq: ['ما الأهم بالنسبة لك؟', 'ما ميزانيتك؟', 'أسلوب حياتك؟', 'كم غرفة تحتاج؟'],
    dh: ['أولويتك تحدد التوصية.', 'حدد نطاقك المريح.', 'أين ترى نفسك؟', 'كم عدد الغرف؟'],
    do: [
    [{ ic: '📈', t: 'عائد مرتفع', d: 'الاستثمار أولاً' }, { ic: '🏡', t: 'حياة عائلية', d: 'مساحة ومجتمع' }, { ic: '🚗', t: 'الموقع', d: 'التنقل والوصول' }, { ic: '🎨', t: 'الفخامة', d: 'التصميم والرقي' }],
    [{ ic: '💰', t: 'أقل من 5 مليون', d: 'مستوى مدخل' }, { ic: '🏠', t: '5-15 مليون', d: 'متوسط' }, { ic: '🌟', t: '15-30 مليون', d: 'بريميوم' }, { ic: '💎', t: '30 مليون+', d: 'فاخر جداً' }],
    [{ ic: '🏙️', t: 'حضري ومتصل', d: 'قريب من كل شيء' }, { ic: '🌿', t: 'أخضر وهادئ', d: 'الطبيعة والسكينة' }, { ic: '🏊', t: 'حياة المنتجع', d: 'المرافق والنوادي' }, { ic: '👨‍👩‍👧', t: 'مجتمع عائلي', d: 'مدارس وأمان' }],
    [{ ic: '1️⃣', t: 'ستوديو / 1 غرفة', d: 'فردي أو زوجين' }, { ic: '2️⃣', t: '2-3 غرف', d: 'عائلة صغيرة' }, { ic: '3️⃣', t: '4-5 غرف', d: 'عائلة متنامية' }, { ic: '🏰', t: '6+ غرف', d: 'فيلا / قصر' }]],

    dreamRes: {
      'عائد مرتفع': ['أبتاون القاهرة', 'AI 9.4 · +31% نمو', 'أفضل ارتفاع رأس المال في القاهرة الجديدة.'],
      'حياة عائلية': ['هايد بارك', 'AI 9.8 · التجمع الخامس', 'أفضل مدارس ومساحات خضراء.'],
      'الموقع': ['ميفيدا', 'AI 9.1 · إعمار', 'وسط التجمع الخامس، أفضل وصول للدائري.'],
      'الفخامة': ['تاج سيتي', 'AI 9.5 · القاهرة الجديدة', 'فيلات فاخرة مع مرافق منتجع.']
    },
    aiResp: {
      def: 'أنا سيرا، مساعدك الذكي. اسألني عن الكمبوندات أو العائد أو الأسعار.',
      hyde: 'هايد بارك (AI 9.8) — 5 وحدات من 8.8 مليون جنيه. ارتفاع سنوي +22%.',
      mivida: 'ميفيدا — أفضل عائد إيجاري في التجمع الخامس بنسبة 7.2%.',
      roi: 'أفضل عائد: ① أبتاون +31% ② ماونتن فيو +24% ③ هايد بارك +22%.',
      rent: 'أفضل إيجارات: الرحاب $600 · مدينتي $650 · ميفيدا $850 · هايد بارك $5,200.',
      compare: 'هايد بارك مقابل ميفيدا: هايد أفضل عائد. ميفيدا أفضل للإيجار.',
      invest: 'أفضل استثمارات 2026: أبتاون (+31%)، ماونتن فيو (+24%)، فيليت (+20%).'
    }
  }
};

/* ── COMPOUND DATA ── */
const CPDS = [
{ n: 'Katameya Heights', c: [29.99, 31.48], g: '+10%', ai: 9, z: 'Katameya', priceM: 26, rent: 5000 },
{ n: 'Katameya Dunes', c: [29.985, 31.492], g: '+12%', ai: 8.8, z: 'Katameya', priceM: 18, rent: 3400 },
{ n: 'Swan Lake Residence', c: [30.045, 31.635], g: '+15%', ai: 8.9, z: '5th Settlement', priceM: 8.5, rent: 1700 },
{ n: 'Mivida', c: [30.007, 31.589], g: '+18%', ai: 9.1, z: '5th Settlement', priceM: 10.5, rent: 2100 },
{ n: 'Cairo Festival City (CFC) Residences', c: [30.016, 31.469], g: '+12%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500 },
{ n: 'Hyde Park New Cairo', c: [30.008, 31.645], g: '+22%', ai: 9.8, z: '5th Settlement', priceM: 28.5, rent: 5200 },
{ n: 'Taj City', c: [30.065, 31.531], g: '+19%', ai: 9.5, z: 'New Cairo', priceM: 35, rent: 6500 },
{ n: 'Eastown (SODIC)', c: [30.018, 31.587], g: '+19%', ai: 9, z: '5th Settlement', priceM: 11.5, rent: 2400 },
{ n: 'Mountain View iCity', c: [30.014, 31.618], g: '+24%', ai: 9.6, z: '5th Settlement', priceM: 22, rent: 3200 },
{ n: 'Zed East (Ora)', c: [30.095, 31.61], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600 },
{ n: 'Palm Hills New Cairo', c: [30.002, 31.608], g: '+21%', ai: 9.2, z: '5th Settlement', priceM: 25, rent: 4800 },
{ n: 'The Waterway', c: [30.04, 31.47], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 12, rent: 2300 },
{ n: 'Lake View / Lake View Residence', c: [30.022, 31.532], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 9.5, rent: 1900 },
{ n: 'Fifth Square (Al Marasem)', c: [30.025, 31.578], g: '+17%', ai: 9, z: '5th Settlement', priceM: 8.5, rent: 1750 },
{ n: 'Villette (SODIC)', c: [30.053, 31.598], g: '+20%', ai: 9.3, z: '5th Settlement', priceM: 24.5, rent: 4400 },
{ n: 'Stone Residence (Rooya Group)', c: [30.028, 31.557], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.8, rent: 1550 },
{ n: 'The Square (Al Ahly Sabbour)', c: [30.033, 31.542], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9, rent: 1800 },
{ n: 'El Patio Oro (La Vista)', c: [30.029, 31.56], g: '+15%', ai: 8.9, z: 'New Cairo', priceM: 10, rent: 2000 },
{ n: 'El Patio 7 (La Vista)', c: [30.035, 31.565], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8.5, rent: 1700 },
{ n: 'Katameya Gardens', c: [29.992, 31.488], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 15, rent: 2800 },
{ n: 'Village Gardens Katameya (Palm Hills)', c: [29.988, 31.484], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 16, rent: 3000 },
{ n: 'Galleria Moon Valley (Arabia Holding)', c: [30.02, 31.55], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7, rent: 1400 },
{ n: '90 Avenue (Tabarak)', c: [30.028, 31.572], g: '+14%', ai: 8.8, z: '5th Settlement', priceM: 8, rent: 1600 },
{ n: 'Azzar New Cairo (Reedy Group)', c: [30.022, 31.568], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500 },
{ n: 'District 5 (Marakez)', c: [30.012, 31.5], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9.5, rent: 1900 },
{ n: 'The Brooks (PRE Developments)', c: [30.07, 31.57], g: '+17%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1400 },
{ n: 'STEI8HT (LMD)', c: [30.075, 31.575], g: '+16%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300 },
{ n: 'The Crest (IL Cazar)', c: [30.068, 31.562], g: '+15%', ai: 8.7, z: 'Mostakbal', priceM: 7.2, rent: 1450 },
{ n: 'Azad & Azad Views (Tameer)', c: [30.078, 31.558], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 6.8, rent: 1350 },
{ n: 'Eastshire (Alqamzi)', c: [30.082, 31.565], g: '+13%', ai: 8.5, z: 'Mostakbal', priceM: 6, rent: 1200 },
{ n: 'The Waterway Branded Residences', c: [30.042, 31.472], g: '+18%', ai: 9.1, z: 'New Cairo', priceM: 18, rent: 3500 },
{ n: 'Aster Residence', c: [30.062, 31.548], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8, rent: 1600 },
{ n: 'The MarQ', c: [30.058, 31.544], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 9, rent: 1800 },
{ n: 'Capital Gate (Al Marasem)', c: [30.026, 31.58], g: '+16%', ai: 9, z: '5th Settlement', priceM: 8.5, rent: 1700 },
{ n: 'Bloomfields (Tatweer Misr)', c: [30.08, 31.55], g: '+16%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1500 },
{ n: 'IL Bosco City (Misr Italia)', c: [30.085, 31.556], g: '+17%', ai: 9, z: 'Mostakbal', priceM: 8.5, rent: 1700 },
{ n: 'Odyssia (Al Ahly Sabbour)', c: [30.09, 31.56], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.5, rent: 1500 },
{ n: 'Haptown (Hassan Allam)', c: [30.086, 31.553], g: '+15%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300 },
{ n: 'Sarai (Madinet Masr)', c: [30.105, 31.662], g: '+14%', ai: 8.9, z: 'New Cairo', priceM: 7, rent: 1400 },
{ n: 'Madinaty', c: [30.078, 31.657], g: '+13%', ai: 8.7, z: 'Madinaty', priceM: 4.5, rent: 900 },
{ n: 'El Shorouk', c: [30.13, 31.62], g: '+11%', ai: 8.5, z: 'El Shorouk', priceM: 5.5, rent: 1100 }];



/* ── UNIT DATA (key compounds) ── */
const UNITS = {
  'Hyde Park': [
  { id: 'HP-001', type: 'Villa', beds: 5, bath: 5, area: 480, egpM: 28.5, usd: 5200, status: 'Available', ai: 9.8 },
  { id: 'HP-002', type: 'Villa', beds: 4, bath: 4, area: 380, egpM: 21.5, usd: 4200, status: 'Available', ai: 9.7 },
  { id: 'HP-003', type: 'Twin House', beds: 4, bath: 3, area: 320, egpM: 18.5, usd: 3800, status: 'Under Offer', ai: 9.5 },
  { id: 'HP-004', type: 'Townhouse', beds: 3, bath: 3, area: 240, egpM: 14.2, usd: 2900, status: 'Available', ai: 9.3 },
  { id: 'HP-005', type: 'Penthouse', beds: 4, bath: 3, area: 290, egpM: 17.2, usd: 3500, status: 'Available', ai: 9.6 },
  { id: 'HP-006', type: 'Apartment', beds: 3, bath: 2, area: 175, egpM: 8.8, usd: 1850, status: 'Sold', ai: 9.1 }],

  'Mountain View iCity': [
  { id: 'MV-001', type: 'Villa', beds: 4, bath: 4, area: 350, egpM: 22.0, usd: 3200, status: 'Available', ai: 9.6 },
  { id: 'MV-002', type: 'Twin House', beds: 3, bath: 3, area: 280, egpM: 15.5, usd: 2400, status: 'Available', ai: 9.4 },
  { id: 'MV-003', type: 'Apartment', beds: 3, bath: 2, area: 155, egpM: 7.8, usd: 1650, status: 'Under Offer', ai: 9.2 },
  { id: 'MV-004', type: 'Duplex', beds: 4, bath: 3, area: 260, egpM: 14.0, usd: 2800, status: 'Available', ai: 9.5 },
  { id: 'MV-005', type: 'Apartment', beds: 2, bath: 2, area: 120, egpM: 6.2, usd: 1400, status: 'Available', ai: 9.0 }],

  'Mivida': [
  { id: 'MI-001', type: 'Apartment', beds: 1, bath: 1, area: 75, egpM: 3.4, usd: 850, status: 'Available', ai: 8.8 },
  { id: 'MI-002', type: 'Apartment', beds: 2, bath: 2, area: 110, egpM: 5.2, usd: 1300, status: 'Available', ai: 9.0 },
  { id: 'MI-003', type: 'Apartment', beds: 3, bath: 2, area: 145, egpM: 6.8, usd: 1650, status: 'Available', ai: 9.1 },
  { id: 'MI-004', type: 'Twin House', beds: 3, bath: 3, area: 210, egpM: 9.5, usd: 2100, status: 'Available', ai: 9.3 },
  { id: 'MI-005', type: 'Villa', beds: 4, bath: 4, area: 310, egpM: 15.8, usd: 3200, status: 'Under Offer', ai: 9.4 },
  { id: 'MI-006', type: 'Penthouse', beds: 3, bath: 2, area: 200, egpM: 11.2, usd: 2400, status: 'Available', ai: 9.2 }],

  'Uptown Cairo': [
  { id: 'UC-001', type: 'Apartment', beds: 2, bath: 2, area: 130, egpM: 7.2, usd: 1600, status: 'Available', ai: 9.3 },
  { id: 'UC-002', type: 'Penthouse', beds: 4, bath: 3, area: 300, egpM: 18.5, usd: 3800, status: 'Available', ai: 9.5 },
  { id: 'UC-003', type: 'Villa', beds: 5, bath: 4, area: 420, egpM: 25.0, usd: 4800, status: 'Available', ai: 9.4 },
  { id: 'UC-004', type: 'Duplex', beds: 4, bath: 3, area: 280, egpM: 16.0, usd: 3200, status: 'Available', ai: 9.3 }],

  'Madinaty': [
  { id: 'MD-001', type: 'Apartment', beds: 1, bath: 1, area: 65, egpM: 2.8, usd: 650, status: 'Available', ai: 8.5 },
  { id: 'MD-002', type: 'Apartment', beds: 2, bath: 2, area: 100, egpM: 3.8, usd: 900, status: 'Available', ai: 8.7 },
  { id: 'MD-003', type: 'Apartment', beds: 3, bath: 2, area: 140, egpM: 4.5, usd: 1100, status: 'Available', ai: 8.8 },
  { id: 'MD-004', type: 'Villa', beds: 4, bath: 3, area: 280, egpM: 12.5, usd: 2200, status: 'Available', ai: 8.9 }],

  'Villette': [
  { id: 'VL-001', type: 'Villa', beds: 5, bath: 5, area: 520, egpM: 32.0, usd: 5800, status: 'Available', ai: 9.4 },
  { id: 'VL-002', type: 'Twin House', beds: 4, bath: 4, area: 340, egpM: 19.5, usd: 3600, status: 'Available', ai: 9.3 },
  { id: 'VL-003', type: 'Villa', beds: 4, bath: 4, area: 390, egpM: 24.5, usd: 4400, status: 'Available', ai: 9.5 }],

  'Taj City': [
  { id: 'TC-001', type: 'Villa', beds: 5, bath: 5, area: 500, egpM: 35.0, usd: 6500, status: 'Available', ai: 9.5 },
  { id: 'TC-002', type: 'Villa', beds: 4, bath: 4, area: 400, egpM: 27.5, usd: 5000, status: 'Available', ai: 9.4 },
  { id: 'TC-003', type: 'Penthouse', beds: 3, bath: 3, area: 280, egpM: 18.0, usd: 3400, status: 'Available', ai: 9.2 }],

  'Eastown': [
  { id: 'ET-001', type: 'Apartment', beds: 2, bath: 2, area: 120, egpM: 6.5, usd: 1500, status: 'Available', ai: 8.9 },
  { id: 'ET-002', type: 'Apartment', beds: 3, bath: 2, area: 160, egpM: 8.2, usd: 1900, status: 'Available', ai: 9.0 },
  { id: 'ET-003', type: 'Twin House', beds: 4, bath: 3, area: 270, egpM: 14.8, usd: 2800, status: 'Available', ai: 9.2 }],

  'SODIC East': [
  { id: 'SE-001', type: 'Apartment', beds: 2, bath: 2, area: 118, egpM: 6.0, usd: 1400, status: 'Available', ai: 9.1 },
  { id: 'SE-002', type: 'Townhouse', beds: 3, bath: 3, area: 235, egpM: 12.0, usd: 2500, status: 'Available', ai: 9.0 },
  { id: 'SE-003', type: 'Villa', beds: 4, bath: 4, area: 320, egpM: 18.5, usd: 3400, status: 'Under Offer', ai: 9.1 }],

  'Palm Hills NC': [
  { id: 'PH-001', type: 'Villa', beds: 5, bath: 5, area: 460, egpM: 30.0, usd: 5500, status: 'Available', ai: 9.2 },
  { id: 'PH-002', type: 'Twin House', beds: 4, bath: 4, area: 310, egpM: 19.0, usd: 3400, status: 'Available', ai: 9.1 },
  { id: 'PH-003', type: 'Villa', beds: 4, bath: 4, area: 380, egpM: 23.5, usd: 4200, status: 'Under Offer', ai: 9.3 }],

  'Sarai': [
  { id: 'SR-001', type: 'Apartment', beds: 2, bath: 2, area: 115, egpM: 4.2, usd: 950, status: 'Available', ai: 8.8 },
  { id: 'SR-002', type: 'Villa', beds: 4, bath: 3, area: 290, egpM: 14.0, usd: 2800, status: 'Available', ai: 9.1 }],

  'El Shorouk': [
  { id: 'ES-001', type: 'Apartment', beds: 2, bath: 1, area: 95, egpM: 2.8, usd: 680, status: 'Available', ai: 8.5 },
  { id: 'ES-002', type: 'Villa', beds: 4, bath: 3, area: 280, egpM: 10.5, usd: 1900, status: 'Available', ai: 8.7 }],

  'Al Rehab': [
  { id: 'AR-001', type: 'Apartment', beds: 2, bath: 1, area: 90, egpM: 2.5, usd: 600, status: 'Available', ai: 8.4 },
  { id: 'AR-002', type: 'Villa', beds: 4, bath: 3, area: 260, egpM: 9.8, usd: 1700, status: 'Available', ai: 8.6 },
  { id: 'AR-003', type: 'Duplex', beds: 3, bath: 2, area: 185, egpM: 6.5, usd: 1400, status: 'Available', ai: 8.5 }]

};


// Name aliases for UNITS lookup
UNITS['Hyde Park New Cairo'] = UNITS['Hyde Park'] || [];
UNITS['Villette (SODIC)'] = UNITS['Villette'] || [];
UNITS['Eastown (SODIC)'] = UNITS['Eastown'] || [];
UNITS['Sarai (Madinet Masr)'] = UNITS['Sarai'] || [];
UNITS['Bloomfields (Tatweer Misr)'] = UNITS['Bloomfields'] || [];
UNITS['Fifth Square (Al Marasem)'] = UNITS['Fifth Square'] || [];
UNITS['Palm Hills New Cairo'] = UNITS['Palm Hills NC'] || [];

/* ── FEATURED LISTINGS ── */
const FEATURED = [
{ id: 1, cmp: 'Hyde Park', type: 'Villa', beds: 5, bath: 5, area: 480, egpM: 28.5, usd: 5200, ai: 9.8, tag: 'Premium', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=85' },
{ id: 2, cmp: 'Mountain View iCity', type: 'Twin House', beds: 4, bath: 3, area: 280, egpM: 15.5, usd: 2400, ai: 9.6, tag: 'Featured', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=85' },
{ id: 3, cmp: 'Mivida', type: 'Apartment', beds: 3, bath: 2, area: 145, egpM: 6.8, usd: 1650, ai: 9.1, tag: 'Smart Match', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=85' },
{ id: 4, cmp: 'Uptown Cairo', type: 'Penthouse', beds: 4, bath: 3, area: 300, egpM: 18.5, usd: 3800, ai: 9.5, tag: 'Exclusive', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=85' },
{ id: 5, cmp: 'Taj City', type: 'Villa', beds: 5, bath: 5, area: 500, egpM: 35.0, usd: 6500, ai: 9.5, tag: 'Premium', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85' },
{ id: 6, cmp: 'Villette', type: 'Villa', beds: 4, bath: 4, area: 390, egpM: 24.5, usd: 4400, ai: 9.3, tag: 'New', img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=85' },
{ id: 7, cmp: 'Palm Hills NC', type: 'Villa', beds: 4, bath: 3, area: 380, egpM: 23.5, usd: 4200, ai: 9.2, tag: 'Best ROI', img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=85' },
{ id: 8, cmp: 'Eastown', type: 'Duplex', beds: 3, bath: 2, area: 220, egpM: 11.5, usd: 2400, ai: 9.1, tag: null, img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=600&q=85' },
{ id: 9, cmp: 'Madinaty', type: 'Villa', beds: 4, bath: 3, area: 280, egpM: 12.5, usd: 2200, ai: 8.9, tag: null, img: 'https://images.unsplash.com/photo-1568605114967-8130f3a3699f?w=600&q=85' },
{ id: 10, cmp: 'SODIC East', type: 'Villa', beds: 4, bath: 4, area: 320, egpM: 18.5, usd: 3400, ai: 9.1, tag: 'New', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=85' },
{ id: 11, cmp: 'Sarai', type: 'Villa', beds: 4, bath: 3, area: 290, egpM: 14.0, usd: 2800, ai: 9.1, tag: null, img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=85' },
{ id: 12, cmp: 'Palm Hills NC', type: 'Villa', beds: 5, bath: 5, area: 460, egpM: 30.0, usd: 5500, ai: 9.2, tag: 'Premium', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=85' },
{ id: 13, cmp: 'Villette', type: 'Twin House', beds: 4, bath: 4, area: 340, egpM: 19.5, usd: 3600, ai: 9.3, tag: null, img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85' },
{ id: 14, cmp: 'Taj City', type: 'Penthouse', beds: 3, bath: 3, area: 280, egpM: 18.0, usd: 3400, ai: 9.2, tag: 'Exclusive', img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=85' },
{ id: 15, cmp: 'Eastown', type: 'Apartment', beds: 3, bath: 2, area: 160, egpM: 8.2, usd: 1900, ai: 9.0, tag: null, img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=85' },
{ id: 16, cmp: 'Hyde Park', type: 'Twin House', beds: 4, bath: 4, area: 350, egpM: 22.0, usd: 4000, ai: 9.4, tag: 'Featured', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85' },
{ id: 17, cmp: 'Mivida', type: 'Duplex', beds: 3, bath: 3, area: 210, egpM: 9.8, usd: 2200, ai: 9.0, tag: null, img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=85' },
{ id: 18, cmp: 'Mountain View iCity', type: 'Apartment', beds: 2, bath: 2, area: 130, egpM: 5.6, usd: 1300, ai: 8.9, tag: null, img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=85' },
{ id: 19, cmp: 'Uptown Cairo', type: 'Apartment', beds: 3, bath: 2, area: 175, egpM: 10.2, usd: 2300, ai: 9.0, tag: 'Smart Match', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=85' },
{ id: 20, cmp: 'Al Rehab', type: 'Duplex', beds: 3, bath: 2, area: 185, egpM: 6.5, usd: 1400, ai: 8.5, tag: null, img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=600&q=85' },
{ id: 21, cmp: 'El Shorouk', type: 'Villa', beds: 4, bath: 3, area: 280, egpM: 10.5, usd: 1900, ai: 8.7, tag: null, img: 'https://images.unsplash.com/photo-1568605114967-8130f3a3699f?w=600&q=85' },
{ id: 22, cmp: 'Madinaty', type: 'Apartment', beds: 3, bath: 2, area: 140, egpM: 4.5, usd: 1100, ai: 8.8, tag: null, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=85' },
{ id: 23, cmp: 'Palm Hills NC', type: 'Twin House', beds: 4, bath: 4, area: 310, egpM: 19.0, usd: 3400, ai: 9.1, tag: 'Best ROI', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=85' },
{ id: 24, cmp: 'Taj City', type: 'Villa', beds: 4, bath: 4, area: 400, egpM: 27.5, usd: 5000, ai: 9.4, tag: null, img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=85' },
{ id: 25, cmp: 'SODIC East', type: 'Apartment', beds: 2, bath: 2, area: 118, egpM: 6.0, usd: 1400, ai: 9.1, tag: null, img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85' },
{ id: 26, cmp: 'Villette', type: 'Villa', beds: 5, bath: 5, area: 520, egpM: 32.0, usd: 5800, ai: 9.5, tag: 'Premium', img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=85' }];


/* ── TOUR ROOMS ── */
const ROOMS = [
{ name: 'Luxury Living Room', sub: 'Hyde Park · Grand Villa · 5th Settlement', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=2400&q=90' },
{ name: 'Master Bedroom Suite', sub: 'Mountain View iCity · Penthouse Level', img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=2400&q=90' },
{ name: 'Chef\'s Kitchen', sub: 'Villette · Villa G-Type', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90' },
{ name: 'Infinity Pool & Deck', sub: 'Taj City · Signature Villa', img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=2400&q=90' },
{ name: 'Rooftop Sky Terrace', sub: 'Uptown Cairo · Penthouse Level', img: 'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=2400&q=90' },
{ name: 'Villa Grand Exterior', sub: 'Palm Hills NC · Corner Plot', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=2400&q=90' }];



window.LANG = LANG; window.CPDS = CPDS; window.UNITS = UNITS; window.FEATURED = FEATURED; window.ROOMS = ROOMS;
