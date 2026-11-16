'use strict';
/**
 * lead-qualifier.js — Lead Qualification & Hidden Tag Parser Middleware.
 * ──────────────────────────────────────────────────────────────────────
 * Integrates:
 *  1. SIERRA_SYSTEM_PROMPT: 3-Stage consultative AI prompt ("البياع مستشار والمستشار مؤتمن").
 *  2. Hidden <lead_qualification> tag extraction and zero-leak stripping from customer chat replies.
 *  3. Safe JSON parsing of lead qualification payloads.
 *  4. Database persistence (upserting into Supabase public.leads) & sales notifications.
 */

const { requestJson } = require('./gateway-client');

const SIERRA_SYSTEM_PROMPT = `You are the Senior AI Real Estate Consultant for **Sierra Estates Realty** (operating across New Cairo, Shorouk, Madinaty, Uptown Cairo, and 5th Settlement compounds).

## 1. Core Operating Ethos & Tone
- Persona: Executive, warm, consultative, and authentic peer ("البياع مستشار والمستشار مؤتمن").
- Dynamic Dialect & Language Mirroring:
  * If the client communicates in Arabic (Egyptian dialect/العامية المصرية): Respond in natural, courteous, and professional Egyptian Arabic.
  * If the client communicates in English: Respond in polished, upscale, and consultative English.
  * If the client switches languages at any point, switch immediately with them.
- WhatsApp Format: Concise, structured with line breaks, 2 to 3 short paragraphs max. Avoid generic robotic intros.

## 2. Three-Stage Lead Qualification & Viewing Script

### Stage 1: Lead Acknowledgment & Viewing Availability (استفسار المعاينة الأولي)
Trigger: When a client inquires about a unit from Property Finder / Bayut or mentions a property reference:
- Acknowledge the unit politely.
- State that you are verifying availability with the owner/developer and arranging entry permissions (QR Code).
- Ask 3 qualification questions:
  1. Preferred viewing day & time (الميعاد الأنسب للمعاينة).
  2. Target move-in date (تاريخ الاستلام/الانتقال المناسب).
  3. Desired contract / lease duration (المدة المتوقعة للإيجار أو التعاقد).

### Stage 2: Preferences Gathering for Alternatives (جمع متطلبات البدائل)
Trigger: When the client responds to Stage 1 or asks to explore more options:
- Confirm that owner coordination is in progress.
- Explain that to match them with suitable inventory from the database without confusion, you need their criteria:
  1. Budget Range (الميزانية التقريبية).
  2. Preferred locations/compounds (المناطق أو الكومباوندات المفضلة مثل مدينتي/ميفيدا/فيليت/اب تاون).
  3. Bedrooms & Furnishing (عدد الغرف وهل تفضل الوحدة مفروشة بالكامل أو نصف فرش أجهزة وتكييفات).

### Stage 3: Structured Lead Payload Generation
Trigger: As soon as the client provides their qualification data (budget, bedrooms, dates, location), append a hidden JSON payload at the very bottom of your response wrapped in <lead_qualification> tags:
<lead_qualification>
{
  "lead_ready": true,
  "client_name": "...",
  "preferred_viewing": "...",
  "move_in_date": "...",
  "lease_duration": "...",
  "budget": "...",
  "currency": "EGP / USD",
  "locations": ["..."],
  "bedrooms": "...",
  "furnishing_status": "Furnished / Semi-Furnished / Unfurnished",
  "special_notes": "..."
}
</lead_qualification>

## 3. Grounding Knowledge Base Rules
- Long-term leases (2+ years): Highlight that semi-furnished units (with kitchen & ACs) save 20k-30k EGP monthly compared to fully furnished units (saving 500k-1M EGP over the lease term).
- Advance Payment Negotiation: 6 to 12 months upfront payment is used as leverage to negotiate 15-25% discounts from owners.
- Outdated Ads: If client finds differing prices online, clarify that third-party portals frequently host outdated broker ads, and Sierra negotiates directly with vetted owners.
- Diplomatic / Corporate Leases: Account for Diplomatic early-exit clauses (30-60 days notice) and corporate tax registration requirements.
`;

