/**
 * SIERRA ESTATES — STAGE 9: CLOSER PROTOCOL (HANDOFF)
 * Generates the Executive Intelligence Summary for human closers.
 */

import { getRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, Lead, Unit } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';

export interface HandoffSummary {
  leadName: string;
  phone: string;
  intelligenceProfile: string;
  strategicIntent: string;
  highInterestAssets: Array<{
    code: string;
    matchScore: number;
    reason: string;
  }>;
  nextSteps: string;
}

/** The column is `full_name`; older documents carried `name`. */
function stakeholderName(lead: Lead): string {
  return (lead as { fullName?: string }).fullName ?? lead.name ?? '';
}

/**
 * Generates a high-fidelity context summary for the human closer.
 */
export async function generateCloserHandoff(leadId: string): Promise<HandoffSummary> {
  const lead = await getRecord<Lead>(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error('Lead not found');

  // 1. Analyze Interaction History (Stage 8 Feedback)
  const interestedUnits = lead.interactionHistory?.filter(i => i.action === 'interested') || [];
  
  const highInterestAssets: HandoffSummary['highInterestAssets'] = [];
  for (const interaction of interestedUnits) {
    const unit = await getRecord<Unit>(COLLECTIONS.units, interaction.unitId);
    if (unit) {
      const match = lead.aiProfiling?.topMatches?.find(m => m.unitId === interaction.unitId);
      highInterestAssets.push({
        code: unit.code || 'UNKNOWN',
        matchScore: match?.matchScore || 0,
        reason: match?.matchReason || 'Curated preference'
      });
    }
  }

  // 2. Generate Strategic Intent using AI
  const summaryText = await generateAIHandoffSummary(lead, highInterestAssets);

  // 3. Finalize Handoff
  const handoff: HandoffSummary = {
    leadName: stakeholderName(lead),
    phone: lead.phone,
    intelligenceProfile: `Nationality: ${lead.intelligence?.profile?.nationality || 'N/A'}. Family: ${lead.intelligence?.profile?.familySize || 'X'}. Move-in: ${lead.intelligence?.profile?.moveInDate || 'Immediate'}.`,
    strategicIntent: summaryText,
    highInterestAssets,
    nextSteps: "Schedule physical viewings for the high-interest assets. Deploy Loyalty Incentive (Stage 10) if booking is confirmed within 24h."
  };

  // 4. Update Orchestration State
  // `orchestrationState` and `intelligence` are single JSONB columns, so the
  // dotted-path updates become merges onto the objects already on the row.
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    orchestrationState: {
      ...(lead.orchestrationState ?? {}),
      stage: 'S9',
      status: 'completed',
    },
    intelligence: {
      ...(lead.intelligence ?? {}),
      handoffSummary: handoff,
    },
  });

  return handoff;
}

// Alias for compatibility with existing agents (Matchmaker)
export const generateAgentBriefing = generateCloserHandoff;

async function generateAIHandoffSummary(lead: Lead, assets: HandoffSummary['highInterestAssets']): Promise<string> {
  const systemPrompt = `ROLE: You are the Sierra Estates Handoff Specialist (Intelligence Layer V10.0).
TASK: Generate a 2-sentence executive summary for a human closer.
TONE: Institutional, analytical, premium.

INSTRUCTIONS: Focus on the stakeholder's 'Psychological Profile', 'Neural Memory' (what they explicitly reject), and 'Cognitive Matrix' (decision triggers).
PERSONA ALIGNMENT: Align the intelligence with "Sierra's" Editorial Luxury standards.`;

  const promptContent = `
    Stakeholder: ${stakeholderName(lead)}. 
    Assets of Interest: ${assets.map(a => a.code).join(', ')}. 
    Profile: ${JSON.stringify(lead.intelligence?.profile)}.
    Neural Memory (Negative Signals): ${JSON.stringify(lead.intelligence?.memory?.negativeSignals || [])}.
    Cognitive Matrix: ${JSON.stringify(lead.intelligence?.matrix || {})}.
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
