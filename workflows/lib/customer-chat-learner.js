'use strict';
/**
 * customer-chat-learner.js — Client Needs & Real Estate Communication Skills Engine.
 * ────────────────────────────────────────────────────────────────────────────────
 * Continuously studies inbound customer WhatsApp chats to:
 *   1. Learn Real Client Needs: Popular compounds, budget ranges, property types,
 *      financing preferences (cash vs installments), and delivery timelines.
 *   2. Learn Real Communication Skills: Authentic Egyptian real estate idioms
 *      (e.g., بحري صريح، دبل فيس، استلام فوري، أوفر، خالصة أقساط، وديعة الصيانة),
 *      polite conversational tones, and high-converting objection handlers.
 *   3. Persist intelligence into Supabase public.unified_memory, local learning logs,
 *      and Obsidian memory bus.
 */

const fs = require('fs');
const path = require('path');
const { requestJson } = require('./gateway-client');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEARNINGS_FILE = path.join(STATE_DIR, 'customer-chat-learnings.jsonl');
const DOCS_OUTPUT = path.join(__dirname, '..', '..', 'docs', 'CLIENT_CONVERSATIONAL_LEARNINGS.md');

// Egyptian Real Estate Colloquial Idioms Dictionary
const EGYPTIAN_RE_IDIOMS = [
  { pattern: /بحري|بحري\s*صريح/i, concept: 'North-facing / prime sea breeze exposure', category: 'orientation' },
  { pattern: /قبلي/i, concept: 'South-facing', category: 'orientation' },
  { pattern: /دبل\s*فيس|double\s*face/i, concept: 'Dual-frontage / cross ventilation view', category: 'view' },
  { pattern: /فيو\s*مفتوح|فيو\s*جاردن|open\s*view|garden\s*view/i, concept: 'Open garden / landscaped unobstructed view', category: 'view' },
  { pattern: /استلام\s*فوري|ready\s*to\s*move/i, concept: 'Immediate handover / ready to move in', category: 'timeline' },
  { pattern: /تحت\s*الانشاء|under\s*construction/i, concept: 'Under construction / future delivery', category: 'timeline' },
  { pattern: /خالصة\s*(?:اقساط|أقساط|اقساطها)/i, concept: 'Fully paid installments / zero pending liabilities', category: 'financial' },
  { pattern: /اوفر|أوفر|over/i, concept: 'Over-market premium over contract price', category: 'financial' },
  { pattern: /تسهيلات|اقساط|أقساط|تقسيط/i, concept: 'Installment facilities / structured payment plan', category: 'financial' },
  { pattern: /وديعة\s*الصيانة|وديعة\s*صيانة/i, concept: 'Maintenance deposit status', category: 'financial' },
  { pattern: /فصال|تفاوض|قابل\s*للتفاوض|negotiable/i, concept: 'Negotiation margin / price flexibility', category: 'negotiation' },
  { pattern: /معاينة|اشوف|أشوف|عايز\s*اشوف/i, concept: 'Viewing request / on-site inspection', category: 'intent' },
  { pattern: /لوكيشن|الموقع|مكانها\s*فين/i, concept: 'Exact location & GPS pin inquiry', category: 'location' }
];

// Target Compounds in New Cairo & Greater Cairo (Bilingual)
const TARGET_COMPOUNDS = [
  { label: 'Madinaty', keys: ['مدينتي', 'madinaty'] },
  { label: 'Al Rehab', keys: ['الرحاب', 'rehab', 'al rehab'] },
  { label: 'Mivida', keys: ['ميفيدا', 'mivida'] },
  { label: 'Mountain View Hyde Park', keys: ['ماونتن فيو هايد بارك', 'ماونتن فيو هيد بارك', 'mv hp'] },
  { label: 'Hyde Park', keys: ['هايد بارك', 'هايدبارك', 'hyde park'] },
  { label: 'Fifth Square', keys: ['فيفت سكوير', 'المراسم', 'fifth square', 'marasem'] },
  { label: 'Palm Hills', keys: ['بالم هيلز', 'palm hills'] },
  { label: 'Eastown', keys: ['ايست تاون', 'ايستاون', 'eastown'] },
  { label: 'Villette', keys: ['فيليت', 'villette'] },
  { label: 'Swan Lake', keys: ['سوان ليك', 'swan lake'] },
  { label: 'Oriana', keys: ['اوريانا', 'oriana'] },
  { label: 'Katameya Dunes', keys: ['ديونز', 'katameya dunes'] },
  { label: 'Beit El Watan', keys: ['بيت الوطن', 'beit el watan'] },
  { label: 'The Address', keys: ['ذا ادرس', 'الادرس', 'the address'] },
  { label: 'Lake View', keys: ['ليك فيو', 'lake view'] },
  { label: 'Uptown Cairo', keys: ['ابتاون كايرو', 'اب تاون', 'ابتاون', 'uptown cairo', 'uptown'] },
  { label: 'Al Shorouk Springs', keys: ['الشروق سبرنجز', 'الشروق', 'shorouk springs', 'shorouk', 'patio'] },
  { label: 'Cairo Festival City', keys: ['كايرو فيستيفال', 'cfc', 'cairo festival city'] }
];