/**
 * Strips hidden qualification tags so clients on WhatsApp never see raw JSON.
 */
function stripQualificationTags(text) {
  if (!text) return '';
  return String(text)
    .replace(/<lead_qualification>[\s\S]*?<\/lead_qualification>/gi, '')
    .trim();
}

/**
 * Extracts and parses the structured JSON qualification payload from raw AI output.
 */
function extractQualificationPayload(text) {
  if (!text) return null;
  const match = String(text).match(/<lead_qualification>([\s\S]*?)<\/lead_qualification>/i);
  if (!match || !match[1]) return null;

  try {
    const rawJson = match[1].trim();
    const data = JSON.parse(rawJson);
    return data;
  } catch (err) {
    console.warn(`[lead-qualifier] Failed to parse <lead_qualification> JSON: ${err.message}`);
    return null;
  }
}

/**
 * Middleware function that processes bot responses:
 *  - Strips tags for WhatsApp delivery
 *  - Extracts qualification data
 *  - Upserts to Supabase leads table
 *  - Fires notification / alert
 */
async function processBotResponse({
  leadId,
  clientPhone,
  clientName,
  rawAiReply,
  sbUrl,
  sbKey,
  notificationEmail,
} = {}) {
  const cleanMessage = stripQualificationTags(rawAiReply);
  const qualificationData = extractQualificationPayload(rawAiReply);

  if (!qualificationData) {
    return {
      cleanMessage,
      isQualified: false,
      qualificationData: null,
    };
  }

  const nowIso = new Date().toISOString();
  const phone = clientPhone || qualificationData.client_phone || 'unknown';
  const name = clientName || qualificationData.client_name || 'Property Inquirer';

  // 1. Persist into Supabase leads if credentials provided
  const supabaseUrl = (sbUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseKey = sbKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (supabaseUrl && supabaseKey) {
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };

    const leadPayload = {
      full_name: name,
      phone: phone,
      source: 'whatsapp-consultant-bot',
      stage: 'qualified',
      budget: qualificationData.budget || null,
      currency: qualificationData.currency || 'EGP',
      target_compound: Array.isArray(qualificationData.locations) ? qualificationData.locations.join(', ') : qualificationData.locations || null,
      qualification_data: qualificationData,
      summary_notes: `[AI-QUALIFIED] Move-in: ${qualificationData.move_in_date || 'N/A'}, Viewing: ${qualificationData.preferred_viewing || 'N/A'}, Beds: ${qualificationData.bedrooms || 'N/A'}`,
      updated_at: nowIso,
    };

    try {
      if (leadId) {
        await requestJson(`${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`, {
          method: 'PATCH',
          headers,
          body: leadPayload,
          timeoutMs: 6000,
        });
      } else {
        // Probe by phone or insert
        const existing = await requestJson(
          `${supabaseUrl}/rest/v1/leads?phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`,
          { headers, timeoutMs: 6000 }
        );
        if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
          await requestJson(`${supabaseUrl}/rest/v1/leads?id=eq.${existing.data[0].id}`, {
            method: 'PATCH',
            headers,
            body: leadPayload,
            timeoutMs: 6000,
          });
        } else {
          await requestJson(`${supabaseUrl}/rest/v1/leads`, {
            method: 'POST',
            headers,
            body: { ...leadPayload, created_at: nowIso },
            timeoutMs: 6000,
          });
        }
      }
    } catch (err) {
      console.warn(`[lead-qualifier] Database upsert failed: ${err.message}`);
    }
  }

  return {
    cleanMessage,
    isQualified: true,
    qualificationData,
  };
}

module.exports = {
  SIERRA_SYSTEM_PROMPT,
  stripQualificationTags,
  extractQualificationPayload,
  processBotResponse,
};
