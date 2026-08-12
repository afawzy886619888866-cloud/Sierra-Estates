/**
 * SIERRA ESTATES — STAGE 9: CLOSER PROTOCOL (HANDOFF)
 * Generates the Executive Intelligence Summary for human closers.
 */

import { db } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

/**
 * Generates a high-fidelity context summary for the human closer.
 */
export async function generateCloserHandoff(leadId: string): Promise<HandoffSummary> {
  const leadSnap = await getDoc(doc(db, COLLECTIONS.stakeholders, leadId));
  if (!leadSnap.exists()) throw new Error('Lead not found');
  const lead = { id: leadSnap.id, ...leadSnap.data() } as Lead;

  // 1. Analyze Interaction History (Stage 8 Feedback)
  const interestedUnits = lead.interactionHistory?.filter(i => i.action === 'interested') || [];
  
  const highInterestAssets: HandoffSummary['highInterestAssets'] = [];
  for (const interaction of interestedUnits) {
    const unitSnap = await getDoc(doc(db, COLLECTIONS.units, interaction.unitId));
    if (unitSnap.exists()) {
      const unit = unitSnap.data() as Unit;
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
    leadName: lead.name,
    phone: lead.phone,
    intelligenceProfile: `Nationality: ${lead.intelligence?.profile?.nationality || 'N/A'}. Family: ${lead.intelligence?.profile?.familySize || 'X'}. Move-in: ${lead.intelligence?.profile?.moveInDate || 'Immediate'}.`,
    strategicIntent: summaryText,
    highInterestAssets,
    nextSteps: "Schedule physical viewings for the high-interest assets. Deploy Loyalty Incentive (Stage 10) if booking is confirmed within 24h."
  };

  // 4. Update Orchestration State
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    'orchestrationState.stage': 'S9',
    'orchestrationState.status': 'completed',
    'intelligence.handoffSummary': handoff,
    updatedAt: serverTimestamp()
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
    Stakeholder: ${lead.name}. 
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
