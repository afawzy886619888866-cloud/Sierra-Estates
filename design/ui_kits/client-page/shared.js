/* ============================================================
   Sierra Estates — shared.js
   HZ namespace: i18n, chrome (nav/footer), theme + lang, reveal,
   count-up, property-card renderer.
   ============================================================ */
(function () {

  /* ── i18n dictionary ── */
  var DICT = {
    en: {
      /* nav */
      navHome:'Home', navProps:'Properties', navCompounds:'Compounds',
      navTour:'Virtual Tour', navAI:'AI Hub', navContact:'Contact',
      navList:'List Property',
      /* hero */
      heroSub:'AI-scored inventory across 19 New Cairo compounds — resale, rent and new launches, all verified.',
      q1:'1,900+ verified listings', q2:'50+ premium compounds', q3:'100% escrow-secured',
      exploreMapBtn:'Explore the New Cairo map',
      /* search */
      tabBuy:'Buy', tabRent:'Rent', tabNew:'New Launch',
      fLoc:'Location', vLoc:'New Cairo', fType:'Property Type', vType:'Any type',
      fBeds:'Bedrooms', vBeds:'Any', fPrice:'Max Price', vPrice:'No limit', search:'Search',
      /* featured */
      eyeList:'Featured Inventory', featTit:'Properties worth your attention',
      featSub:'Hand-picked, AI-scored listings updated daily across New Cairo.',
      viewAll:'View all',
      /* compounds */
      eyeCpd:'Premium Compounds', cpdTit:'Explore New Cairo\u2019s finest',
      cpdSub:'The most sought-after gated communities, ranked by our AI.', allCpds:'All compounds',
      /* tour */
      eyeTour:'Immersive 360\u00b0', tourTit:'Walk through before you visit',
      tourSub:'Step inside our signature villas with a full 360\u00b0 virtual tour.',
      tourLaunchTit:'Launch the 360\u00b0 virtual tour', tourLaunchSub:'6 rooms \u00b7 drag to look around',
      /* map */
      eyeMap:'Map Intelligence', mapTit:'See every compound on the map',
      mapSub:'Live pricing, growth, and inventory across New Cairo\u2019s top compounds.',
      mapCta:'Open full map', mapOpenFull:'Open full map', mapLegend:'Live compound data',
      /* stats */
      stat1:'Verified listings', stat2:'Compounds covered', stat3:'Avg. days to close',
      stat4:'Sold in 2025',
      /* why */
      eyeWhy:'Why Sierra', whyTit:'A smarter way to buy in New Cairo',
      whySub:'Data, not guesswork \u2014 every decision backed by our real-time market engine.',
      netEye:'The Sierra Network', netTit:'One team, every premium developer',
      netBody:'Direct inventory from Emaar, SODIC, Mountain View, Palm Hills and more \u2014 no middlemen, no inflated prices, full escrow protection on every deal.',
      netS1L:'Active clients', netS2L:'Elite brokers', netS3L:'Escrow-secured',
      w1t:'AI market radar', w1s:'Live pricing signals across all 19 compounds, refreshed hourly.',
      w2t:'ROI intelligence', w2s:'Projected yield and appreciation modelled per unit.',
      w3t:'Concierge service', w3s:'A dedicated advisor from first viewing to final signature.',
      w4t:'Verified only', w4s:'Every listing legally checked before it reaches you.',
      /* testimonials */
      eyeTesti:'Client Stories', testiTit:'Trusted by New Cairo buyers',
      testiSub:'Real outcomes from families and investors we\u2019ve placed.',
      t1n:'Omar El-Sayed', t1r:'Bought in Mivida',
      t1q:'The AI match shortlisted three villas that fit us perfectly. We closed in under three weeks.',
      t2n:'Nadia Farouk', t2r:'Invested in Hyde Park',
      t2q:'ROI projections were spot on. Sierra\u2019s advisor knew every compound inside out.',
      t3n:'Karim Adel', t3r:'Rented in Eastown',
      t3q:'Escrow protection gave me total peace of mind. Genuinely effortless from start to finish.',
      /* perfect + inquiry */
      eyePerfect:'The Sierra Difference', perfTit:'Built for the perfect match',
      perfSub:'Three pillars behind every Sierra placement.',
      pc1t:'AI shortlisting', pc1s:'We score every unit against your brief and surface only the strong fits.',
      pc2t:'Transparent pricing', pc2s:'Live comparables so you always know a fair market number.',
      pc3t:'End-to-end support', pc3s:'Legal, financing and handover handled by one dedicated team.',
      inqTit:'Request a callback', inqSub:'Tell us what you\u2019re after \u2014 we\u2019ll match it within 24h.',
      inqBuy:'Buy', inqRent:'Rent', inqSell:'Sell',
      inqName:'Full name', inqPhone:'Phone', inqEmail:'Email', inqZone:'Preferred zone',
      inqType2:'Property type', inqBudget:'Budget (EGP)', inqSend:'Send request',
      z1:'New Cairo', z2:'Fifth Settlement', z3:'Madinaty', z4:'El Shorouk',
      lVilla:'Villa', lApt:'Apartment', lTwin:'Twin House', lPent:'Penthouse',
      /* AI hub */
      aiEye:'Sierra AI \u00b7 live', aiTit:'Seven engines working for your next home',
      aiSub:'Our intelligence layer runs across pricing, matching and market data in real time.',
      aiLive:'Live',
      ai1t:'Market Engine', ai1s:'Real-time pricing & demand across every compound.',
      ai2t:'Smart Match', ai2s:'Ranks listings against your exact brief.',
      ai3t:'ROI Analyst', ai3s:'Projected yield and appreciation per unit.',
      ai4t:'Price Guard', ai4s:'Flags over- and under-priced listings instantly.',
      ai5t:'Dream Finder', ai5s:'Describe your home \u2014 we find it.',
      ai6t:'Interactive Map', ai6s:'Explore New Cairo by price, zone and score.',
      ai7t:'360\u00b0 Tour', ai7s:'Immersive walk-throughs of signature units.',
      /* cta */
      ctaTit:'Ready to find your New Cairo home?',
      ctaSub:'List your property or book a free consultation with a Sierra advisor.',
      ctaBtn1:'List a property', ctaBtn2:'Call an advisor',
      /* partners */
      partEye:'Trusted by New Cairo\u2019s leading developers',
      /* footer */
      fTagline:'AI-guided real estate for New Cairo \u2014 verified inventory, transparent pricing, full escrow protection.',
      fExplore:'Explore', fCompany:'Company', fLegal:'Legal',
      fRights:'\u00a9 2026 Sierra Estates \u00b7 New Cairo, Egypt. All rights reserved.',
      fPrivacy:'Privacy', fTerms:'Terms', fCookies:'Cookies'
    },
    ar: {
      navHome:'الرئيسية', navProps:'العقارات', navCompounds:'الكمباوندات',
      navTour:'جولة افتراضية', navAI:'مركز الذكاء', navContact:'تواصل',
      navList:'أضف عقارك',
      heroSub:'مخزون مقيّم بالذكاء الاصطناعي في 19 كمباوند بالقاهرة الجديدة — بيع وإيجار وإطلاقات جديدة، الكل موثّق.',
      q1:'أكثر من 1900 عقار موثّق', q2:'أكثر من 50 كمباوند فاخر', q3:'حماية كاملة بالضمان',
      exploreMapBtn:'استكشف خريطة القاهرة الجديدة',
      tabBuy:'شراء', tabRent:'إيجار', tabNew:'إطلاق جديد',
      fLoc:'الموقع', vLoc:'القاهرة الجديدة', fType:'نوع العقار', vType:'أي نوع',
      fBeds:'غرف النوم', vBeds:'أي عدد', fPrice:'أقصى سعر', vPrice:'بلا حد', search:'بحث',
      eyeList:'عقارات مميزة', featTit:'عقارات تستحق اهتمامك',
      featSub:'قوائم مختارة ومقيّمة بالذكاء الاصطناعي، تُحدّث يومياً.',
      viewAll:'عرض الكل',
      eyeCpd:'كمباوندات فاخرة', cpdTit:'استكشف أرقى مجتمعات القاهرة الجديدة',
      cpdSub:'أكثر المجتمعات المغلقة طلباً، مرتبة بذكائنا الاصطناعي.', allCpds:'كل الكمباوندات',
      eyeTour:'جولة 360°', tourTit:'تجوّل قبل أن تزور',
      tourSub:'ادخل فيلاتنا المميزة بجولة افتراضية كاملة 360°.',
      tourLaunchTit:'ابدأ الجولة الافتراضية 360°', tourLaunchSub:'6 غرف · اسحب للنظر حولك',
      /* map */
      eyeMap:'ذكاء الخريطة', mapTit:'شوف كل كمباوند عالخريطة',
      mapSub:'أسعار حيّة، نمو، ومخزون عبر أفضل كمباوندات القاهرة الجديدة.',
      mapCta:'افتح الخريطة الكاملة', mapOpenFull:'افتح الخريطة الكاملة', mapLegend:'بيانات حيّة للكمباوندات',
      stat1:'عقار موثّق', stat2:'كمباوند مغطّى', stat3:'متوسط أيام الإغلاق',
      stat4:'تم بيعها 2025',
      eyeWhy:'لماذا سييرا', whyTit:'طريقة أذكى للشراء في القاهرة الجديدة',
      whySub:'بيانات لا تخمين — كل قرار مدعوم بمحرك السوق اللحظي.',
      netEye:'شبكة سييرا', netTit:'فريق واحد، كل مطوّر فاخر',
      netBody:'مخزون مباشر من إعمار وسوديك وماونتن فيو وبالم هيلز وغيرها — دون وسطاء ولا أسعار مبالغ فيها، مع حماية ضمان كاملة لكل صفقة.',
      netS1L:'عميل نشط', netS2L:'وسيط نخبة', netS3L:'مؤمّن بالضمان',
      w1t:'رادار السوق الذكي', w1s:'مؤشرات أسعار حية لكل الكمباوندات الـ19، تُحدّث كل ساعة.',
      w2t:'ذكاء العائد', w2s:'العائد والارتفاع المتوقع محسوب لكل وحدة.',
      w3t:'خدمة كونسيرج', w3s:'مستشار مخصّص من أول معاينة حتى التوقيع النهائي.',
      w4t:'موثّق فقط', w4s:'كل عقار يُراجع قانونياً قبل أن يصل إليك.',
      eyeTesti:'قصص العملاء', testiTit:'موثوق من مشتري القاهرة الجديدة',
      testiSub:'نتائج حقيقية لعائلات ومستثمرين ساعدناهم.',
      t1n:'عمر السيد', t1r:'اشترى في ميفيدا',
      t1q:'المطابقة الذكية اختارت ثلاث فيلات تناسبنا تماماً. أنهينا الصفقة في أقل من ثلاثة أسابيع.',
      t2n:'نادية فاروق', t2r:'استثمرت في هايد بارك',
      t2q:'توقعات العائد كانت دقيقة. مستشار سييرا يعرف كل كمباوند عن ظهر قلب.',
      t3n:'كريم عادل', t3r:'استأجر في إيستاون',
      t3q:'حماية الضمان أعطتني راحة بال كاملة. تجربة سلسة من البداية للنهاية.',
      eyePerfect:'فارق سييرا', perfTit:'مصمّم للمطابقة المثالية',
      perfSub:'ثلاث ركائز خلف كل صفقة سييرا.',
      pc1t:'الاختيار الذكي', pc1s:'نقيّم كل وحدة مقابل طلبك ونعرض الأنسب فقط.',
      pc2t:'تسعير شفّاف', pc2s:'مقارنات حية لتعرف دائماً السعر العادل.',
      pc3t:'دعم متكامل', pc3s:'القانون والتمويل والتسليم بيد فريق واحد مخصّص.',
      inqTit:'اطلب معاودة اتصال', inqSub:'أخبرنا بما تريد — سنطابقه خلال 24 ساعة.',
      inqBuy:'شراء', inqRent:'إيجار', inqSell:'بيع',
      inqName:'الاسم الكامل', inqPhone:'الهاتف', inqEmail:'البريد', inqZone:'المنطقة المفضلة',
      inqType2:'نوع العقار', inqBudget:'الميزانية (ج.م)', inqSend:'إرسال الطلب',
      z1:'القاهرة الجديدة', z2:'التجمع الخامس', z3:'مدينتي', z4:'الشروق',
      lVilla:'فيلا', lApt:'شقة', lTwin:'تاون هاوس', lPent:'بنتهاوس',
      aiEye:'ذكاء سييرا · مباشر', aiTit:'سبعة محركات تعمل لأجل منزلك القادم',
      aiSub:'طبقة الذكاء لدينا تعمل على التسعير والمطابقة وبيانات السوق لحظياً.',
      aiLive:'مباشر',
      ai1t:'محرك السوق', ai1s:'تسعير وطلب لحظي في كل الكمباوندات.',
      ai2t:'المطابقة الذكية', ai2s:'يرتّب العقارات وفق طلبك بدقة.',
      ai3t:'محلل العائد', ai3s:'العائد والارتفاع المتوقع لكل وحدة.',
      ai4t:'حارس السعر', ai4s:'يرصد المبالغة أو التخفيض فوراً.',
      ai5t:'باحث الأحلام', ai5s:'صف منزلك — ونحن نجده.',
      ai6t:'خريطة تفاعلية', ai6s:'استكشف القاهرة الجديدة بالسعر والمنطقة والتقييم.',
      ai7t:'جولة 360°', ai7s:'جولات غامرة داخل وحداتنا المميزة.',
      ctaTit:'جاهز لإيجاد منزلك في القاهرة الجديدة؟',
      ctaSub:'أضف عقارك أو احجز استشارة مجانية مع مستشار سييرا.',
      ctaBtn1:'أضف عقاراً', ctaBtn2:'اتصل بمستشار',
      partEye:'موثوق من كبار مطوّري القاهرة الجديدة',
      fTagline:'عقارات مدعومة بالذكاء الاصطناعي للقاهرة الجديدة — مخزون موثّق وتسعير شفّاف وحماية ضمان كاملة.',
      fExplore:'استكشف', fCompany:'الشركة', fLegal:'قانوني',
      fRights:'© 2026 سييرا إستيتس · القاهرة الجديدة، مصر. جميع الحقوق محفوظة.',
      fPrivacy:'الخصوصية', fTerms:'الشروط', fCookies:'الكوكيز'
    }
  };

  var LANG_KEY = 'hzp-lang', THEME_KEY = 'hzp-theme';
  function lang(){ return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; }
  function theme(){ return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
  function t(key){ var d = DICT[lang()]; return (d && d[key] != null) ? d[key] : (DICT.en[key] != null ? DICT.en[key] : key); }

  /* ── apply language + theme to document ── */
  function applyLang(){
    var ar = lang() === 'ar';
    var html = document.documentElement;
    html.setAttribute('lang', ar ? 'ar' : 'en');
    html.setAttribute('dir', ar ? 'rtl' : 'ltr');
    document.querySelectorAll('[data-i18n]').forEach(function (el){
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el){
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
  }
  function applyTheme(){ document.documentElement.setAttribute('data-theme', theme()); }

  /* ── chrome markup ── */
  function navHTML(active){
    var links = [['index.html','navHome','home'],['properties.html','navProps','props'],
      ['compounds.html','navCompounds','compounds'],['virtual-tour.html','navTour','tour'],
      ['index.html#ai','navAI','ai'],['index.html#contact','navContact','contact']];
    var linkList = function (cls){ return links.map(function (l){
      return '<a href="' + l[0] + '"' + (l[2] === active ? ' class="on"' : '') +
        ' data-i18n="' + l[1] + '"></a>';
    }).join(''); };
    return '<nav class="nav" id="nav"><div class="wrap"><div class="nav-in">' +
      '<a class="brand" href="index.html"><span class="mark"><img src="logo-gold.png" alt="Sierra Estates"/></span>' +
      '<span><b>Sierra Estates</b><small>Future of Real Estate</small></span></a>' +
      '<div class="nav-links">' + linkList() + '</div>' +
      '<div class="nav-act">' +
      '<button class="icon-btn" id="theme-btn" aria-label="Theme"><i data-lucide="moon" class="i"></i></button>' +
      '<button class="icon-btn lang-btn" id="lang-btn" aria-label="Language">EN</button>' +
      '<a class="btn btn-pri nav-cta" href="index.html#contact"><i data-lucide="plus" class="i"></i> <span data-i18n="navList"></span></a>' +
      '<button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div></div></div>' +
      '<div class="nav-mobile" id="nav-mobile"><div class="wrap">' +
      '<div class="nm-links">' + linkList() + '</div>' +
      '<a class="btn btn-pri nm-cta" href="index.html#contact"><i data-lucide="plus" class="i"></i> <span data-i18n="navList"></span></a>' +
      '</div></div>' +
      '</nav>';
  }
  function footerHTML(){
    function col(h,items){ return '<div class="f-col"><h5 data-i18n="' + h + '"></h5>' +
      items.map(function (i){ return '<a href="' + i[0] + '" data-i18n="' + i[1] + '"></a>'; }).join('') + '</div>'; }
    var soc = ['facebook','instagram','linkedin','twitter'];
    return '<div class="wrap"><div class="f-top">' +
      '<div class="f-brand"><b>Sierra Estates</b><p data-i18n="fTagline"></p>' +
      '<div class="f-social">' + soc.map(function (s){
        return '<a href="#" aria-label="' + s + '"><i data-lucide="' + s + '" class="i"></i></a>'; }).join('') + '</div></div>' +
      col('fExplore',[['properties.html','navProps'],['compounds.html','navCompounds'],['virtual-tour.html','navTour'],['index.html#ai','navAI']]) +
      col('fCompany',[['index.html#agents','navHome'],['index.html#testimonials','eyeTesti'],['index.html#contact','navContact']]) +
      col('fLegal',[['#','fPrivacy'],['#','fTerms'],['#','fCookies']]) +
      '</div><div class="f-bot"><span data-i18n="fRights"></span>' +
      '<span class="mono">Sierra AI \u00b7 v3.2</span></div></div>';
  }

  /* ── property card renderer ── */
  function money(m){
    if (m < 1) return (Math.round(m*1000)).toLocaleString() + 'K';
    return m.toLocaleString(undefined,{maximumFractionDigits:1}) + 'M';
  }
  function pcard(p){
    var isRent = p.tag === 'Rent';
    var price = isRent ? 'EGP ' + money(p.priceM) + '<small>/mo</small>'
                       : 'EGP ' + money(p.priceM);
    return '<article class="pcard rv">' +
      '<div class="p-img"><img src="' + p.img + '" alt="' + p.type + ' in ' + p.compound + '" loading="lazy"/>' +
      '<span class="p-tag">' + p.tag + '</span>' +
      '<span class="p-ai"><span class="dot"></span>AI ' + p.ai.toFixed(1) + '</span>' +
      '<button class="p-heart" type="button" aria-label="Save" onclick="this.classList.toggle(\'on\')"><i data-lucide="heart" class="i"></i></button>' +
      '</div>' +
      '<div class="p-body">' +
      '<div class="p-price">' + price + '</div>' +
      '<div class="p-title">' + p.type + ' \u00b7 ' + p.compound + '</div>' +
      '<div class="p-loc"><i data-lucide="map-pin" class="i"></i>' + p.zone + '</div>' +
      '<div class="p-meta">' +
      '<span><i data-lucide="bed-double" class="i"></i>' + p.beds + '</span>' +
      '<span><i data-lucide="bath" class="i"></i>' + p.baths + '</span>' +
      '<span><i data-lucide="ruler" class="i"></i>' + p.area + ' m\u00b2</span>' +
      '</div></div></article>';
  }

  /* ── reveal on scroll ── */
  function reveal(){
    var els = document.querySelectorAll('.rv:not(.in)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e){ e.classList.add('in'); }); return;
    }
    var io = new IntersectionObserver(function (ents){
      ents.forEach(function (en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold:.12, rootMargin:'0px 0px -8% 0px' });
    els.forEach(function (e){ io.observe(e); });
  }

  /* ── count-up for [data-count] ── */
  function counts(){
    document.querySelectorAll('[data-count]').forEach(function (el){
      var target = parseFloat(el.getAttribute('data-count'));
      var pre = el.getAttribute('data-prefix') || '';
      var suf = el.getAttribute('data-suffix') || '';
      var dec = target % 1 !== 0 ? 1 : 0;
      var io = new IntersectionObserver(function (ents, obs){
        ents.forEach(function (en){
          if (!en.isIntersecting) return;
          obs.unobserve(el);
          var start = null, dur = 1500;
          function step(ts){
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var val = (target * eased).toFixed(dec);
            el.textContent = pre + Number(val).toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec}) + suf;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      }, { threshold:.4 });
      io.observe(el);
    });
  }

  /* ── nav shadow on scroll ── */
  function navScroll(){
    var nav = document.getElementById('nav');
    if (!nav) return;
    function upd(){ nav.classList.toggle('solid', window.scrollY > 12); }
    window.addEventListener('scroll', upd, { passive:true }); upd();
  }

  /* ── wire theme + lang toggles ── */
  function wireToggles(){
    var tb = document.getElementById('theme-btn');
    if (tb){
      var setIc = function (){ tb.innerHTML = '<i data-lucide="' + (theme()==='dark'?'sun':'moon') + '" class="i"></i>';
        if (window.lucide) lucide.createIcons(); };
      setIc();
      tb.addEventListener('click', function (){
        localStorage.setItem(THEME_KEY, theme()==='dark'?'light':'dark');
        applyTheme(); setIc();
      });
    }
    var lb = document.getElementById('lang-btn');
    if (lb){
      lb.textContent = lang()==='ar' ? 'EN' : 'ع';
      lb.addEventListener('click', function (){
        localStorage.setItem(LANG_KEY, lang()==='ar'?'en':'ar');
        location.reload();
      });
    }
  }

  /* ── mount everything ── */
  function wireBurger(){
    var b = document.getElementById('burger');
    var m = document.getElementById('nav-mobile');
    if (!b || !m) return;
    function close(){ m.classList.remove('open'); b.classList.remove('open'); b.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
    b.addEventListener('click', function (){
      var open = m.classList.toggle('open');
      b.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    m.querySelectorAll('a').forEach(function (a){ a.addEventListener('click', close); });
    window.addEventListener('resize', function (){ if (window.innerWidth > 940) close(); });
  }

  function mount(active){
    applyTheme();
    var chrome = document.getElementById('site-chrome');
    if (chrome) chrome.innerHTML = navHTML(active);
    var foot = document.getElementById('site-footer');
    if (foot){ foot.className = 'footer'; foot.innerHTML = footerHTML(); }
    applyLang();
    wireToggles();
    wireBurger();
    navScroll();
    counts();
    if (window.lucide) lucide.createIcons();
  }

  window.HZ = { t:t, lang:lang, theme:theme, pcard:pcard, mount:mount, reveal:reveal, DICT:DICT };
})();