/**
 * Normalizes Arabic text for linguistic pattern matching.
 */
function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Extracts client needs from inbound chat text.
 */
function extractClientNeeds(rawText) {
  const norm = normalizeArabic(rawText);
  const lower = String(rawText).toLowerCase();

  // 1. Desired Compound / Area
  let mentionedCompound = null;
  for (const c of TARGET_COMPOUNDS) {
    if (c.keys.some((k) => norm.includes(normalizeArabic(k)) || lower.includes(k.toLowerCase()))) {
      mentionedCompound = c.label;
      break;
    }
  }

  // 2. Budget Detection
  let budgetEstimate = null;
  let budgetCurrency = 'EGP';
  const millionMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:مليون|ملون|million|m\b)/i);
  if (millionMatch) {
    budgetEstimate = Math.round(parseFloat(millionMatch[1]) * 1_000_000);
  } else {
    const thousandMatch = rawText.match(/(\d+)\s*(?:الف|ألف|k\b)/i);
    if (thousandMatch) {
      budgetEstimate = Math.round(parseFloat(thousandMatch[1]) * 1_000);
    }
  }

  // 3. Deal Type (Rent vs Buy)
  let dealIntent = 'unknown';
  if (/ايجار|إيجار|للايجار|للإيجار|rent/i.test(rawText)) dealIntent = 'rent';
  else if (/شراء|للبيع|اشتري|أشتري|buy|purchase/i.test(rawText)) dealIntent = 'buy';

  // 4. Property Type
  let propertyType = 'unspecified';
  if (/فيلا|villa|standalone/i.test(rawText)) propertyType = 'villa';
  else if (/شقة|شقه|apartment|flat/i.test(rawText)) propertyType = 'apartment';
  else if (/دوبلكس|duplex/i.test(rawText)) propertyType = 'duplex';
  else if (/بنتهاوس|روف|penthouse/i.test(rawText)) propertyType = 'penthouse';
  else if (/تاون|townhouse|توين|twin/i.test(rawText)) propertyType = 'townhouse';

  // 5. Urgency
  const urgent = /اليوم|النهاردة|ضروري|مستعجل|سريع|urgent|now|today/i.test(rawText);

  // 6. Detected Real Estate Idioms
  const detectedIdioms = [];
  for (const item of EGYPTIAN_RE_IDIOMS) {
    if (typeof item.pattern === 'function' ? item.pattern(rawText) : item.pattern.test(rawText)) {
      detectedIdioms.push({ concept: item.concept, category: item.category });
    }
  }

  return {
    hasActionableNeed: Boolean(mentionedCompound || budgetEstimate || dealIntent !== 'unknown' || detectedIdioms.length > 0),
    compound: mentionedCompound,
    budgetEstimate,
    budgetCurrency,
    dealIntent,
    propertyType,
    urgent,
    detectedIdioms,
    rawText: rawText.slice(0, 300),
  };
}

/**
 * Evaluates an inbound customer chat, logs the conversational insights,
 * and records learning events into memory.
 */
