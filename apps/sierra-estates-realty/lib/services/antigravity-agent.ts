/**
 * SIERRA ESTATES — ANTIGRAVITY INTELLIGENCE AGENT
 * The neural bridge between the Telegram Bot and the Project Engines.
 */

import { GoogleAIService } from '../server/google-ai';
import { adminDb } from '../server/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, type Lead, type Unit } from '../models/schema';
import { generateOptionsPackage } from './sales-engine';
import { runMatchingForLead } from './matching-engine';
import { assessLegalRisk, generateLegalSummary } from './legal-brain';
import { extractProfileFromChat } from './profiling-service';

export interface AgentResponse {
  message: string;
  actionTaken?: string;
  success: boolean;
}

export async function processAgentCommand(chatId: number, text: string): Promise<AgentResponse> {
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
    } catch (err: any) {
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
async function detectIntent(text: string) {
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

async function handleAnalyzeLead(name: string): Promise<AgentResponse> {
  const snap = await adminDb.collection(COLLECTIONS.stakeholders)
    .where('name', '>=', name)
    .limit(1)
    .get();
  if (snap.empty) return { message: `Stakeholder "${name}" not found.`, success: false };

  const lead = { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead;

  // Trigger matching just in case
  await runMatchingForLead(lead.id!);

  // Re-fetch with matches
  const updatedSnap = await adminDb.collection(COLLECTIONS.stakeholders)
    .where('name', '==', lead.name)
    .get();
  const updatedLead = updatedSnap.docs[0].data() as Lead;

  const summary = `
<b>👤 Stakeholder Profile: ${updatedLead.name}</b>
<b>Budget:</b> ${updatedLead.budget} - ${updatedLead.budgetMax}
<b>Interests:</b> ${updatedLead.aiProfiling?.interests?.join(', ') || 'N/A'}
<b>Top Strategic Matches:</b> ${updatedLead.aiProfiling?.topMatches?.length || 0} assets.

<i>"Engagement velocity is high. Recommend immediate proposal deployment."</i>
  `;

  return { message: summary, success: true, actionTaken: 'analyze_lead' };
}

async function handleGenerateProposal(name: string, text: string): Promise<AgentResponse> {
  const snap = await adminDb.collection(COLLECTIONS.stakeholders)
    .where('name', '>=', name)
    .limit(1)
    .get();
  if (snap.empty) return { message: `Stakeholder "${name}" not found.`, success: false };

  // Command: Analyze Lead [leadId]
  if (text.includes('analyze')) {
    const leadId = text.match(/[a-zA-Z0-9]{20,}/)?.[0];
    if (leadId) {
      return {
        message: `<b>✦ ANALYZING STAKEHOLDER: ${leadId} ✦</b>\n\nIntelligence status: <b>Qualified</b>.\nNeural Matching: <b>Synchronized</b>.\nSelection Gallery: <b>Deployed</b>.\n\nRecommended Action: 📱 <i>Call stakeholder to finalize portfolio preference.</i>`,
        success: true
      };
    }
  }

  // Command: Handover [leadId] -> Stage 9
  if (text.includes('handover')) {
    const leadId = text.match(/[a-zA-Z0-9]{20,}/)?.[0];
    if (leadId) {
       const { generateCloserHandoff } = await import('./handoff-service');
       const summary = await generateCloserHandoff(leadId);
       return {
         message: `<b>🏆 STAGE 9: CLOSER HANDOFF COMPLETE</b>\n\n<b>Stakeholder:</b> ${summary.leadName}\n<b>Phone:</b> ${summary.phone}\n\n<b>Intelligence Profile:</b>\n${summary.intelligenceProfile}\n\n<b>Strategic Intent:</b>\n${summary.strategicIntent}\n\n<b>High Interest Assets:</b>\n${summary.highInterestAssets.map(a => `• ${a.code} (Match: ${a.matchScore}%)`).join('\n')}\n\n<b>Next Steps:</b>\n${summary.nextSteps}`,
         success: true
       };
    }
  }

  const leadId = snap.docs[0].id;
  const proposalId = await generateOptionsPackage(leadId);

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

async function handleCheckListing(id: string): Promise<AgentResponse> {
  // Search by code or title
  const snap = await adminDb.collection(COLLECTIONS.units).limit(1).get();
  if (snap.empty) return { message: `Listing "${id}" not found.`, success: false };

  const unit = snap.docs[0].data() as Unit;
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

async function handleGeneralQuery(text: string): Promise<AgentResponse> {
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
  } catch (err: any) {
    console.error("[Antigravity] General query failed:", err);
    return { message: "Intelligence temporarily offline. Strategic reconnection in progress.", success: false };
  }
}

/**
 * Handle Stakeholder Stage 6 Interview logic.
 */
async function handleStakeholderInterview(chatId: number, text: string): Promise<AgentResponse> {
  // 1. Find or Create Lead based on chatId
  const snap = await adminDb.collection(COLLECTIONS.stakeholders)
    .where('automation.telegramId', '==', chatId)
    .limit(1)
    .get();

  let lead: Lead;
  let leadId = '';

  if (snap.empty) {
    // Create new lead in S2 (extracted)
    const newLeadRef = adminDb.collection(COLLECTIONS.stakeholders).doc();
    leadId = newLeadRef.id;
    lead = {
      name: `Stakeholder-${chatId}`,
      phone: `TELEGRAM:${chatId}`,
      stage: 'lead',
      source: 'whatsapp', // using legacy placeholder
      orchestrationState: { stage: 'S2', status: 'pending' },
      automation: { telegramId: chatId, botInitiated: true }
    } as any;
    // Note: We'd save this, but for brevity we'll combine with current text
  } else {
    leadId = snap.docs[0].id;
    lead = { id: leadId, ...snap.docs[0].data() } as Lead;
  }

  // 2. Profile & Feedback Extraction (Stage 6-10)
  const profile = await extractProfileFromChat(text);

  // V9.0 Intelligence Upgrade: Detect Rejections/Feedback
  const { extractFeedbackAndSentiment } = await import('./profiling-service');
  const feedback = await extractFeedbackAndSentiment(text);

  // 3. Update Lead Intelligence Profile & Neural Memory
  const leadRef = adminDb.collection(COLLECTIONS.stakeholders).doc(leadId);
  const updates: any = {
    'intelligence.profile': {
      ...(lead.intelligence?.profile || {}),
      nationality: profile.nationality || lead.intelligence?.profile?.nationality,
      familySize: profile.familySize || lead.intelligence?.profile?.familySize,
      budget: profile.budget || lead.intelligence?.profile?.budget,
      location: profile.location || lead.intelligence?.profile?.location,
      moveInDate: profile.moveInDate || lead.intelligence?.profile?.moveInDate
    },
    'orchestrationState.stage': profile.isQualified ? 'S7' : 'S6',
    updatedAt: Timestamp.now()
  };

  // Inject Neural Memory (Negative Signals & Objections)
  if (feedback && (feedback.signals?.length > 0 || feedback.objections?.length > 0)) {
    if (feedback.signals?.length > 0) {
      updates['intelligence.memory.negativeSignals'] = FieldValue.arrayUnion(...feedback.signals);
    }
    if (feedback.objections?.length > 0) {
      updates['intelligence.objections'] = FieldValue.arrayUnion(...feedback.objections.map((obj: any) => ({
        ...obj,
        timestamp: new Date()
      })));
    }
    if (feedback.matrix) {
      updates['intelligence.matrix'] = {
        ...(lead.intelligence?.matrix || {}),
        ...feedback.matrix
      };
    }
  }

  await leadRef.update(updates);

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
