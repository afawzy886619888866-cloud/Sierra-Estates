import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { escapeTelegramHtml } from '@/lib/telegram';
import { resolveUnitCode, normalizeDealType } from '@/lib/server/unit-codes';

/**
 * SIERRA ESTATES 3.0 — GEMINI AI PROPERTY FORMATTER (Phase 2)
 *
 * Turns raw property specs into high-converting Arabic luxury real-estate
 * copy for the Telegram channel, always structured around the canonical
 * sections:
 *
 *   🏷️ Unit Code & Compound · 📐 Area / Floor / Finishing · 🛏️ Bedrooms ·
 *   🚿 Bathrooms · 💰 Price & Payment Terms · 📍 Location Highlights &
 *   Masterplan proximity · 📞 Official Contact & WhatsApp booking CTA.
 *
 * §21 anti-fabrication: the AI receives ONLY the facts the source listing
 * states and is instructed to omit anything absent — never to invent a
 * floor, a view or a payment plan. When Gemini is not configured (or fails),
 * a deterministic template renders the same sections from the same facts;
 * the result is flagged `source: 'template'` so callers can tell.
 */

export interface TelegramListingSpec {
  code?: string | null;
  compound: string;
  zone?: string | null;
  unitType?: string | null;
  dealType?: string | null;
  areaSqm?: number | null;
  floor?: string | number | null;
  finishing?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  paymentTerms?: string | null;
  locationHighlights?: string[] | null;
  masterplanProximity?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  /** Optional explicit coordinates — otherwise resolved from the compounds table. */
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
}

export interface FormattedListing {
  caption: string;
  source: 'gemini' | 'template';
  model?: string;
  unitCode: string;
  generatedAt: string;
}

const GEMINI_API_KEY =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  '';

const FORMATTER_MODEL = process.env.TELEGRAM_FORMATTER_MODEL || 'gemini-flash-latest';

/** Official channel contact override (falls back to the unit's own contact). */
const CHANNEL_CONTACT_PHONE =
  process.env.TELEGRAM_LISTING_CONTACT_PHONE || process.env.SIERRA_CONTACT_PHONE || '';

function resolveContactPhone(unit: TelegramListingSpec): string | null {
  const raw =
    (unit.whatsappNumber ?? unit.contactPhone ?? CHANNEL_CONTACT_PHONE ?? '').toString().trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  return digits.length >= 8 ? digits : null;
}

export function buildWhatsAppBookingLink(unit: TelegramListingSpec): string | null {
  const phone = resolveContactPhone(unit);
  if (!phone) return null;
  const normalized = phone.startsWith('20') ? phone : `20${phone.replace(/^0+/, '')}`;
  const text = encodeURIComponent(
    `مرحباً سييرا إستيتس، مهتم بالوحدة ${resolveUnitCode(unit).code} — أرجو ترتيب معاينة.`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

function formatPrice(unit: TelegramListingSpec): string | null {
  if (!(Number(unit.price) > 0)) return null;
  const currency = (unit.priceCurrency || 'EGP').toUpperCase();
  const amount = Number(unit.price).toLocaleString('en-US');
  const suffix = normalizeDealType(unit.dealType) === 'rent' ? ' / شهرياً' : '';
  return `${amount} ${currency}${suffix}`;
}

/**
 * Deterministic Arabic template — the honest fallback. Every line is derived
 * from a field the source listing actually provides; absent fields are
 * omitted, never invented.
 */
export function buildListingCaptionTemplate(unit: TelegramListingSpec): string {
  const { code } = resolveUnitCode(unit);
  const isRent = normalizeDealType(unit.dealType) === 'rent';
  const lines: string[] = [];

  lines.push(
    isRent
      ? `🌟 ${unit.compound} — للإيجار | Sierra Estates`
      : `🌟 ${unit.compound} — للبيع | Sierra Estates`,
  );
  lines.push('');
  lines.push(`🏷️ كود الوحدة: ${code} · كمبوند: ${unit.compound}${unit.zone ? ` (${unit.zone})` : ''}`);

  const geometry: string[] = [];
  if (Number(unit.areaSqm) > 0) geometry.push(`المساحة ${Number(unit.areaSqm)} م²`);
  if (unit.floor != null && String(unit.floor).trim() !== '') geometry.push(`الدور ${unit.floor}`);
  if (unit.finishing) geometry.push(`التشطيب ${unit.finishing}`);
  if (geometry.length > 0) lines.push(`📐 ${geometry.join(' · ')}`);

  const rooms: string[] = [];
  if (Number(unit.bedrooms) > 0) rooms.push(`🛏️ ${Number(unit.bedrooms)} غرف نوم`);
  if (Number(unit.bathrooms) > 0) rooms.push(`🚿 ${Number(unit.bathrooms)} حمامات`);
  if (rooms.length > 0) lines.push(rooms.join(' · '));

  const price = formatPrice(unit);
  if (price) {
    lines.push(`💰 ${isRent ? `الإيجار: ${price}` : `السعر: ${price}`}`);
    if (unit.paymentTerms) lines.push(`💳 شروط السداد: ${unit.paymentTerms}`);
  } else {
    lines.push('💰 السعر: عند الطلب');
  }

  const location = [
    ...(unit.locationHighlights ?? []),
    unit.masterplanProximity ? `قرب ${unit.masterplanProximity}` : null,
  ].filter(Boolean);
  if (location.length > 0) lines.push(`📍 ${location.join(' · ')}`);

  if (unit.description) lines.push(`\n${String(unit.description).slice(0, 400)}`);

  lines.push('');
  lines.push('— سييرا إستيتس | Sierra Estates New Cairo —');

  const waLink = buildWhatsAppBookingLink(unit);
  lines.push(
    waLink
      ? `📞 للحجز والمعاينة عبر واتساب: ${waLink}`
      : `📞 للتواصل: إدارة سييرا إستيتس`,
  );
  return lines.join('\n');
}

/** Compact, §21-honest spec sheet handed to Gemini — present fields only. */
function buildSpecSheet(unit: TelegramListingSpec, code: string): string {
  const fields: Array<[string, string]> = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value != null && String(value).trim() !== '') fields.push([label, String(value).trim()]);
  };
  push('unit_code', code);
  push('compound', unit.compound);
  push('zone', unit.zone);
  push('deal_type', normalizeDealType(unit.dealType));
  push('property_type', unit.unitType);
  if (Number(unit.areaSqm) > 0) push('area_sqm', String(unit.areaSqm));
  push('floor', unit.floor != null ? String(unit.floor) : null);
  push('finishing', unit.finishing);
  if (Number(unit.bedrooms) > 0) push('bedrooms', String(unit.bedrooms));
  if (Number(unit.bathrooms) > 0) push('bathrooms', String(unit.bathrooms));
  if (Number(unit.price) > 0) push('price', `${Number(unit.price).toLocaleString('en-US')} ${(unit.priceCurrency || 'EGP').toUpperCase()}`);
  push('payment_terms', unit.paymentTerms);
  if ((unit.locationHighlights ?? []).length > 0) push('location_highlights', (unit.locationHighlights ?? []).join(' | '));
  push('masterplan_proximity', unit.masterplanProximity);
  push('contact_name', unit.contactName);
  const phone = resolveContactPhone(unit);
  if (phone) push('whatsapp_booking_link', buildWhatsAppBookingLink(unit));
  push('source_description', unit.description);

  return fields.map(([k, v]) => `${k}: ${v}`).join('\n');
}

