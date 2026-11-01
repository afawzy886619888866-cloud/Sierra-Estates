#!/usr/bin/env node
'use strict';
/**
 * bot.js — Sierra Estates Telegram Intake Agent (long-running poller).
 * ─────────────────────────────────────────────────────────────────────────────
 * The agent groups ("Fareda units", "Christina units", "Heba Units" …) send
 * unstructured Arabic/English listing texts + photo albums. This bot:
 *
 *   1. LISTENS  — long-polls getUpdates (no public webhook needed; it runs
 *      next to the Docker workflow-runner on the same host network).
 *   2. PARSES   — deterministic AR/EN extractor (parser.js); the agent gets
 *      a bilingual "missing fields" reply instead of a half-saved unit.
 *   3. SANITIZES — landlord names/numbers are extracted to INTERNAL-only
 *      storage; every team-facing surface is scrubbed (redact.js).
 *   4. CODES    — SE-RENT-XXXX / SE-SALE-XXXX sequential, sheet-led.
 *   5. LOGS     — appends the 20-column Master ledger row AND a PENDING
 *      new_units row, then triggers workflow 05 (unit-adder) so the unit
 *      enters Supabase `listings` (REVIEW_REQUIRED) right away.
 *   6. CONFIRMS — replies in the SAME agent group (code + sheet row).
 *   7. BROADCASTS — posts the sanitized official template + first 3–5
 *      photos to the General group. Structurally owner-free: built only
 *      from sanitized structured fields, then runtime-guarded.
 *
 * Failure doctrine: NOTHING crashes the poller. Sheet outages spool the
 * unit locally (.state/telegram-intake-spool.json) and are flushed with a
 * 10-minute retry; the broadcast happens only AFTER the ledger accepts the
 * row (never broadcast a unit the concierge cannot look up). Every user-
 * facing error is specific and actionable — the bot never answers with a
 * generic "عذراً، حدث خطأ غير متوقع".
 *
 * Env (full schema in README.md):
 *   TELEGRAM_BOT_TOKEN            required
 *   TELEGRAM_AGENT_GROUP_IDS      required  "-100…:Fareda,-100…:Christina"
 *   TELEGRAM_GENERAL_GROUP_ID     required for broadcast
 *   GOOGLE_SHEET_ID | TELEGRAM_MASTER_SHEET_ID | UNITS_SHEET_ID
 *   GOOGLE_SERVICE_ACCOUNT_CREDENTIALS (= inline JSON/base64; aliases
 *     GOOGLE_SERVICE_ACCOUNT_JSON / _KEY also accepted)
 *   TELEGRAM_INTAKE_MAX_PHOTOS=5  TELEGRAM_INTAKE_RUN_UNIT_ADDER=1
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (unit-adder passthrough)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const { loadWorkflowEnv } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));

const { createClient, escapeHtml } = require('./tg');
const { parseListing, missingFields } = require('./parser');
const redact = require('./redact');
const { assignCode, intakeHash } = require('./codes');
const sheets = require('./sheets');
const render = require('./render');
const dedupIndex = require('../lib/dedup-index');
const { resolveCanonicalCompound } = require('../lib/compound-canonical');

// ── configuration ──────────────────────────────────────────────────────────
const BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const GENERAL_GROUP_ID = String(process.env.TELEGRAM_GENERAL_GROUP_ID || '').trim();
const MAX_PHOTOS = parseInt(process.env.TELEGRAM_INTAKE_MAX_PHOTOS || '5', 10);
const RUN_UNIT_ADDER = String(process.env.TELEGRAM_INTAKE_RUN_UNIT_ADDER || '1') !== '0';
const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const SPOOL_FILE = path.join(STATE_DIR, 'telegram-intake-spool.json');
const LEDGER_FILE = path.join(STATE_DIR, 'telegram-intake-ledger.json');
const HEARTBEAT_FILE = path.join(STATE_DIR, 'telegram-intake-heartbeat.json');
const UPLOADS_DIR = path.join(STATE_DIR, 'uploads');
const INTAKE_COOLDOWN_MS = parseInt(process.env.TELEGRAM_INTAKE_COOLDOWN_MS || '600000', 10); // 10 min
const MEDIA_GROUP_WAIT_MS = parseInt(process.env.TELEGRAM_INTAKE_MEDIA_GROUP_WAIT_MS || '2500', 10);

/** AGENT_GROUP_IDS accepts "-100…:Fareda" or plain "-100…" (name resolved
 *  from the chat title at runtime, suffix "units"/"وحدات" stripped). */
