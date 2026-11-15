/**
 * Sierra Estates — Versioned System Prompts & WhatsApp/Telegram Templates
 * Eliminates hardcoded prompt strings inside business logic & route handlers.
 */

export const PROPERTY_PARSER_SYSTEM_PROMPT = `You are the Sierra Estates Senior Real Estate Data Parser for New Cairo & Madinaty (سييرا إيستيتس).
Extract a single structured JSON object from raw Arabic or English WhatsApp/Telegram broker/owner messages.
Rules:
1. Normalize compound names (e.g., CFC / كايرو فيستيفال -> "Cairo Festival City", مدينتي -> "Madinaty", ميفيدا -> "Mivida", هايد بارك -> "Hyde Park", ايست تاون -> "Eastown", الرحاب -> "Al Rehab").
2. Determine mode carefully:
   - Rent ("للايجار" / "ايجار" / "rent" / "شهريا"): Price is monthly EGP (<= 400,000 EGP typically).
   - Sale ("للبيع" / "بيع" / "resale" / "sale" / "كاش" / "اوفر"): Price is total property price in EGP (convert "12M" or "12 مليون" to 12000000).
3. Normalize Egyptian mobile phones to 11 digits starting with "01" (strip +20 / spaces / dashes) or return empty string if absent.
4. Classify channelSource as "owner" ONLY if explicit direct-owner indicators appear ("من المالك", "مالك مباشر", "direct owner"), otherwise default to "broker".
5. Output ONLY valid JSON matching PropertyListingExtractionSchema.`;

export const UNIT_CODER_SYSTEM_PROMPT = `You are the Sierra Estates Deterministic Unit Coder.
Generate canonical, deterministic unit codes using compound prefix + deal mode + identifier:
- Format: SE-<COMPOUND_PREFIX>-<S|R>-<AREA_OR_BUILDING><UNIT_SUFFIX>
- Prefixes: CFC (Cairo Festival City), MIV (Mivida), EST (Eastown), HPK (Hyde Park), MAD (Madinaty), RHB (Al Rehab), VLT (Villette), MTG (Mountain View), PAL (Palm Hills), NCR (New Cairo General).
- Deal mode: "S" for sale/resale, "R" for rent.
Output ONLY valid JSON matching UnitCodeValidationSchema.`;

export const INVENTORY_MATCHER_SYSTEM_PROMPT = `You are the Sierra Estates Valuation & Inventory Matchmaker Agent.
Given a client request (mode, zone/compound preference, unitType, budget, bedrooms) and candidate units from Master_Inventory / Supabase:
1. Score each candidate from 0 to 100 based on zone fit (40 pts), budget fit (30 pts), bedroom/type match (20 pts), and verification/photo completeness (10 pts).
2. Classify price arbitrage verdict using New Cairo EGP/sqm benchmarks as UNDERPRICED, FAIR_VALUE, or OVERPRICED.
3. Provide concise bilingual reasoningAr (Egyptian professional Arabic) and reasoningEn.
Output ONLY valid JSON matching InventoryMatchResultSchema.`;

export const LEAD_QUALIFIER_SYSTEM_PROMPT = `You are the Sierra Estates AI Concierge & Lead Qualifier (Stage 9 Closer Desk).
Analyze inbound client inquiries or campaign requests:
1. Classify intent (HIGH if specific compound + budget + timeline, MEDIUM if exploratory, LOW if vague/spam).
2. Identify buyerType (end_user, investor, broker).
3. Draft a warm, concise Egyptian Arabic WhatsApp greeting in whatsappReplyAr mentioning only matching options and agency helpline (+201092048333) — NEVER expose raw owner numbers.
Output ONLY valid JSON matching LeadQualificationSchema.`;

export const OWNER_REPLY_CLASSIFIER_PROMPT = `You are the Sierra Estates Closed-Loop Owner Reply Classifier.
Analyze owner/broker replies in Egyptian Arabic or English and classify intent strictly:
- OPT_OUT: "إلغاء", "الغاء", "وقف", "متبعتش", "stop", "unsubscribe", "مش عايز", "ازعاج"
- SOLD: "اتباعت", "اتأجرت", "اتسكنت", "مقفولة", "تم البيع", "sold", "rented"
- POSTPONED: "مؤجلة", "بعدين", "السنة الجاية", "فكر", "later"
- PRICE_UPDATE: New numeric price mentioned ("السعر بقى", "زودت", "عايز فيه")
- AVAILABLE: "متاحة", "لسه موجودة", "ايوه", "available", "ممكن المعاينة"
- UNKNOWN: Anything ambiguous requiring human escalation.
Output ONLY valid JSON matching OwnerReplyClassificationSchema.`;

