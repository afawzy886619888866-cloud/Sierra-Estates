/**
 * sierra estates — STAGE 8: PORTFOLIO ENGINE
 * Curates top 3-5 matches into a VIP "Concierge Selection"
 * and generates shareable mobile-first gallery links.
 */

import { db } from '../firebase';
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { COLLECTIONS, type Lead, type Unit } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';
import { analyzeAssetFinancials } from './roi-service';

export interface ConciergeUnit {
  id: string;
  title: string;
  description: string; // 2-3 sentence luxury description
  price: number;
  matchScore: number;
  estimatedYield: number;
  estimatedROI: number;
  reason: string; // Why this unit matches the client
  imageUrl?: string;
  compound?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  features?: string[];
}

export interface ConciergeSelection {
  id: string;
  leadId: string;
  leadName: string;
  createdAt: Timestamp;
  units: ConciergeUnit[];
  personalNote: string; // AI-written welcome message
  whatsappLink: string;
  matchingScore: number; // Overall portfolio fit
  estimatedPortfolioROI: number;
  status?: string;
  engagement?: Record<string, unknown>;
}

/**
 * Curate the top 3-5 matches into a Concierge Selection Portfolio.
 */
export async function curateConciergePortfolio(leadId: string): Promise<ConciergeSelection> {
  // 1. Fetch Lead profile
  const leadSnap = await getDoc(doc(db, COLLECTIONS.stakeholders, leadId));
  if (!leadSnap.exists()) throw new Error('Lead not found');
  const lead = { id: leadSnap.id, ...leadSnap.data() } as Lead;

  if (!lead.aiProfiling?.topMatches || lead.aiProfiling.topMatches.length === 0) {
    throw new Error('No matches found. Run Stage 6 (Matching) first.');
  }

  // 2. Select top 3-5 matches (based on score + diversity)
  const selectedMatches = lead.aiProfiling.topMatches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  // 3. Fetch unit details and financials
  const conciergeUnits: ConciergeUnit[] = [];
  let totalROI = 0;
  let matchSum = 0;

  for (const match of selectedMatches) {
    const unitSnap = await getDoc(doc(db, COLLECTIONS.units, match.unitId));
    if (!unitSnap.exists()) continue;

    const unit = { id: unitSnap.id, ...unitSnap.data() } as Unit;
    const financials = await analyzeAssetFinancials(unit);
    const description = await generateLuxuryDescription(lead, unit);

    conciergeUnits.push({
      id: unit.id ?? unitSnap.id,
      title: unit.title,
      price: unit.price,
      matchScore: match.matchScore,
      estimatedYield: financials.annualYield,
      estimatedROI: financials.projectedROI,
      imageUrl: unit.featuredImage ?? undefined,
      compound: unit.compound,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      area: unit.area,
      description,
      reason: match.matchReason,
    });

    totalROI += financials.projectedROI;
    matchSum += match.matchScore;
  }

  // Quality over quantity: cap at 5, require at least 1 valid unit.
  if (conciergeUnits.length > 5) {
    conciergeUnits.splice(5);
  }
  if (conciergeUnits.length === 0) {
    throw new Error('No valid units found for portfolio curation.');
  }

  // 4. Generate personalized welcome note
  const personalNote = await generateSierraNoteFromTemplate(lead, conciergeUnits);
  const matchingScore = matchSum / conciergeUnits.length;
  const estimatedPortfolioROI = totalROI / conciergeUnits.length;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sierra-estates.net';
  const whatsappLink = `${siteUrl}/concierge/${leadId}?gallery=true`;

  // 5. Create Concierge Selection document
  const portfolioRef = await addDoc(collection(db, COLLECTIONS.conciergeSelections), {
    leadId,
    leadName: lead.name,
    units: conciergeUnits,
    personalNote,
    matchingScore,
    estimatedPortfolioROI,
    createdAt: serverTimestamp(),
    status: 'generated',
    whatsappLink,
  });

  // 6. Update Lead record with a pointer to the new portfolio
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    conciergePortfolioId: portfolioRef.id,
    lastCuratedAt: serverTimestamp(),
  });

  return {
    id: portfolioRef.id,
    leadId,
    leadName: lead.name,
    createdAt: Timestamp.now(),
    units: conciergeUnits,
    personalNote,
    whatsappLink,
    matchingScore,
    estimatedPortfolioROI,
    status: 'generated',
  };
}