function parseAgentGroups(raw) {
  const map = new Map();
  for (const part of String(raw || '').split(',')) {
    const entry = part.trim();
    if (!entry) continue;
    const [id, ...rest] = entry.split(':');
    const key = String(id).trim();
    if (!/^-?\d+$/.test(key)) continue;
    map.set(key, rest.join(':').trim() || null);
  }
  return map;
}

const AGENT_GROUPS = parseAgentGroups(process.env.TELEGRAM_AGENT_GROUP_IDS || process.env.AGENT_GROUP_IDS || '');

function log(...args) {
  console.log(new Date().toISOString(), '[telegram-intake]', ...args);
}

function stateRead(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function stateWrite(file, obj) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 1));
    fs.renameSync(tmp, file);
  } catch (e) { log(`state write failed (${path.basename(file)}): ${e.message}`); }
}

// ── startup validation ─────────────────────────────────────────────────────
// (moved into validateStartup() above so importing the module in tests
//  never terminates the runner)

const tg = createClient(BOT_TOKEN);

/** Startup validation — only enforced when run as the daemon (tests import
 *  the module's pure pieces without a token). */
function validateStartup() {
  if (!BOT_TOKEN) {
    console.error('UNCONFIGURED: TELEGRAM_BOT_TOKEN missing — get one from @BotFather.');
    return 'TELEGRAM_BOT_TOKEN missing';
  }
  if (!AGENT_GROUPS.size) {
    console.error('UNCONFIGURED: TELEGRAM_AGENT_GROUP_IDS missing — comma-separated chat ids (id:AgentName). Use /chatid in each group to find them.');
    return 'TELEGRAM_AGENT_GROUP_IDS missing';
  }
  if (!GENERAL_GROUP_ID) {
    log('NOTE: TELEGRAM_GENERAL_GROUP_ID not set — units will be logged + confirmed, but NOT broadcast.');
  }
  return null;
}

