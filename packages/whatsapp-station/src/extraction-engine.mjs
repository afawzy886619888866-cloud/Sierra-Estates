/**
 * WhatsApp Station — Extraction Engine (skill-local, privacy-aware)
 * ──────────────────────────────────────────────────────────────────
 * Wraps the canonical USB-harvester parse engine
 * (workflows/21-usb-phone-harvester/parse-engine.mjs — single source of
 * truth for the compound gazetteer, Arabic price/area parsing and
 * WhatsApp export parsing) and adds the three station concerns:
 *
 *   1. PRIVACY MASKING  — full phone numbers never leave this module.
 *                         Broker/owner identities travel as last-7
 *                         only; the canonical confidential contact is
 *                         the station operator number (01092048333).
 *   2. RAG TEXT         — one canonical sentence per row for the 768-d
 *                         Gemini embedding (mirrors gemini-embeddings.ts).
 *   3. WAITING-ROW MAP  — exact shape of public.listing_waiting_list
 *                         rows (migration 20261120_052).
 */
import crypto from 'node:crypto';
import {
  GAZETTEER,
  extractUnitDetails,
  parseGroupedListings,
  parseWhatsAppExport,
  toWesternDigits,
} from '../../../workflows/21-usb-phone-harvester/parse-engine.mjs';

/** The only phone number allowed to appear unmasked anywhere downstream. */
export const CONFIDENTIAL_CONTACT = '01092048333';

const PHONE_STRIP = /(?:\+?20[\s\-.]?)?(?:01[0125](?:[\s\-.]?\d){8}|\d{10,13})/g;

/** Mask every Egyptian phone number inside free text → ***last-7. */
export function maskPhones(text) {
  if (!text) return '';
  return String(text).replace(PHONE_STRIP, (m) => {
    const digits = m.replace(/\D/g, '');
    const tail = digits.slice(-7);
    return tail ? `***${tail}` : '***';
  });
}

/** Full phone → ***last-7 (empty-safe). */
export function maskPhoneValue(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 7 ? `***${digits.slice(-7)}` : '***';
}

/** Human-readable station code SE-WA-XXXXXX for a waiting row. */
export function stationCode(dedupeKey) {
  const h = crypto.createHash('sha256').update(dedupeKey).digest('hex').slice(0, 8).toUpperCase();
  return `SE-WA-${h}`;
}

/** Canonical dedupe hash — identical message in the same group never re-imports. */
export function dedupeHash(groupName, sender, body) {
  return crypto.createHash('sha256')
    .update(`${groupName}|${sender}|${toWesternDigits(body || '').replace(/\s+/g, ' ').trim()}`)
    .digest('hex');
}

/**
 * One canonical RAG sentence — what the embedder sees. Deterministic,
 * Arabic-forward (the corpus is Arabic broker chatter), compounds and
 * numbers spelled out so cosine similarity clusters by compound+type+price.
 */
export function buildRagText(row) {
  const x = row.extracted || {};
  const parts = [
    x.dealType === 'rent' ? 'للايجار' : 'للبيع',
    x.propertyType || '',
    `في ${x.compound || ''}`,
    x.areaSqm ? `مساحة ${x.areaSqm} متر` : '',
    x.bedrooms ? `${x.bedrooms} غرف` : '',
    x.priceEgp ? `سعر ${x.priceEgp} جنيه` : '',
    x.zone || '',
    (row.group_name || row.groupName || ''),
  ];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** 0..1 confidence that a parsed message is a real listable unit. */
export function listingConfidence(extracted) {
  if (!extracted) return 0;
  let score = 0.2;
  if (extracted.compound && extracted.compound !== 'New Cairo') score += 0.2;
  if (extracted.priceEgp > 0) score += 0.2;
  if (extracted.areaSqm > 0) score += 0.15;
  if (extracted.propertyType) score += 0.1;
  if (extracted.dealType) score += 0.1;
  if ((extracted.attachedPhotos || []).length > 0) score += 0.05;
  if (extracted.isRequest) score -= 0.5;
  return Math.max(0, Math.min(1, score));
}

/**
 * Engine output row → public.listing_waiting_list insert payload.
 * `fullContactOpNumber` is the ONLY place a full number may appear and
 * it is forced to the confidential station contact, never a broker's.
 */
export function toWaitingRow(parsed, { source = 'whatsapp_group' } = {}) {
  if (!parsed) return null;
  const group = parsed.sourceGroup || 'WhatsApp';
  const hash = dedupeHash(group, parsed.senderName || '', parsed.rawText || '');
  const row = {
    code: stationCode(hash),
    source,
    group_name: group,
    broker_name: parsed.senderName || '',
    broker_phone_masked: maskPhoneValue(parsed.phoneNormalized || parsed.phoneLast7 || ''),
    raw_message: maskPhones(parsed.rawText || ''),
    extracted: {
      compound: parsed.compound || null,
      compound_code: parsed.compoundCode || null,
      zone: parsed.zone || null,
      lat: parsed.lat ?? null,
      lng: parsed.lng ?? null,
      property_type: parsed.propertyType || null,
      deal_type: parsed.dealType || null,
      price_egp: parsed.priceEgp || 0,
      area_sqm: parsed.areaSqm || null,
      bedrooms: parsed.bedrooms ?? null,
      bathrooms: parsed.bathrooms ?? null,
      photos_count: parsed.photosCount || 0,
      is_request: !!parsed.isRequest,
      advertiser: parsed.advertiser || null,
      posted_iso: parsed.postedIso || null,
      confidence: listingConfidence(parsed),
      contact_confidential: CONFIDENTIAL_CONTACT,
    },
    dedup_hash: hash,
    rag_text: '',
    status: parsed.isRequest ? 'REJECTED' : 'PENDING',
  };
  row.rag_text = buildRagText(row);
  return row;
}

export { GAZETTEER, extractUnitDetails, parseGroupedListings, parseWhatsAppExport, toWesternDigits };
