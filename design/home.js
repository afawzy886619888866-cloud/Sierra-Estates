/* Sierra Estates — home page logic.
   Depends on data.js (window.HZDATA) and shared.js (window.HZ). Loaded with defer. */
(function () {
  'use strict';
  var D = window.HZDATA;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isAr = HZ.lang() === 'ar';

  /* ═══ render dynamic content (before HZ.mount so i18n/icons/reveal apply) ═══ */

  /* hero slides + dots — only the first image loads eagerly */
  document.getElementById('hero-slides').innerHTML = D.slides.map(function (s, i) {
    var attrs = i === 0 ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
    return '<div class="slide' + (i === 0 ? ' on' : '') + '"><img src="' + s.img + '" alt=""' + attrs + '/></div>';
  }).join('');
  document.getElementById('hero-dots').innerHTML = D.slides.map(function (_, i) {
    return '<button type="button"' + (i === 0 ? ' class="on"' : '') + ' aria-label="Slide ' + (i + 1) + '"></button>';
  }).join('');

  /* featured properties (6) */
  document.getElementById('prop-grid').innerHTML = D.listings.slice(0, 6).map(HZ.pcard).join('');

  /* compound tiles */
  var picks = ['Hyde Park New Cairo', 'Mivida', 'Mountain View iCity', 'Eastown (SODIC)'];
  document.getElementById('comp-grid').innerHTML = picks.map(function (n, i) {
    var c = D.compounds.find(function (x) { return x.n === n; });
    if (!c) return '';
    return '<a class="comp rv d' + (i + 1) + '" href="compounds.html?cpd=' + encodeURIComponent(c.n) + '">' +
      '<img src="' + D.compoundImgs[n] + '" alt="' + c.n + '" loading="lazy" decoding="async"/>' +
      '<div class="co-scrim"></div>' +
      '<div class="co-count">AI ' + c.ai.toFixed(1) + ' · ' + c.g + '</div>' +
      '<div class="co-body"><h4>' + c.n + '</h4><span>' + c.z + ' · EGP ' + c.priceM + 'M avg</span></div></a>';
  }).join('');

  /* testimonials */
  var star = '<i data-lucide="star" class="i"></i>';
  document.getElementById('testi-grid').innerHTML = [1, 2, 3].map(function (n, i) {
    var nm = HZ.t('t' + n + 'n');
    var initials = nm.split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('');
    return '<div class="tcard rv d' + (i + 1) + '">' +
      '<div class="stars" aria-hidden="true">' + star + star + star + star + star + '</div>' +
      '<p>“' + HZ.t('t' + n + 'q') + '”</p>' +
      '<div class="who"><span class="av" aria-hidden="true">' + initials + '</span><span><b>' + nm + '</b><small>' + HZ.t('t' + n + 'r') + '</small></span></div></div>';
  }).join('');

  /* market ticker (decorative, duplicated for the loop) */
  var tickItems = isAr
    ? ['ماونتن فيو +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجار من $1,700/شهر', 'هايد بارك AI 9.8', 'الرحاب عائد 8.1%', 'مدينتي طلب متزايد']
    : ['Mountain View iCity +24%', 'Uptown Cairo +31%', 'Mivida rentals from $1,700/mo', 'Hyde Park AI score 9.8', 'Villette yield 8.1%', 'Taj City demand rising'];
  document.getElementById('ticker-row').innerHTML = tickItems.concat(tickItems).map(function (s) { return '<span>' + s + '</span>'; }).join('');

  /* AI hub cards */
  var AI_IC = {
    engine: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="20" stroke="#C8961A" stroke-width="1" stroke-dasharray="4 3" opacity=".4"><animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="8s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="13" stroke="#E9C176" stroke-width="1" stroke-dasharray="3 4" opacity=".3"><animateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="5s" repeatCount="indefinite"/></circle><circle cx="24" cy="11" r="2.5" fill="#C8961A"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="4" fill="#E9C176"><animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite"/></circle></svg>',
    match: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="18" stroke="#4ade80" stroke-width="1.5"><animate attributeName="r" values="10;20;10" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0;.5" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="5" fill="#4ade80"/><path d="M21.5 24 L23.5 26.5 L27.5 21" stroke="#071524" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    roi: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="7" y="30" width="7" height="10" rx="2" fill="#f59e0b" opacity=".5"><animate attributeName="height" values="3;10;3" dur="2.2s" repeatCount="indefinite"/><animate attributeName="y" values="37;30;37" dur="2.2s" repeatCount="indefinite"/></rect><rect x="17" y="22" width="7" height="18" rx="2" fill="#f59e0b" opacity=".75"><animate attributeName="height" values="7;18;7" dur="2.2s" begin=".35s" repeatCount="indefinite"/><animate attributeName="y" values="33;22;33" dur="2.2s" begin=".35s" repeatCount="indefinite"/></rect><rect x="27" y="13" width="7" height="27" rx="2" fill="#f59e0b"><animate attributeName="height" values="12;27;12" dur="2.2s" begin=".7s" repeatCount="indefinite"/><animate attributeName="y" values="28;13;28" dur="2.2s" begin=".7s" repeatCount="indefinite"/></rect></svg>',
    price: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 8 L32 8 L40 24 L32 40 L8 40 Z" stroke="#a78bfa" stroke-width="1.5" fill="rgba(167,139,250,.08)"/><circle cx="15" cy="18" r="3" stroke="#a78bfa" stroke-width="1.5"/><text x="26" y="30" text-anchor="middle" font-weight="700" font-size="15" fill="#a78bfa" font-family="monospace">$<animate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite"/></text></svg>',
    dream: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 10 L36 22 L33 22 L33 36 L15 36 L15 22 L12 22 Z" fill="#f472b6" opacity=".9"/><rect x="20" y="27" width="8" height="9" fill="#07121E" rx="1"/><g><animateTransform attributeName="transform" type="rotate" from="0 24 23" to="360 24 23" dur="3s" repeatCount="indefinite"/><circle cx="40" cy="23" r="2.2" fill="#f472b6"><animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/></circle></g></svg>',
    imap: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="6" y="8" width="36" height="32" rx="3" stroke="#C8961A" stroke-width="1.3" fill="rgba(200,150,26,.07)"/><circle cx="24" cy="23" r="5" fill="rgba(200,150,26,.2)" stroke="#C8961A" stroke-width="1.5"><animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="23" r="2.5" fill="#C8961A"/></svg>',
    tour: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="18" stroke="#38bdf8" stroke-width="1.3" fill="rgba(56,189,248,.07)"/><ellipse cx="24" cy="24" rx="18" ry="7" stroke="#38bdf8" stroke-width="1" fill="none" opacity=".4"/><circle cx="24" cy="24" r="4" fill="#38bdf8"><animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite"/></circle><path d="M20 21 L28 24 L20 27 Z" fill="#fff" opacity=".9"/></svg>'
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
    return '<' + (tool.tour ? 'button' : 'a') + ' class="ai-card rv d' + ((i % 4) + 1) + '"' +
      (tool.tour ? ' type="button" id="ai-tour-card"' : ' href="' + tool.href + '"') + '>' +
      '<span class="ai-ic">' + AI_IC[tool.k] + '</span>' +
      '<h4 data-i18n="' + tool.t + '"></h4>' +
      '<p data-i18n="' + tool.s + '"></p>' +
      (tool.live ? '<span class="live-tag" data-i18n="aiLive"></span>' : '') +
      '</' + (tool.tour ? 'button' : 'a') + '>';
  }).join('');

  /* AI tool preview cards */
  var previews = [
    { href: 'matches.html', t: 'ai2t', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
    { href: 'pricing.html', t: 'ai4t', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
    { href: 'roi.html', t: 'ai3t', img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80' }
  ];
  document.getElementById('ai-previews').innerHTML = previews.map(function (p) {
    return '<a href="' + p.href + '" class="ai-prev">' +
      '<img src="' + p.img + '" alt="" loading="lazy" decoding="async"/>' +
      '<div class="ap-scrim"></div>' +
      '<div class="ap-body"><div class="ap-live" data-i18n="aiLive"></div><div class="ap-tit" data-i18n="' + p.t + '"></div></div></a>';
  }).join('');

  /* inquiry selects */
  document.getElementById('inq-zone').innerHTML = ['z1', 'z2', 'z3', 'z4'].map(function (k) { return '<option data-i18n="' + k + '"></option>'; }).join('');
  document.getElementById('inq-type').innerHTML = ['lVilla', 'lApt', 'lTwin', 'lPent'].map(function (k) { return '<option data-i18n="' + k + '"></option>'; }).join('');

  /* Insights — top 3 AI-ranked listings */
  var topListings = D.listings.slice().sort(function (a, b) { return b.ai - a.ai; }).slice(0, 3);
  document.getElementById('insights-grid').innerHTML = topListings.map(function (p, i) {
    var rank = i + 1;
    return '<a href="property.html?id=' + p.id + '" style="display:block;text-decoration:none;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:.3s var(--silk);position:relative;">' +
      '<div style="position:relative;height:200px;overflow:hidden;">' +
        '<img src="' + p.img + '" alt="' + p.code + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>' +
        '<div style="position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#34d399,#22c55e);color:#fff;font-family:var(--mono);font-weight:800;font-size:12px;padding:5px 12px;border-radius:8px;box-shadow:0 4px 12px rgba(52,211,153,.4);">#' + rank + ' AI ' + p.ai.toFixed(1) + '</div>' +
        (p.tag ? '<div style="position:absolute;top:12px;right:12px;background:rgba(0,43,75,.88);color:#fff;font-family:var(--mono);font-weight:700;font-size:10px;padding:4px 9px;border-radius:5px;text-transform:uppercase;">' + p.tag + '</div>' : '') +
        '<div style="position:absolute;bottom:12px;right:12px;background:rgba(0,43,75,.88);color:#fff;font-family:var(--mono);font-weight:700;font-size:13px;padding:6px 12px;border-radius:6px;">' + (p.mode === 'sale' ? p.egpM + 'M EGP' : '$' + p.usd + '/mo') + '</div>' +
      '</div>' +
      '<div style="padding:18px;">' +
        '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--pri);margin-bottom:6px;">' + p.code + ' · ' + p.type + '</div>' +
        '<div style="font-size:17px;font-weight:700;color:var(--ink);margin-bottom:4px;">' + p.cmp + '</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">' + p.zone + '</div>' +
        '<div style="display:flex;gap:14px;font-size:13px;color:var(--text);font-weight:600;">' +
          '<span>🛏 ' + p.beds + '</span>' +
          '<span>🚿 ' + p.bath + '</span>' +
          '<span>📐 ' + p.area + ' m²</span>' +
        '</div>' +
      '</div>' +
    '</a>';
  }).join('');

  /* mount shared chrome — applies i18n, icons, reveal-on-scroll, counters */
  HZ.mount('home');

  /* ═══ hero slider ═══ */
  var slides = document.querySelectorAll('.hero .slide');
  var dots = document.querySelectorAll('.hero .dots button');
  var cur = 0, timer;
  function setSlide(n) {
    if (!slides.length || !dots.length) return;
    slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
    cur = ((n % D.slides.length) + D.slides.length) % D.slides.length;
    slides[cur].classList.add('on'); dots[cur].classList.add('on');
    var s = D.slides[cur];
    var pre = document.getElementById('hero-pre');
    var main = document.getElementById('hero-main');
    if (pre && main) {
      pre.style.opacity = '0'; main.style.opacity = '0';
      pre.style.transform = 'translateY(15px)'; main.style.transform = 'translateY(15px)';
      setTimeout(function () {
        pre.textContent = isAr ? s.preAr : s.pre;
        var txt = isAr ? s.mainAr : s.main;
        var words = txt.split(' ');
        var hl = words.splice(-3).join(' ');
        main.innerHTML = words.join(' ') + ' <span class="hl">' + hl + '</span>';
        pre.style.transition = 'opacity .6s var(--silk), transform .6s var(--silk)';
        main.style.transition = 'opacity .6s var(--silk), transform .6s var(--silk)';
        pre.style.opacity = '1'; main.style.opacity = '1';
        pre.style.transform = 'translateY(0)'; main.style.transform = 'translateY(0)';
      }, 400);
    }
  }
  function arm() { clearInterval(timer); timer = setInterval(function () { setSlide(cur + 1); }, 7000); }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { setSlide(i); arm(); }); });
  setSlide(0);
  if (!reduced) {
    arm();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer); else arm();
    });
  }

  /* ═══ hero search compound autocomplete + filters ═══ */
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
        heroResults.innerHTML = '<div style="padding:12px 16px;color:var(--muted);font-size:13px;">No compounds found</div>';
        heroResults.style.display = 'block';
        return;
      }
      heroResults.innerHTML = matches.map(function (c) {
        return '<div class="compound-option" data-cpd="' + c.n + '" style="padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink);transition:.15s;">' +
          '<b>' + c.n + '</b> <span style="color:var(--muted);font-size:11px;">&middot; ' + c.z + ' &middot; ' + D.unitsFor(c.n).length + ' units</span>' +
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
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-compound-wrap')) {
        heroResults.style.display = 'none';
      }
    });
  }

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
      if (cpd) {
        location.href = 'compounds.html' + (qs ? '?' + qs : '');
      } else {
        location.href = 'properties.html' + (qs ? '?' + qs : '');
      }
    });
  }

  /* ═══ search tabs (visual mode toggle) ═══ */
  document.querySelectorAll('.search-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.search-tabs button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
    });
  });

  /* ═══ inquiry form ═══ */
  var segButtons = document.querySelectorAll('#inq-seg button');
  var inqMode = 'buy';
  segButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      segButtons.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
      inqMode = b.dataset.i18n === 'inqBuy' ? 'buy' : b.dataset.i18n === 'inqRent' ? 'rent' : 'sell';
    });
  });

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

      var submitBtn = inqForm.querySelector('button[type="submit"]');
      var originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2" class="i" style="animation:vtv-spin 1s linear infinite;"></i> <span>Sending…</span>';
        if (window.lucide) lucide.createIcons();
      }

      function showSuccess() {
        var doneEl = document.getElementById('inq-done');
        if (doneEl) {
          doneEl.classList.add('on');
          doneEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { doneEl.classList.remove('on'); }, 6000);
        }
        inqForm.reset();
        segButtons.forEach(function (x, i) { x.classList.toggle('on', i === 0); x.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); });
        inqMode = 'buy';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          if (window.lucide) lucide.createIcons();
        }
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
        } catch (err) {}
      }

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

  /* CTA "List your property" → inquiry form with "Sell" preselected */
  var ctaListBtn = document.getElementById('cta-list');
  if (ctaListBtn) {
    ctaListBtn.addEventListener('click', function () {
      var sell = segButtons[2];
      if (sell) sell.click();
      var inqSec = document.getElementById('inquiry');
      if (inqSec) inqSec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      var name = document.getElementById('inq-name');
      if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, reduced ? 0 : 600);
    });
  }

  /* ═══ 3D tour embed — poster first, iframe only on demand ═══ */
  (function () {
    var TOUR_SRC = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';
    var poster = document.getElementById('vtv-poster');
    var iframe = document.getElementById('vtv-iframe');
    var loading = document.getElementById('vtv-loading');
    var fsBtn = document.getElementById('vtv-fs');
    var frame = document.getElementById('vtv-frame') || document.getElementById('vtv-banner');
    var loaded = false;
    if (poster && iframe && loading && fsBtn && frame) {
      poster.addEventListener('click', function () {
        if (loaded) return;
        loaded = true;
        loading.style.display = 'flex';
        poster.style.display = 'none';
        iframe.src = TOUR_SRC;
        iframe.onload = function () {
          loading.style.display = 'none';
          iframe.style.opacity = '1';
          fsBtn.style.display = 'grid';
        };
      });
      fsBtn.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (frame.requestFullscreen) frame.requestFullscreen();
      });
    }
  })();

  /* ═══ virtual tour modal (Three.js page in an iframe) ═══ */
  (function () {
    var modal = document.getElementById('tour-modal');
    var closeBtn = document.getElementById('tour-close');
    var lastFocus = null;
    if (!modal || !closeBtn) return;
    function openTour() {
      var f = document.getElementById('tour-frame');
      if (f && !f.src) f.src = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';
      lastFocus = document.activeElement;
      modal.classList.add('on');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function closeTour() {
      modal.classList.remove('on');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    var openBtn = document.getElementById('tour-open');
    if (openBtn) openBtn.addEventListener('click', openTour);
    var tourCard = document.getElementById('ai-tour-card');
    if (tourCard) tourCard.addEventListener('click', openTour);
    closeBtn.addEventListener('click', closeTour);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('on')) closeTour();
    });
  })();

  /* ═══ live compound map — Leaflet loaded lazily when the section nears view ═══ */
  (function () {
    var mapEl = document.getElementById('home-map');
    if (!mapEl) return;
    var CSS = [
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
      'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
    ];
    var started = false;

    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    function loadAssets() {
      CSS.forEach(function (href) {
        var l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href;
        document.head.appendChild(l);
      });
      return loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(function () {
        return loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
      });
    }

    function initMap() {
      var featured = D.featured || [];
      var theme = HZ.theme();
      var map = L.map('home-map', { scrollWheelZoom: false, zoomControl: true }).setView([30.03, 31.57], 11);
      var tiles = {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      };
      var layer = L.tileLayer(tiles[theme], { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18 }).addTo(map);

      document.addEventListener('hzp:theme', function (e) { layer.setUrl(tiles[e.detail]); });

      function markerIcon(c, isFeatured) {
        var hot = c.ai >= 9.2;
        var cls = 'cpd-marker' + (hot ? ' hot' : '') + (isFeatured ? ' pulse' : '');
        var curLang = HZ.lang();
        var displayName = D.compoundName ? D.compoundName(c.n, curLang) : c.n;
        var unitCount = 0;
        if (typeof D.unitsFor === 'function') {
          try { unitCount = D.unitsFor(c.n).length; } catch (e) {}
        }
        var unitBadge = unitCount > 0 ? '<span class="unit-count">' + unitCount + '</span>' : '';
        return L.divIcon({
          className: '',
          html: '<span class="' + cls + '" title="' + displayName + ' (' + unitCount + ' units)">' + displayName + unitBadge + '</span>',
          iconSize: null
        });
      }

      var clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
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
        marker._compound = c;
        clusterGroup.addLayer(marker);
      });
      map.addLayer(clusterGroup);

      try { map.fitBounds(clusterGroup.getBounds(), { padding: [40, 40], maxZoom: 13 }); } catch (e) {}
      requestAnimationFrame(function () { map.invalidateSize(); });

      // ═══ Map filters ═══
      var allMarkers = clusterGroup.getLayers();
      var compoundInput = document.getElementById('home-map-compound');
      var compoundDropdown = document.getElementById('hmf-compound-dropdown');
      var compoundChevron = document.getElementById('hmf-compound-chevron');
      var compoundChips = document.getElementById('hmf-compound-chips');
      var bedsWrap = document.getElementById('home-map-beds');
      var countEl = document.getElementById('home-map-count');

      var filterState = { compounds: [], beds: 0 };

      function renderCompoundDropdown(query) {
        var q = (query || '').trim().toLowerCase();
        var items = D.compounds.filter(function (c) {
          if (!q) return true;
          return c.n.toLowerCase().indexOf(q) >= 0;
        });
        if (!items.length) {
          compoundDropdown.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:13px;text-align:center;">No compounds found</div>';
          return;
        }
        compoundDropdown.innerHTML = items.map(function (c) {
          var isSelected = filterState.compounds.indexOf(c.n) >= 0;
          var unitCount = (typeof D.unitsFor === 'function') ? D.unitsFor(c.n).length : 0;
          return '<div class="hmf-cpd-item' + (isSelected ? ' selected' : '') + '" data-cpd="' + c.n + '" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:.15s;' + (isSelected ? 'background:rgba(0,174,255,.08);' : '') + '">' +
            '<span style="width:18px;height:18px;border-radius:5px;border:2px solid ' + (isSelected ? 'var(--pri)' : 'var(--line-2)') + ';background:' + (isSelected ? 'var(--pri)' : 'transparent') + ';display:grid;place-items:center;flex:none;">' + (isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</span>' +
            '<span style="flex:1;font-size:13.5px;font-weight:600;color:var(--ink);">' + c.n + '</span>' +
            '<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);background:var(--bg);padding:2px 8px;border-radius:999px;">' + unitCount + '</span>' +
          '</div>';
        }).join('');

        compoundDropdown.querySelectorAll('.hmf-cpd-item').forEach(function (item) {
          item.addEventListener('click', function (e) {
            e.stopPropagation();
            var name = this.getAttribute('data-cpd');
            var idx = filterState.compounds.indexOf(name);
            if (idx >= 0) {
              filterState.compounds.splice(idx, 1);
            } else {
              filterState.compounds.push(name);
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

      function renderChips() {
        if (!compoundChips) return;
        if (!filterState.compounds.length) {
          compoundChips.innerHTML = '';
          compoundChips.style.minHeight = '0';
          return;
        }
        compoundChips.style.minHeight = '32px';
        compoundChips.innerHTML = filterState.compounds.map(function (name) {
          return '<span class="hmf-chip" data-cpd="' + name + '" style="display:inline-flex;align-items:center;gap:6px;background:var(--pri);color:#fff;font-family:var(--font);font-size:12px;font-weight:700;padding:5px 10px 5px 12px;border-radius:999px;gap:6px;">' +
            '<span>' + name + '</span>' +
            '<button type="button" data-remove="' + name + '" style="border:none;background:rgba(255,255,255,.25);color:#fff;width:16px;height:16px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;display:grid;place-items:center;padding:0;" aria-label="Remove ' + name + '">×</button>' +
          '</span>';
        }).join('');
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
          var matchCompound = !selectedCompounds.length || selectedCompounds.indexOf(c.n) >= 0;
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

        if (countEl) {
          var isArabic = HZ.lang() === 'ar';
          countEl.textContent = visible.length + ' ' + (isArabic ? 'كمبوند' : (visible.length === 1 ? 'compound' : 'compounds'));
        }

        if (visible.length > 0) {
          try {
            var group = L.featureGroup(visible);
            map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 13 });
          } catch (e) {}
        }
        setTimeout(function () { map.invalidateSize(); }, 100);
      }

      if (compoundInput) {
        compoundInput.addEventListener('focus', function () {
          compoundDropdown.style.display = 'block';
          if (compoundChevron) compoundChevron.style.transform = 'rotate(180deg)';
          renderCompoundDropdown(compoundInput.value);
        });
        compoundInput.addEventListener('input', function (e) {
          compoundDropdown.style.display = 'block';
          if (compoundChevron) compoundChevron.style.transform = 'rotate(180deg)';
          renderCompoundDropdown(e.target.value);
        });
        compoundInput.addEventListener('click', function (e) { e.stopPropagation(); });
      }
      document.addEventListener('click', function (e) {
        if (compoundDropdown && !e.target.closest('#hmf-compound-dropdown') && !e.target.closest('#home-map-compound') && !e.target.closest('#hmf-compound-chevron')) {
          compoundDropdown.style.display = 'none';
          if (compoundChevron) compoundChevron.style.transform = 'rotate(0)';
        }
      });
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

      var hmfTrigger = document.getElementById('hmf-trigger');
      var hmfPanel = document.getElementById('hmf-panel');
      var hmfReset = document.getElementById('hmf-reset');
      var activeBadge = document.getElementById('hmf-active-badge');

      function updateActiveBadge() {
        if (!activeBadge) return;
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
          if (compoundInput) compoundInput.value = '';
          filterState.compounds = [];
          filterState.beds = 0;
          if (compoundDropdown) {
            compoundDropdown.style.display = 'none';
            if (compoundChevron) compoundChevron.style.transform = 'rotate(0)';
          }
          renderChips();
          if (bedsWrap) {
            bedsWrap.querySelectorAll('button').forEach(function (x, i) { x.classList.toggle('on', i === 0); });
          }
          applyFilter();
          updateActiveBadge();
        });
      }

      if (countEl) {
        var isArabic = HZ.lang() === 'ar';
        countEl.textContent = allMarkers.length + ' ' + (isArabic ? 'كمبوند' : 'compounds');
      }

      setTimeout(function () { map.invalidateSize(); }, 200);
      window.addEventListener('resize', function () { map.invalidateSize(); });

      // Re-render markers on lang change
      document.addEventListener('hzp:lang', function (e) {
        var newLang = e.detail;
        allMarkers.forEach(function (m) {
          var c = m._compound;
          if (!c) return;
          m.setIcon(markerIcon(c, featured.indexOf(c.n) >= 0));
        });
        var visibleCount = clusterGroup.getLayers().length;
        if (countEl) {
          countEl.textContent = visibleCount + ' ' + (newLang === 'ar' ? 'كمبوند' : (visibleCount === 1 ? 'compound' : 'compounds'));
        }
      });

      // Sticky map behaviour
      var mapWrap = document.getElementById('map-sticky-wrap');
      var mapSection = document.getElementById('map-section');
      if (mapWrap && mapSection) {
        var stickyActive = false;
        window.addEventListener('scroll', function () {
          var secRect = mapSection.getBoundingClientRect();
          var wrapRect = mapWrap.getBoundingClientRect();
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
    }

    function start() {
      if (started) return;
      started = true;
      loadAssets().then(initMap).catch(function () {});
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
      }, { rootMargin: '600px 0px' });
      io.observe(mapEl);
    } else {
      start();
    }
  })();

  /* ═══ customization tweaks panel logic ═══ */
  (function () {
    var trigger = document.getElementById('tweaks-trigger');
    var overlay = document.getElementById('tweaks-overlay');
    var closeBtn = document.getElementById('tweaks-close');
    if (!trigger || !overlay) return;

    var savedAccent = localStorage.getItem('se-accent') || '#00aeff';
    var savedFont = localStorage.getItem('se-font-color') || '#0d2136';
    var savedRadius = localStorage.getItem('se-radius') || '10';
    applyAccent(savedAccent);
    applyFont(savedFont);
    applyRadius(savedRadius);

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

    document.querySelectorAll('.tweaks-swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        var color = this.getAttribute('data-color');
        document.querySelectorAll('.tweaks-swatch').forEach(function (s) { s.classList.remove('on'); });
        this.classList.add('on');
        applyAccent(color);
        localStorage.setItem('se-accent', color);
      });
    });

    document.querySelectorAll('.tweaks-font-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var color = this.getAttribute('data-font');
        document.querySelectorAll('.tweaks-font-btn').forEach(function (b) { b.classList.remove('on'); });
        this.classList.add('on');
        applyFont(color);
        localStorage.setItem('se-font-color', color);
      });
    });

    document.querySelectorAll('.tweaks-corner-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = this.getAttribute('data-radius');
        document.querySelectorAll('.tweaks-corner-btn').forEach(function (b) { b.classList.remove('on'); });
        this.classList.add('on');
        applyRadius(r);
        localStorage.setItem('se-radius', r);
      });
    });

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

  /* ═══ scroll-reveal animations (setupFades) ═══ */
  (function () {
    function setupFades() {
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

      document.querySelectorAll('.sec-head h2, .ai-hub h2').forEach(function (el) {
        if (el.dataset.fmDone) return;
        el.classList.add('fm-down');
        el.dataset.fmDone = '1';
      });

      document.querySelectorAll('.grid-props .pcard, #prop-grid .pcard').forEach(function (el, i) {
        if (el.dataset.fmDone) return;
        el.classList.add('fm-spin', 'fm-d' + ((i % 6) + 1));
        el.dataset.fmDone = '1';
      });

      document.querySelectorAll('.grid-feat .feat').forEach(function (el, i) {
        if (el.dataset.fmDone) return;
        el.classList.add(i % 2 === 0 ? 'fm-left' : 'fm-right', 'fm-d' + ((i % 4) + 1));
        el.dataset.fmDone = '1';
      });

      var nb = document.querySelector('.net-banner');
      if (nb && !nb.dataset.fmDone) { nb.classList.add('fm-left'); nb.dataset.fmDone = '1'; }

      document.querySelectorAll('.ai-card').forEach(function (el, i) {
        if (el.dataset.fmDone) return;
        el.classList.add('fm-spin', 'fm-d' + ((i % 4) + 1));
        el.dataset.fmDone = '1';
      });

      document.querySelectorAll('.grid-comp .comp, #comp-grid .comp').forEach(function (el, i) {
        if (el.dataset.fmDone) return;
        el.classList.add(i % 2 === 0 ? 'fm-left' : 'fm-right', 'fm-d' + ((i % 4) + 1));
        el.dataset.fmDone = '1';
      });

      document.querySelectorAll('.stats .stat').forEach(function (el, i) {
        if (el.dataset.fmDone) return;
        el.classList.add('fm-write', 'fm-d' + ((i % 4) + 1));
        el.dataset.fmDone = '1';
      });

      var tourSec = document.getElementById('tour');
      if (tourSec && !tourSec.dataset.fmDone) { tourSec.classList.add('fm-blur'); tourSec.dataset.fmDone = '1'; }

      var mapSec = document.getElementById('map-section');
      if (mapSec && !mapSec.dataset.fmDone) { mapSec.classList.add('fm-clip'); mapSec.dataset.fmDone = '1'; }

      document.querySelectorAll('#insights-grid > a').forEach(function (el, i) {
        if (el.dataset.fmDone) return;
        el.classList.add('fm-spin', 'fm-d' + ((i % 3) + 1));
        el.dataset.fmDone = '1';
      });
    }

    if (reduced) {
      document.querySelectorAll('.se-fade, [class*="fm-"]').forEach(function (el) {
        el.classList.add('se-fade-in', 'fm-in');
      });
      return;
    }

    setupFades();

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('se-fade-in', 'fm-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.se-fade, [class*="fm-"]').forEach(function (el) {
      io.observe(el);
    });

    setTimeout(function () {
      document.querySelectorAll('.se-fade, [class*="fm-"]').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('fm-in', 'se-fade-in');
        }
      });
    }, 4000);

    setTimeout(function () {
      document.querySelectorAll('[class*="fm-"]:not(.fm-in), .se-fade:not(.se-fade-in)').forEach(function (el) {
        el.classList.add('fm-in', 'se-fade-in');
      });
    }, 8000);
  })();

  /* Section order (tour after properties, AI hub after Why Sierra) is now
     baked into the HTML — the old JS reordering caused layout shift. */

  /* icons for content rendered after mount */
  HZ.refreshIcons();
  HZ.reveal();
})();