// ── per-chat rate limiting (intake spam guard) ─────────────────────────────
const intakeTimes = new Map(); // chatId → [ts, …]
function intakeAllowed(chatId) {
  const now = Date.now();
  const arr = (intakeTimes.get(String(chatId)) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (arr.length >= 6) { intakeTimes.set(String(chatId), arr); return false; }
  arr.push(now);
  intakeTimes.set(String(chatId), arr);
  return true;
}

// ── dedupe ledger (Telegram retries / double-sends) ────────────────────────
function ledgerSeen(hash) {
  const led = stateRead(LEDGER_FILE, { hashes: [] });
  return led.hashes.includes(hash);
}
function ledgerRecord(hash, code) {
  const led = stateRead(LEDGER_FILE, { hashes: [], units: [] });
  led.hashes = [hash, ...led.hashes].slice(0, 500);
  led.units = [{ hash, code, at: new Date().toISOString() }, ...(led.units || [])].slice(0, 500);
  stateWrite(LEDGER_FILE, led);
}
function ledgerCodeFor(hash) {
  const led = stateRead(LEDGER_FILE, { units: [] });
  const hit = (led.units || []).find((u) => u.hash === hash);
  return hit ? hit.code : null;
}

// ── update_id exactly-once (Mission 2: concurrent processing guard) ─────────
// The poll loop dispatches updates WITHOUT awaiting them (sub-500 ms ack),
// so Telegram redeliveries could otherwise double-process an update that
// is still mid-flight. A bounded LRU of seen update_ids closes that hole.
const seenUpdateIds = new Map(); // update_id → ts
function updateSeen(updateId) {
  const key = Number(updateId);
  if (!Number.isFinite(key)) return false;
  const now = Date.now();
  if (seenUpdateIds.has(key)) return true;
  seenUpdateIds.set(key, now);
  if (seenUpdateIds.size > 2000) {
    for (const [k, ts] of seenUpdateIds) {
      if (now - ts > 24 * 60 * 60 * 1000) seenUpdateIds.delete(k);
    }
  }
  return false;
}

// ── spool (sheet outage safety net) ────────────────────────────────────────
function spoolPush(entry) {
  const spool = stateRead(SPOOL_FILE, { pending: [] });
  spool.pending.push(entry);
  stateWrite(SPOOL_FILE, spool);
}
function spoolTakeAll() {
  const spool = stateRead(SPOOL_FILE, { pending: [] });
  stateWrite(SPOOL_FILE, { pending: [] });
  return spool.pending || [];
}

// ── media-group buffering ──────────────────────────────────────────────────
const mediaGroups = new Map(); // media_group_id → { photos: [fileId…], caption, chatId, msgId, timer }

function largestPhotoFileId(message) {
  const photos = message.photo || [];
  if (!photos.length) return null;
  const best = photos.reduce((a, b) => ((a.file_size || 0) >= (b.file_size || 0) ? a : b));
  return best.file_id;
}

function bufferMediaMessage(message) {
  const gid = message.media_group_id;
  const file = largestPhotoFileId(message);
  if (!file) return null;
  const entry = mediaGroups.get(gid) || {
    photos: [], caption: '', chatId: String(message.chat.id),
    msgId: message.message_id, agentUserId: message.from && message.from.id,
  };
  if (!entry.photos.includes(file)) entry.photos.push(file);
  if (message.caption && !entry.caption) entry.caption = message.caption;
  mediaGroups.set(gid, entry);
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    mediaGroups.delete(gid);
    handleIntake(entry.chatId, entry.caption || '', entry.photos.slice(0, MAX_PHOTOS), entry.msgId).catch((e) =>
      log(`media-group intake failed: ${e.message}`),
    );
  }, MEDIA_GROUP_WAIT_MS);
  return entry;
}

// ── agent identity ─────────────────────────────────────────────────────────
const chatTitleCache = new Map();
async function agentNameFor(chatId, fromUser) {
  const mapped = AGENT_GROUPS.get(String(chatId));
  if (mapped) return mapped;
  let title = chatTitleCache.get(String(chatId));
  if (!title) {
    try {
      const chat = await tg.getChat(chatId);
      title = String(chat.title || chat.first_name || '');
      chatTitleCache.set(String(chatId), title);
    } catch (_) { title = ''; }
  }
  const cleaned = title
    .replace(/\s*(?:units|unit|وحدات|الوحدات)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned) return cleaned.slice(0, 40);
  const u = fromUser || {};
  return String(u.first_name || u.username || 'Unknown agent').slice(0, 40);
}

