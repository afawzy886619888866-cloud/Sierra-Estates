/* Sierra Estates — API bridge
   Hydrates the portal's demo data from the production backend when reachable.
   Contract: GET {API}/api/listings?limit=24  → { success, listings:[{id,title,price,compound,beds,baths,area,image,images,propertyType,status}] }
   Falls back silently to the built-in demo dataset (window.FEATURED) when offline.
   The app mount awaits window.SIERRA_DATA_READY (max ~2.5s). */
(function () {
  'use strict';
  var API = (window.SIERRA_API_BASE || new URLSearchParams(location.search).get('api') || '').replace(/\/$/, '');
  window.SIERRA_LIVE = false;

  function cap(s) { s = String(s || 'Residence'); return s.charAt(0).toUpperCase() + s.slice(1); }
  function aiScore(id) { // stable pseudo-score 8.8–9.7 per unit id
    var h = 0, s = String(id);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return +(8.8 + (h % 10) / 11).toFixed(1);
  }
  function mapListing(x, i) {
    var price = +x.price || 0;
    var isRent = price > 0 && price < 1e6; // monthly EGP heuristic per API data
    var egpM = isRent ? +(price * 12 / 1e6).toFixed(1) : +(price / 1e6).toFixed(1);
    var usd = isRent ? Math.round(price / 31) : Math.round((price / 1e6) * 170); // ≈ market monthly-rent equivalent
    return {
      id: x.id || 'SE-' + (i + 1),
      cmp: x.compound || 'New Cairo',
      type: cap(x.propertyType),
      beds: x.beds != null ? x.beds : 3,
      bath: x.baths != null ? x.baths : (x.beds || 3),
      area: x.area != null ? x.area : 200,
      egpM: egpM, usd: usd,
      ai: aiScore(x.id || i),
      tag: i < 3 ? 'Featured' : null,
      img: x.image || (x.images && x.images[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=85'
    };
  }

  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 2500);

  window.SIERRA_DATA_READY = fetch(API + '/api/listings?limit=24', ctrl ? { signal: ctrl.signal } : {})
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) {
      if (!j || j.success === false || !Array.isArray(j.listings) || j.listings.length < 1) throw 0;
      var mapped = j.listings.map(mapListing);
      window.FEATURED.length = 0;                      // hydrate in place —
      Array.prototype.push.apply(window.FEATURED, mapped); // consts stay referenced everywhere
      window.SIERRA_LIVE = true;
    })
    .catch(function () { /* demo data stays — by design */ })
    .then(function () { clearTimeout(timer); });
})();
