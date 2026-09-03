 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — ANTIGRAVITY INTELLIGENCE AGENT
 * The neural bridge between the Telegram Bot and the Project Engines.
 */

import { GoogleAIService } from '../server/google-ai';
import { getRecord, getSupabaseAdmin, insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, } from '../models/schema';
import { generateOptionsPackage } from './sales-engine';
import { runMatchingForLead } from './matching-engine';
import { assessLegalRisk, generateLegalSummary } from './legal-brain';
import { extractProfileFromChat } from './profiling-service';







export async function processAgentCommand(chatId, text) {
  const ADMIN_ID = process.env.TELEGRAM_CHAT_ID ? parseInt(process.env.TELEGRAM_CHAT_ID) : null;

  // --- MODE A: EXECUTIVE MODE (ADMIN) ---
  if (chatId === ADMIN_ID) {
    // Detect Intent for Admin Commands
    const intent = await detectIntent(text);

    if (!intent || intent.type === 'unknown') {
      return await handleGeneralQuery(text);
    }

    try {
      switch (intent.type) {
        case 'analyze_lead':
          return await handleAnalyzeLead(intent.params.name);
        case 'generate_proposal':
          return await handleGenerateProposal(intent.params.name, text);
        case 'check_listing':
          return await handleCheckListing(intent.params.identifier);
        case 'general_query':
          return await handleGeneralQuery(text);
        default:
          return { message: "Intent recognized but not yet implemented.", success: false };
      }
    } catch (err) {
      console.error("Agent execution failed:", err);
      return { message: `Operational Failure: ${err.message}`, success: false };
    }
  }

  // --- MODE B: STAKEHOLDER MODE (CONCIERGE) ---
  // In this mode, Antigravity acts as the "Matchmaker" (S6-S8)
  return await handleStakeholderInterview(chatId, text);
}

/**
 * Uses Gemini to parse natural language into structured intent.
 */
async function detectIntent(text) {
  const systemPrompt = `You are the Sierra Estates Intent Dispatcher.
Analyze the user's message and determine their intent.
Available Intents:
- analyze_lead: User wants to see a summary of a lead's profile/preferences. (Params: name)
- generate_proposal: User wants to create a new proposal/options package for a lead. (Params: name)
- check_listing: User wants status/legal info for a property/listing. (Params: identifier)
- general_query: User is asking a general question about the project or real estate.

Format: JSON only: {"type": "intent_name", "params": {}}`;

  try {
    const data = await GoogleAIService.chatCompletions(
      'antigravity', 'detect-intent',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      { model: 'gemini-1.5-flash', temperature: 0 }
    );

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { type: 'unknown' };
  } catch (err) {
    console.error("[Antigravity] Intent detection failed:", err);
    return { type: 'unknown' };
  }
}

/**
 * The lead's display name. The column is `full_name`; older documents carried
 * `name`, and the admin API still speaks `name` to the client, so both are
 * accepted here.
 */
function stakeholderName(lead) {
  return _nullishCoalesce(_nullishCoalesce((lead ).fullName, () => ( (lead ).name)), () => ( ''));
}

/**
 * Firestore emulated a prefix search with `where('name', '>=', name)`, which
 * actually matched everything ordered at or after it. `ilike` is the honest
 * version of what that was reaching for.
 */
async function findStakeholderByName(name) {
  const rows = await listRecords(COLLECTIONS.stakeholders, {
    where: [{ column: 'fullName', op: 'ilike', value: `${name}%` }],
    limit: 1,
  });
  return _nullishCoalesce(rows[0], () => ( null));
}

