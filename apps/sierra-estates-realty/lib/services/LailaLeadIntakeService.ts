/**
 * LailaLeadIntakeService.ts
 *
 * Laila — Sierra Estates' bilingual (Egyptian Arabic + English) WhatsApp lead intake agent.
 *
 * WORKFLOW:
 *  Stage 0 → Greeting & Language Detection
 *  Stage 1 → Intent (Buy / Rent / Invest / List / Just Browsing)
 *  Stage 2 → Compound Preference & Area
 *  Stage 3 → Unit Type & Size
 *  Stage 4 → Budget & Payment Method
 *  Stage 5 → Timeline & Urgency
 *  Stage 6 → AI Match & Recommendation Dispatch
 *
 * The service is stateless per-call — conversation state lives in Supabase
 * table `whatsapp_lead_sessions` (keyed by phone).
 *
 * Integration:
 *  - Called from /api/whatsapp/webhook when the sender is NOT a broker group.
 *  - After Stage 6, hands off to matching-engine.ts and sends shortlist via WhatsApp.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getRecord, insertRecord, upsertRecord, listRecords } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { sharedMemory } from '@sierra-estates/memory-engine';

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || ''
);

/* ─────────────────────────────────────────────────────── types ─── */

export type IntakeStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IntakeSession {
  phone: string;
  lang: 'ar' | 'en';
  stage: IntakeStage;
  data: {
    intent?: 'buy' | 'rent' | 'invest' | 'list' | 'browse';
    compounds?: string[];
    unitType?: string;
    bedrooms?: number;
    areaMin?: number;
    areaMax?: number;
    budgetEGP?: number;
    paymentMethod?: 'cash' | 'installments' | 'mortgage' | 'flexible';
    deliveryDate?: string;
    urgency?: 'immediate' | 'within3months' | 'within6months' | 'casual';
    clientName?: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────────────────────── static copy ─── */

/** All Q&A copy for both languages. */
const COPY = {
  greeting: {
    ar: `أهلاً وسهلاً! 🏡✨\nأنا *ليلى* — مستشارتك العقارية الشخصية من *Sierra Estates*.\n\nلأقدملك أفضل وحدة بالظبط بحسب احتياجك — ممكن تقولي:\n\nهل تبحث عن:\n1️⃣ شراء وحدة\n2️⃣ إيجار\n3️⃣ استثمار\n4️⃣ عرض وحدتك للبيع أو الإيجار\n5️⃣ بس بتتفرج 😄`,
    en: `Hello! 🏡✨\nI'm *Laila* — your personal real estate advisor at *Sierra Estates*.\n\nTo find your perfect match, please tell me:\n\nAre you looking to:\n1️⃣ Buy a unit\n2️⃣ Rent\n3️⃣ Invest\n4️⃣ List your property\n5️⃣ Just browsing 😄`,
  },
  intent_ack: {
    ar: (intent: string) => `ممتاز! 🎯 سأساعدك في البحث عن أفضل ${intent === 'rent' ? 'إيجار' : intent === 'invest' ? 'استثمار' : 'وحدة'}.\n\n*الخطوة التالية:* في أي مجمع أو منطقة تفضل؟ (مثلاً: ميفيدا، هايد بارك، ماونتن فيو، مدينتي، أبتاون...)`,
    en: (intent: string) => `Great! 🎯 I'll help you find the best ${intent === 'rent' ? 'rental' : intent === 'invest' ? 'investment' : 'property'}.\n\n*Next:* Which compound or area do you prefer? (e.g. Mivida, Hyde Park, Mountain View, Madinaty, Uptown...)`,
  },
  unit_type_q: {
    ar: `تمام! وما نوع الوحدة اللي تبحث عنها؟\n\n1️⃣ شقة\n2️⃣ فيلا / توين هاوس\n3️⃣ دوبلكس / بنتهاوس\n4️⃣ استوديو\n5️⃣ شاليه`,
    en: `Got it! What type of unit are you looking for?\n\n1️⃣ Apartment\n2️⃣ Villa / Twin House\n3️⃣ Duplex / Penthouse\n4️⃣ Studio\n5️⃣ Chalet`,
  },
  bedrooms_q: {
    ar: `وكام غرفة نوم؟ (1، 2، 3، 4+)`,
    en: `How many bedrooms? (1, 2, 3, 4+)`,
  },
  budget_q: {
    ar: `ممتاز! 💰\nما هو الميزانية المتاحة لك؟\n\nوهل الدفع:\n1️⃣ كاش\n2️⃣ تقسيط مع المطور\n3️⃣ تمويل عقاري (بنك)\n4️⃣ مرن حسب العرض`,
    en: `Great! 💰\nWhat's your budget range?\n\nAnd preferred payment:\n1️⃣ Cash\n2️⃣ Developer installments\n3️⃣ Mortgage / Bank\n4️⃣ Flexible`,
  },
  timeline_q: {
    ar: `آخر سؤال وبدأنا! ⏳\n\nإيه توقيت التسليم أو الانتقال المناسب ليك؟\n\n1️⃣ فوري / جاهز للاستلام\n2️⃣ خلال 3 شهور\n3️⃣ خلال 6 شهور\n4️⃣ مش مستعجل`,
    en: `Last question! ⏳\n\nWhen do you need the unit or move in?\n\n1️⃣ Immediately / Ready to move\n2️⃣ Within 3 months\n3️⃣ Within 6 months\n4️⃣ No rush`,
  },
  searching: {
    ar: `⚙️ ممتاز! بفحص المخزون دلوقتي وبانتقي أفضل الوحدات المطابقة ليك...\n\n*انتظر ثوانٍ* 🔍`,
    en: `⚙️ Perfect! Scanning our master inventory for your best matches...\n\n*One moment* 🔍`,
  },
  no_match: {
    ar: `🙏 مش لاقيين وحدة متاحة بالمواصفات دي دلوقتي، بس هنتواصل معاك لما تنزل وحدة مناسبة.\n\nأو تحب تعدّل المواصفات؟`,
    en: `🙏 No exact matches available right now, but we'll notify you as soon as something comes in.\n\nWould you like to adjust your criteria?`,
  },
  list_property: {
    ar: `يسعدنا نسوّق وحدتك! 🏠\n\nمحتاج منك:\n• اسم المجمع\n• المساحة والغرف\n• السعر المطلوب\n• تشطيب (تشطيب كامل / نص تشطيب / عظم)\n• صور لو متاحة\n\nابعتلنا التفاصيل وهنرد عليك فوراً 🎯`,
    en: `We'd love to market your property! 🏠\n\nPlease share:\n• Compound name\n• Area & bedrooms\n• Asking price\n• Finishing level\n• Photos if available\n\nSend us the details and we'll respond immediately 🎯`,
  },
  browse_ack: {
    ar: `مشكلة مش عندك! 😄 أنا هنا لما تحتاجني.\n\nلو حابب تشوف أفضل عروضنا في نيو كايرو اكتب "*عروض*" وهبعتلك حالاً.`,
    en: `No problem! 😄 I'm here whenever you need me.\n\nType "*listings*" anytime to see our latest New Cairo showcase.`,
  },
};

/* ────────────────────────────────────── session helpers ─── */

const TABLE = 'whatsapp_lead_sessions';

async function loadSession(phone: string): Promise<IntakeSession | null> {
  try {
    const row = await getRecord<IntakeSession>(TABLE, phone, 'phone');
    return row ?? null;
  } catch {
    return null;
  }
}

async function saveSession(session: IntakeSession): Promise<void> {
  await upsertRecord(TABLE, { ...session, updatedAt: new Date().toISOString() }, 'phone');
}

function newSession(phone: string, lang: 'ar' | 'en'): IntakeSession {
  return {
    phone,
    lang,
    stage: 0,
    data: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ─────────────────────────────────── language detection ─── */

function detectLang(text: string, phone: string): 'ar' | 'en' {
  // Arabic Unicode range
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars > 2) return 'ar';
  // Egyptian (+20) → Arabic by default
  if (phone.startsWith('+20') || phone.startsWith('20')) return 'ar';
  return 'en';
}

/* ─────────────────────────────────────── NLP parser ─── */

async function parseUserInput(
  text: string,
  stage: IntakeStage,
  lang: 'ar' | 'en'
): Promise<Partial<IntakeSession['data']>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are parsing a WhatsApp real estate inquiry message from an Egyptian client.
Language detected: ${lang === 'ar' ? 'Arabic' : 'English'}
Current intake stage: ${stage}
User message: "${text}"

Extract ONE or more of the following JSON fields matching stage ${stage}:
Stage 1 → intent: "buy" | "rent" | "invest" | "list" | "browse"
Stage 2 → compounds: string[] (compound names), e.g. ["Mivida","Hyde Park"]
Stage 3 → unitType: "apartment"|"villa"|"townhouse"|"duplex"|"penthouse"|"studio"|"chalet", bedrooms: number
Stage 4 → budgetEGP: number (in EGP), paymentMethod: "cash"|"installments"|"mortgage"|"flexible"
Stage 5 → urgency: "immediate"|"within3months"|"within6months"|"casual", deliveryDate: string

Also always try to extract: clientName: string (if mentioned)

Respond ONLY with a valid JSON object with the relevant fields. No explanation.`;

  try {
    const res = await model.generateContent(prompt);
    const raw = res.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/* ─────────────────────────── unit matching & recommendation ─── */

async function buildRecommendationMessage(
  session: IntakeSession
): Promise<string> {
  const { data, lang } = session;

  try {
    // Fetch best matching units from inventory
    const units = await listRecords<{
      id: string;
      title: string;
      compound: string;
      price: number;
      bedrooms: number;
      type: string;
      area: number;
      finishing: string;
      hasPhoto: boolean;
      status: string;
      isOwner?: boolean;
    }>('units', {
      where: [{ column: 'status', value: 'available' }],
      limit: 50,
    });

    // Also pull latest direct-owner units from Shared Memory Bus RAG
    try {
      const ownerMemories = await sharedMemory.search('', ['owner_unit']);
      for (const mem of ownerMemories) {
        const d = (mem.value as any)?.data || mem.value;
        if (d && (d.compound || d.priceEgp)) {
          units.unshift({
            id: d.sierraCode || mem.id,
            compound: d.compound || 'New Cairo',
            title: `${d.compound} (${d.propertyType || 'Apartment'})`,
            price: d.priceEgp || d.price || 0,
            area: d.areaSqm || d.area_sqm || 0,
            bedrooms: d.bedrooms || 3,
            type: d.propertyType || d.type || 'Apartment',
            finishing: d.finishing || 'Semi-Finished',
            hasPhoto: true,
            status: 'available',
            isOwner: true,
          });
        }
      }
    } catch {}

    // Score each unit
    const scored = units
      .map((u) => {
        let score = 0;

        // Direct Owner Golden Deal bonus
        if (u.isOwner) score += 25;

        // Compound match
        if (data.compounds?.length) {
          const nameMatch = data.compounds.some(
            (c) =>
              u.compound?.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(u.compound?.toLowerCase() || '')
          );
          if (nameMatch) score += 40;
        } else {
          score += 20; // no preference = any compound is ok
        }

        // Budget match
        if (data.budgetEGP && u.price) {
          const ratio = u.price / data.budgetEGP;
          if (ratio <= 1.05) score += 30;
          else if (ratio <= 1.2) score += 15;
        } else {
          score += 15;
        }

        // Unit type
        if (data.unitType && u.type?.toLowerCase().includes(data.unitType.toLowerCase())) {
          score += 20;
        }

        // Bedrooms
        if (data.bedrooms && u.bedrooms === data.bedrooms) score += 10;

        // Photo bonus
        if (u.hasPhoto) score += 5;

        return { ...u, score };
      })
      .filter((u) => u.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return lang === 'ar' ? COPY.no_match.ar : COPY.no_match.en;
    }

    const lines: string[] = [];

    if (lang === 'ar') {
      lines.push(`🎯 *وجدت لك ${scored.length} وحدة مثالية!*\n`);
    } else {
      lines.push(`🎯 *Found ${scored.length} perfect matches for you!*\n`);
    }

    scored.forEach((u, i) => {
      const priceM = u.price ? `${(u.price / 1_000_000).toFixed(1)}M EGP` : 'TBD';
      const ownerBadge = u.isOwner
        ? (lang === 'ar' ? '   💎 *مباشر من المالك (بدون عمولة)*\n' : '   💎 *Direct Owner Deal (0% Commission)*\n')
        : '';
      if (lang === 'ar') {
        lines.push(
          `*${i + 1}. ${u.compound || 'New Cairo'}*\n` +
          ownerBadge +
          `   📐 ${u.area || '?'} م²  •  🛏️ ${u.bedrooms || '?'} غرف\n` +
          `   💰 ${priceM}\n` +
          `   ${u.hasPhoto ? '📷 صور متاحة' : '📋 بيانات فقط'}\n`
        );
      } else {
        lines.push(
          `*${i + 1}. ${u.compound || 'New Cairo'}*\n` +
          ownerBadge +
          `   📐 ${u.area || '?'} sqm  •  🛏️ ${u.bedrooms || '?'} bed\n` +
          `   💰 ${priceM}\n` +
          `   ${u.hasPhoto ? '📷 Photos available' : '📋 Data listing only'}\n`
        );
      }
    });

    if (lang === 'ar') {
      lines.push(`\nتحب تحجز معاينة أو تشوف التفاصيل؟ رد بـ "*معاينة*" وهننسق معاك فوراً! 🔑`);
    } else {
      lines.push(`\nWant a viewing or more details? Reply "*viewing*" and we'll arrange it immediately! 🔑`);
    }

    // Save qualified lead to CRM
    await upsertRecord('leads', {
      phone: session.phone,
      channel: 'whatsapp',
      status: 'matched',
      aiProfiling: {
        intent: data.intent,
        preferences: {
          compound: data.compounds?.join(', ') || 'Any',
          unitType: data.unitType,
          budget: data.budgetEGP,
          urgency: data.urgency,
          bedrooms: data.bedrooms,
          paymentMethod: data.paymentMethod,
        },
        topMatches: scored.map((u) => ({ unitId: u.id, score: u.score, title: u.title })),
        qualifiedAt: new Date().toISOString(),
      },
      leadScore: Math.min(95, 50 + (scored[0]?.score ?? 0)),
      summaryNotes: `Intake via Laila. Intent: ${data.intent}. Budget: ${data.budgetEGP ? `${(data.budgetEGP / 1_000_000).toFixed(1)}M EGP` : 'N/A'}. Compounds: ${data.compounds?.join(', ') || 'flexible'}. Urgency: ${data.urgency || 'N/A'}.`,
    }, 'phone');

    // Broadcast to SharedMemory for Stage-9 Closer to pick up
    await sharedMemory.write(
      `lead:${session.phone}:intake_complete`,
      {
        phone: session.phone,
        lang: session.lang,
        data: session.data,
        matchedUnits: scored.slice(0, 3),
        qualifiedAt: new Date().toISOString(),
      },
      { author: 'laila', tags: ['lead_qualified', 'intake_complete', session.phone] }
    ).catch(() => {});

    return lines.join('\n');
  } catch (err) {
    logger.error('[Laila] Matching error:', err);
    return lang === 'ar'
      ? `🙏 يتم مراجعة المخزون... سيتواصل معك مستشارنا فوراً بأفضل الخيارات.`
      : `🙏 Reviewing inventory... our advisor will reach out shortly with the best options.`;
  }
}

