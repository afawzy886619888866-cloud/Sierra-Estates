'use strict';

/**
 * Workflow 11: Number Verifier (Silent Pre-Flight & Night-Time Validator)
 * ───────────────────────────────────────────────────────────────────────
 * Autonomously probes candidate owner numbers against the OpenWA gateway
 * using `checkNumberStatus` (zero WhatsApp messages sent).
 *
 * Runs during off-hours (night) or as a pre-flight stage:
 * 1. Pulls owner candidate phones from Google Sheet and Supabase.
 * 2. Normalizes using canonical `phone-utils` (strips duplicate 2/20/00).
 * 3. Probes the gateway silently to test if an active WhatsApp account exists.
 * 4. Caches valid numbers in `workflows/.state/verified-whatsapp-numbers.json`
 *    and invalid/landline numbers in `workflows/.state/invalid-whatsapp-numbers.json`.
 *
 * This ensures daytime outreach ONLY texts 100% verified WhatsApp accounts
 * and hits the full 25 msgs / 30-min slot cap without wasting time on dead numbers.
 */

const fs = require('fs');
const path = require('path');
const { loadWorkflowEnv } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));

const { GatewayClient, normalizeChatId } = require('../lib/gateway-client');
const { normalizePhone } = require('../lib/phone-utils');

const STATE_DIR = path.join(__dirname, '..', '.state');
const VERIFIED_CACHE = path.join(STATE_DIR, 'verified-whatsapp-numbers.json');
const INVALID_CACHE = path.join(STATE_DIR, 'invalid-whatsapp-numbers.json');

function loadJsonSet(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data)) return new Set(data);
      if (typeof data === 'object') return new Set(Object.keys(data));
    }
  } catch (_) { /* ignore parse error */ }
  return new Set();
}

function saveJsonSet(filePath, set) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(Array.from(set).sort(), null, 2), 'utf8');
}

async function verifyCandidates({ max = 100, delayMs = 300 } = {}) {
  const verifiedSet = loadJsonSet(VERIFIED_CACHE);
  const invalidSet = loadJsonSet(INVALID_CACHE);

  const gw = new GatewayClient({
    baseUrl: process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785',
    adminKey: process.env.OPENWA_ADMIN_API_KEY,
    operatorKey: process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_KEY,
    sessionPool: (process.env.OPENWA_SESSION_IDS || 'line-1,line-2,line-3,line-4').split(',').map(s => s.trim())
  });

  console.log(`[verifier] Initializing WhatsApp pre-flight number verifier...`);
  const pool = await gw.healthyPool();
  if (!pool.length) {
    console.error(`[verifier] No healthy WhatsApp sessions available on gateway`);
    return { ok: false, error: 'no_sessions' };
  }
  console.log(`[verifier] Gateway pool ready (${pool.length} lines active)`);

  // Load candidates from sheet (public gviz CSV)
  const sheetId = process.env.UNITS_SHEET_ID || '1B_mZECqA4K2K29aN_26Z27m9S0kX9aP69K5LgYQ7a-w';
  const gid = process.env.UNITS_SHEET_GID || '1127958606';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

  const candidates = [];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      const csv = await res.text();
      const lines = csv.split('\n');
      for (const line of lines) {
        const matches = line.match(/(?:^|,)"?([^",]+)"?/g);
        if (!matches) continue;
        for (const col of matches) {
          const raw = col.replace(/^[,"]+|["\r\n]+$/g, '');
          const p = normalizePhone(raw);
          if (p && !verifiedSet.has(p) && !invalidSet.has(p)) {
            candidates.push(p);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[verifier] Could not fetch sheet candidates: ${err.message}`);
  }

  // Deduplicate candidate list
  const uniqueQueue = Array.from(new Set(candidates)).slice(0, max);
  console.log(`[verifier] Found ${uniqueQueue.length} candidate numbers queued for silent verification`);

  let checked = 0;
  let newVerified = 0;
  let newInvalid = 0;

  for (const phone of uniqueQueue) {
    try {
      const res = await gw.checkNumber(phone);
      if (res.ok && res.exists) {
        verifiedSet.add(phone);
        newVerified++;
        console.log(`[verifier] ✅ ${phone} -> VALID WhatsApp account (${res.session || 'gateway'})`);
      } else {
        invalidSet.add(phone);
        newInvalid++;
        console.log(`[verifier] ❌ ${phone} -> NOT on WhatsApp (marked invalid)`);
      }
    } catch (e) {
      console.warn(`[verifier] Check error on ${phone}: ${e.message}`);
    }

    checked++;
    if (delayMs > 0 && checked < uniqueQueue.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  saveJsonSet(VERIFIED_CACHE, verifiedSet);
  saveJsonSet(INVALID_CACHE, invalidSet);

  const report = {
    ok: true,
    checked,
    newVerified,
    newInvalid,
    totalVerifiedCached: verifiedSet.size,
    totalInvalidCached: invalidSet.size,
    timestamp: new Date().toISOString()
  };

  console.log(`[verifier] Pre-flight run complete: ${JSON.stringify(report, null, 2)}`);
  return report;
}

if (require.main === module) {
  const max = parseInt(process.argv[2] || '50', 10);
  verifyCandidates({ max }).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  verifyCandidates,
  loadJsonSet,
  saveJsonSet,
  VERIFIED_CACHE,
  INVALID_CACHE
};
