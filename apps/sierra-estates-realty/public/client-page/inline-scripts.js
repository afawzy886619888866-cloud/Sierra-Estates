
(function () {
  'use strict';
  var poster = document.getElementById('vtv-poster');
  var iframe = document.getElementById('vtv-iframe');
  var loading = document.getElementById('vtv-loading');
  var fsBtn = document.getElementById('vtv-fs');
  var frame = document.getElementById('vtv-frame');
  var loaded = false;
  var TOUR_SRC = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';
  function activate() {
    if (loaded) return;
    loading.style.display = 'flex';
    poster.style.display = 'none';
    iframe.src = TOUR_SRC;
    iframe.onload = function () { loading.style.display = 'none'; iframe.style.opacity = '1'; fsBtn.style.display = 'grid'; };
    loaded = true;
  }
  poster.addEventListener('click', activate);
  fsBtn.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (frame.requestFullscreen) frame.requestFullscreen();
  });
})();



(function () {
  'use strict';
  var D = window.HZDATA;
  var isAr = (localStorage.getItem('hzp-lang') || 'en') === 'ar';

  /* hero slides */
  document.getElementById('hero-slides').innerHTML = D.slides.map(function (s, i) {
    return '<div className="slide' + (i === 0 ? ' on' : '') + '"><img src="' + s.img + '" alt=""/></div>';
  }).join('');
  document.getElementById('hero-dots').innerHTML = D.slides.map(function (_, i) {
    return '<button type="button"' + (i === 0 ? ' className="on"' : '') + ' aria-label="Slide ' + (i + 1) + '"></button>';
  }).join('');

  var cur = 0, slides, dots, timer;
  function setSlide(n) {
    slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
    cur = n % D.slides.length;
    slides[cur].classList.add('on'); dots[cur].classList.add('on');
    var s = D.slides[cur];
    var pre = document.getElementById('hero-pre');
    var main = document.getElementById('hero-main');
    // Animate caption change — fade out, swap, fade in
    pre.style.opacity = '0'; main.style.opacity = '0';
    pre.style.transform = 'translateY(15px)'; main.style.transform = 'translateY(15px)';
    setTimeout(function () {
      pre.textContent = isAr ? s.preAr : s.pre;
      var txt = isAr ? s.mainAr : s.main;
      var words = txt.split(' ');
      var hl = words.splice(-3).join(' ');
      main.innerHTML = words.join(' ') + ' <span className="hl">' + hl + '</span>';
      pre.style.transition = 'opacity .6s var(--silk), transform .6s var(--silk)';
      main.style.transition = 'opacity .6s var(--silk), transform .6s var(--silk)';
      pre.style.opacity = '1'; main.style.opacity = '1';
      pre.style.transform = 'translateY(0)'; main.style.transform = 'translateY(0)';
    }, 400);
  }
  function arm() { clearInterval(timer); timer = setInterval(function () { setSlide(cur + 1); }, 7000); }

  /* featured (6) + compound tiles + rooms */
  document.getElementById('prop-grid').innerHTML = D.listings.slice(0, 6).map(HZ.pcard).join('');
  var picks = ['Hyde Park New Cairo', 'Mivida', 'Mountain View iCity', 'Eastown (SODIC)'];
  document.getElementById('comp-grid').innerHTML = picks.map(function (n, i) {
    var c = D.compounds.find(function (x) { return x.n === n; });
    return '<a aria-label="Link" className="comp rv d' + (i + 1) + '" href="compounds.html">' +
      '<img src="' + D.compoundImgs[n] + '" alt="' + c.n + '" loading="lazy"/>' +
      '<div className="co-scrim"></div>' +
      '<div className="co-count">AI ' + c.ai.toFixed(1) + ' · ' + c.g + '</div>' +
      '<div className="co-body"><h4>' + c.n + '</h4><span>' + c.z + ' · EGP ' + c.priceM + 'M avg</span></div></a>';
  }).join('');
  /* testimonials */
  var star = '<i data-lucide="star" className="i"></i>';
  document.getElementById('testi-grid').innerHTML = [1, 2, 3].map(function (n, i) {
    var nm = HZ.t('t' + n + 'n');
    var initials = nm.split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('');
    return '<div className="tcard rv d' + (i + 1) + '">' +
      '<div className="stars">' + star + star + star + star + star + '</div>' +
      '<p>“' + HZ.t('t' + n + 'q') + '”</p>' +
      '<div className="who"><span className="av">' + initials + '</span><span><b>' + nm + '</b><small>' + HZ.t('t' + n + 'r') + '</small></span></div></div>';
  }).join('');

  /* inquiry selects + segmented */
  document.getElementById('inq-zone').innerHTML = ['z1', 'z2', 'z3', 'z4'].map(function (k) { return '<option>' + HZ.t(k) + '</option>'; }).join('');
  document.getElementById('inq-type').innerHTML = ['lVilla', 'lApt', 'lTwin', 'lPent'].map(function (k) { return '<option>' + HZ.t(k) + '</option>'; }).join('');
  var inqMode = 'buy';
  document.querySelectorAll('#inq-seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#inq-seg button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      inqMode = b.dataset.i18n === 'inqBuy' ? 'buy' : b.dataset.i18n === 'inqRent' ? 'rent' : 'sell';
    });
  });

  /* ═══ INQUIRY FORM SUBMIT — Firestore (primary) + CSV (fallback) ═══
     Tries to write to Firestore via window.SIERRA_DB.addInquiry().
     If Firestore is not connected (SIERRA_FIREBASE_ENABLED=false), falls
     back to CSV download + localStorage — same as career.html. */
  var inqForm = document.getElementById('inq-form');
  if (inqForm) {
    inqForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        timestamp: new Date().toISOString(),
        mode: inqMode,
        name: document.getElementById('inq-name').value.trim(),
        phone: document.getElementById('inq-phone').value.trim(),
        email: document.getElementById('inq-email').value.trim(),
        zone: document.getElementById('inq-zone').value,
        type: document.getElementById('inq-type').value,
        budget: document.getElementById('inq-budget').value.trim()
      };

      // Show loading state on button
      var submitBtn = inqForm.querySelector('button[type="submit"]');
      var originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" className="i" style={{{"animation": "vtv-spin 1s linear infinite"}}}></i> <span>Sending…</span>'; if (window.lucide) lucide.createIcons(); }

      function showSuccess() {
        var successEl = document.getElementById('inq-success');
        if (successEl) {
          successEl.style.display = 'block';
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { successEl.style.display = 'none'; }, 6000);
        }
        inqForm.reset();
        document.querySelectorAll('#inq-seg button').forEach(function (x, i) { x.classList.toggle('on', i === 0); });
        inqMode = 'buy';
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnHtml; if (window.lucide) lucide.createIcons(); }
      }

      function csvFallback() {
        try {
          var csvRow = [data.timestamp, data.mode, data.name, data.phone, data.email, data.zone, data.type, data.budget]
            .map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
          var csvHeader = 'Timestamp,Mode,Name,Phone,Email,Zone,Type,Budget\n';
          var log = JSON.parse(localStorage.getItem('sierra_inquiries') || '[]');
          log.push(data);
          localStorage.setItem('sierra_inquiries', JSON.stringify(log));
          var blob = new Blob([csvHeader + csvRow], { type: 'text/csv;charset=utf-8;' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'sierra-inquiry-' + Date.now() + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) { /* localStorage full or disabled */ }
      }

      // Try Firestore first, fall back to CSV
      if (window.SIERRA_DB && window.SIERRA_DB.isReady()) {
        window.SIERRA_DB.addInquiry(data).then(function (result) {
          if (result.fallback) csvFallback();
          showSuccess();
        }).catch(function () {
          csvFallback();
          showSuccess();
        });
      } else {
        csvFallback();
        showSuccess();
      }
    });
  }

  HZ.mount('home');

  /* ═══ HERO SEARCH — compound autocomplete + filter redirect ═══
     User types compound name (e.g. "Mivida") → dropdown shows matching
     compounds. Selecting one + clicking Search → redirects to
     compounds.html?cpd=<name> with type/beds/price filters. */
  var heroSearchInput = document.getElementById('hero-compound-search');
  var heroResults = document.getElementById('hero-compound-results');
  var heroSearchBtn = document.getElementById('hero-search-btn');

  if (heroSearchInput && heroResults) {
    heroSearchInput.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (!q) { heroResults.style.display = 'none'; return; }
      var matches = D.compounds.filter(function (c) {
        return c.n.toLowerCase().indexOf(q) >= 0 || (c.z && c.z.toLowerCase().indexOf(q) >= 0);
      }).slice(0, 8);
      if (matches.length === 0) {
        heroResults.innerHTML = '<div style={{{"padding": "12px 16px", "color": "var(--muted)", "fontSize": "13px"}}}>No compounds found</div>';
        heroResults.style.display = 'block';
        return;
      }
      heroResults.innerHTML = matches.map(function (c) {
        return '<div className="compound-option" data-cpd="' + c.n + '" style={{{"padding": "10px 16px", "cursor": "pointer", "borderBottom": "1px solid var(--line)", "fontSize": "13px", "color": "var(--ink)", "transition": ".15s"}}}>' +
          '<b>' + c.n + '</b> <span style={{{"color": "var(--muted)", "fontSize": "11px"}}}>&middot; ' + c.z + ' &middot; ' + D.unitsFor(c.n).length + ' units</span>' +
          '</div>';
      }).join('');
      heroResults.style.display = 'block';
      heroResults.querySelectorAll('.compound-option').forEach(function (opt) {
        opt.addEventListener('mouseenter', function () { this.style.background = 'var(--bg)'; });
        opt.addEventListener('mouseleave', function () { this.style.background = 'none'; });
        opt.addEventListener('click', function () {
          heroSearchInput.value = this.getAttribute('data-cpd');
          heroResults.style.display = 'none';
        });
      });
    });
    // Hide dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-compound-wrap')) {
        heroResults.style.display = 'none';
      }
    });
  }

  // Search button → redirect to compounds.html with filters
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', function () {
      var cpd = heroSearchInput ? heroSearchInput.value.trim() : '';
      var type = document.getElementById('hero-type') ? document.getElementById('hero-type').value : '';
      var beds = document.getElementById('hero-beds') ? document.getElementById('hero-beds').value : '0';
      var price = document.getElementById('hero-price') ? document.getElementById('hero-price').value : '0';
      var params = new URLSearchParams();
      if (cpd) params.set('cpd', cpd);
      if (type) params.set('type', type);
      if (beds && beds !== '0') params.set('beds', beds);
      if (price && price !== '0') params.set('maxPrice', price);
      var qs = params.toString();
      // If compound selected → go to compounds.html?cpd=<name>
      // Otherwise → go to properties.html with filters
      if (cpd) {
        location.href = 'compounds.html' + (qs ? '?' + qs : '');
      } else {
        location.href = 'properties.html' + (qs ? '?' + qs : '');
      }
    });
  }

  // Tab switching
  document.querySelectorAll('.search-tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.search-tabs button').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  /* ═══ INSIGHTS — top 3 AI-ranked listings ═══
     Renders the 3 highest AI-scored properties in the insights section.
     When wired to Firestore, this data comes from the admin page.
     The admin can update which properties appear here by changing
     AI scores or tags in the Firestore 'houyez_listings' collection. */
  var topListings = D.listings.slice().sort(function (a, b) { return b.ai - a.ai; }).slice(0, 3);
  document.getElementById('insights-grid').innerHTML = topListings.map(function (p, i) {
    var rank = i + 1;
    return '<a aria-label="Link" href="property.html?id=' + p.id + '" style={{{"display": "block", "textDecoration": "none", "background": "var(--surface)", "border": "1px solid var(--line)", "borderRadius": "14px", "overflow": "hidden", "transition": ".3s var(--silk)", "position": "relative"}}}>' +
      '<div style={{{"position": "relative", "height": "200px", "overflow": "hidden"}}}>' +
        '<img src="' + p.img + '" alt="' + p.code + '" style={{{"width": "100%", "height": "100%", "objectFit": "cover"}}} loading="lazy"/>' +
        '<div style={{{"position": "absolute", "top": "12px", "left": "12px", "background": "linear-gradient(135deg,#34d399,#22c55e)", "color": "#fff", "fontFamily": "var(--mono)", "fontWeight": "800", "fontSize": "12px", "padding": "5px 12px", "borderRadius": "8px", "boxShadow": "0 4px 12px rgba(52,211,153,.4)"}}}>#' + rank + ' AI ' + p.ai.toFixed(1) + '</div>' +
        (p.tag ? '<div style={{{"position": "absolute", "top": "12px", "right": "12px", "background": "rgba(0,43,75,.88)", "color": "#fff", "fontFamily": "var(--mono)", "fontWeight": "700", "fontSize": "10px", "padding": "4px 9px", "borderRadius": "5px", "textTransform": "uppercase"}}}>' + p.tag + '</div>' : '') +
        '<div style={{{"position": "absolute", "bottom": "12px", "right": "12px", "background": "rgba(0,43,75,.88)", "color": "#fff", "fontFamily": "var(--mono)", "fontWeight": "700", "fontSize": "13px", "padding": "6px 12px", "borderRadius": "6px"}}}>' + (p.mode === 'sale' ? p.egpM + 'M EGP' : '$' + p.usd + '/mo') + '</div>' +
      '</div>' +
      '<div style={{{"padding": "18px"}}}>' +
        '<div style={{{"fontFamily": "var(--mono)", "fontSize": "10px", "textTransform": "uppercase", "letterSpacing": ".12em", "color": "var(--pri)", "marginBottom": "6px"}}}>' + p.code + ' · ' + p.type + '</div>' +
        '<div style={{{"fontSize": "17px", "fontWeight": "700", "color": "var(--ink)", "marginBottom": "4px"}}}>' + p.cmp + '</div>' +
        '<div style={{{"fontSize": "13px", "color": "var(--muted)", "marginBottom": "12px"}}}>' + p.zone + '</div>' +
        '<div style={{{"display": "flex", "gap": "14px", "fontSize": "13px", "color": "var(--text)", "fontWeight": "600"}}}>' +
          '<span>🛏 ' + p.beds + '</span>' +
          '<span>🚿 ' + p.bath + '</span>' +
          '<span>📐 ' + p.area + ' m²</span>' +
        '</div>' +
      '</div>' +
    '</a>';
  }).join('');

  /* ticker */
  var tickItems = HZ.lang() === 'ar'
    ? ['ماونتن فيو +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجار من $1,700/شهر', 'هايد بارك AI 9.8', 'الرحاب عائد 8.1%', 'مدينتي طلب متزايد']
    : ['Mountain View iCity +24%', 'Uptown Cairo +31%', 'Mivida rentals from $1,700/mo', 'Hyde Park AI score 9.8', 'Villette yield 8.1%', 'Taj City demand rising'];
  var row = tickItems.concat(tickItems);
  document.getElementById('ticker-row').innerHTML = row.map(function (s) { return '<span>' + s + '</span>'; }).join('');

  /* AI hub cards */
  var AI_IC = {
    engine: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#C8961A" strokeWidth="1" stroke-dasharray="4 3" opacity=".4"><a aria-label="Link"nimateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="8s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="13" stroke="#E9C176" strokeWidth="1" stroke-dasharray="3 4" opacity=".3"><a aria-label="Link"nimateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="5s" repeatCount="indefinite"/></circle><circle cx="24" cy="11" r="2.5" fill="#C8961A"><a aria-label="Link"nimate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="4" fill="#E9C176"><a aria-label="Link"nimate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite"/></circle></svg>',
    match: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="#4ade80" strokeWidth="1.5"><a aria-label="Link"nimate attributeName="r" values="10;20;10" dur="2.5s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="opacity" values=".5;0;.5" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="5" fill="#4ade80"/><path d="M21.5 24 L23.5 26.5 L27.5 21" stroke="#071524" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    roi: '<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="30" width="7" height="10" rx="2" fill="#f59e0b" opacity=".5"><a aria-label="Link"nimate attributeName="height" values="3;10;3" dur="2.2s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="y" values="37;30;37" dur="2.2s" repeatCount="indefinite"/></rect><rect x="17" y="22" width="7" height="18" rx="2" fill="#f59e0b" opacity=".75"><a aria-label="Link"nimate attributeName="height" values="7;18;7" dur="2.2s" begin=".35s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="y" values="33;22;33" dur="2.2s" begin=".35s" repeatCount="indefinite"/></rect><rect x="27" y="13" width="7" height="27" rx="2" fill="#f59e0b"><a aria-label="Link"nimate attributeName="height" values="12;27;12" dur="2.2s" begin=".7s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="y" values="28;13;28" dur="2.2s" begin=".7s" repeatCount="indefinite"/></rect></svg>',
    price: '<svg viewBox="0 0 48 48" fill="none"><path d="M8 8 L32 8 L40 24 L32 40 L8 40 Z" stroke="#a78bfa" strokeWidth="1.5" fill="rgba(167,139,250,.08)"/><circle cx="15" cy="18" r="3" stroke="#a78bfa" strokeWidth="1.5"/><text x="26" y="30" text-anchor="middle" font-weight="700" font-size="15" fill="#a78bfa" font-family="monospace">$<a aria-label="Link"nimate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite"/></text></svg>',
    dream: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 10 L36 22 L33 22 L33 36 L15 36 L15 22 L12 22 Z" fill="#f472b6" opacity=".9"/><rect x="20" y="27" width="8" height="9" fill="#07121E" rx="1"/><g><a aria-label="Link"nimateTransform attributeName="transform" type="rotate" from="0 24 23" to="360 24 23" dur="3s" repeatCount="indefinite"/><circle cx="40" cy="23" r="2.2" fill="#f472b6"><a aria-label="Link"nimate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/></circle></g></svg>',
    imap: '<svg viewBox="0 0 48 48" fill="none"><rect x="6" y="8" width="36" height="32" rx="3" stroke="#C8961A" strokeWidth="1.3" fill="rgba(200,150,26,.07)"/><circle cx="24" cy="23" r="5" fill="rgba(200,150,26,.2)" stroke="#C8961A" strokeWidth="1.5"><a aria-label="Link"nimate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="23" r="2.5" fill="#C8961A"/></svg>',
    tour: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="#38bdf8" strokeWidth="1.3" fill="rgba(56,189,248,.07)"/><ellipse cx="24" cy="24" rx="18" ry="7" stroke="#38bdf8" strokeWidth="1" fill="none" opacity=".4"/><circle cx="24" cy="24" r="4" fill="#38bdf8"><a aria-label="Link"nimate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite"/></circle><path d="M20 21 L28 24 L20 27 Z" fill="#fff" opacity=".9"/></svg>'
  };
  var aiTools = [
    { k: 'engine', t: 'ai1t', s: 'ai1s', live: true, href: 'ai-engine.html' },
    { k: 'match', t: 'ai2t', s: 'ai2s', href: 'matches.html' },
    { k: 'roi', t: 'ai3t', s: 'ai3s', href: 'roi.html' },
    { k: 'price', t: 'ai4t', s: 'ai4s', href: 'pricing.html' },
    { k: 'dream', t: 'ai5t', s: 'ai5s', href: 'advice.html' },
    { k: 'imap', t: 'ai6t', s: 'ai6s', href: 'compounds.html' },
    { k: 'tour', t: 'ai7t', s: 'ai7s', tour: true }
  ];
  document.getElementById('ai-grid').innerHTML = aiTools.map(function (tool, i) {
    return '<' + (tool.tour ? 'button' : 'a') + ' className="ai-card rv d' + ((i % 4) + 1) + '"' +
      (tool.tour ? ' type="button" id="ai-tour-card"' : ' href="' + tool.href + '"') + '>' +
      '<span className="ai-ic">' + AI_IC[tool.k] + '</span>' +
      '<h4>' + HZ.t(tool.t) + '</h4>' +
      '<p>' + HZ.t(tool.s) + '</p>' +
      (tool.live ? '<span className="live-tag">' + HZ.t('aiLive') + '</span>' : '') +
      '</' + (tool.tour ? 'button' : 'a') + '>';
  }).join('');

  /* virtual tour modal */
  function openTour() {
    var f = document.getElementById('tour-frame');
    if (!f.src) f.src = 'virtual-tour.html';
    document.getElementById('tour-modal').classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeTour() {
    document.getElementById('tour-modal').classList.remove('on');
    document.body.style.overflow = '';
  }
  var tourOpenBtn = document.getElementById('tour-open');
  if (tourOpenBtn) tourOpenBtn.addEventListener('click', openTour);
  var tourHero = document.getElementById('tour-hero');
  if (tourHero) tourHero.addEventListener('click', openTour);
  var tourCard = document.getElementById('ai-tour-card');
  if (tourCard) tourCard.addEventListener('click', openTour);
  var tourCloseBtn = document.getElementById('tour-close');
  if (tourCloseBtn) tourCloseBtn.addEventListener('click', closeTour);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTour(); });

  HZ.reveal();

  slides = document.querySelectorAll('.hero .slide');
  dots = document.querySelectorAll('.hero .dots button');
  dots.forEach(function (d, i) { d.addEventListener('click', function () { setSlide(i); arm(); }); });
  setSlide(0);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) arm();

  // ═══ Move AI Hub / Intelligence Engine to right after Why Sierra ═══
  var aiHub = document.getElementById('ai');
  var whySierra = document.getElementById('agents');
  if (aiHub && whySierra && whySierra.nextElementSibling !== aiHub) {
    whySierra.parentNode.insertBefore(aiHub, whySierra.nextElementSibling);
  }

  // ═══ Move 3D Tour to right after Featured Properties (before Why Sierra) ═══
  var tour = document.getElementById('tour');
  var props = document.getElementById('properties');
  if (tour && props && props.nextElementSibling !== tour) {
    props.parentNode.insertBefore(tour, props.nextElementSibling);
  }
})();