async function handleAnalyzeLead(name) {
  const lead = await findStakeholderByName(name);
  if (!lead) return { message: `Stakeholder "${name}" not found.`, success: false };

  // Trigger matching just in case
  await runMatchingForLead(lead.id);

  // Re-fetch with matches
  const updatedLead = await _asyncNullishCoalesce((await getRecord(COLLECTIONS.stakeholders, lead.id)), async () => ( lead));

  const summary = `
<b>👤 Stakeholder Profile: ${stakeholderName(updatedLead)}</b>
<b>Budget:</b> ${updatedLead.budget} - ${updatedLead.budgetMax}
<b>Interests:</b> ${_optionalChain([updatedLead, 'access', _ => _.aiProfiling, 'optionalAccess', _2 => _2.interests, 'optionalAccess', _3 => _3.join, 'call', _4 => _4(', ')]) || 'N/A'}
<b>Top Strategic Matches:</b> ${_optionalChain([updatedLead, 'access', _5 => _5.aiProfiling, 'optionalAccess', _6 => _6.topMatches, 'optionalAccess', _7 => _7.length]) || 0} assets.

<i>"Engagement velocity is high. Recommend immediate proposal deployment."</i>
  `;

  return { message: summary, success: true, actionTaken: 'analyze_lead' };
}

async function handleGenerateProposal(name, text) {
  const lead = await findStakeholderByName(name);
  if (!lead) return { message: `Stakeholder "${name}" not found.`, success: false };

  // Command: Analyze Lead [leadId]
  if (text.includes('analyze')) {
    const leadId = _optionalChain([text, 'access', _8 => _8.match, 'call', _9 => _9(/[a-zA-Z0-9]{20,}/), 'optionalAccess', _10 => _10[0]]);
    if (leadId) {
      return {
        message: `<b>✦ ANALYZING STAKEHOLDER: ${leadId} ✦</b>\n\nIntelligence status: <b>Qualified</b>.\nNeural Matching: <b>Synchronized</b>.\nSelection Gallery: <b>Deployed</b>.\n\nRecommended Action: 📱 <i>Call stakeholder to finalize portfolio preference.</i>`,
        success: true
      };
    }
  }

  // Command: Handover [leadId] -> Stage 9
  if (text.includes('handover')) {
    const leadId = _optionalChain([text, 'access', _11 => _11.match, 'call', _12 => _12(/[a-zA-Z0-9]{20,}/), 'optionalAccess', _13 => _13[0]]);
    if (leadId) {
       const { generateCloserHandoff } = await import('./handoff-service');
       const summary = await generateCloserHandoff(leadId);
       return {
         message: `<b>🏆 STAGE 9: CLOSER HANDOFF COMPLETE</b>\n\n<b>Stakeholder:</b> ${summary.leadName}\n<b>Phone:</b> ${summary.phone}\n\n<b>Intelligence Profile:</b>\n${summary.intelligenceProfile}\n\n<b>Strategic Intent:</b>\n${summary.strategicIntent}\n\n<b>High Interest Assets:</b>\n${summary.highInterestAssets.map(a => `• ${a.code} (Match: ${a.matchScore}%)`).join('\n')}\n\n<b>Next Steps:</b>\n${summary.nextSteps}`,
         success: true
       };
    }
  }

  const proposalId = await generateOptionsPackage(lead.id);

  return {
    message: `
<b>✅ Proposal Deployed</b>
Strategic portfolio for <b>${name}</b> has been generated.
<b>Proposal ID:</b> <code>${proposalId}</code>
<b>Action:</b> Assets curated and incentives triggered.
    `,
    success: true,
    actionTaken: 'generate_proposal'
  };
}

async function handleCheckListing(id) {
  // Search by code or title
  const units = await listRecords(COLLECTIONS.units, { limit: 1 });
  if (units.length === 0) return { message: `Listing "${id}" not found.`, success: false };

  const unit = units[0];
  const legal = assessLegalRisk(unit);
  const legalSummary = generateLegalSummary(legal, 'en');

  return {
    message: `
<b>🏢 Asset Intel: ${unit.title}</b>
<b>Price:</b> ${unit.price} EGP
<b>Status:</b> ${unit.status.toUpperCase()}
<b>Legal Status:</b> ${legalSummary}
<b>Risk Level:</b> ${legal.riskLevel.toUpperCase()}
    `,
    success: true,
    actionTaken: 'check_listing'
  };
}

