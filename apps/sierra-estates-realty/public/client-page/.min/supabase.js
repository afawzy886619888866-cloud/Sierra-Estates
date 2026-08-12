/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Supabase Integration Layer
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Provides a clean async API for the SE portal to talk to Supabase
 *  (PostgreSQL). Uses @supabase/supabase-js CDN.
 *
 *  PUBLIC API (window.SIERRA_DB):
 *    - isReady()              → boolean
 *    - getCompounds()         → Promise<array>
 *    - getCompound(name)      → Promise<object|null>
 *    - getUnitsFor(name)      → Promise<array>
 *    - getListings(filter)    → Promise<array>
 *    - addInquiry(data)       → Promise<{id, fallback}>
 *    - addCareerApp(data)     → Promise<{id, fallback}>
 *    - subscribe(callback)    → unsubscribe fn (real-time via Supabase channels)
 *    - seedFromDataJS()       → one-time seed from data.js
 *
 *  FALLBACK:
 *    If Supabase is not enabled or connection fails, all methods fall back
 *    to static data.js (window.HZDATA). Portal ALWAYS works.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.HZDATA;
  var sb = null;
  var connected = false;

  // ── Initialize Supabase client ──
  function init() {
    if (!window.SIERRA_SUPABASE_ENABLED) return false;
    if (!window.supabase || !window.SIERRA_SUPABASE_CONFIG) return false;
    var cfg = window.SIERRA_SUPABASE_CONFIG;
    if (!cfg.url || cfg.url.indexOf('YOUR-PROJECT-ID') !== -1) return false;
    if (!cfg.anonKey || cfg.anonKey.indexOf('PASTE-YOUR') === 0) return false;
    try {
      sb = window.supabase.createClient(cfg.url, cfg.anonKey);
      connected = true;
      if (window.console) console.info('[Sierra] Supabase connected to:', cfg.url);
      return true;
    } catch (e) {
      if (window.console) console.warn('[Sierra] Supabase init failed, using static fallback:', e.message);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═════════════════════════════════════════════════════════════════════════

  function isReady() { return connected; }

  // ── Get all compounds ──
  function getCompounds() {
    if (!connected) return Promise.resolve(D.compounds || []);
    return sb.from('compounds').select('*').then(function (res) {
      if (res.error) throw res.error;
      return res.data || [];
    }).catch(function (err) {
      console.warn('[Sierra] getCompounds failed, fallback:', err.message);
      return D.compounds || [];
    });
  }

  // ── Get single compound by name ──
  function getCompound(name) {
    if (!connected) {
      var found = (D.compounds || []).find(function (c) { return c.n === name; });
      return Promise.resolve(found || null);
    }
    return sb.from('compounds').select('*').eq('n', name).limit(1).single().then(function (res) {
      if (res.error) throw res.error;
      return res.data || null;
    }).catch(function () {
      var found = (D.compounds || []).find(function (c) { return c.n === name; });
      return found || null;
    });
  }

  // ── Get units for a compound ──
  function getUnitsFor(name) {
    if (!connected) return Promise.resolve(D.unitsFor ? D.unitsFor(name) : []);
    return sb.from('units').select('*').eq('compound', name).then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        return D.unitsFor ? D.unitsFor(name) : [];
      }
      return res.data;
    }).catch(function () {
      return D.unitsFor ? D.unitsFor(name) : [];
    });
  }

  // ── Get listings with optional filter ──
  function getListings(filter) {
    filter = filter || {};
    if (!connected) {
      var listings = D.listings || [];
      if (filter.mode) listings = listings.filter(function (l) { return l.mode === filter.mode; });
      if (filter.type) listings = listings.filter(function (l) { return l.type === filter.type; });
      if (filter.minBeds) listings = listings.filter(function (l) { return l.beds >= filter.minBeds; });
      if (filter.maxPrice) listings = listings.filter(function (l) { return l.egpM <= filter.maxPrice; });
      return Promise.resolve(listings);
    }
    var q = sb.from('listings').select('*').limit(50);
    if (filter.mode) q = q.eq('mode', filter.mode);
    if (filter.type) q = q.eq('type', filter.type);
    return q.then(function (res) {
      var results = res.data || [];
      if (filter.minBeds) results = results.filter(function (l) { return l.beds >= filter.minBeds; });
      if (filter.maxPrice) results = results.filter(function (l) { return l.egpM <= filter.maxPrice; });
      return results;
    }).catch(function () { return D.listings || []; });
  }

  // ── Add inquiry ──
  function addInquiry(data) {
    var payload = {
      created_at: new Date().toISOString(),
      mode: data.mode || 'buy',
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      zone: data.zone || '',
      type: data.type || '',
      budget: data.budget || '',
      status: 'new',
      source: 'website'
    };
    if (!connected) {
      try {
        var log = JSON.parse(localStorage.getItem('sierra_inquiries') || '[]');
        log.push(Object.assign({ id: 'local-' + Date.now() }, payload));
        localStorage.setItem('sierra_inquiries', JSON.stringify(log));
      } catch (e) {}
      return Promise.resolve({ id: 'local-' + Date.now(), fallback: true });
    }
    return sb.from('inquiries').insert(payload).select().single().then(function (res) {
      if (res.error) throw res.error;
      return { id: res.data.id, fallback: false };
    }).catch(function (err) {
      console.warn('[Sierra] addInquiry failed, localStorage fallback:', err.message);
      try {
        var log = JSON.parse(localStorage.getItem('sierra_inquiries') || '[]');
        log.push(Object.assign({ id: 'local-' + Date.now() }, payload));
        localStorage.setItem('sierra_inquiries', JSON.stringify(log));
      } catch (e) {}
      return { id: 'local-' + Date.now(), fallback: true };
    });
  }

  // ── Add career application ──
  function addCareerApp(data) {
    var payload = {
      created_at: new Date().toISOString(),
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      position: data.position || '',
      experience: data.experience || '',
      message: data.message || '',
      status: 'new'
    };
    if (!connected) {
      try {
        var log = JSON.parse(localStorage.getItem('sierra_career_apps') || '[]');
        log.push(Object.assign({ id: 'local-' + Date.now() }, payload));
        localStorage.setItem('sierra_career_apps', JSON.stringify(log));
      } catch (e) {}
      return Promise.resolve({ id: 'local-' + Date.now(), fallback: true });
    }
    return sb.from('career_applications').insert(payload).select().single().then(function (res) {
      if (res.error) throw res.error;
      return { id: res.data.id, fallback: false };
    }).catch(function (err) {
      console.warn('[Sierra] addCareerApp failed, localStorage:', err.message);
      try {
        var log = JSON.parse(localStorage.getItem('sierra_career_apps') || '[]');
        log.push(Object.assign({ id: 'local-' + Date.now() }, payload));
        localStorage.setItem('sierra_career_apps', JSON.stringify(log));
      } catch (e) {}
      return { id: 'local-' + Date.now(), fallback: true };
    });
  }

  // ── Subscribe to compounds (real-time) ──
  function subscribe(callback) {
    if (!connected) {
      callback(D.compounds || []);
      return function () {};
    }
    // Initial fetch
    getCompounds().then(callback);
    // Subscribe to changes
    var channel = sb.channel('compounds-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compounds' }, function () {
        getCompounds().then(callback);
      })
      .subscribe();
    return function () {
      try { sb.removeChannel(channel); } catch (e) {}
    };
  }

  // ── Seed Supabase from data.js (one-time) ──
  function seedFromDataJS() {
    if (!connected) return Promise.reject(new Error('Supabase not connected'));
    var compounds = (D.compounds || []).map(function (c) {
      return {
        name: c.n, zone: c.z, lat: c.c[0], lng: c.c[1],
        growth: c.g, ai_score: c.ai, price_m: c.priceM, rent: c.rent,
        coords: c.c.join(',')
      };
    });
    var listings = (D.listings || []).map(function (l) {
      return {
        code: l.code, compound: l.cmp, zone: l.zone, type: l.type,
        beds: l.beds, bath: l.bath, area: l.area, egp_m: l.egpM,
        usd: l.usd, ai_score: l.ai, tag: l.tag, mode: l.mode,
        agent: l.agent, ago: l.ago, img: l.img
      };
    });
    return Promise.all([
      sb.from('compounds').upsert(compounds, { onConflict: 'name' }),
      sb.from('listings').upsert(listings, { onConflict: 'code' })
    ]).then(function () {
      console.info('[Sierra] Seeded ' + compounds.length + ' compounds + ' + listings.length + ' listings');
      return { compounds: compounds.length, listings: listings.length };
    }).catch(function (err) {
      throw err;
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  INIT + EXPORT
  // ═════════════════════════════════════════════════════════════════════════
  init();

  window.SIERRA_DB = {
    isReady: isReady,
    getCompounds: getCompounds,
    getCompound: getCompound,
    getUnitsFor: getUnitsFor,
    getListings: getListings,
    addInquiry: addInquiry,
    addCareerApp: addCareerApp,
    subscribe: subscribe,
    seedFromDataJS: seedFromDataJS,
    tables: ['compounds', 'listings', 'units', 'inquiries', 'career_applications', 'agents', 'leads']
  };
})();