/**
 * Generate a luxury property description in Sierra's voice.
 */
async function generateLuxuryDescription(lead: Lead, unit: Unit): Promise<string> {
  const prompt = `You are Sierra, a luxury property concierge for Sierra Estates Realty.
Generate a 2-3 sentence description of this property for a high-net-worth client.
The tone should be warm, editorial, and exclusive. Emphasize lifestyle and investment potential.

Property: ${unit.title}
Price: ${unit.price} EGP
Compound: ${unit.compound}
Bedrooms: ${unit.bedrooms ?? 'N/A'}
Client Budget: ${lead.budget ?? lead.budgetMax} EGP

Write ONLY the description. No extra text.`;

  const response = await GoogleAIService.generateContent('portfolio-engine', 'S8:description', { user: prompt });
  return response.trim();
}

/**
 * Generate personalized welcome note for the Concierge Selection.
 */
async function generateSierraNoteFromTemplate(lead: Lead, units: ConciergeUnit[]): Promise<string> {
  const unitTitles = units.map(u => u.title).join(', ');

  const prompt = `You are Sierra, the personal concierge at Sierra Estates Realty.
Write a warm, 3-4 sentence welcome message for a VIP client about their curated portfolio selection.

Client Name: ${lead.name}
Selected Units: ${unitTitles}
Budget: ${lead.budget || lead.budgetMax} EGP
Investment Goal: Long-term wealth creation

The tone should be:
- Warm and professional
- Celebratory (they've been pre-selected for VIP access)
- Exclusive (emphasize the curated, personalized nature)
- Action-oriented (gently guide them to request viewings)

Write ONLY the message. No extra text.`;

  const response = await GoogleAIService.generateContent('portfolio-engine', 'S8:note', { user: prompt });
  return response.trim();
}

/**
 * Builds the WhatsApp portfolio message body (pure — safe to import from client
 * or server). The actual outbound send is enqueued server-side via
 * lib/server/whatsapp-queue in app/api/concierge/send-whatsapp.
 */
export function buildPortfolioMessage(portfolio: ConciergeSelection): string {
  return `
👋 *${portfolio.leadName}*, Laila here!

I've curated ${portfolio.units.length} exclusive properties just for you:

${portfolio.units
  .map(
    (u) => `
📍 *${u.title}*
💰 ${u.price.toLocaleString()} EGP | ${u.matchScore}% Match
🏠 ${u.reason}
`
  )
  .join('')}

*Portfolio ROI*: ${portfolio.estimatedPortfolioROI.toFixed(1)}% annually

👉 *View Full Gallery:* ${portfolio.whatsappLink}

${portfolio.personalNote}

Ready to explore? Reply "VIEWING" or click the gallery link above! ✨
`;
}

/**
 * Marks a lead's portfolio as sent (client SDK). The real WhatsApp dispatch is
 * enqueued by the API route; this only records the send on the lead document.
 */
export async function sendPortfolioViaWhatsApp(
  leadId: string,
  _portfolio: ConciergeSelection,
  _phoneNumber: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    conciergePortfolioSentAt: serverTimestamp(),
    conciergePortfolioSentVia: 'whatsapp',
  });
}

/**
 * Track portfolio engagement metrics (analytics for the feedback loop).
 */
export async function trackPortfolioEngagement(
  portfolioId: string,
  action: 'viewed' | 'unit_clicked' | 'requested_viewing'
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.conciergeSelections, portfolioId), {
    [`engagement.${action}`]: serverTimestamp(),
  });
}
