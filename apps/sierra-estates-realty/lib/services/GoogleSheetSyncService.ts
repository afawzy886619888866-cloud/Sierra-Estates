/**
 * GoogleSheetSyncService — mirrors public /add-listing submissions into the
 * team's Google Sheet ops hub via their Apps Script Web App (Mode D,
 * `website_submission`).
 *
 * The sheet engine (v6.1) validates the same OUTREACH secret and writes ONE
 * row to the "Website_Listings" tab with: تاريخ الإضافة + آخر تحديث + the
 * full unit specs + لينك الموقع + لينك الخريطة + لينك الانفنتوري (deep link
 * to the row) + photos uploaded to Google Drive.
 *
 * Transport notes (same battle-tested pattern as the Easy Listing tool):
 * Apps Script responds to a POST with a 302 to a one-time googleusercontent
 * URL, so `redirect: 'follow'` + a text/plain content type is used — the
 * CORS-free pattern that works reliably against script.google.com.
 *
 * The secret NEVER reaches the browser: this module runs server-side only,
 * reading SHEETS_WEBAPP_URL / SHEETS_WEBAPP_SECRET from the environment.
 * When the variables are not configured the sync is skipped gracefully
 * (logged, non-fatal) — the public form keeps working exactly as before.
 */
import { logger } from '../logger';
import { resolveLocation } from '../inventory/gazetteer';

export interface WebsiteSheetSyncInput {
  /** Submission reference, e.g. SE-SUB-483922 (stable across retries). */
  code: string;
  /** Canonical Supabase listing id (used for the public property URL). */
  supabaseId: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  beds: number;
  baths: number;
  area: number;
  gardenArea?: number;
  price: number;
  finishing?: string;
  ownerName: string;
  ownerType?: string;
  mobile: string;
  comment?: string;
  /** data-URLs (from the form's FileReader) and/or hosted http(s) URLs. */
  photos?: string[];
  /** Public listing page, e.g. https://sierra-estates.net/property/<id>. */
  websiteUrl: string;
}

export interface WebsiteSheetSyncResult {
  ok: boolean;
  /** Sheet row number on success. */
  row?: number;
  /** Tab name written to (e.g. 'owners rent', 'owners resale', 'brokers rent', 'brokers resale') */
  sheet?: string;
  /** Deep link to the exact sheet row (لينك الانفنتوري). */
  inventoryUrl?: string;
  /** Permanent Google Drive links for the uploaded photos. */
  photoUrls?: string[];
  error?: string;
}

interface ScriptImage {
  name: string;
  mime: string;
  /** base64 payload without the data-URL prefix */
  data: string;
}

const MAX_IMAGES = 10;

