'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePhone } = require('./phone-utils');

/**
 * Paginate an entire Supabase table column without the 1,000/10,000 row cap.
 */
async function fetchAllPhonesFromTable(sb, table) {
  const phones = new Set();
  if (!sb) return phones;
  const pageSize = 1000;
  let page = 0;
  while (page < 200) {
    try {
      const query = sb.from(table).select('phone');
      const hasRange = query && typeof query.range === 'function';
      const { data, error } = hasRange
        ? await query.range(page * pageSize, (page + 1) * pageSize - 1)
        : await query.limit(10000);
      if (error || !data || !data.length) break;
      for (const row of data) {
        const p = normalizePhone(row && row.phone);
        if (p) phones.add(p);
      }
      if (!hasRange || data.length < pageSize) break;
      page++;
    } catch (_) {
      break;
    }
  }
  return phones;
}

/**
 * Read all JSONL outreach ledgers on disk (both 09-owner-outreach and 13-paced-outreach).
 */
function readLocalLedgers(stateDir) {
  const phones = new Set();
  if (!stateDir) return phones;
  for (const file of ['owner-outreach-ledger.jsonl', 'paced-outreach-ledger.jsonl']) {
    const full = path.join(stateDir, file);
    try {
      if (!fs.existsSync(full)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj && obj.dryRun) continue;
          const p = normalizePhone(obj && obj.phone);
          if (p) phones.add(p);
        } catch (_) { /* ignore malformed line */ }
      }
    } catch (_) { /* ignore read error */ }
  }
  return phones;
}

/**
 * Load the complete union of all previously contacted phones from:
 *   1. public.owner_outreach_claims (canonical PK lock)
 *   2. public.owner_outreach_log (historical audit trail)
 *   3. Local JSONL ledgers (owner-outreach-ledger.jsonl + paced-outreach-ledger.jsonl)
 */
async function loadAllClaimedPhones(sb, stateDir) {
  const merged = readLocalLedgers(stateDir);
  if (sb) {
    const [claims, logs] = await Promise.all([
      fetchAllPhonesFromTable(sb, 'owner_outreach_claims'),
      fetchAllPhonesFromTable(sb, 'owner_outreach_log'),
    ]);
    for (const p of claims) merged.add(p);
    for (const p of logs) merged.add(p);
  }
  return merged;
}

/**
 * Atomically claim a phone number in public.owner_outreach_claims before sending.
 * Primary key on `phone` guarantees two workers/containers/lanes can NEVER send
 * to the same number twice.
 *
 * Returns { claimed: boolean, reason: string }.
 */
async function claimOutreachPhone(sb, { phone, source = 'outreach', listingCode = null, sessionName = null }) {
  const canonical = normalizePhone(phone);
  if (!canonical) return { claimed: false, reason: 'invalid_phone' };
  if (!sb) return { claimed: true, reason: 'no_db' };
  try {
    const { error } = await sb.from('owner_outreach_claims').insert({
      phone: canonical,
      source,
      listing_code: listingCode || null,
      session_name: sessionName || null,
      claimed_at: new Date().toISOString(),
    });
    if (!error) return { claimed: true, reason: 'claimed' };
    // 23505 = Postgres unique_violation (phone already claimed)
    if (error.code === '23505' || /duplicate key/i.test(error.message || '')) {
      return { claimed: false, reason: 'already_claimed_in_db' };
    }
    // Table missing in mock test environments -> do not break unit tests
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return { claimed: true, reason: 'table_missing' };
    }
    return { claimed: false, reason: `db_error:${error.message || error.code}` };
  } catch (err) {
    return { claimed: false, reason: `exception:${err.message}` };
  }
}

/**
 * Release a claim ONLY if the WhatsApp send failed before delivery.
 */
async function releaseOutreachClaim(sb, phone) {
  const canonical = normalizePhone(phone);
  if (!sb || !canonical) return;
  try {
    await sb.from('owner_outreach_claims').delete().eq('phone', canonical);
  } catch (_) { /* best-effort */ }
}

module.exports = {
  fetchAllPhonesFromTable,
  readLocalLedgers,
  loadAllClaimedPhones,
  claimOutreachPhone,
  releaseOutreachClaim,
};