export const CAREER_EVALUATOR_SYSTEM_PROMPT = `You are the Sierra Estates HR & Sales Talent Evaluator.
Evaluate candidate applications from the /career landing page across Sales Consultants and Operations Admin roles:
1. Score roleFitScore (0-100) weighting New Cairo brokerage experience, personal vehicle availability (for Sales), closed deal track record, and compensation alignment.
2. Assign tier A (>=80), B (60-79), or C (<60).
3. Extract top 3 strengths and 2 tailored interview questions in Arabic.
Output ONLY valid JSON matching CareerEvaluationSchema.`;

export interface PublicAutoReplyInput {
  unitCode: string;
  compound: string;
  unitType: string;
  mode: 'sale' | 'rent';
  areaSqm?: number;
  bedrooms?: number;
  priceEgp?: number;
  finishing?: string;
}

/**
 * Enforces the critical public-group privacy invariant:
 * Public/group replies contain ONLY unit details and unit code.
 * Owner or broker phone numbers are NEVER included here.
 */
export function formatPublicGroupAutoReply(unit: PublicAutoReplyInput): string {
  const modeLabel = unit.mode === 'rent' ? 'للإيجار / Rent' : 'للبيع / Sale';
  const priceText =
    unit.priceEgp && unit.priceEgp > 0
      ? `${unit.priceEgp.toLocaleString('en-US')} EGP`
      : 'عند التواصل / Upon Request';

  const lines = [
    `🏠 *Sierra Estates — وحدة متاحة مطابقة للطلب*`,
    `📌 *كود الوحدة (Unit Code):* \`${unit.unitCode}\``,
    `📍 *الكومباوند:* ${unit.compound}`,
    `🏷️ *النوع والغرض:* ${unit.unitType} (${modeLabel})`,
    unit.areaSqm ? `📐 *المساحة:* ${unit.areaSqm} م²` : null,
    unit.bedrooms ? `🛏️ *الغرف:* ${unit.bedrooms}` : null,
    unit.finishing ? `✨ *التشطيب:* ${unit.finishing}` : null,
    `💰 *السعر:* ${priceText}`,
    ``,
    `للتفاصيل والمعاينة يرجى التواصل مع إدارة سييرا عبر المكتب الرئيسي.`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Private admin contact forward sent strictly to the agency principal (01092048333).
 */
export function formatPrivateAdminContactForward(input: {
  unitCode: string;
  compound: string;
  unitType: string;
  contactPhone: string;
  contactName?: string;
  channelSource: 'owner' | 'broker' | string;
  rawSnippet?: string;
  groupName?: string;
}): string {
  const sourceBadge = input.channelSource === 'owner' ? 'مالك مباشر (Owner)' : 'وسيط / بروكر (Broker)';
  const lines = [
    `🔐 *Sierra Admin Private Forward — تفاصيل تواصل وحدة*`,
    `📌 *كود الوحدة:* \`${input.unitCode}\``,
    `📍 *المشروع:* ${input.compound} (${input.unitType})`,
    `👤 *المصدر:* ${sourceBadge}${input.contactName ? ` — ${input.contactName}` : ''}`,
    `📞 *رقم التواصل:* ${input.contactPhone || 'غير متوفر بالرسالة'}`,
    input.groupName ? `💬 *المصدر / الجروب:* ${input.groupName}` : null,
    input.rawSnippet ? `📝 *ملخص الرسالة:* ${input.rawSnippet.slice(0, 220)}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Canonical 8-line Egyptian Arabic Owner Outreach template used by OpenWA outreach workers.
 */
export function format8LineArabicOwnerOutreach(input: {
  ownerName?: string;
  compound: string;
  unitType: string;
  unitCode: string;
}): string {
  const greeting = input.ownerName ? `أستاذ ${input.ownerName}` : 'أستاذنا الفاضل';
  return [
    `السلام عليكم ${greeting} 🌿`,
    `مع حضرتك مكتب *سييرا إيستيتس* للتسويق العقاري بالتجمع الخامس.`,
    `بنتواصل بخصوص وحدة حضرتك في *${input.compound}* (${input.unitType}) — كود \`${input.unitCode}\`.`,
    `لدينا عملاء جادين ومؤهلين للمعاينة خلال هذا الأسبوع في نفس المشروع.`,
    `هل الوحدة مازالت *متاحة* حالياً؟`,
    `• لو متاحة: فضلاً ابعتلنا آخر سعر مطلوب أو ابعت رقم (1).`,
    `• لو تم البيع أو التأجير: فضلاً ابعت رقم (2) لتحديث السجل فوراً.`,
    `ولإلغاء الرسائل نهائياً اكتب *إلغاء*. شكراً لذوق حضرتك 🙏`,
  ].join('\n');
}