(function () {
  'use strict';
  'use strict';
  var D = window.HZDATA;
  if (!D || !window.L) return;

  var featured = D.featured || [];
  var theme = (window.HZ && HZ.theme) ? HZ.theme() : 'light';
  var map = L.map('home-map', { scrollWheelZoom: false, zoomControl: true }).setView([30.03, 31.57], 11);
  var tiles = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };
  var layer = L.tileLayer(tiles[theme], { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18 }).addTo(map);

  document.addEventListener('hzp:theme', function (e) {
    layer.setUrl(tiles[e.detail]);
  });

  // Marker icon: featured compounds get the 'pulse' class for the glow animation
  // Shows compound name + total unit count badge (green pill next to name)
  function markerIcon(c, isFeatured) {
    var hot = c.ai >= 9.2;
    var cls = 'cpd-marker' + (hot ? ' hot' : '') + (isFeatured ? ' pulse' : '');
    // Use Arabic name if site language is Arabic and translation exists
    var curLang = (window.HZ && HZ.lang) ? HZ.lang() : 'en';
    var displayName = (D.compoundName) ? D.compoundName(c.n, curLang) : c.n;
    // Get total unit count for this compound (from D.unitsFor generator)
    var unitCount = 0;
    if (typeof D.unitsFor === 'function') {
      try { unitCount = D.unitsFor(c.n).length; } catch (e) { unitCount = 0; }
    }
    var unitBadge = unitCount > 0 ? '<span className="unit-count">' + unitCount + '</span>' : '';
    return L.divIcon({
      className: '',
      html: '<span className="' + cls + '" title="' + displayName + ' (' + unitCount + ' units)">' + displayName + unitBadge + '</span>',
      iconSize: null
    });
  }

  // ═══ Marker Cluster Group ═══
  // When zoomed out, nearby markers group into styled clusters.
  // When zoomed in, markers spread out and are individually visible.
  var clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 44,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 11,
    iconCreateFunction: function (cluster) {
      var count = cluster.getChildCount();
      var size = count >= 10 ? 'large' : count >= 5 ? 'medium' : 'small';
      return L.divIcon({
        className: 'cpd-cluster cpd-cluster-' + size,
        html: '<span>' + count + '</span>',
        iconSize: [40, 40]
      });
    }
  });

  D.compounds.forEach(function (c) {
    var isFeatured = featured.indexOf(c.n) >= 0;
    var marker = L.marker(c.c, { icon: markerIcon(c, isFeatured), title: c.n });
    marker.on('click', function () {
      location.href = 'compounds.html?cpd=' + encodeURIComponent(c.n);
    });
    marker._compound = c; // keep a back-reference so we can filter later
    clusterGroup.addLayer(marker);
  });

  map.addLayer(clusterGroup);

  // Fit bounds to show all compounds
  try { map.fitBounds(clusterGroup.getBounds(), { padding: [40, 40], maxZoom: 13 }); } catch (e) {}

  // ═══ HOME MAP FILTER (compound multi-select + single beds) ═══
  // Per user request:
  //  - Compounds: multi-select (click multiple compounds to filter)
  //  - Bedrooms: single select, exact number (1, 2, 3, 4, 5 — no '+')
  var allMarkers = clusterGroup.getLayers();
  var compoundInput = document.getElementById('home-map-compound');
  var compoundDropdown = document.getElementById('hmf-compound-dropdown');
  var compoundChevron = document.getElementById('hmf-compound-chevron');
  var compoundChips = document.getElementById('hmf-compound-chips');
  var bedsWrap = document.getElementById('home-map-beds');
  var countEl = document.getElementById('home-map-count');

  // filterState.compounds = array of selected compound names (empty = all)
  // filterState.beds = exact bedroom count (0 = any)
  var filterState = { compounds: [], beds: 0 };

  // ── Build compound dropdown list ──
  function renderCompoundDropdown(query) {
    var q = (query || '').trim().toLowerCase();
    var items = D.compounds.filter(function (c) {
      if (!q) return true;
      return c.n.toLowerCase().indexOf(q) >= 0;
    });
    if (!items.length) {
      compoundDropdown.innerHTML = '<div style={{{"padding": "12px", "color": "var(--muted)", "fontSize": "13px", "textAlign": "center"}}}>No compounds found</div>';
      return;
    }
    compoundDropdown.innerHTML = items.map(function (c) {
      var isSelected = filterState.compounds.indexOf(c.n) >= 0;
      var unitCount = (typeof D.unitsFor === 'function') ? D.unitsFor(c.n).length : 0;
      return '<div className="hmf-cpd-item' + (isSelected ? ' selected' : '') + '" data-cpd="' + c.n + '" style={{{"display": "flex", "alignItems": "center", "gap": "10px", "padding": "9px 12px", "borderRadius": "8px", "cursor": "pointer", "transition": ".15s", "' + (isSelected ? 'background": "rgba(0,174,255,.08)", "'": "'') + '"}}}>' +
        '<span style={{{"width": "18px", "height": "18px", "borderRadius": "5px", "border": "2px solid ' + (isSelected ? 'var(--pri)' : 'var(--line-2)') + '", "background": "' + (isSelected ? 'var(--pri)' : 'transparent') + '", "display": "grid", "placeItems": "center", "flex": "none"}}}>' + (isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</span>' +
        '<span style={{{"flex": "1", "fontSize": "13.5px", "fontWeight": "600", "color": "var(--ink)"}}}>' + c.n + '</span>' +
        '<span style={{{"fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "color": "var(--muted)", "background": "var(--bg)", "padding": "2px 8px", "borderRadius": "999px"}}}>' + unitCount + '</span>' +
      '</div>';
    }).join('');

    // Bind click on each item
    compoundDropdown.querySelectorAll('.hmf-cpd-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = this.getAttribute('data-cpd');
        var idx = filterState.compounds.indexOf(name);
        if (idx >= 0) {
          filterState.compounds.splice(idx, 1); // deselect
        } else {
          filterState.compounds.push(name); // select
        }
        renderCompoundDropdown(compoundInput.value);
        renderChips();
        applyFilter();
        updateActiveBadge();
      });
      item.addEventListener('mouseenter', function () {
        if (!this.classList.contains('selected')) this.style.background = 'var(--bg)';
      });
      item.addEventListener('mouseleave', function () {
        if (!this.classList.contains('selected')) this.style.background = 'transparent';
      });
    });
  }

  // ── Render selected compound chips ──
  function renderChips() {
    if (!filterState.compounds.length) {
      compoundChips.innerHTML = '';
      compoundChips.style.minHeight = '0';
      return;
    }
    compoundChips.style.minHeight = '32px';
    compoundChips.innerHTML = filterState.compounds.map(function (name) {
      return '<span className="hmf-chip" data-cpd="' + name + '" style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "background": "var(--pri)", "color": "#fff", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "padding": "5px 10px 5px 12px", "borderRadius": "999px"}}}>' +
        '<span>' + name + '</span>' +
        '<button type="button" data-remove="' + name + '" style={{{"border": "none", "background": "rgba(255,255,255,.25)", "color": "#fff", "width": "16px", "height": "16px", "borderRadius": "50%", "cursor": "pointer", "fontSize": "14px", "lineHeight": "1", "display": "grid", "placeItems": "center", "padding": "0"}}} aria-label="Remove ' + name + '">×</button>' +
      '</span>';
    }).join('');
    // Bind remove buttons
    compoundChips.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = this.getAttribute('data-remove');
        var idx = filterState.compounds.indexOf(name);
        if (idx >= 0) filterState.compounds.splice(idx, 1);
        renderCompoundDropdown(compoundInput.value);
        renderChips();
        applyFilter();
        updateActiveBadge();
      });
    });
  }

  function applyFilter() {
    var selectedCompounds = filterState.compounds;
    var exactBeds = filterState.beds;
    var visible = [];

    allMarkers.forEach(function (m) {
      var c = m._compound;
      if (!c) return;
      // Compound filter: if compounds selected, marker must be in the list
      var matchCompound = !selectedCompounds.length || selectedCompounds.indexOf(c.n) >= 0;
      // Beds filter: if beds > 0, compound must have at least one unit with EXACTLY that bedroom count
      var matchBeds = true;
      if (exactBeds > 0 && typeof D.unitsFor === 'function') {
        var units = D.unitsFor(c.n);
        matchBeds = units.some(function (u) { return u.beds === exactBeds; });
      }
      var visible_now = matchCompound && matchBeds;
      if (clusterGroup.hasLayer(m) && !visible_now) {
        clusterGroup.removeLayer(m);
      } else if (!clusterGroup.hasLayer(m) && visible_now) {
        clusterGroup.addLayer(m);
      }
      if (visible_now) visible.push(m);
    });

    countEl.textContent = visible.length + ' ' + ((window.HZ && HZ.lang && HZ.lang() === 'ar') ? 'كمبوند' : (visible.length === 1 ? 'compound' : 'compounds'));

    // Refit bounds to visible markers
    if (visible.length > 0) {
      try {
        var group = L.featureGroup(visible);
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 13 });
      } catch (e) {}
    }
    setTimeout(function () { map.invalidateSize(); }, 100);
  }

  // ── Compound input: search + open dropdown ──
  if (compoundInput) {
    compoundInput.addEventListener('focus', function () {
      compoundDropdown.style.display = 'block';
      compoundChevron.style.transform = 'rotate(180deg)';
      renderCompoundDropdown(compoundInput.value);
    });
    compoundInput.addEventListener('input', function (e) {
      compoundDropdown.style.display = 'block';
      compoundChevron.style.transform = 'rotate(180deg)';
      renderCompoundDropdown(e.target.value);
    });
    // Prevent document click handler from closing dropdown when clicking input
    compoundInput.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#hmf-compound-dropdown') && !e.target.closest('#home-map-compound') && !e.target.closest('#hmf-compound-chevron')) {
      compoundDropdown.style.display = 'none';
      compoundChevron.style.transform = 'rotate(0)';
    }
  });
  // Chevron click toggles dropdown
  if (compoundChevron) {
    compoundChevron.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = compoundDropdown.style.display === 'block';
      if (isOpen) {
        compoundDropdown.style.display = 'none';
        compoundChevron.style.transform = 'rotate(0)';
      } else {
        compoundDropdown.style.display = 'block';
        compoundChevron.style.transform = 'rotate(180deg)';
        renderCompoundDropdown(compoundInput.value);
        compoundInput.focus();
      }
    });
  }

  // ── Beds selector (single select, exact match) ──
  if (bedsWrap) {
    bedsWrap.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        bedsWrap.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        filterState.beds = +b.dataset.b;
        applyFilter();
        updateActiveBadge();
      });
    });
  }

  // ── Smart dropdown toggle ──
  var hmfTrigger = document.getElementById('hmf-trigger');
  var hmfPanel = document.getElementById('hmf-panel');
  var hmfReset = document.getElementById('hmf-reset');
  var activeBadge = document.getElementById('hmf-active-badge');

  function updateActiveBadge() {
    var count = 0;
    if (filterState.compounds.length) count++;
    if (filterState.beds > 0) count++;
    if (count > 0) {
      activeBadge.style.display = 'inline-flex';
      activeBadge.textContent = count;
    } else {
      activeBadge.style.display = 'none';
    }
  }

  if (hmfTrigger && hmfPanel) {
    hmfTrigger.addEventListener('click', function () {
      var isOpen = hmfPanel.style.display !== 'none';
      if (isOpen) {
        hmfPanel.style.display = 'none';
        hmfTrigger.setAttribute('aria-expanded', 'false');
      } else {
        hmfPanel.style.display = 'block';
        hmfTrigger.setAttribute('aria-expanded', 'true');
      }
      if (window.lucide) lucide.createIcons();
    });
  }
  if (hmfReset) {
    hmfReset.addEventListener('click', function () {
      compoundInput.value = '';
      filterState.compounds = [];
      filterState.beds = 0;
      compoundDropdown.style.display = 'none';
      compoundChevron.style.transform = 'rotate(0)';
      renderChips();
      bedsWrap.querySelectorAll('button').forEach(function (x, i) { x.classList.toggle('on', i === 0); });
      applyFilter();
      updateActiveBadge();
    });
  }

  // Initial count
  countEl.textContent = allMarkers.length + ' ' + ((window.HZ && HZ.lang && HZ.lang() === 'ar') ? 'كمبوند' : 'compounds');

  // Fix tile rendering after layout settles
  setTimeout(function () { map.invalidateSize(); }, 200);
  setTimeout(function () { map.invalidateSize(); }, 800);
  window.addEventListener('resize', function () { map.invalidateSize(); });

  // ─── Re-render markers when language changes ───
  // When user switches EN↔AR, compound names on markers need to update.
  // We listen for the custom 'hzp:lang' event dispatched by shared.js.
  document.addEventListener('hzp:lang', function (e) {
    var newLang = e.detail;
    // Refresh each marker's icon with the new language name
    allMarkers.forEach(function (m) {
      var c = m._compound;
      if (!c) return;
      var isFeat = featured.indexOf(c.n) >= 0;
      m.setIcon(markerIcon(c, isFeat));
    });
    // Update count text
    var visibleCount = clusterGroup.getLayers().length;
    countEl.textContent = visibleCount + ' ' + (newLang === 'ar' ? 'كمبوند' : (visibleCount === 1 ? 'compound' : 'compounds'));
    // Update datalist options with Arabic names
    if (compoundList) {
      compoundList.innerHTML = D.compounds.map(function (c) {
        var name = D.compoundName ? D.compoundName(c.n, newLang) : c.n;
        return '<option value="' + name + '">';
      }).join('');
    }
    // Update filter input placeholder (data-i18n-ph handles this, but reload-safe)
  });

  // ─── Sticky map: freeze when scrolled past, unfreeze when leaving section ───
  var mapWrap = document.getElementById('map-sticky-wrap');
  var mapSection = document.getElementById('map-section');
  if (mapWrap && mapSection) {
    var stickyActive = false;
    window.addEventListener('scroll', function () {
      var secRect = mapSection.getBoundingClientRect();
      var wrapRect = mapWrap.getBoundingClientRect();
      // Activate sticky when the map wrapper top goes above the header
      if (wrapRect.top < 64 && secRect.bottom > 300 && !stickyActive) {
        mapWrap.classList.add('sticky');
        stickyActive = true;
        setTimeout(function () { map.invalidateSize(); }, 300);
      } else if ((wrapRect.top >= 64 || secRect.bottom <= 300) && stickyActive) {
        mapWrap.classList.remove('sticky');
        stickyActive = false;
        setTimeout(function () { map.invalidateSize(); }, 300);
      }
    }, { passive: true });
  }
})();