// ── the intake pipeline ────────────────────────────────────────────────────
async function handleIntake(chatId, text, photoFileIds, replyToMessageId, agentNameOverride) {
  const chatKey = String(chatId);
  const agentName = agentNameOverride || (await agentNameFor(chatId, null));

  if (!intakeAllowed(chatKey)) {
    return tg.sendMessage(chatKey,
      `⏳ Too many units in the last 10 minutes (max 6). Send the rest shortly.\nتم استلام الكثير من الوحدات خلال ١٠ دقائق — أرسل الباقي بعد قليل.`,
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
    ).catch(() => {});
  }

  if (!text || !text.trim()) {
    return tg.sendMessage(chatKey,
      `📷 Photos received — but there is no listing text yet. Please send the full details (type, compound, area, beds/baths, price, finishing, landlord contact if any).\nتم استلام الصور — من فضلك أرسل بيانات الوحدة كاملة.`,
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
    ).catch(() => {});
  }

  // Dedupe: identical text from the same agent within the cooldown window.
  const hash = intakeHash(text, agentName);
  if (ledgerSeen(hash)) {
    const prior = ledgerCodeFor(hash);
    return tg.sendMessage(chatKey,
      `♻️ This listing is already logged${prior ? ` as <code>${escapeHtml(prior)}</code>` : ''} — no duplicate row was created.\nهذه الوحدة مسجلة بالفعل.`,
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
    ).catch(() => {});
  }

  // ═══ MISSION 2: SUB-500ms ACK ═══════════════════════════════════════════
  // Everything above is local (rate limiter + ledger read). Acknowledge the
  // agent NOW; parsing, media download, AI extraction, Sheets + Supabase
  // writes and the broadcast all continue below, asynchronously.
  const ackStart = Date.now();
  const fastAckP = tg.sendMessage(chatKey, render.renderFastAck(),
    replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
  ).catch(() => {});
  const ackSentMs = Date.now() - ackStart;

  // 1. Parse (deterministic; LLM gap-fill intentionally OFF by default —
  //    §21 no-fabrication: an explicit "missing" beats a guessed field).
  const listing = parseListing(text);
  const missing = missingFields(listing);
  if (missing.length) {
    await fastAckP;
    return tg.sendMessage(chatKey, render.renderMissingFields(missing, photoFileIds.length > 0),
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
    ).catch(() => {});
  }

  // 2. Sanitize + extract private material.
  const ownerPhones = redact.extractOwnerPhones(text);
  const landlordName = redact.extractLandlordName(text);
  const sanitizedDescription = redact.scrubForTeam(text).slice(0, 900);
  // Canonical compound (Mission 3 normalization rule) — gazetteer-mapped.
  if (listing.compound) listing.compoundCanonical = resolveCanonicalCompound(listing.compound);
  // Mission 5: the structured 📥 card carries an explicit owner block —
  // prefer it over label-extraction when present (never fabricated).
  const cardOwner = listing.owner || null;
  const ownerFirstName = (cardOwner && cardOwner.name) || landlordName;
  const cardUnitNumber = cardOwner && cardOwner.unitNumber ? String(cardOwner.unitNumber) : null;

  // ═══ MISSION 2: IN-MEMORY DEDUP INDEX + ±5% PRICE DQE GATE ═══════════════
  // Checked BEFORE any Sheets/Supabase write. Same owner + canonical
  // compound + unit type + area bucket with a price within ±5% → re-list:
  // refresh the existing row in place instead of creating a duplicate.
  const dedupDecision = await dedupIndex.checkDuplicate({
    ownerPhone: ownerPhones[0] || null,
    compound: listing.compoundCanonical || listing.compound,
    unitType: listing.propertyType,
    areaSqm: listing.areaSqm,
    price: listing.price ? listing.price.amount : null,
    dealType: listing.listingType,
  }).catch((e) => {
    log(`dedup-index check failed (continuing as fresh): ${e.message}`);
    return { duplicate: false };
  });

  if (dedupDecision.duplicate && dedupDecision.action === 'update_in_place') {
    const priorCode = dedupDecision.match && dedupDecision.match.code;
    let rowNumber = null;
    if (priorCode && sheets.configured()) {
      rowNumber = await sheets.updateIntakeRowByCode(priorCode, {
        priceDisplay: listing.price
          ? `${Number(listing.price.amount).toLocaleString('en-US')} ${listing.price.currency}${listing.listingType === 'rent' ? (listing.price.period === 'year' ? ' / year' : ' / month') : ''}`
          : undefined,
      }).catch((e) => {
        log(`re-list sheet refresh failed for ${priorCode}: ${e.message}`);
        return null;
      });
    }
    await dedupIndex.record({
      ownerPhone: ownerPhones[0] || null,
      compound: listing.compoundCanonical || listing.compound,
      unitType: listing.propertyType,
      areaSqm: listing.areaSqm,
      price: listing.price ? listing.price.amount : null,
      dealType: listing.listingType,
      code: priorCode,
    }).catch(() => {});
    await fastAckP;
    log(`re-list refresh: ${priorCode} drift=${dedupDecision.drift} ackMs=${ackSentMs}`);
    return tg.sendMessage(chatKey, render.renderRelistRefresh(priorCode, dedupDecision.drift, rowNumber),
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
    ).catch(() => {});
  }

  // 3. Code assignment (sheet-led, mutex-guarded).
  const sheetRows = sheets.configured() ? await sheets.readIntakeRows().catch(() => null) : null;
  const colIndex = 1; // "Reference Code" is column B in the intake tab
  const { code, source } = await assignCode(listing.listingType, sheetRows, colIndex);
  listing.code = code;

  // 4. Build the Master ledger row (EXACT owner-approved 20-column order).
  const nowIso = new Date().toISOString();
  const priceDisplay = listing.price
    ? `${Number(listing.price.amount).toLocaleString('en-US')} ${listing.price.currency}${listing.listingType === 'rent' ? (listing.price.period === 'year' ? ' / year' : ' / month') : ''}`
    : '—';
  const internalNotes = [
    `landlord: ${ownerFirstName || '(not given)'}`,
    `phones: ${ownerPhones.length ? ownerPhones.join(' , ') : '(none found)'}`,
    `agent: ${agentName}`,
    `received: ${nowIso}`,
    `code_source: ${source}`,
    cardUnitNumber ? `unit_no(private): ${cardUnitNumber}` : '',
    `shape: ${listing.__shape || 'free-text'}`,
    dedupDecision.dqeFlag ? `dqe: PRICE_OUT_OF_BAND existing=${dedupDecision.dqeFlag.existingPrice} drift=${dedupDecision.dqeFlag.drift}` : '',
    `raw: ${String(text).replace(/\s+/g, ' ').slice(0, 400)}`,
  ].filter(Boolean).join(' | ');
  const maskedContact = ownerPhones.length ? ownerPhones.map(redact.maskPhone).join(' , ') : '—';
  const mediaLinks = [
    photoFileIds.length ? `tg:${photoFileIds.join(',')}` : '',
    photoFileIds.length ? `local:${UPLOADS_DIR}/${code}` : '',
  ].filter(Boolean).join(' | ') || '—';

  const masterRow = [
    nowIso, code, listing.dealTypeRaw || (listing.listingType === 'rent' ? 'Rent' : 'Sale'), agentName,
    listing.compoundCanonical || listing.compound || '—', listing.district || '—',
    listing.propertyType || 'Unit', listing.areaSqm ?? '—',
    listing.bedrooms ?? '—', listing.bathrooms ?? '—',
    listing.furnishing || '—', listing.finishing || '—',
    priceDisplay, listing.paymentTerms || '—', listing.deposit || '—',
    sanitizedDescription, internalNotes, maskedContact, mediaLinks,
    dedupDecision.dqeFlag ? 'DQE Flag — price variance' : 'Active',
  ];

  // 5. The new_units feed row (A–L contract of workflow 05 unit-adder).
  const newUnitsRow = [
    listing.compoundCanonical || listing.compound || '—',
    String(listing.bedrooms ?? 0),
    String(listing.bathrooms ?? 0),
    String(listing.areaSqm ?? 0),
    String(listing.price ? listing.price.amount : 0),
    listing.finishing || '',
    (listing.furnishing || '').toLowerCase().includes('furnish') && !/un|empty|غير/i.test(listing.furnishing || '')
      ? 'furnished' : '',
    listing.propertyType || 'apartment',
    [listing.district, listing.compoundCanonical || listing.compound].filter(Boolean).join(', ') || '—',
    '', '', 'PENDING',
    listing.listingType === 'rent' ? 'Rent' : 'Sale', // M — deal type (05-unit-adder, 2026-11-01)
  ];

  // 6. Persist (spool on failure — never drop a unit).
  let rowNumber = null;
  let spooled = false;
  try {
    rowNumber = await sheets.appendIntakeRow(masterRow);
    await sheets.appendNewUnitsRow(newUnitsRow);
  } catch (e) {
    spoolPush({
      at: nowIso, chatId: chatKey, code, masterRow, newUnitsRow,
      photoFileIds, text: String(text).slice(0, 1000), agentName,
      replyToMessageId: replyToMessageId || null,
    });
    ledgerRecord(hash, code);
    log(`sheet append failed — ${code} spooled (${e.message})`);
    spooled = true;
    await tg.sendMessage(chatKey, render.renderSpooled(code),
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
    ).catch(() => {});
    return;
  }
  ledgerRecord(hash, code);

  // 6b. Record in the dedup index so the NEXT intake of the same unit hits
  //     the re-list gate (Mission 2).
  await dedupIndex.record({
    ownerPhone: ownerPhones[0] || null,
    compound: listing.compoundCanonical || listing.compound,
    unitType: listing.propertyType,
    areaSqm: listing.areaSqm,
    price: listing.price ? listing.price.amount : null,
    dealType: listing.listingType,
    code,
    sheetRow: rowNumber,
  }).catch(() => {});

  // 7. Archive photos to the state volume (file_ids already stored in the
  //    sheet; local copies survive even if Telegram prunes them).
  for (let i = 0; i < Math.min(photoFileIds.length, MAX_PHOTOS); i++) {
    try {
      await tg.downloadFile(photoFileIds[i], path.join(UPLOADS_DIR, code, `${String(i + 1).padStart(2, '0')}.jpg`));
    } catch (e) { log(`photo ${i + 1} archive failed for ${code}: ${e.message}`); }
  }

  // 8. Inventory: run workflow 05 unit-adder inline so the PENDING row
  //    becomes a Supabase listing immediately (non-fatal on failure — the
  //    cron lane retries it anyway).
  if (RUN_UNIT_ADDER && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    runUnitAdder().catch((e) => log(`unit-adder inline run failed: ${e.message}`));
  }

  // 9. Confirmation in the agent's own group.
  const broadcastOk = await broadcastListing(listing, agentName, photoFileIds);
  await fastAckP; // the ⏳ is on screen — replace it with the outcome
  await tg.sendMessage(chatKey, render.renderConfirmation(code, rowNumber, {
    broadcast: broadcastOk, landlordCount: ownerPhones.length,
  }), replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}).catch(() => {});
  if (dedupDecision.dqeFlag) {
    await tg.sendMessage(chatKey, render.renderDqeFlag(code,
      dedupDecision.dqeFlag.existingPrice, dedupDecision.dqeFlag.newPrice,
      dedupDecision.dqeFlag.drift),
      replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}).catch(() => {});
  }

  log(`intake ok: ${code} row ${rowNumber} agent=${agentName} photos=${photoFileIds.length} phones=${ownerPhones.length} ackMs=${ackSentMs}${dedupDecision.dqeFlag ? ' dqe=PRICE_OUT_OF_BAND' : ''}`);
}

