/**
 * SIERRA ESTATES — STAGE 6: AI MATCHING ENGINE
 * Orchestrates cross-referencing Leads with Listings/Units
 * using high-fidelity NLP scoring.
 */

import { getRecord, getSupabaseAdmin, listRecords, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, type Lead, type Unit } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';
import { TelegramAlertService } from './telegram-alert-service';
import { MemoryService } from './memory-service';

export interface MatchResult {
  unitId: string;
  matchScore: number;
  matchReason: string;
}

/**
 * Perform AI-driven matching for a specific lead.
 */
export async function runMatchingForLead(leadId: string): Promise<MatchResult[]> {
  // 1. Fetch the Lead
  const lead = await getRecord<Lead & { fullName?: string }>(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error('Lead not found');

  // 2. Initial Filtered Search for potential units
  // We don't want to send 1000 listings to AI. We filter by basic criteria first.
  const candidateUnits = await listRecords<Unit>(COLLECTIONS.units, {
    where: [{ column: 'status', value: 'available' }],
    limit: 20, // Heuristic limit for AI processing
  });

  if (candidateUnits.length === 0) return [];

  // 3. AI Scoring Logic
  // We use the OpenClaw gateway to perform sophisticated comparison
  const matches = await scoreMatchesWithAI(lead, candidateUnits);

  // 4. Update Lead with new matches
  // `aiProfiling` is one JSONB column, so the dotted paths become a merge onto
  // whatever profiling already wrote there.
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    aiProfiling: {
      ...(lead.aiProfiling ?? {}),
      topMatches: matches,
      lastMatchRunAt: new Date().toISOString(),
    },
  });

  // 5. VIP Alerting (Stage 7 Logic)
  for (const match of matches) {
    if (match.matchScore >= 90) {
      const unit = candidateUnits.find(u => u.id === match.unitId);
      if (unit) {
        await TelegramAlertService.sendVipMatchAlert({
          leadName: lead.fullName ?? lead.name,
          propertyTitle: unit.title,
          matchScore: match.matchScore,
          budget: `${lead.budgetMax || lead.budget} EGP`,
          proposalUrl: `https://sierra-estates.web.app/concierge/${leadId}?unit=${unit.id}`,
          roi: unit.intelligence?.roi || '8-12%'
        });
      }
    }
  }

  return matches;
}

/**
 * Perform AI-driven matching for a newly updated unit across all stakeholders.
 * Strategic Synthesis: Identifies the top 50 stakeholders and ranks this asset for them.
 */
