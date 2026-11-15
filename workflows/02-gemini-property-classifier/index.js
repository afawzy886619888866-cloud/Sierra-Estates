'use strict';

/**
 * Workflow 02: Gemini Property Classifier (Phase 3)
 * Runs deterministic Arabic pre-filter rules BEFORE Gemini 2.5 Flash extraction.
 * - Confidence >= 0.85 (and clear mode): auto-publishes to STAGING.
 * - Confidence < 0.85 (or ambiguous mode): marks REVIEW_REQUIRED and dispatches
 *   a 1-tap Telegram inline-button ("Rent or Sale?") confirmation message.
 */

const { preFilterArabicListing } = require('../../packages/arabic-nlp');

const CONFIDENCE_THRESHOLD = Number(process.env.CLASSIFIER_CONFIDENCE_THRESHOLD || '0.85');

async function callGeminiStructuredExtraction(rawText, preFilter, fetchImpl = fetch) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = [
    'Extract New Cairo real estate listing JSON from this message.',
    `Pre-filter hints: mode=${preFilter.mode || 'unknown'}, intent=${preFilter.intent}, role=${preFilter.advertiserRole}, area=${preFilter.areaSqm || ''}, price=${preFilter.priceEgp || ''}.`,
    'Return strict JSON with keys: mode ("rent"|"sale"|null), intent ("supply"|"demand"), compound (string), propertyType (string), areaSqm (number|null), bedrooms (number|null), priceEgp (number|null), confidence (0..1).',
    `Text:\n${String(rawText || '').slice(0, 2000)}`,
  ].join('\n');

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function sendTelegramModeConfirmation({
  unitId,
  rawText,
  confidence,
  fetchImpl = fetch,
}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (
    process.env.ROLE_MANAGEMENT_CHAT_ID ||
    process.env.UNASSIGNED_DISPATCH_FALLBACK ||
    process.env.TELEGRAM_ADMIN_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    ''
  ).trim();

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Rent (إيجار)', callback_data: `confirm_mode:${unitId}:rent` },
        { text: 'Sale (بيع)', callback_data: `confirm_mode:${unitId}:sale` },
      ],
    ],
  };

  if (!token || !chatId) {
    return { sent: false, reason: 'telegram_not_configured', reply_markup: replyMarkup };
  }

  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `⚠️ REVIEW_REQUIRED (${Math.round(confidence * 100)}% confidence)\nUnit: ${unitId}\nIs this Rent or Sale?\n\n${String(rawText || '').slice(0, 400)}`,
        reply_markup: replyMarkup,
      }),
    });
    return { sent: res.ok, status: res.status, chatId, reply_markup: replyMarkup };
  } catch (err) {
    return { sent: false, error: err.message, reply_markup: replyMarkup };
  }
}

/**
 * Classify listing text deterministically first, invoke Gemini 2.5 Flash when
 * available/needed, and decide STAGING auto-publish vs REVIEW_REQUIRED prompt.
 */
async function classifyPropertyListing({
  unitId = `UN-${Date.now().toString(36).toUpperCase()}`,
  rawText,
  geminiExtractFn = null,
  telegramConfirmFn = null,
  skipGemini = false,
}) {
  const preFilter = preFilterArabicListing(rawText);

  let aiResult = null;
  if (!skipGemini && !preFilter.autoPublishEligible) {
    aiResult = geminiExtractFn
      ? await geminiExtractFn(rawText, preFilter)
      : await callGeminiStructuredExtraction(rawText, preFilter);
  }

  const resolvedMode = preFilter.mode || aiResult?.mode || null;
  const resolvedIntent = preFilter.intent || aiResult?.intent || 'supply';
  const combinedConfidence = aiResult && typeof aiResult.confidence === 'number'
    ? Math.max(preFilter.confidence, aiResult.confidence)
    : preFilter.confidence;

  const isAutoPublish =
    Boolean(resolvedMode) &&
    !preFilter.modeConflict &&
    combinedConfidence >= CONFIDENCE_THRESHOLD;

  let confirmation = null;
  if (!isAutoPublish) {
    confirmation = telegramConfirmFn
      ? await telegramConfirmFn({ unitId, rawText, confidence: combinedConfidence })
      : await sendTelegramModeConfirmation({ unitId, rawText, confidence: combinedConfidence });
  }

  return {
    unitId,
    preFilter,
    aiResult,
    mode: resolvedMode,
    intent: resolvedIntent,
    advertiserRole: preFilter.advertiserRole,
    confidence: Number(combinedConfidence.toFixed(2)),
    publishStatus: isAutoPublish ? 'STAGING' : 'REVIEW_REQUIRED',
    reviewStatus: isAutoPublish ? 'AUTO_PUBLISHED' : 'REVIEW_REQUIRED',
    confirmation,
  };
}

if (require.main === module) {
  const sample = process.argv.slice(2).join(' ') || 'شقة للبيع في ميفيدا 180م 3 غرف السعر 10 مليون كاش 01012345678';
  classifyPropertyListing({ rawText: sample, skipGemini: true })
    .then((res) => {
      console.log(`SUMMARY ${JSON.stringify({ status: res.publishStatus, mode: res.mode, confidence: res.confidence })}`);
    })
    .catch((err) => {
      console.error(`02-gemini-property-classifier FAILED: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  CONFIDENCE_THRESHOLD,
  preFilterArabicListing,
  callGeminiStructuredExtraction,
  sendTelegramModeConfirmation,
  classifyPropertyListing,
};