/** Broadcast the sanitized unit to General: text first (guaranteed), then
 *  the 3–5 photo album. Returns whether the text broadcast landed. */
async function broadcastListing(listing, agentName, photoFileIds) {
  if (!GENERAL_GROUP_ID) return false;
  const body = render.renderBroadcast(listing, agentName);
  // Runtime privacy guard — structured fields should make this a no-op;
  // if it ever trips, the message is blocked, not "partially redacted".
  const leftovers = redact.broadcastLeftovers(body);
  if (leftovers.length) {
    log(`BROADCAST BLOCKED for ${listing.code}: owner-contact leftover(s) detected — refusing to send.`);
    return false;
  }
  try {
    await tg.sendMessage(GENERAL_GROUP_ID, body);
  } catch (e) {
    log(`broadcast text failed for ${listing.code}: ${e.message}`);
    return false;
  }
  if (photoFileIds && photoFileIds.length) {
    const media = photoFileIds.slice(0, MAX_PHOTOS).map((fileId, i) => ({
      type: 'photo',
      media: fileId,
      ...(i === 0 ? { caption: render.renderAlbumCaption(listing), parse_mode: 'HTML' } : {}),
    }));
    try {
      await tg.sendMediaGroup(GENERAL_GROUP_ID, media);
    } catch (e) {
      log(`broadcast album failed for ${listing.code}: ${e.message}`); // text already landed
    }
  }
  return true;
}

