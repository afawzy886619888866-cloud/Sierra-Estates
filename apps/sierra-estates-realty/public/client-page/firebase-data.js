/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Firebase / Firestore Integration Layer
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  DROP-IN REPLACEMENT for supabase.js — exposes the identical
 *  window.SIERRA_DB public API so home.js / shared.js / all pages
 *  require zero changes.
 *
 *  PUBLIC API  (window.SIERRA_DB):
 *    - isReady()              → boolean
 *    - getCompounds()         → Promise<array>
 *    - getCompound(name)      → Promise<object|null>
 *    - getUnitsFor(name)      → Promise<array>
 *    - getListings(filter)    → Promise<array>
 *    - addInquiry(data)       → Promise<{id, fallback}>
 *    - addCareerApp(data)     → Promise<{id, fallback}>
 *    - subscribe(callback)    → unsubscribe fn  (Firestore onSnapshot)
 *
 *  FALLBACK:
 *    If Firebase is not enabled or initialisation fails, every method
 *    falls back to the static data.js (window.HZDATA). The portal
 *    always works — even offline.
 *
 *  ADMIN WIRING:
 *    The admin panel (admin.sierra-estates.net) writes to the same
 *    Firestore collections via firebase-admin. Changes appear here
 *    in real-time via Firestore onSnapshot subscriptions.
 *
 *  COLLECTIONS EXPECTED IN FIRESTORE:
 *    /properties   — listings (matches admin panel schema)
 *    /compounds    — compound metadata
 *    /inquiries    — contact / viewing requests (write-only from client)
 *    /careers      — career form submissions
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.HZDATA || {};
  var db = null;
  var connected = false;
  var unsubscribers = [];

  /* ── Map Firestore property doc → the shape home.js expects ── */
  function mapListing(doc) {
    var d = doc.data ? doc.data() : doc;
    var id = doc.id || d.id || Math.random().toString(36).slice(2);
    var price = typeof d.price === 'number' ? d.price : 0;
    var currency = price < 10000 ? 'USD' : 'EGP';
    var priceLabel = d.priceLabel ||
      (price > 0
        ? (currency === 'USD'
            ? '$' + price.toLocaleString()
            : 'EGP ' + (price / 1e6).toFixed(1) + 'M')
        : 'On Request');

    return {
      id:           id,
      title:        d.title       || d.type  || 'Property',
      compound:     d.compound    || d.location || '',
      location:     d.compound    || d.location || '',
      code:         d.sbrCode     || d.code || ('SE-' + id.slice(0,4).toUpperCase()),
      type:         d.propertyType || d.type || 'Apartment',
      beds:         d.bedrooms    ?? d.beds    ?? 3,
      baths:        d.bathrooms   ?? d.baths   ?? 2,
      area:         d.area        ?? 200,
      price:        price,
      priceLabel:   priceLabel,
      currency:     currency,
      aiScore:      d.aiScore     ?? 88,
      badge:        d.badge       || d.tag    || null,
      badgeColor:   d.badgeColor  || '#C8961A',
      img:          d.featuredImage || d.img || d.image || '',
      images:       d.images      || (d.featuredImage ? [d.featuredImage] : []),
      status:       d.status      || 'for-sale',
      delivery:     d.delivery    || '',
      furnished:    d.furnished   || false,
      description:  d.description || '',
    };
  }

  /* ── Map Firestore compound doc → home.js compound shape ── */
  function mapCompound(doc) {
    var d = doc.data ? doc.data() : doc;
    return {
      n:       d.name       || d.n      || 'Compound',
      z:       d.zone       || d.z      || 'New Cairo',
      g:       d.grade      || d.g      || 'A',
      ai:      d.aiScore    || d.ai     || 8.5,
      priceM:  d.avgPriceM  || d.priceM || 10,
      lat:     d.lat        || 30.01,
      lng:     d.lng        || 31.50,
      img:     d.image      || d.img    || '',
      units:   d.totalUnits || d.units  || 0,
    };
  }

  /* ── Initialise Firebase App + Firestore ── */
  function init() {
    if (!window.SIERRA_FIREBASE_ENABLED) return false;
    if (!window.firebase || !window.SIERRA_FIREBASE_CONFIG) return false;
    var cfg = window.SIERRA_FIREBASE_CONFIG;
    if (!cfg.apiKey || cfg.apiKey.indexOf('YOUR') !== -1) return false;
    try {
      var app;
      if (window.firebase.apps && window.firebase.apps.length > 0) {
        app = window.firebase.apps[0];
      } else {
        app = window.firebase.initializeApp(cfg);
      }
      db = window.firebase.firestore(app);
      connected = true;
      console.info('[Sierra] Firebase/Firestore connected · project:', cfg.projectId);
      return true;
    } catch (e) {
      console.warn('[Sierra] Firebase init failed — using static fallback:', e.message);
      return false;
    }
  }

  /* ════════════════════════════════════════════════════════════
   *  PUBLIC API — window.SIERRA_DB
   * ════════════════════════════════════════════════════════════ */

  function isReady() { return connected; }

  /* ── Get all compounds ── */
  function getCompounds() {
    if (!connected) return Promise.resolve(D.compounds || []);
    return db.collection('houyez_compounds').orderBy('name').get()
      .then(function (snap) {
        if (snap.empty) return D.compounds || [];
        return snap.docs.map(mapCompound);
      })
      .catch(function () { return D.compounds || []; });
  }

  /* ── Get single compound by name ── */
  function getCompound(name) {
    if (!connected) {
      return Promise.resolve((D.compounds || []).find(function (c) { return c.n === name; }) || null);
    }
    return db.collection('houyez_compounds').where('name', '==', name).limit(1).get()
      .then(function (snap) {
        if (snap.empty) return (D.compounds || []).find(function (c) { return c.n === name; }) || null;
        return mapCompound(snap.docs[0]);
      })
      .catch(function () { return null; });
  }

  /* ── Get units for a compound ── */
  function getUnitsFor(compoundName) {
    if (!connected) return Promise.resolve([]);
    return db.collection('houyez_listings')
      .where('compound', '==', compoundName)
      .orderBy('price')
      .get()
      .then(function (snap) {
        return snap.docs.map(mapListing);
      })
      .catch(function () { return []; });
  }

  /* ── Get listings with optional filter ── */
  function getListings(filter) {
    filter = filter || {};
    if (!connected) {
      var list = D.listings || [];
      if (filter.compound) list = list.filter(function (l) { return l.compound === filter.compound || l.location === filter.compound; });
      if (filter.beds)     list = list.filter(function (l) { return (l.beds || 0) >= filter.beds; });
      if (filter.type)     list = list.filter(function (l) { return l.type === filter.type; });
      return Promise.resolve(list.slice(0, filter.limit || 100));
    }

    var q = db.collection('houyez_listings');
    if (filter.compound) q = q.where('compound', '==', filter.compound);
    if (filter.type)     q = q.where('propertyType', '==', filter.type);
    if (filter.status)   q = q.where('status', '==', filter.status);
    q = q.orderBy('aiScore', 'desc').limit(filter.limit || 50);

    return q.get()
      .then(function (snap) {
        var items = snap.docs.map(mapListing);
        if (filter.beds) items = items.filter(function (l) { return (l.beds || 0) >= filter.beds; });
        return items;
      })
      .catch(function () { return D.listings ? D.listings.slice(0, filter.limit || 50) : []; });
  }

  /* ── Submit inquiry ── */
  function addInquiry(data) {
    if (!connected) {
      // CSV / localStorage fallback (same as before)
      try { localStorage.setItem('se_inq_' + Date.now(), JSON.stringify(data)); } catch (e) {}
      return Promise.resolve({ id: null, fallback: true });
    }
    return db.collection('inquiries').add(Object.assign({}, data, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      source:    'client-portal',
      status:    'new',
    }))
      .then(function (ref) { return { id: ref.id, fallback: false }; })
      .catch(function () {
        try { localStorage.setItem('se_inq_' + Date.now(), JSON.stringify(data)); } catch (e) {}
        return { id: null, fallback: true };
      });
  }

  /* ── Submit career application ── */
  function addCareerApp(data) {
    if (!connected) {
      try { localStorage.setItem('se_career_' + Date.now(), JSON.stringify(data)); } catch (e) {}
      return Promise.resolve({ id: null, fallback: true });
    }
    return db.collection('careers').add(Object.assign({}, data, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      source:    'client-portal',
      status:    'new',
    }))
      .then(function (ref) { return { id: ref.id, fallback: false }; })
      .catch(function () {
        try { localStorage.setItem('se_career_' + Date.now(), JSON.stringify(data)); } catch (e) {}
        return { id: null, fallback: true };
      });
  }

  /* ── Real-time subscription (listings) ── */
  function subscribe(callback) {
    if (!connected) return function () {};
    var unsub = db.collection('houyez_listings')
      .orderBy('aiScore', 'desc')
      .limit(50)
      .onSnapshot(function (snap) {
        callback(snap.docs.map(mapListing));
      }, function (err) {
        console.warn('[Sierra] Firestore subscription error:', err.message);
      });
    unsubscribers.push(unsub);
    return unsub;
  }

  /* ── Bootstrap ── */
  function bootstrap() {
    var ok = init();
    if (!ok) {
      console.info('[Sierra] Firebase not enabled — using static data.js fallback');
    }
    window.SIERRA_DB = {
      isReady:     isReady,
      getCompounds: getCompounds,
      getCompound:  getCompound,
      getUnitsFor:  getUnitsFor,
      getListings:  getListings,
      addInquiry:   addInquiry,
      addCareerApp: addCareerApp,
      subscribe:    subscribe,
    };
  }

  // Run after Firebase SDK has loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
