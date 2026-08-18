/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — live lead / listing bridge  (window.SIERRA_LIVE)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ONE API used by both surfaces:
 *    client portal  → addLead(), addListingSubmission()
 *    admin console  → onLeads(cb), onListingSubmissions(cb)
 *
 *  TRANSPORT
 *    Firestore when SIERRA_FIREBASE_ENABLED is on (real-time, cross-device).
 *    localStorage otherwise — same origin, cross-tab, works offline.
 *  Writes ALWAYS hit localStorage too, so a dropped network never loses a lead
 *  and the admin keeps working with no backend at all.
 *
 *  The Firebase SDK is fetched only when enabled — an unconfigured site pays
 *  nothing for this file beyond its own ~4 KB.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LEADS = 'sierra_leads';
  var SUBS = 'sierra_broker_listings';
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var db = null, connected = false;
  var subs = { leads: [], subs: [] };

  /* ── localStorage helpers ── */
  function read(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function push(key, rec) {
    try { var l = read(key); l.push(rec); localStorage.setItem(key, JSON.stringify(l)); } catch (e) {}
  }
  function newest(key) { return read(key).slice().reverse(); }

  /* ── SDK loading (compat build: plain scripts, no module graph) ── */
  function script(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('failed ' + src)); };
      document.head.appendChild(s);
    });
  }
  function configured() {
    var c = window.SIERRA_FIREBASE_CONFIG;
    return !!(window.SIERRA_FIREBASE_ENABLED && c && c.projectId &&
      String(c.apiKey || '').indexOf('PASTE') !== 0);
  }
  function init() {
    if (!configured()) return;
    script(SDK + 'firebase-app-compat.js')
      .then(function () { return script(SDK + 'firebase-firestore-compat.js'); })
      .then(function () {
        if (!window.firebase.apps.length) window.firebase.initializeApp(window.SIERRA_FIREBASE_CONFIG);
        db = window.firebase.firestore();
        connected = true;
        if (window.console) console.info('[Sierra] Firestore live:', window.SIERRA_FIREBASE_CONFIG.projectId);
        watch('leads', LEADS, subs.leads);
        watch('listing_submissions', SUBS, subs.subs);
      })
      .catch(function (err) {
        if (window.console) console.warn('[Sierra] Firestore unavailable, using local store:', err.message);
      });
  }

  /* ── real-time reads ── */
  function watch(collection, key, listeners) {
    if (!connected || !listeners.length) return;
    db.collection(collection).orderBy('ts', 'desc').limit(300)
      .onSnapshot(function (snap) {
        var rows = [];
        snap.forEach(function (doc) { rows.push(Object.assign({ id: doc.id }, doc.data())); });
        listeners.forEach(function (cb) { try { cb(rows); } catch (e) {} });
      }, function (err) {
        if (window.console) console.warn('[Sierra] snapshot error, local fallback:', err.message);
        listeners.forEach(function (cb) { try { cb(newest(key)); } catch (e) {} });
      });
  }
  function subscribe(which, collection, key, cb) {
    cb(newest(key));                       // paint immediately from local
    subs[which].push(cb);
    if (connected) watch(collection, key, [cb]);
    var sync = function (e) { if (!e || !e.key || e.key === key) cb(newest(key)); };
    window.addEventListener('storage', sync);
    var poll = setInterval(function () { if (!connected) cb(newest(key)); }, 4000);
    return function () {
      window.removeEventListener('storage', sync);
      clearInterval(poll);
      var i = subs[which].indexOf(cb); if (i >= 0) subs[which].splice(i, 1);
    };
  }

  /* ── writes ── */
  function write(collection, key, rec) {
    rec.ts = rec.ts || new Date().toISOString();
    push(key, rec);
    if (!connected) return Promise.resolve({ id: rec.ref || rec.id, local: true });
    return db.collection(collection).add(rec)
      .then(function (d) { return { id: d.id, local: false }; })
      .catch(function (err) {
        if (window.console) console.warn('[Sierra] write failed, kept locally:', err.message);
        return { id: rec.ref || rec.id, local: true };
      });
  }

  window.SIERRA_LIVE = {
    ready: function () { return connected; },
    addLead: function (lead) { return write('leads', LEADS, lead); },
    addListingSubmission: function (rec) { return write('listing_submissions', SUBS, rec); },
    onLeads: function (cb) { return subscribe('leads', 'leads', LEADS, cb); },
    onListingSubmissions: function (cb) { return subscribe('subs', 'listing_submissions', SUBS, cb); },
    onProperties: function (cb) {
      if (!connected) return function () {};
      return db.collection('houyez_listings').orderBy('ai', 'desc').limit(100)
        .onSnapshot(function (snap) {
          var items = [];
          snap.forEach(function (doc) { items.push(Object.assign({ id: doc.id }, doc.data())); });
          if (cb) cb(items);
        });
    },
    onCompounds: function (cb) {
      if (!connected) return function () {};
      return db.collection('compounds').orderBy('ai', 'desc').limit(50)
        .onSnapshot(function (snap) {
          var items = [];
          snap.forEach(function (doc) { items.push(Object.assign({ id: doc.id }, doc.data())); });
          if (cb) cb(items);
        });
    },
    localLeads: function () { return newest(LEADS); },
    localSubmissions: function () { return newest(SUBS); }
  };

  init();
})();
