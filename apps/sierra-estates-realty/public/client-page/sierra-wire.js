/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Admin API Wire
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Intercepts the inquiry form submission from home.js and routes it to the
 *  Sierra Estates admin backend deployed on Vercel:
 *    → POST https://admin.sierra-estates.net/api/leads
 *
 *  This script MUST be loaded AFTER home.js so it can override the
 *  SIERRA_DB.addInquiry function (or patch the form's submit listener).
 *
 *  Payload to /api/leads (matches leads/route.ts Zod schema):
 *    { name, email, phone, message, locale }
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ADMIN_API = 'https://admin.sierra-estates.net/api/leads';

  /* ── Core POST helper ──────────────────────────────────────────────────── */
  function postToAdmin(payload) {
    return fetch(ADMIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    payload.name    || '',
        email:   payload.email   || '',
        phone:   payload.phone   || '',
        message: [
          payload.mode   ? 'Mode: '   + payload.mode   : '',
          payload.zone   ? 'Zone: '   + payload.zone   : '',
          payload.type   ? 'Type: '   + payload.type   : '',
          payload.budget ? 'Budget: ' + payload.budget  : ''
        ].filter(Boolean).join(' | '),
        locale: payload.zone || ''
      })
    }).then(function (res) {
      return res.json();
    });
  }

  /* ── Patch window.SIERRA_DB.addInquiry (runs after supabase.js) ─────────
   *  We replace addInquiry so that ALL form submits — whether Supabase is
   *  enabled or not — always hit the admin Vercel backend first.           */
  function patchDB() {
    if (!window.SIERRA_DB) return false;
    var _orig = window.SIERRA_DB.addInquiry;
    window.SIERRA_DB.addInquiry = function (data) {
      // 1. Fire and forget to admin Vercel (don't block the UX)
      postToAdmin(data).catch(function (err) {
        console.warn('[Sierra Wire] Admin API error:', err);
      });
      // 2. Also run original handler (Supabase or localStorage fallback)
      if (typeof _orig === 'function') return _orig(data);
      return Promise.resolve({ id: 'wire-' + Date.now(), fallback: false });
    };
    console.info('[Sierra Wire] addInquiry patched → ' + ADMIN_API);
    return true;
  }

  /* ── Also directly patch the form as a safety net ───────────────────────
   *  If home.js builds its own submit handler that bypasses SIERRA_DB,
   *  we intercept it at the form level too.                                */
  function patchForm() {
    var form = document.getElementById('inq-form');
    if (!form || form.__sierraWired) return;
    form.__sierraWired = true;

    form.addEventListener('submit', function (e) {
      // Collect form data
      var name   = (document.getElementById('inq-name')   || {}).value || '';
      var phone  = (document.getElementById('inq-phone')  || {}).value || '';
      var email  = (document.getElementById('inq-email')  || {}).value || '';
      var zone   = (document.getElementById('inq-zone')   || {}).value || '';
      var type   = (document.getElementById('inq-type')   || {}).value || '';
      var budget = (document.getElementById('inq-budget') || {}).value || '';

      // Determine mode from the segment selector
      var modeBtn = form.querySelector('#inq-seg button.on');
      var mode = modeBtn ? (modeBtn.dataset.i18n === 'inqBuy' ? 'buy' : modeBtn.dataset.i18n === 'inqRent' ? 'rent' : 'sell') : 'buy';

      postToAdmin({ name: name, email: email, phone: phone, zone: zone, type: type, budget: budget, mode: mode })
        .then(function (res) {
          if (res && res.success) {
            console.info('[Sierra Wire] Lead saved to admin DB, id:', res.id);
          } else {
            console.warn('[Sierra Wire] Admin API returned:', res);
          }
        })
        .catch(function (err) {
          console.warn('[Sierra Wire] Admin POST failed (form-level):', err);
        });
      // Note: we do NOT call e.preventDefault() here — home.js already does
      // that. This listener just adds the admin call as a side effect.
    }, true /* capture — fires before home.js bubble listener */);
  }

  /* ── Boot ───────────────────────────────────────────────────────────────  */
  function boot() {
    patchDB();
    patchForm();
  }

  // DOMContentLoaded may have already fired (scripts are deferred)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // Small delay to let home.js / shared.js finish their own DOMContentLoaded
    setTimeout(boot, 80);
  }

})();