const SYSTEM_INSTRUCTION = [
  'أنت كوبي رايتر عقاري فاخر لـ "سييرا إستيتس" (Sierra Estates) في القاهرة الجديدة.',
  'مهمتك: تحويل مواصفات الوحدة إلى إعلان عربي فاخر عالي التحويل لقناة تيليجرام.',
  'التزم حرفياً بهيكل الأقسام الآتي وبترتيبه، مع سطر فارغ بين كل قسم:',
  '🏷️ كود الوحدة والكمبوند',
  '📐 المساحة والدور والتشطيب',
  '🛏️ غرف النوم و 🚿 الحمامات',
  '💰 السعر وشروط السداد',
  '📍 مميزات الموقع والقرب من المخطط الرئيسي',
  '📞 التواصل الرسمي ورابط الحجز عبر واتساب',
  'قواعد صارمة: استخدم فقط الحقائق المعطاة في المواصفات — ممنوع منعاً باتاً اختراع أي تفصيلة غير مذكورة (لا تُخترع إطلالة أو دور أو وسائل راحة أو شروط سداد).',
  'احذف القسم بالكامل إذا لم تتوفر بياناته. اكتب بلهجة عربية راقية مقنعة دون مبالغة كاذبة.',
  'لا تُضف عناوين زخرفية أو هاشتاجات من عندك. أعد النص النهائي فقط دون أي مقدمات.',
].join('\n');

/**
 * Format a listing for the Telegram channel. Gemini when configured, the
 * deterministic template otherwise (both §21-honest). Never throws — a
 * formatter failure degrades to the template and reports its source.
 */
export async function formatListingForTelegram(
  unit: TelegramListingSpec,
): Promise<FormattedListing> {
  const unitCode = resolveUnitCode(unit).code;
  const generatedAt = new Date().toISOString();

  if (!GEMINI_API_KEY) {
    return {
      caption: buildListingCaptionTemplate(unit),
      source: 'template',
      unitCode,
      generatedAt,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: FORMATTER_MODEL,
      generationConfig: { temperature: 0.45, maxOutputTokens: 900 },
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    const result = await model.generateContent(
      `مواصفات الوحدة:\n${buildSpecSheet(unit, unitCode)}\n\nاكتب إعلان القناة الآن.`,
    );
    const text = (await result.response).text().trim();
    if (text.length > 40) {
      return { caption: text, source: 'gemini', model: FORMATTER_MODEL, unitCode, generatedAt };
    }
    // Degenerate AI output → honest template rather than an empty caption.
    return {
      caption: buildListingCaptionTemplate(unit),
      source: 'template',
      unitCode,
      generatedAt,
    };
  } catch (err) {
    console.warn('[telegram-listing-formatter] Gemini formatting failed; using template:', (err as Error)?.message);
    return {
      caption: buildListingCaptionTemplate(unit),
      source: 'template',
      unitCode,
      generatedAt,
    };
  }
}

/** HTML-escaped caption (for parse_mode: HTML senders). */
export function captionAsHtml(caption: string): string {
  return escapeTelegramHtml(caption);
}