/** Inline trigger of workflow 05 (unit-adder) — bounded, non-fatal. */
function runUnitAdder() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, '..', '05-unit-adder', 'add.js')], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    const killer = setTimeout(() => child.kill('SIGKILL'), 90000);
    child.on('exit', (codeNum) => {
      clearTimeout(killer);
      const summary = (out.match(/^SUMMARY (.+)$/m) || [])[1] || '';
      log(`unit-adder inline: exit ${codeNum} ${summary}`);
      codeNum === 0 || codeNum === 2 ? resolve() : reject(new Error(`exit ${codeNum}`));
    });
    child.on('error', reject);
  });
}

// ── spool flush (sheet recovered?) ─────────────────────────────────────────
async function flushSpool() {
  const pending = spoolTakeAll();
  for (const entry of pending) {
    try {
      const rowNumber = await sheets.appendIntakeRow(entry.masterRow);
      await sheets.appendNewUnitsRow(entry.newUnitsRow);
      // Re-broadcast the delayed unit (photos by file_id still valid).
      const listingLike = {
        code: entry.masterRow[1],
        listingType: entry.masterRow[2].toLowerCase() === 'rent' ? 'rent' : 'sale',
        compound: entry.masterRow[4], district: entry.masterRow[5],
        propertyType: entry.masterRow[6], areaSqm: entry.masterRow[7] === '—' ? null : entry.masterRow[7],
        bedrooms: entry.masterRow[8] === '—' ? null : entry.masterRow[8],
        bathrooms: entry.masterRow[9] === '—' ? null : entry.masterRow[9],
        furnishing: entry.masterRow[10] === '—' ? null : entry.masterRow[10],
        finishing: entry.masterRow[11] === '—' ? null : entry.masterRow[11],
        price: null, paymentTerms: entry.masterRow[13] === '—' ? null : entry.masterRow[13],
        deposit: entry.masterRow[14] === '—' ? null : entry.masterRow[14],
        availability: null, floor: null, view: null,
      };
      await broadcastListing(listingLike, entry.agentName, entry.photoFileIds || []);
      if (entry.chatId) {
        await tg.sendMessage(entry.chatId, render.renderConfirmation(entry.masterRow[1], rowNumber, {
          broadcast: true,
        })).catch(() => {});
      }
      log(`spool flushed: ${entry.masterRow[1]} → row ${rowNumber}`);
    } catch (e) {
      spoolPush(entry); // still failing — back in the queue for the next pass
      log(`spool flush retry kept ${entry.masterRow[1]}: ${e.message}`);
      break;
    }
  }
}