/* ════════════════════════════════════ MAIN ENTRY ════════════════════════════════════ */

/**
 * Process an inbound WhatsApp message through the Laila intake flow.
 * Returns the reply text to send back to the user.
 */
export async function processLailaIntake(
  message: string,
  phone: string
): Promise<string> {
  const lang = detectLang(message, phone);
  let session = await loadSession(phone) ?? newSession(phone, lang);

  // Sync language if first message
  if (session.stage === 0) {
    session.lang = lang;
  }

  logger.info(`[Laila] Stage ${session.stage} | ${phone} | msg: "${message.slice(0, 60)}"`);

  const isAr = session.lang === 'ar';

  // ── Stage 0: greeting (first contact or reset) ──────────────────
  if (session.stage === 0) {
    session.stage = 1;
    await saveSession(session);
    return isAr ? COPY.greeting.ar : COPY.greeting.en;
  }

  // Parse user input for current stage
  const parsed = await parseUserInput(message, session.stage, session.lang);
  Object.assign(session.data, parsed);

  let reply = '';

  switch (session.stage) {
    case 1: {
      // Intent stage
      const intent = parsed.intent;
      if (intent === 'list') {
        reply = isAr ? COPY.list_property.ar : COPY.list_property.en;
        session.stage = 0; // reset after collecting listing info
        break;
      }
      if (intent === 'browse') {
        reply = isAr ? COPY.browse_ack.ar : COPY.browse_ack.en;
        session.stage = 0;
        break;
      }
      if (!intent) {
        // Re-ask
        reply = isAr ? COPY.greeting.ar : COPY.greeting.en;
        break;
      }
      session.stage = 2;
      reply = isAr ? COPY.intent_ack.ar(intent) : COPY.intent_ack.en(intent);
      break;
    }

    case 2: {
      // Compound/area stage
      session.stage = 3;
      reply = isAr ? COPY.unit_type_q.ar : COPY.unit_type_q.en;
      break;
    }

    case 3: {
      // Unit type + bedrooms
      session.stage = 4;
      reply = isAr ? COPY.budget_q.ar : COPY.budget_q.en;
      break;
    }

    case 4: {
      // Budget + payment
      session.stage = 5;
      reply = isAr ? COPY.timeline_q.ar : COPY.timeline_q.en;
      break;
    }

    case 5: {
      // Timeline — trigger matching
      session.stage = 6;
      await saveSession(session);
      // Send "searching" message first
      reply = isAr ? COPY.searching.ar : COPY.searching.en;
      // Schedule async match (fire and forget — caller sends this then sends matches next)
      buildRecommendationMessage(session).then(async (matchMsg) => {
        // Store matches in session so next ping from the webhook can deliver it
        session.data.notes = matchMsg;
        session.stage = 0; // allow re-entry for next cycle
        await saveSession(session);
        // Write to shared memory for webhook to pick up and dispatch
        await sharedMemory.write(
          `lead:${phone}:pending_reply`,
          { phone, message: matchMsg, readyAt: new Date().toISOString() },
          { author: 'laila', tags: ['pending_reply', phone] }
        ).catch(() => {});
      }).catch(logger.error);
      break;
    }

    case 6: {
      // Deliver pending matches if ready
      const pendingKey = `lead:${phone}:pending_reply`;
      const pending = await sharedMemory.read(pendingKey).catch(() => null) as { message?: string } | null;
      if (pending?.message) {
        reply = pending.message;
        session.stage = 0;
        await sharedMemory.delete?.(pendingKey).catch(() => {});
      } else {
        reply = isAr
          ? `⏳ لسه بفحص المخزون... دقيقة وسأشارك معاك أفضل الوحدات.`
          : `⏳ Still scanning inventory... one moment, I'll share the best matches shortly.`;
      }
      break;
    }

    default:
      session.stage = 0;
      reply = isAr ? COPY.greeting.ar : COPY.greeting.en;
  }

  await saveSession(session);
  return reply;
}

/**
 * Reset a session (e.g. when client types "reset" or "ابدأ من جديد")
 */
export async function resetLailaSession(phone: string): Promise<string> {
  const session = newSession(phone, 'ar');
  await saveSession(session);
  return COPY.greeting.ar;
}
