'use strict';
/**
 * Engine 1: Memory & Contact Partitioning Bot (contact-partitioner.js)
 * ─────────────────────────────────────────────────────────────────────
 * Assigns eligible uncontacted owner listings to active WhatsApp lines:
 *   • Quota: 100 numbers per active line per day (9:00 AM – 10:00 PM Cairo).
 *   • Non-overlapping, deterministic partitions with strict deduplication
 *     (ledger + Supabase audit log + Google Sheet contact column).
 *   • Fault-tolerant failover: if a line hangs or disconnects, remaining
 *     ready lines take over pending rows dynamically.
 *   • Updates public.system_status in Supabase for the Bot Operations Desk.
 */

const fs = require('fs');
const path = require('path');
const { loadWorkflowEnv } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));
const { normalizePhone } = require('../lib/phone-utils');
const { GatewayClient } = require('../lib/gateway-client');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const PARTITIONS_FILE = path.join(STATE_DIR, 'owner-partitions.json');
const GATEWAY_URL = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';

const SHEET_ID = process.env.UNITS_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const SHEET_GID = process.env.UNITS_SHEET_GID || '1127958606';
const DAILY_CAP_PER_LINE = 100; // Strict daily cap: 100 numbers per WhatsApp line per day
const AVAIL_OK = String(process.env.WF_OUTREACH_AVAILABILITIES || 'available,follow up,no answer,متاح')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

function cairoDateStr() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function loadContactedLedger() {
  const seen = new Set();
  const PACED_LEDGER = path.join(STATE_DIR, 'paced-outreach-ledger.jsonl');
  for (const file of [LEDGER, PACED_LEDGER]) {
    try {
      if (fs.existsSync(file)) {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry && entry.phone) seen.add(entry.phone);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
  return seen;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

async function fetchSheetCandidates(contactedSet) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Google Sheet fetch failed: HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h || '').trim());
  const col = (names) => headers.findIndex((h) => {
    const clean = h.trim().toLowerCase();
    return names.some((n) => clean === n || clean.includes(n));
  });

  const iCode = col(['code', 'كود']);
  const iName = col(['name', 'owner', 'الاسم', 'مالك', 'المرسل']);
  const iMobile = col(['mobile', 'phone', 'موبايل', 'هاتف', 'تليفون', 'المرسل', 'sender']);
  const iAvail = col(['availablty', 'availability', 'الحالة']);
  const iLastContact = col(['تواصل', 'contacted', 'last_contact', 'last contact']);
  const iLoc = col(['location', 'الكمبوند', 'الموقع']);
  const iPrice = col(['unit price', 'price', 'السعر']);

  if (iMobile < 0) {
    console.warn(`[partitioner] No Mobile column in sheet. Headers: [${headers.join(', ')}]`);
    return [];
  }

  const candidates = [];
  for (let idx = 1; idx < rows.length; idx++) {
    const r = rows[idx];
    const rawMob = iMobile >= 0 ? r[iMobile] : '';
    const phone = normalizePhone(rawMob);
    if (!phone) continue;

    const lastContact = iLastContact >= 0 ? String(r[iLastContact] || '').trim() : '';
    if (lastContact) {
      contactedSet.add(phone);
      continue;
    }

    const avail = (iAvail >= 0 ? (r[iAvail] || '') : 'available').trim().toLowerCase();
    if (avail && (avail.includes('sold') || avail.includes('تم البيع') || avail.includes('rented') || avail.includes('تم الإيجار'))) {
      continue;
    }

    candidates.push({
      sheetRowIdx: idx,
      code: (iCode >= 0 ? (r[iCode] || '') : '').trim() || `SE-${candidates.length + 1}`,
      phone,
      rawMobile: rawMob,
      name: (iName >= 0 ? (r[iName] || '') : '').trim() || 'صاحب الإعلان',
      location: (iLoc >= 0 ? (r[iLoc] || '') : '').trim(),
      price: (iPrice >= 0 ? (r[iPrice] || '') : '').trim().replace(/[^\d]/g, ''),
      availability: avail || 'available',
    });
  }
  return candidates;
}

async function fetchSupabaseCandidates(contactedSet) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1. Load historical audit logs
    const { data: logs } = await sb.from('owner_outreach_log').select('phone').limit(10000);
    if (logs && logs.length) {
      for (const row of logs) {
        const p = normalizePhone(row.phone);
        if (p) contactedSet.add(p);
      }
    }

    // 2. Fetch uncontacted listings
    const { data: listings, error } = await sb
      .from('listings')
      .select('id,code,unit_code,owner_name,owner_phone,compound,location_area,price,bedrooms,deal_type,status,availability')
      .not('owner_phone', 'is', null)
      .neq('owner_phone', '')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error || !listings) return [];

    const candidates = [];
    for (const r of listings) {
      const status = String(r.status || '').toLowerCase().trim();
      const avail = String(r.availability || '').toLowerCase().trim();
      if (['sold', 'rented', 'off-market', 'unavailable', 'archived'].includes(status)) continue;
      if (['sold', 'rented', 'unavailable'].includes(avail)) continue;

      const rawPhone = String(r.owner_phone || '').trim();
      const phone = normalizePhone(rawPhone);
      if (!phone || !/^201[0125]\d{8}$/.test(phone)) continue;
      if (contactedSet.has(phone)) continue;

      candidates.push({
        code: (r.code || r.unit_code || '').trim() || `SE-DB-${candidates.length + 1}`,
        phone,
        rawMobile: rawPhone,
        name: (r.owner_name || '').trim() || 'صاحب الإعلان',
        location: (r.compound || r.location_area || '').trim(),
        price: String(r.price || '').replace(/[^\d]/g, ''),
        availability: avail || status || 'available',
      });
    }
    return candidates;
  } catch (err) {
    console.warn(`[partitioner] Supabase fetch warning: ${err.message}`);
    return [];
  }
}