(function () {
  'use strict';
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Apply .se-fade + framer-motion classes to key content blocks ───────
  function setupFades() {
    // Basic fade-up for general elements
    var fadeSelectors = [
      '.sec-head .eyebrow', '.hz-sec-head h2',
      '.hz-block h2', '.hz-cta h3',
      '.search-card', '.hz-search-card',
      '.hz-comp', '.hz-room', '.hz-stats .stat', '.hz-cta',
      '.block .wrap > p', '.cpd-card',
      '.testi-card', '.ai-tile',
      '#tour .wrap > div'
    ];
    document.querySelectorAll(fadeSelectors.join(',')).forEach(function (el) {
      if (el.dataset.seFade) return;
      el.classList.add('se-fade');
      el.dataset.seFade = '1';
    });

    // Framer-motion: headings slide down from top
    document.querySelectorAll('.sec-head h2, .ai-hub h2').forEach(function (el) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-down');
      el.dataset.fmDone = '1';
    });

    // Framer-motion: listing cards spin-in with stagger
    document.querySelectorAll('.grid-props .pcard, #prop-grid .pcard').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-spin', 'fm-d' + ((i % 6) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: Why Sierra features slide from left/right alternating
    document.querySelectorAll('.grid-feat .feat').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add(i % 2 === 0 ? 'fm-left' : 'fm-right', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: net-banner slides from left
    var nb = document.querySelector('.net-banner');
    if (nb && !nb.dataset.fmDone) { nb.classList.add('fm-left'); nb.dataset.fmDone = '1'; }

    // Framer-motion: AI cards spin-in
    document.querySelectorAll('.ai-card').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-spin', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: compound cards slide from left/right
    document.querySelectorAll('.grid-comp .comp, #comp-grid .comp').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add(i % 2 === 0 ? 'fm-left' : 'fm-right', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: stats write-on effect
    document.querySelectorAll('.stats .stat').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-write', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: 3D tour section blur-in
    var tourSec = document.getElementById('tour');
    if (tourSec && !tourSec.dataset.fmDone) { tourSec.classList.add('fm-blur'); tourSec.dataset.fmDone = '1'; }

    // Framer-motion: map section clip-reveal
    var mapSec = document.getElementById('map-section');
    if (mapSec && !mapSec.dataset.fmDone) { mapSec.classList.add('fm-clip'); mapSec.dataset.fmDone = '1'; }

    // Framer-motion: insights cards flip-3D
    document.querySelectorAll('#insights-grid > a').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-flip', 'fm-d' + ((i % 3) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: CTA scale-up
    var cta = document.querySelector('.cta');
    if (cta && !cta.dataset.fmDone) { cta.classList.add('fm-scale'); cta.dataset.fmDone = '1'; }

    // Framer-motion: AI preview images blur-in
    document.querySelectorAll('.ai-hub a img').forEach(function (el, i) {
      if (el.parentElement.dataset.fmDone) return;
      el.parentElement.classList.add('fm-blur', 'fm-d' + ((i % 3) + 1));
      el.parentElement.dataset.fmDone = '1';
    });
  }

  // ─── Check which elements are in viewport + reveal them ─────────────────
  function checkFades() {
    // Trigger se-fade (Percipio-style fade-up)
    document.querySelectorAll('.se-fade:not(.se-fade-in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88 && r.bottom > 0) {
        el.classList.add('se-fade-in');
      }
    });
    // Trigger framer-motion animations (must include EVERY fm-* class that
    // starts at opacity:0 — fm-blur, fm-clip, fm-flip, fm-scale were previously
    // missing, which kept the 3D tour, map, insights cards, CTA and AI preview
    // images permanently invisible. See lines ~1295-1320 for class assignment.)
    document.querySelectorAll('.fm-spin:not(.fm-in), .fm-down:not(.fm-in), .fm-left:not(.fm-in), .fm-right:not(.fm-in), .fm-write:not(.fm-in), .fm-scale:not(.fm-in), .fm-flip:not(.fm-in), .fm-blur:not(.fm-in), .fm-clip:not(.fm-in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88 && r.bottom > 0) {
        el.classList.add('fm-in');
      }
    });
  }

  // ─── Stagger: add delay to grid children for cascade effect ────────────
  function setupStagger() {
    var grids = document.querySelectorAll('.grid-comp, .hz-grid-comp, .hz-rooms, .grid-props, .hz-grid-props, .stats .grid, .hz-stats .grid');
    grids.forEach(function (grid) {
      var children = grid.children;
      for (var i = 0; i < children.length && i < 8; i++) {
        children[i].style.transitionDelay = (i * 0.08) + 's';
      }
    });
  }

  // ─── Smooth scroll: REMOVED ─────────────────────────────────────────────
  // The custom smooth scroll (both the wheel-hijack version and the lerp
  // version) was causing issues:
  //   - wheel preventDefault blocked native scroll on some setups
  //   - window.scrollTo override broke nav link clicks + scrollIntoView
  // Native browser scrolling is now used — it works perfectly on Windows
  // (mouse wheel, trackpad) and Mac (trackpad momentum scroll) without
  // any JavaScript intervention. The scroll-triggered fade-up reveals
  // still work because they listen to the native 'scroll' event.

  // ─── Init ────────────────────────────────────────────────────────────────
  if (reduced) {
    // Show everything immediately
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.se-fade').forEach(function (el) {
        el.classList.add('se-fade-in');
      });
    });
  } else {
    // Setup after portal JS renders content
    setTimeout(function () {
      setupFades();
      setupStagger();
      checkFades();
      window.addEventListener('scroll', checkFades, { passive: true });
      window.addEventListener('resize', checkFades, { passive: true });
    }, 500);

    // Re-check after dynamic content loads (portal JS renders async)
    var obs = new MutationObserver(function () {
      setupFades();
      checkFades();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 5000);

    // ── FAILSAFE: any fm-* element still at opacity:0 after 4s gets fm-in.
    // This prevents the entire 3D tour / map / CTA / insights sections from
    // staying invisible forever if the scroll check somehow misses them
    // (e.g. user lands on a deep link, viewport miscalculation, layout shift).
    setTimeout(function () {
      document.querySelectorAll(
        '.fm-spin:not(.fm-in), .fm-down:not(.fm-in), .fm-left:not(.fm-in), ' +
        '.fm-right:not(.fm-in), .fm-write:not(.fm-in), .fm-scale:not(.fm-in), ' +
        '.fm-flip:not(.fm-in), .fm-blur:not(.fm-in), .fm-clip:not(.fm-in)'
      ).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('fm-in');
        }
      });
    }, 4000);
    // Ultimate backstop: after 8s, force-reveal EVERYTHING still hidden so
    // no section is permanently invisible regardless of viewport state.
    setTimeout(function () {
      document.querySelectorAll(
        '[class*="fm-"]:not(.fm-in), .se-fade:not(.se-fade-in)'
      ).forEach(function (el) { el.classList.add('fm-in', 'se-fade-in'); });
    }, 8000);
  }
})();