/** Parse a `data:<mime>;base64,<payload>` string into the script image shape. */
function parseDataUrl(dataUrl: string): ScriptImage | null {
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(String(dataUrl || '').trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  return { name: `photo-${Date.now()}.${ext}`, mime, data: m[2] };
}

/**
 * Google Maps link for the compound: precise gazetteer centroid when the
 * compound resolves exactly, otherwise an honest name search (never a
 * fabricated pin).
 */
export function buildMapLink(compound: string): string {
  try {
    const resolved = resolveLocation(compound);
    if (
      resolved &&
      !resolved.approx &&
      Number.isFinite(resolved.lat) &&
      Number.isFinite(resolved.lng) &&
      (resolved.lat !== 0 || resolved.lng !== 0)
    ) {
      return `https://www.google.com/maps/search/?api=1&query=${resolved.lat},${resolved.lng}`;
    }
  } catch {
    /* gazetteer miss — fall through to a name search */
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${compound} New Cairo Egypt`
  )}`;
}

/**
 * Forward one public submission to the Apps Script Web App (Mode D).
 * Never throws — failures are returned and logged so the submit route can
 * keep the flow green for the end user.
 */
export async function syncWebsiteSubmissionToSheet(
  input: WebsiteSheetSyncInput,
  timeoutMs = 90_000
): Promise<WebsiteSheetSyncResult> {
  const url = process.env.SHEETS_WEBAPP_URL || process.env.WF_SHEET_WRITE_URL;
  const secret = process.env.SHEETS_WEBAPP_SECRET || process.env.WF_SHEET_WRITE_SECRET || 'SE_OUTREACH_SECRET_2026_CAIRO';

  if (!url) {
    logger.info(
      '[SHEET_SYNC] SHEETS_WEBAPP_URL / WF_SHEET_WRITE_URL not configured — Google Sheet mirror skipped (form still saves to Supabase + Excel)'
    );
    return { ok: false, error: 'not-configured' };
  }

  const images: ScriptImage[] = [];
  const imageUrls: string[] = [];
  for (const photo of input.photos || []) {
    const s = String(photo || '');
    if (/^data:/i.test(s)) {
      const parsed = parseDataUrl(s);
      if (parsed) images.push(parsed);
    } else if (/^https?:\/\//i.test(s)) {
      imageUrls.push(s);
    }
  }

  const isBroker = String(input.ownerType || '').toLowerCase().includes('broker');
  const isRent = input.mode === 'rent';
  // 400,000 EGP rent ceiling guard: rent above 400k is classified as resale
  const effectiveDealType = (isRent && Number(input.price) <= 400_000) ? 'Rent' : 'Resale';
  const targetTab = isBroker
    ? (effectiveDealType === 'Rent' ? 'brokers rent' : 'brokers resale')
    : (effectiveDealType === 'Rent' ? 'owners rent' : 'owners resale');

  const now = new Date();
  const cairoDate = now.toLocaleDateString('en-GB');
  const masterRow = [
    now.toISOString(),
    '',
    cairoDate,
    input.ownerName,
    input.mobile, // original phone preserved in private sheet
    'Available',
    input.beds > 0 ? String(input.beds) : '',
    input.baths > 0 ? String(input.baths) : '',
    input.compound,
    Number(input.price).toLocaleString('en-US'),
    input.finishing || 'Fully finished',
    effectiveDealType,
    input.propertyType,
    input.code,
    isBroker ? 'Broker' : (input.ownerType || 'Owner'),
    input.gardenArea ? String(input.gardenArea) : '',
    input.area ? String(input.area) : '',
    '',
    input.comment || '',
    cairoDate,
  ];

  const payload = {
    secret,
    mode: 'website_submission',
    action: 'appendRows',
    targetTab,
    rows: [masterRow],
    code: input.code,
    supabaseId: input.supabaseId,
    compound: input.compound,
    propertyType: input.propertyType,
    dealType: effectiveDealType,
    beds: input.beds,
    baths: input.baths,
    area: input.area,
    gardenArea: input.gardenArea || 0,
    price: input.price,
    finishing: input.finishing || '',
    ownerName: input.ownerName,
    ownerType: isBroker ? 'Broker' : (input.ownerType || 'Owner'),
    advertiserType: isBroker ? 'Broker' : 'Direct Owner',
    mobile: input.mobile,
    comment: input.comment || '',
    websiteUrl: input.websiteUrl,
    mapLink: buildMapLink(input.compound),
    images: images.slice(0, MAX_IMAGES),
    imageUrls: imageUrls.slice(0, MAX_IMAGES - Math.min(images.length, MAX_IMAGES)),
    submittedAt: new Date().toISOString(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();

    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON — Apps Script sometimes returns HTML on auth errors */
    }

    if (json && typeof json === 'object' && 'ok' in json) {
      if (json.ok === true && res.ok) {
        logger.info(
          `[SHEET_SYNC] Row ${json.row} written to ${json.sheet || targetTab} for ${input.code}`
        );
        return {
          ok: true,
          row: typeof json.row === 'number' ? json.row : undefined,
          sheet: typeof json.sheet === 'string' ? json.sheet : targetTab,
          inventoryUrl: typeof json.inventoryUrl === 'string' ? json.inventoryUrl : undefined,
          photoUrls: Array.isArray(json.photoUrls) ? json.photoUrls.map(String) : [],
        };
      }
      const errMsg = String((json as Record<string, unknown>).error || 'script error');
      logger.warn(`[SHEET_SYNC] Apps Script rejected the submission: ${errMsg}`);
      return { ok: false, error: errMsg };
    }

    if (!res.ok || /login|sign in|accounts\.google/i.test(text)) {
      const errMsg = `unexpected Apps Script response (HTTP ${res.status}) — is the Web App deployed with "Anyone" access?`;
      logger.warn(`[SHEET_SYNC] ${errMsg}`);
      return { ok: false, error: errMsg };
    }

    logger.warn(`[SHEET_SYNC] Unexpected payload shape: ${text.slice(0, 200)}`);
    return { ok: false, error: 'unexpected response' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const aborted = msg.toLowerCase().includes('abort');
    logger.warn(
      `[SHEET_SYNC] Google Sheet sync failed (non-fatal): ${aborted ? 'timeout' : msg}`
    );
    return { ok: false, error: aborted ? 'timeout' : msg };
  } finally {
    clearTimeout(timer);
  }
}