export async function runMatchingForUnit(unitId: string): Promise<void> {
  const unit = await getRecord<Unit>(COLLECTIONS.units, unitId);
  if (!unit) return;

  // `orchestration_state` is a JSONB column, so this filters on a key inside it
  // and goes through the client directly: the record layer snake_cases column
  // names, which would corrupt a JSON path. `neq` alone would drop rows where
  // the key is absent, which Firestore's '!=' also did — `or` keeps them, since
  // a lead with no orchestration state is not archived.
  const { data: leadRows, error } = await getSupabaseAdmin()
    .from(COLLECTIONS.stakeholders)
    .select('*')
    .or('orchestration_state->>status.neq.archived,orchestration_state->>status.is.null')
    .limit(50);
  if (error) throw new Error(`[supabase:runMatchingForUnit] ${error.message}`);
  const candidates = (leadRows ?? []) as unknown as Lead[];

  for (const lead of candidates) {
    const matches = await scoreMatchesWithAI(lead, [unit]);
    if (matches.length > 0 && matches[0].matchScore > 70) {
      const currentMatches = lead.aiProfiling?.topMatches || [];
      const updatedMatches = [matches[0], ...currentMatches.filter(m => m.unitId !== unitId)].slice(0, 5);
      
      await updateRecord(COLLECTIONS.stakeholders, lead.id!, {
        aiProfiling: {
          ...(lead.aiProfiling ?? {}),
          topMatches: updatedMatches,
          lastMatchRunAt: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * Uses the OpenClaw / Gemini gateway to rank units against a lead's profile.
 */
async function scoreMatchesWithAI(lead: Lead, units: Unit[]): Promise<MatchResult[]> {
  const systemPrompt = `You are the Sierra Estates Strategic Intelligence Core (Neural Matching Unit V10.0).
Task: Rank high-value property assets against specific investment stakeholders using the "Neural Memory Layer" and "Neural Wealth Mode."

Terminology Protocol:
- Property Listing -> Signature Asset
- Lead -> Investment Stakeholder
- Budget -> Capital Allocation

V10 Neural Wealth Objectives:
1. Value-for-Price Index: Prioritize assets with high capital appreciation potential.
2. ROI Transparency: Every match must include a clinical financial justification.
3. Neural Integrity: Strictly avoid "Negative Signals" in the Matchmaker's selection gallery.

Scoring Metrics (V10.0):
1. Neural Alignment (Preferences & Memory) - 30%
2. Financial ROI / Capital Appreciation - 40%
3. Market Liquidity & Scarcity - 20%
4. Strategic Feasibility - 10%

Institutional Knowledge (Global Neural Memory):
{{GLOBAL_TRENDS}}

Output: Return ONLY a JSON array of objects: 
[{"unitId": "...", "matchScore": 0-100, "matchReason": "Detailed executive summary focusing on ROI potential, Capital Appreciation, and why this asset fits the stakeholder's strategic portfolio."}]`;

  const userPayload = {
    stakeholder: {
      name: lead.name,
      interests: lead.aiProfiling?.interests || [],
      allocation: lead.budgetMax || lead.budget,
      preferredType: lead.preferredPropertyType,
      locations: lead.preferredLocations,
      strategicNotes: lead.notes,
      
      // Neural Memory Layer V9.0
      neuralMemory: {
        negativeSignals: lead.intelligence?.memory?.negativeSignals || [],
        historicalObjections: lead.intelligence?.objections || [],
        cognitiveMatrix: lead.intelligence?.matrix || {}
      }
    },
    assets: units.map(u => ({
      id: u.id,
      identity: u.title,
      type: u.propertyType,
      valuation: u.price,
      community: u.compound || u.location,
      footprint: u.area,
      specifications: `${u.bedrooms}BR / ${u.bathrooms}BA`,
      intelligence: u.intelligence || {}
    }))
  };

  try {
    const globalTrends = await MemoryService.getGlobalTrends();
    const trendsString = globalTrends ? JSON.stringify((globalTrends as any).rejectionStats || globalTrends) : 'No significant trends recorded yet.';

    const data = await GoogleAIService.chatCompletions(
      'matching-engine', 'score-matches',
      [
        { role: 'system', content: systemPrompt.replace('{{GLOBAL_TRENDS}}', trendsString) },
        { role: 'user', content: `Analyze strategic matching for this stakeholder: ${JSON.stringify(userPayload)}` }
      ],
      { model: 'gemini-1.5-flash', temperature: 0.1 }
    );

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return fallbackScoring(lead, units);

    const parsed = JSON.parse(jsonMatch[0]) as MatchResult[];
    return parsed.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

  } catch (err) {
    console.error('[MatchingEngine] AI scoring failed:', err);
    return fallbackScoring(lead, units);
  }
}

/**
 * Heuristic fallback scoring if AI is unavailable.
 */
function fallbackScoring(lead: Lead, units: Unit[]): MatchResult[] {
  return units.map(u => {
    let score = 50; // Base score
    
    if (lead.preferredPropertyType === u.propertyType) score += 20;
    if (lead.budgetMax && u.price <= lead.budgetMax) score += 15;
    if (lead.preferredLocations?.includes(u.compound || u.location || '')) score += 15;
    
    return {
      unitId: u.id!,
      matchScore: Math.min(score, 100),
      matchReason: 'Heuristic match based on property type and budget.'
    };
  }).sort((a,b) => b.matchScore - a.matchScore).slice(0, 5);
}

/**
 * Generates a concise summary of matches for a lead (Operational Intelligence).
 */
export async function getMatchSummaryForLead(leadId: string): Promise<string> {
  const lead = await getRecord<Lead & { fullName?: string }>(COLLECTIONS.stakeholders, leadId);
  if (!lead) return "Stakeholder profile not found.";

  if (!lead.aiProfiling?.topMatches || lead.aiProfiling.topMatches.length === 0) {
    return "No strategic matches detected. Initialize Neural Matching Engine.";
  }

  let summary = `<b>Matches for ${lead.fullName ?? lead.name}:</b>\n`;
  for (const match of lead.aiProfiling.topMatches) {
    const unit = await getRecord<Unit>(COLLECTIONS.units, match.unitId);
    if (unit) {
      summary += `💎 ${unit.title} (${match.matchScore}%)\n`;
    }
  }
  return summary;
}