async function handleGeneralQuery(text) {
  try {
    const data = await GoogleAIService.chatCompletions(
      'antigravity', 'general-query',
      [
        {
          role: 'system',
          content: `ROLE: You are "Sierra," the Lead Concierge for Sierra Estates Realty.
CORE COMPETENCIES:
1. The Subtle Interviewer: You extract key data points (Nationality, Family Size, Budget, Move-in Date) with professional warmth.
2. Tone: Use "Editorial Luxury" tone — warm, refined, and authoritative. Speak exclusively in professional English with courtesy and quiet confidence.
3. The Qualifier: Your goal is to qualify leads for the high-end Cairo market (21 compounds).

Answer every query with authority, blending professional warmth with the precision of a data scientist.`
        },
        { role: 'user', content: text }
      ],
      { model: 'gemini-1.5-pro' }
    );

    return { message: data.choices[0].message.content, success: true };
  } catch (err) {
    console.error("[Antigravity] General query failed:", err);
    return { message: "Intelligence temporarily offline. Strategic reconnection in progress.", success: false };
  }
}

/**
 * Handle Stakeholder Stage 6 Interview logic.
 */
async function handleStakeholderInterview(chatId, text) {
  // 1. Find or Create Lead based on chatId.
  //
  // `automation` is a JSONB column, so this filters on a key inside it and has
  // to go through the client directly — the record layer snake_cases column
  // names, which would corrupt the path. The key reads snake_cased because that
  // same layer converts payload keys recursively on write.
  const { data: found, error: findError } = await getSupabaseAdmin()
    .from(COLLECTIONS.stakeholders)
    .select('*')
    .eq('automation->>telegram_id', String(chatId))
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(`[supabase:handleStakeholderInterview] ${findError.message}`);

  let lead;
  let leadId = '';

  if (!found) {
    // Create new lead in S2 (extracted). Firestore's .doc() handed back an id
    // for a document that was never written, so the update below always failed
    // with NOT_FOUND for a first-time chat; the row is now actually inserted.
    const created = await insertRecord(COLLECTIONS.stakeholders, {
      fullName: `Stakeholder-${chatId}`,
      phone: `TELEGRAM:${chatId}`,
      stage: 'lead',
      source: 'whatsapp', // using legacy placeholder
      orchestrationState: { stage: 'S2', status: 'pending' },
      automation: { telegramId: chatId, botInitiated: true },
    });
    leadId = created.id;
    lead = created;
  } else {
    lead = found ;
    leadId = lead.id;
  }

  // 2. Profile & Feedback Extraction (Stage 6-10)
  const profile = await extractProfileFromChat(text);

  // V9.0 Intelligence Upgrade: Detect Rejections/Feedback
  const { extractFeedbackAndSentiment } = await import('./profiling-service');
  const feedback = await extractFeedbackAndSentiment(text);

  // 3. Update Lead Intelligence Profile & Neural Memory
  //
  // Firestore addressed these with dotted paths ('intelligence.profile') and
  // grew the arrays with FieldValue.arrayUnion. `intelligence` and
  // `orchestrationState` are single JSONB columns here, so the whole object is
  // read, merged and written back — arrayUnion becomes an explicit dedupe.
  const intelligence = { ...(_nullishCoalesce(lead.intelligence, () => ( {}))) };
  intelligence.profile = {
    ...(_optionalChain([lead, 'access', _14 => _14.intelligence, 'optionalAccess', _15 => _15.profile]) || {}),
    nationality: profile.nationality || _optionalChain([lead, 'access', _16 => _16.intelligence, 'optionalAccess', _17 => _17.profile, 'optionalAccess', _18 => _18.nationality]),
    familySize: profile.familySize || _optionalChain([lead, 'access', _19 => _19.intelligence, 'optionalAccess', _20 => _20.profile, 'optionalAccess', _21 => _21.familySize]),
    budget: profile.budget || _optionalChain([lead, 'access', _22 => _22.intelligence, 'optionalAccess', _23 => _23.profile, 'optionalAccess', _24 => _24.budget]),
    location: profile.location || _optionalChain([lead, 'access', _25 => _25.intelligence, 'optionalAccess', _26 => _26.profile, 'optionalAccess', _27 => _27.location]),
    moveInDate: profile.moveInDate || _optionalChain([lead, 'access', _28 => _28.intelligence, 'optionalAccess', _29 => _29.profile, 'optionalAccess', _30 => _30.moveInDate])
  };

  // Inject Neural Memory (Negative Signals & Objections)
  if (feedback && (_optionalChain([feedback, 'access', _31 => _31.signals, 'optionalAccess', _32 => _32.length]) > 0 || _optionalChain([feedback, 'access', _33 => _33.objections, 'optionalAccess', _34 => _34.length]) > 0)) {
    if (_optionalChain([feedback, 'access', _35 => _35.signals, 'optionalAccess', _36 => _36.length]) > 0) {
      const existing = _nullishCoalesce(_optionalChain([intelligence, 'access', _37 => _37.memory, 'optionalAccess', _38 => _38.negativeSignals]), () => ( []));
      intelligence.memory = {
        ...(_nullishCoalesce(intelligence.memory, () => ( {}))),
        negativeSignals: Array.from(new Set([...existing, ...feedback.signals])),
      };
    }
    if (_optionalChain([feedback, 'access', _39 => _39.objections, 'optionalAccess', _40 => _40.length]) > 0) {
      // Each objection carries its own timestamp, so these are appended rather
      // than deduped — arrayUnion never collapsed them either.
      intelligence.objections = [
        ...(_nullishCoalesce(intelligence.objections, () => ( []))),
        ...feedback.objections.map((obj) => ({
          ...obj,
          timestamp: new Date().toISOString()
        })),
      ];
    }
    if (feedback.matrix) {
      intelligence.matrix = {
        ...(_optionalChain([lead, 'access', _41 => _41.intelligence, 'optionalAccess', _42 => _42.matrix]) || {}),
        ...feedback.matrix
      };
    }
  }

  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    intelligence,
    orchestrationState: {
      ...(_nullishCoalesce(lead.orchestrationState, () => ( {}))),
      stage: profile.isQualified ? 'S7' : 'S6',
    },
  });

  // 4. Get Next Question - Using Sierra's Editorial Luxury Persona
  const welcomeSequence = `
    Based on the current profile summary: "${profile.summary}",
    generate a warm, professional response in refined English with quiet confidence.
    If the lead is new, follow the 3-message welcome sequence:
    1. Branded greeting.
    2. Subtle question about Nationality.
    3. Transition to Budget.

    Current missing points: ${[
      !profile.nationality && 'Nationality',
      !profile.budget && 'Budget',
      !profile.familySize && 'Family Size',
      !profile.moveInDate && 'Move-in Date'
    ].filter(Boolean).join(', ')}
  `;

  const sierraResponse = await GoogleAIService.chatCompletions(
    'sierra', 'concierge-interview',
    [
      {
        role: 'system',
        content: `You are Sierra from Sierra Estates — Lead Concierge for an elite Cairo property platform.
        Focus on qualifying the lead: Nationality, Family Size, Budget, Move-in Date.
        Be warm, professional, and precise. Speak exclusively in refined English with quiet confidence.`
      },
      { role: 'user', content: `${welcomeSequence}\n\nPrevious context: ${text}\nGenerate the next Sierra-style question.` }
    ],
    { model: 'gemini-1.5-flash' }
  );

  const finalMessage = sierraResponse.choices[0].message.content;

  return {
    message: finalMessage,
    success: true,
    actionTaken: 'stakeholder_profiling'
  };
}