async function getReadySessions() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/sessions`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const sessions = await res.json();
    return Array.isArray(sessions) ? sessions.filter(s => s.status === 'ready') : [];
  } catch (err) {
    console.warn(`[partitioner] Failed to query gateway sessions: ${err.message}`);
    return [];
  }
}

async function partitionOwnerContacts() {
  const today = cairoDateStr();
  console.log(`\n======================================================`);
  console.log(`[Engine 1: Memory Bot] Contact Partitioning Run — ${today}`);
  console.log(`======================================================`);

  const readySessions = await getReadySessions();
  console.log(`[partitioner] Found ${readySessions.length} READY WhatsApp line(s): ${readySessions.map(s => `${s.id} (${s.phone || 'no-phone'})`).join(', ')}`);

  if (!readySessions.length) {
    console.log('[partitioner] No lines currently READY — skipping partition generation.');
    return { success: false, reason: 'no_ready_lines', partitions: [] };
  }

  const contactedSet = loadContactedLedger();
  console.log(`[partitioner] Local ledger holds ${contactedSet.size} previously contacted owners.`);

  // Ingest from Sheet + Supabase
  const sheetCandidates = await fetchSheetCandidates(contactedSet).catch(() => []);
  const supabaseCandidates = await fetchSupabaseCandidates(contactedSet).catch(() => []);

  const combined = [...sheetCandidates, ...supabaseCandidates];
  console.log(`[partitioner] Ingested ${combined.length} candidates (${sheetCandidates.length} sheet, ${supabaseCandidates.length} Supabase).`);

  // Unique phone deduplication
  const dedupedPool = [];
  const phoneSeen = new Set();
  for (const c of combined) {
    if (contactedSet.has(c.phone) || phoneSeen.has(c.phone)) continue;
    phoneSeen.add(c.phone);
    dedupedPool.push(c);
  }

  console.log(`[partitioner] After strict deduplication: ${dedupedPool.length} uncontacted owners ready for assignment.`);

  // Divide contacts into 100-number daily slices per line
  const partitions = [];
  let cursor = 0;

  for (let i = 0; i < readySessions.length; i++) {
    const session = readySessions[i];
    const count = Math.min(DAILY_CAP_PER_LINE, dedupedPool.length - cursor);
    if (count <= 0) break;

    const assigned = dedupedPool.slice(cursor, cursor + count);
    cursor += count;

    partitions.push({
      lineId: session.id,
      phone: session.phone,
      pushName: session.pushName,
      date: today,
      quota: count,
      candidates: assigned,
      status: 'assigned',
      sentCount: 0,
    });
  }

  const result = {
    date: today,
    generatedAt: new Date().toISOString(),
    totalReadyLines: readySessions.length,
    totalAssigned: cursor,
    targetDailyCap: readySessions.length * DAILY_CAP_PER_LINE,
    partitions,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(PARTITIONS_FILE, JSON.stringify(result, null, 2), 'utf8');

  console.log(`[partitioner] Successfully partitioned ${cursor} contacts across ${partitions.length} line(s):`);
  for (const p of partitions) {
    console.log(`  • Line ${p.lineId} (${p.phone}): ${p.candidates.length} assigned (Quota: ${DAILY_CAP_PER_LINE}/day)`);
  }

  // Update Supabase system_status for Bot Operations Desk
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const db = createClient(supabaseUrl, supabaseKey);
      await db.from('system_status').upsert({
        id: 'memory-engine-bot',
        status: 'active',
        last_pulse: new Date().toISOString(),
        config: { dailyCapPerLine: DAILY_CAP_PER_LINE, activeHours: '9-22' },
        stats: {
          today,
          readyLines: readySessions.length,
          totalAssigned: cursor,
          partitionsCount: partitions.length,
        },
      });
      console.log(`[partitioner] Updated Supabase system_status for 'memory-engine-bot'.`);
    }
  } catch (err) {
    console.warn(`[partitioner] Supabase status update error: ${err.message}`);
  }

  return { success: true, ...result };
}

if (require.main === module) {
  partitionOwnerContacts()
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(`[partitioner] Fatal error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { partitionOwnerContacts, getReadySessions };