// ── commands ───────────────────────────────────────────────────────────────
async function handleCommand(text, chatId, fromUser) {
  const clean = text.trim();
  if (clean === '/chatid' || clean === '/id') {
    return tg.sendMessage(chatId,
      `🆔 This chat's ID: <code>${escapeHtml(String(chatId))}</code>\nAdd it to TELEGRAM_AGENT_GROUP_IDS (as <code>${escapeHtml(String(chatId))}:AgentName</code>) or use it as TELEGRAM_GENERAL_GROUP_ID.`,
    ).catch(() => {});
  }
  if (clean === '/ping') {
    const spoolN = (stateRead(SPOOL_FILE, { pending: [] }).pending || []).length;
    return tg.sendMessage(chatId, [
      `🏓 Intake agent alive`,
      `• Sheet sync: ${sheets.configured() ? 'configured ✅' : 'NOT configured ⚠️ (units spool locally)'}`,
      `• General broadcast: ${GENERAL_GROUP_ID ? 'configured ✅' : 'not set ⚠️'}`,
      `• Agent groups: ${AGENT_GROUPS.size}`,
      `• Spooled units awaiting sheet: ${spoolN}`,
    ].join('\n')).catch(() => {});
  }
  if (clean === '/start' || clean === '/help') {
    return tg.sendMessage(chatId, render.renderHelp(sheets.configured())).catch(() => {});
  }
  return false;
}

// ── dispatch one update ────────────────────────────────────────────────────
async function handleUpdate(update) {
  // Exactly-once: Telegram redelivers un-acked updates; with the poll loop
  // no longer awaiting handlers, an in-flight update could be seen twice.
  if (updateSeen(update.update_id)) return;
  const message = update.message || update.edited_message;
  if (!message) return;
  if (message.from && message.from.is_bot) return;
  // Ignore stale replays (bot down > 24 h): never re-intake old units.
  if (message.date && Date.now() / 1000 - message.date > 86400) return;

  const chatId = String(message.chat.id);
  const text = String(message.text || message.caption || '');

  if (text.startsWith('/')) {
    await handleCommand(text, chatId, message.from);
    return;
  }

  // Intake ONLY from configured agent groups (fail-closed: unknown chats
  // are logged + ignored, never processed).
  if (!AGENT_GROUPS.has(chatId)) {
    return;
  }

  if (message.photo && message.media_group_id) {
    bufferMediaMessage(message); // flushed after the album settles
    return;
  }
  const singlePhoto = message.photo ? largestPhotoFileId(message) : null;
  await handleIntake(chatId, text, singlePhoto ? [singlePhoto] : [], message.message_id);
}

