 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * sierra estates — STAGE 7: SALES ENGINE
 * Orchestrates Strategic Proposals (Options Packages) and Automated Incentives.
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { COLLECTIONS, } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';
import { analyzeAssetFinancials } from './roi-service';
import { logger } from '@/lib/logger';

/**
 * Generate a Strategic Options Package (Proposal) for a lead.
 */
export async function generateOptionsPackage(leadId) {
  // 1. Fetch Lead
  const leadSnap = await getDoc(doc(db, COLLECTIONS.stakeholders, leadId));
  if (!leadSnap.exists()) throw new Error('Lead not found');
  const lead = { id: leadSnap.id, ...leadSnap.data() } ;

  if (!_optionalChain([lead, 'access', _ => _.aiProfiling, 'optionalAccess', _2 => _2.topMatches]) || lead.aiProfiling.topMatches.length === 0) {
    throw new Error('No matches found for this lead. Run Stage 6 Matching first.');
  }

  // 2. Fetch Unit Details for the matches
  const unitsData = [];
  let totalROI = 0;
  let totalYield = 0;

  for (const match of lead.aiProfiling.topMatches) {
    const unitSnap = await getDoc(doc(db, COLLECTIONS.units, match.unitId));
    if (unitSnap.exists()) {
      const unit = { id: unitSnap.id, ...unitSnap.data() } ;
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
    leadName: lead.name,
    unitIds: unitsData.map(u => u.id),
    units: unitsData,
    strategicSummary: summary,
    status: 'draft',
    createdAt: serverTimestamp() ,
    expiresAt: Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Days
    financialAnalysis: {
      projectedROI: avgROI,
      annualYield: parseFloat(avgYield),
      valuationAnalysis: `This portfolio demonstrates a curated average projected ROI of ${avgROI}% over a 36-month horizon, with a resilient net cash yield of ${avgYield}%. Selection prioritized asset liquidity and structural location growth.`
    }
  };

  const proposalRef = await addDoc(collection(db, COLLECTIONS.proposals), proposalData);
  
  // 4b. Update with public shareable URL
  const shareableUrl = `${siteUrl}/proposals/${proposalRef.id}`;
  await updateDoc(proposalRef, { shareableUrl });

  // 5. Automation Check: Trigger high-fidelity incentives
  const maxScore = Math.max(...unitsData.map(u => u.matchScore));
  if (maxScore >= 90) {
    await triggerIncentive(leadId, proposalRef.id);
  }

  return proposalRef.id;
}

/**
 * Stage 8: Concierge Selection Funnel Logic
 * Generates a curated selection gallery for the stakeholder.
 */
export async function generateConciergeSelection(leadId) {
  const leadSnap = await getDoc(doc(db, COLLECTIONS.stakeholders, leadId));
  if (!leadSnap.exists()) throw new Error('Stakeholder profile not found');
  const lead = { id: leadSnap.id, ...leadSnap.data() } ;

  // 1. Ensure matches exist (Neural Synthesis / S7)
  if (!_optionalChain([lead, 'access', _3 => _3.aiProfiling, 'optionalAccess', _4 => _4.topMatches]) || lead.aiProfiling.topMatches.length === 0) {
    throw new Error('Neural Matching not yet completed for this stakeholder.');
  }

  // 2. Generate a unique selection URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sierraestates.luxury';
  const selectionUrl = `${siteUrl}/select/${leadId}`;

  // 3. Mark selection as deployed
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    'automation.selectionUrlSent': true,
    'orchestrationState.stage': 'S8',
    'orchestrationState.status': 'completed',
    updatedAt: serverTimestamp()
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
STAKEHOLDER: ${lead.name} (${lead.preferredPropertyType} in ${_optionalChain([lead, 'access', _5 => _5.preferredLocations, 'optionalAccess', _6 => _6.join, 'call', _7 => _7(', ')]) || 'selected areas'})
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
    createdAt: serverTimestamp() ,
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    conditions: "Valid for site inspection bookings within 7 days of proposal deployment."
  };

  await addDoc(collection(db, COLLECTIONS.vouchers), voucher);

  // Log automation in lead
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    'automation.viewingRewardActive': true,
    'automation.lastIncentiveAt': serverTimestamp(),
  });
}