(function () {
  'use strict';
  var trigger = document.getElementById('tweaks-trigger');
  var overlay = document.getElementById('tweaks-overlay');
  var closeBtn = document.getElementById('tweaks-close');
  if (!trigger || !overlay) return;

  // Load saved settings
  var savedAccent = localStorage.getItem('se-accent') || '#00aeff';
  var savedFont = localStorage.getItem('se-font-color') || '#0d2136';
  var savedRadius = localStorage.getItem('se-radius') || '10';
  applyAccent(savedAccent);
  applyFont(savedFont);
  applyRadius(savedRadius);
  var savedLogo = localStorage.getItem('se-logo') || '';
  if (savedLogo) applyLogo(savedLogo);
  window.addEventListener('load', function () { if (savedLogo) applyLogo(savedLogo); });
  // Mark active swatches
  document.querySelectorAll('.tweaks-swatch').forEach(function (s) {
    s.classList.toggle('on', s.getAttribute('data-color') === savedAccent);
  });
  document.querySelectorAll('.tweaks-font-btn').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-font') === savedFont);
  });
  document.querySelectorAll('.tweaks-corner-btn').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-radius') === savedRadius);
  });

  trigger.addEventListener('click', function () { overlay.classList.add('on'); });
  closeBtn.addEventListener('click', function () { overlay.classList.remove('on'); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('on'); });

  // Accent color
  document.querySelectorAll('.tweaks-swatch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      var color = this.getAttribute('data-color');
      document.querySelectorAll('.tweaks-swatch').forEach(function (s) { s.classList.remove('on'); });
      this.classList.add('on');
      applyAccent(color);
      localStorage.setItem('se-accent', color);
    });
  });

  // Font color
  document.querySelectorAll('.tweaks-font-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var color = this.getAttribute('data-font');
      document.querySelectorAll('.tweaks-font-btn').forEach(function (b) { b.classList.remove('on'); });
      this.classList.add('on');
      applyFont(color);
      localStorage.setItem('se-font-color', color);
    });
  });

  // Corner radius
  document.querySelectorAll('.tweaks-corner-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var r = this.getAttribute('data-radius');
      document.querySelectorAll('.tweaks-corner-btn').forEach(function (b) { b.classList.remove('on'); });
      this.classList.add('on');
      applyRadius(r);
      localStorage.setItem('se-radius', r);
    });
  });

  var logoFile = document.getElementById('tweaks-logo-file');
  var logoReset = document.getElementById('tweaks-logo-reset');
  if (logoFile) logoFile.addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function (e) {
      var src = e.target.result;
      applyLogo(src); savedLogo = src;
      try { localStorage.setItem('se-logo', src); } catch (err) {}
    };
    rd.readAsDataURL(f);
  });
  if (logoReset) logoReset.addEventListener('click', function () {
    applyLogo('logo-gold.png'); savedLogo = '';
    localStorage.removeItem('se-logo');
    if (logoFile) logoFile.value = '';
  });
  function applyLogo(src) {
    document.querySelectorAll('.brand .mark.logo img, img[alt="Sierra Estates"]').forEach(function (img) { img.src = src; });
    var prev = document.getElementById('tweaks-logo-preview-img');
    if (prev) prev.src = src;
  }

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--pri', color);
  }
  function applyFont(color) {
    document.documentElement.style.setProperty('--ink', color);
    document.documentElement.style.setProperty('--text', color);
  }
  function applyRadius(r) {
    document.documentElement.style.setProperty('--r-card', r + 'px');
    document.documentElement.style.setProperty('--r-btn', Math.max(0, r - 2) + 'px');
  }
})();



