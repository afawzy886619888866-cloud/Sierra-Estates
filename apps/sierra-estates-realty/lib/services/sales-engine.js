 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * sierra estates — STAGE 7: SALES ENGINE
 * Orchestrates Strategic Proposals (Options Packages) and Automated Incentives.
 */

import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';
import { analyzeAssetFinancials } from './roi-service';
import { logger } from '@/lib/logger';

/**
 * Generate a Strategic Options Package (Proposal) for a lead.
 */
export async function generateOptionsPackage(leadId) {
  // 1. Fetch Lead
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error('Lead not found');

  if (!_optionalChain([lead, 'access', _ => _.aiProfiling, 'optionalAccess', _2 => _2.topMatches]) || lead.aiProfiling.topMatches.length === 0) {
    throw new Error('No matches found for this lead. Run Stage 6 Matching first.');
  }

  // 2. Fetch Unit Details for the matches
  const unitsData = [];
  let totalROI = 0;
  let totalYield = 0;

  for (const match of lead.aiProfiling.topMatches) {
    const unit = await getRecord(COLLECTIONS.units, match.unitId);
    if (unit) {
      const financials = await analyzeAssetFinancials(unit);
      
      unitsData.push({
        id: match.unitId,
        title: unit.title,
        price: unit.price,
        matchScore: match.matchScore,
        matchReason: match.matchReason,
        financialAnalysis: {
          projectedROI: financials.projectedROI,
          annualYield: financials.annualYield
        }
      });

      totalROI += financials.projectedROI;
      totalYield += financials.annualYield;
    }
  }

  const avgROI = unitsData.length > 0 ? Math.round(totalROI / unitsData.length) : 0;
  const avgYield = unitsData.length > 0 ? (totalYield / unitsData.length).toFixed(1) : "0";

  // 3. AI Generation of Strategic Summary
  const summary = await generateAIPackageSummary(lead, unitsData);

  // 4. Create Proposal
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sierraestates.luxury';
  
  const proposalData = {
    leadId,
    leadName: _nullishCoalesce(lead.fullName, () => ( lead.name)),
    unitIds: unitsData.map(u => u.id),
    units: unitsData,
    strategicSummary: summary,
    status: 'draft',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 Days
    financialAnalysis: {
      projectedROI: avgROI,
      annualYield: parseFloat(avgYield),
      valuationAnalysis: `This portfolio demonstrates a curated average projected ROI of ${avgROI}% over a 36-month horizon, with a resilient net cash yield of ${avgYield}%. Selection prioritized asset liquidity and structural location growth.`
    }
  };

  const proposal = await insertRecord(COLLECTIONS.proposals, proposalData);

  // 4b. Update with public shareable URL
  const shareableUrl = `${siteUrl}/proposals/${proposal.id}`;
  await updateRecord(COLLECTIONS.proposals, proposal.id, { shareableUrl });

  // 5. Automation Check: Trigger high-fidelity incentives
  const maxScore = Math.max(...unitsData.map(u => u.matchScore));
  if (maxScore >= 90) {
    await triggerIncentive(leadId, proposal.id);
  }

  return proposal.id;
}

/**
 * Stage 8: Concierge Selection Funnel Logic
 * Generates a curated selection gallery for the stakeholder.
 */
export async function generateConciergeSelection(leadId) {
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error('Stakeholder profile not found');

  // 1. Ensure matches exist (Neural Synthesis / S7)
  if (!_optionalChain([lead, 'access', _3 => _3.aiProfiling, 'optionalAccess', _4 => _4.topMatches]) || lead.aiProfiling.topMatches.length === 0) {
    throw new Error('Neural Matching not yet completed for this stakeholder.');
  }

  // 2. Generate a unique selection URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sierraestates.luxury';
  const selectionUrl = `${siteUrl}/select/${leadId}`;

  // 3. Mark selection as deployed
  // `automation` and `orchestrationState` are single JSONB columns, so the
  // dotted paths become merges onto what is already on the row.
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    automation: { ...(_nullishCoalesce(lead.automation, () => ( {}))), selectionUrlSent: true },
    orchestrationState: {
      ...(_nullishCoalesce(lead.orchestrationState, () => ( {}))),
      stage: 'S8',
      status: 'completed',
    },
  });

  return selectionUrl;
}

/**
 * Uses Gemini/GoogleAIService to write the strategic recommendation for the package.
 */
async function generateAIPackageSummary(lead, units) {
  const systemPrompt = `ROLE: You are "Sierra," the Lead Concierge for Sierra Estates Realty.
CORE COMPETENCIES:
1. Editorial Luxury: You write with professional warmth and authority.
2. Tone: Use "Editorial Luxury" — professional warmth, refined English, quiet authority. No regional dialect.
3. Investment Precision: You justify asset curation based on ROI, location fidelity, and portfolio alignment.

TASK: Write a 3-4 sentence justification for why these specific assets were curated for the stakeholder.
STAKEHOLDER: ${_nullishCoalesce((lead ).fullName, () => ( lead.name))} (${lead.preferredPropertyType} in ${_optionalChain([lead, 'access', _5 => _5.preferredLocations, 'optionalAccess', _6 => _6.join, 'call', _7 => _7(', ')]) || 'selected areas'})
ASSETS: ${units.map(u => `${u.title} (MatchScore: ${u.matchScore}%)`).join('; ')}

Output the response as a single cohesive paragraph.`;

  try {
    const data = await GoogleAIService.chatCompletions(
      'sales-engine', 'package-summary',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the strategic summary for this stakeholder package.' }
      ],
      { model: 'gemini-1.5-flash', temperature: 0.7 }
    );

    return data.choices[0].message.content || "Strategic portfolio recommendation based on structural market alignment.";
  } catch (err) {
    logger.error("[SalesEngine] AI Summary generation failed:", err);
    return "Strategic portfolio recommendation based on structural market alignment.";
  }
}

/**
 * Automates the creation of a 'Viewing Reward' voucher for high-match leads.
 */
async function triggerIncentive(leadId, _proposalId) {
  const code = "SB-VIP-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  
  const voucher = {
    code,
    type: 'viewing-reward',
    value: 5000,
    currency: 'EGP',
    leadId,
    status: 'active',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    conditions: "Valid for site inspection bookings within 7 days of proposal deployment."
  };

  await insertRecord(COLLECTIONS.vouchers, voucher);

  // Log automation in lead
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    automation: {
      ...(_nullishCoalesce(_optionalChain([lead, 'optionalAccess', _8 => _8.automation]), () => ( {}))),
      viewingRewardActive: true,
      lastIncentiveAt: new Date().toISOString(),
    },
  });
}