// ── main loop ──────────────────────────────────────────────────────────────
async function main() {
  const invalid = validateStartup();
  if (invalid) {
    console.error(`telegram-intake bot FAILED to start: ${invalid}`);
    // Honest retry loop: sleep 10 min, then exit 2 — the compose restart
    // policy relaunches us, so filling infra/.env goes live within ~10 min
    // without a fast crash-loop spamming the logs.
    console.error('retrying in 10 minutes (fill infra/.env to go live immediately + docker restart sierra-telegram-intake)');
    await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
    process.exit(2);
  }
  log(`starting — agent groups: ${[...AGENT_GROUPS.keys()].join(', ')} | general: ${GENERAL_GROUP_ID || '(none)'} | sheet: ${sheets.resolveSpreadsheetId() || '(default)'}`);
  const me = await tg.getMe();
  log(`connected as @${me.username} (${me.first_name})`);

  // Long-polling requires no webhook consumer.
  try {
    await tg.deleteWebhook(false);
    log('webhook cleared (long-poll mode)');
  } catch (e) { log(`deleteWebhook: ${e.message}`); }

  if (sheets.configured()) {
    await sheets.ensureTabs().catch((e) => log(`ensureTabs failed (will retry on demand): ${e.message}`));
  } else {
    log('UNCONFIGURED: Google Sheets credentials/sheet id missing — units will spool locally until configured.');
  }

  let offset = 0;
  const flushTimer = setInterval(() => {
    flushSpool().catch((e) => log(`spool flush failed: ${e.message}`));
  }, 10 * 60 * 1000);
  flushSpool().catch(() => {}); // boot-time pass

  process.on('SIGTERM', () => { clearInterval(flushTimer); process.exit(0); });
  process.on('SIGINT', () => { clearInterval(flushTimer); process.exit(0); });

  // The loop that never dies: every failure is logged and retried.
  for (;;) {
    try {
      stateWrite(HEARTBEAT_FILE, { at: new Date().toISOString(), offset });
      const updates = await tg.getUpdates(offset, 30);
      for (const update of updates || []) {
        offset = update.update_id + 1;
        // MISSION 2 (sub-500 ms ack): dispatch WITHOUT awaiting so one slow
        // sheet write / photo album never delays the next unit's ack. The
        // update_id guard + intake ledger + codes mutex keep this safe.
        handleUpdate(update).catch((e) => {
          const incidentId = `tg-${new Date().toISOString().slice(11, 19)}-${crypto.randomBytes(3).toString('hex')}`;
          log(`update ${update.update_id} failed (${incidentId}): ${e.message}`);
          const message = update.message || update.edited_message;
          if (message && AGENT_GROUPS.has(String(message.chat.id))) {
            tg.sendMessage(String(message.chat.id), render.renderError(incidentId, 'processing'))
              .catch(() => {});
          }
        });
      }
    } catch (e) {
      log(`poll cycle failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

process.on('unhandledRejection', (e) => log(`unhandledRejection (suppressed): ${e && e.message}`));
process.on('uncaughtException', (e) => log(`uncaughtException (suppressed): ${e && e.message}`));

if (require.main === module) {
  main().catch((e) => {
    console.error(`telegram-intake bot FAILED to start: ${e.message}`);
    process.exit(1);
  });
} else {
  // Imported as a module (tests / future admin bridge): env validation
  // runs in main(), so an import without a token is inert, not fatal.
}

module.exports = {
  parseAgentGroups,
  handleIntake,
  broadcastListing,
  flushSpool,
  handleUpdate,
  __internals: { stateRead, stateWrite, SPOOL_FILE, LEDGER_FILE, HEARTBEAT_FILE, UPLOADS_DIR },
};