(function(){
  var hub=document.getElementById('ai');
  if(!hub) return;
  var mark=document.getElementById('ai-watermark');
  var cards=[];
  function collect(){cards=[].slice.call(hub.querySelectorAll('.ai-card'));}
  collect();
  new MutationObserver(collect).observe(document.getElementById('ai-grid')||hub,{childList:true});
  var raf=null,mx=0,my=0;
  hub.addEventListener('mousemove',function(e){
    var r=hub.getBoundingClientRect();
    var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
    mx=px;my=py;
    if(raf) return;
    raf=requestAnimationFrame(function(){
      raf=null;
      if(mark) mark.style.transform='translate3d('+(mx*-34)+'px,'+(my*-34)+'px,0) rotate('+(mx*3)+'deg)';
      var cr;
      cards.forEach(function(c){
        cr=c.getBoundingClientRect();
        var cx=(e.clientX-cr.left)/cr.width, cy=(e.clientY-cr.top)/cr.height;
        if(cx<-0.15||cx>1.15||cy<-0.15||cy>1.15){c.style.transform='';return;}
        c.style.setProperty('--mx',(cx*100)+'%');
        c.style.setProperty('--my',(cy*100)+'%');
        c.style.transform='perspective(720px) rotateX('+((0.5-cy)*5)+'deg) rotateY('+((cx-0.5)*5)+'deg) translateY(-4px)';
      });
    });
  });
  hub.addEventListener('mouseleave',function(){
    if(mark) mark.style.transform='';
    cards.forEach(function(c){c.style.transform='';});
  });
})();