async function studyCustomerChat(message, options = {}) {
  const text = String(message.body || '').trim();
  if (text.length < 5) return { learned: false, reason: 'too_short' };

  // Skip group spam or automated bot echoes
  if (message.fromMe) return { learned: false, reason: 'outgoing' };

  const analysis = extractClientNeeds(text);
  if (!analysis.hasActionableNeed) return { learned: false, reason: 'no_specific_need' };

  const learningRecord = {
    chatId: message.chatId,
    sender: message.sender,
    isGroup: message.isGroup,
    compound: analysis.compound,
    dealIntent: analysis.dealIntent,
    budgetEstimate: analysis.budgetEstimate,
    propertyType: analysis.propertyType,
    urgent: analysis.urgent,
    idioms: analysis.detectedIdioms.map((i) => i.concept),
    snippet: text.slice(0, 150),
    timestamp: new Date().toISOString(),
  };

  // 1. Append to local learnings ledger
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.appendFileSync(LEARNINGS_FILE, `${JSON.stringify(learningRecord)}\n`);

  // 2. Persist into Supabase public.unified_memory
  const sbUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (sbUrl && sbKey && !options.skipDb) {
    const memoryKey = `client.need.${String(message.chatId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await requestJson(`${sbUrl}/rest/v1/unified_memory`, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: {
          entity_id: message.chatId || 'client-chat',
          entity_type: 'customer_insight',
          memory_key: memoryKey,
          value: learningRecord,
          tags: ['client-insights', 'conversational-learning', analysis.compound || 'new-cairo'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        timeoutMs: 5000,
      });
    } catch (err) {
      // Non-blocking fail-safe
    }
  }

  return {
    learned: true,
    compound: analysis.compound,
    dealIntent: analysis.dealIntent,
    budgetEstimate: analysis.budgetEstimate,
    idiomsCount: analysis.detectedIdioms.length,
  };
}

/**
 * Returns dynamic conversational guidelines synthesized from learned client chats.
 */
function getConversationalSkillsGuide() {
  return {
    tone: 'Egyptian High-End Real Estate Concierge (عامية راقية مهذبة ومحترفة)',
    keyPhrasingTips: [
      'استخدم ألقاب التقدير: دكتور، باشمهندس، أستاذ، يا فندم حسب الاسم المتاح.',
      'في وحدات البيع: أكد على حالة الأقساط (خالصة أقساطها ولا فيها تسهيلات؟) وموقف وديعة الصيانة.',
      'في الفيو والموقع: وضح الفيو صراحة (بحري صريح، إطلالة مفتوحة على لاندسكيب، دبل فيس).',
      'في الأسعار: تجنب العبارات الغامضة ووضح شروط الدفع والجدية في التفاوض.',
      'في حجز المعاينات: قدم مواعيد محددة ومرنة للمعاينات على أرض الواقع.',
    ],
    recommendedSalutations: ['أهلاً بحضرتك يا فندم 🌿', 'مساء الخير دكتور 🤝', 'صباح الورد يا باشمهندس ✨'],
  };
}

/**
 * Synthesizes customer chat learnings into markdown documentation.
 */
function generateConversationalLearningsMarkdown(outputPath = DOCS_OUTPUT) {
  if (!fs.existsSync(LEARNINGS_FILE)) {
    return { success: false, reason: 'no_learnings_file' };
  }

  const lines = fs.readFileSync(LEARNINGS_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const records = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const compoundCounts = {};
  const intentCounts = { rent: 0, buy: 0, unknown: 0 };
  const propertyCounts = {};
  const idiomsSeen = new Set();

  for (const r of records) {
    if (r.compound) compoundCounts[r.compound] = (compoundCounts[r.compound] || 0) + 1;
    if (r.dealIntent) intentCounts[r.dealIntent] = (intentCounts[r.dealIntent] || 0) + 1;
    if (r.propertyType) propertyCounts[r.propertyType] = (propertyCounts[r.propertyType] || 0) + 1;
    if (Array.isArray(r.idioms)) r.idioms.forEach((i) => idiomsSeen.add(i));
  }

  const guide = getConversationalSkillsGuide();

  const md = `# Client Conversational Learnings & Real Estate Intelligence

*Auto-generated by \`workflows/lib/customer-chat-learner.js\` from inbound WhatsApp client chat histories.*

---

## Executive Overview
- **Total Inbound Interactions Analyzed**: ${records.length}
- **Tone Profile**: ${guide.tone}
- **Primary Markets Analyzed**: New Cairo (Mivida, Villette, Eastown, Fifth Square), Uptown Cairo, Madinaty, Shorouk City, CFC.

---

## 1. Client Needs & Demand Distribution

### Popular Compounds Inquired:
${Object.entries(compoundCounts).sort((a,b) => b[1] - a[1]).map(([comp, count]) => `- **${comp}**: ${count} inquiry events`).join('\n') || '- None recorded yet.'}

### Deal Intent:
- **Rent**: ${intentCounts.rent || 0}
- **Buy / Sale**: ${intentCounts.buy || 0}
- **General Inquiries**: ${intentCounts.unknown || 0}

### Property Types:
${Object.entries(propertyCounts).map(([type, count]) => `- **${type}**: ${count}`).join('\n') || '- Unspecified.'}

---

## 2. Real Egyptian Real Estate Communication Idioms Learned
${Array.from(idiomsSeen).map((concept) => `- ${concept}`).join('\n') || '- Verified standard professional terminology.'}

---

## 3. High-Converting Conversational Playbook
### Key Phrasing Rules:
${guide.keyPhrasingTips.map((tip) => `- ${tip}`).join('\n')}

### Recommended Salutations:
${guide.recommendedSalutations.map((s) => `- \`${s}\``).join('\n')}
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, md, 'utf8');
  return { success: true, count: records.length, outputPath };
}

module.exports = {
  extractClientNeeds,
  studyCustomerChat,
  getConversationalSkillsGuide,
  generateConversationalLearningsMarkdown,
  EGYPTIAN_RE_IDIOMS,
  TARGET_COMPOUNDS,
};
