 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — STAGE 9: CLOSER PROTOCOL (HANDOFF)
 * Generates the Executive Intelligence Summary for human closers.
 */

import { getRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';














/** The column is `full_name`; older documents carried `name`. */
function stakeholderName(lead) {
  return _nullishCoalesce(_nullishCoalesce((lead ).fullName, () => ( lead.name)), () => ( ''));
}

/**
 * Generates a high-fidelity context summary for the human closer.
 */
export async function generateCloserHandoff(leadId) {
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error('Lead not found');

  // 1. Analyze Interaction History (Stage 8 Feedback)
  const interestedUnits = _optionalChain([lead, 'access', _ => _.interactionHistory, 'optionalAccess', _2 => _2.filter, 'call', _3 => _3(i => i.action === 'interested')]) || [];
  
  const highInterestAssets = [];
  for (const interaction of interestedUnits) {
    const unit = await getRecord(COLLECTIONS.units, interaction.unitId);
    if (unit) {
      const match = _optionalChain([lead, 'access', _4 => _4.aiProfiling, 'optionalAccess', _5 => _5.topMatches, 'optionalAccess', _6 => _6.find, 'call', _7 => _7(m => m.unitId === interaction.unitId)]);
      highInterestAssets.push({
        code: unit.code || 'UNKNOWN',
        matchScore: _optionalChain([match, 'optionalAccess', _8 => _8.matchScore]) || 0,
        reason: _optionalChain([match, 'optionalAccess', _9 => _9.matchReason]) || 'Curated preference'
      });
    }
  }

  // 2. Generate Strategic Intent using AI
  const summaryText = await generateAIHandoffSummary(lead, highInterestAssets);

  // 3. Finalize Handoff
  const handoff = {
    leadName: stakeholderName(lead),
    phone: lead.phone,
    intelligenceProfile: `Nationality: ${_optionalChain([lead, 'access', _10 => _10.intelligence, 'optionalAccess', _11 => _11.profile, 'optionalAccess', _12 => _12.nationality]) || 'N/A'}. Family: ${_optionalChain([lead, 'access', _13 => _13.intelligence, 'optionalAccess', _14 => _14.profile, 'optionalAccess', _15 => _15.familySize]) || 'X'}. Move-in: ${_optionalChain([lead, 'access', _16 => _16.intelligence, 'optionalAccess', _17 => _17.profile, 'optionalAccess', _18 => _18.moveInDate]) || 'Immediate'}.`,
    strategicIntent: summaryText,
    highInterestAssets,
    nextSteps: "Schedule physical viewings for the high-interest assets. Deploy Loyalty Incentive (Stage 10) if booking is confirmed within 24h."
  };

  // 4. Update Orchestration State
  // `orchestrationState` and `intelligence` are single JSONB columns, so the
  // dotted-path updates become merges onto the objects already on the row.
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    orchestrationState: {
      ...(_nullishCoalesce(lead.orchestrationState, () => ( {}))),
      stage: 'S9',
      status: 'completed',
    },
    intelligence: {
      ...(_nullishCoalesce(lead.intelligence, () => ( {}))),
      handoffSummary: handoff,
    },
  });

  return handoff;
}

// Alias for compatibility with existing agents (Matchmaker)
export const generateAgentBriefing = generateCloserHandoff;

async function generateAIHandoffSummary(lead, assets) {
  const systemPrompt = `ROLE: You are the Sierra Estates Handoff Specialist (Intelligence Layer V10.0).
TASK: Generate a 2-sentence executive summary for a human closer.
TONE: Institutional, analytical, premium.

INSTRUCTIONS: Focus on the stakeholder's 'Psychological Profile', 'Neural Memory' (what they explicitly reject), and 'Cognitive Matrix' (decision triggers).
PERSONA ALIGNMENT: Align the intelligence with "Sierra's" Editorial Luxury standards.`;

  const promptContent = `
    Stakeholder: ${stakeholderName(lead)}. 
    Assets of Interest: ${assets.map(a => a.code).join(', ')}. 
    Profile: ${JSON.stringify(_optionalChain([lead, 'access', _19 => _19.intelligence, 'optionalAccess', _20 => _20.profile]))}.
    Neural Memory (Negative Signals): ${JSON.stringify(_optionalChain([lead, 'access', _21 => _21.intelligence, 'optionalAccess', _22 => _22.memory, 'optionalAccess', _23 => _23.negativeSignals]) || [])}.
    Cognitive Matrix: ${JSON.stringify(_optionalChain([lead, 'access', _24 => _24.intelligence, 'optionalAccess', _25 => _25.matrix]) || {})}.
  `;

  try {
    const data = await GoogleAIService.chatCompletions(
      'closer', 'handoff-summary',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptContent }
      ],
      { model: 'gemini-1.5-flash', temperature: 0 }
    );

    return data.choices[0].message.content || "Stakeholder ready for closer engagement based on curated portfolio interaction.";
  } catch (err) {
    console.error("[HandoffService] AI Summary failed:", err);
    return "Stakeholder ready for closer engagement.";
  }
}
