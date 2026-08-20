/**
 * Enhanced Stage 9 Closer Agent
 * AI-powered proposal generation, negotiation, and deal closing
 * Uses Claude Opus for complex negotiation logic
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Anthropic } from '@anthropic-ai/sdk';
import { sharedMemory, instrument } from '@sierra-estates/memory-engine';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ProposalContext {
  dealId: string;
  leadPhone: string;
  propertyCode: string;
  buyerProfile: Record<string, unknown>;
  propertyData: Record<string, unknown>;
  previousOffers: Array<{ amount: number; date: string }>;
  negotiationHistory: string[];
}

export class CloserAgentEnhanced {
  private static instance: CloserAgentEnhanced;

  static getInstance(): CloserAgentEnhanced {
    if (!CloserAgentEnhanced.instance) {
      CloserAgentEnhanced.instance = new CloserAgentEnhanced();
    }
    return CloserAgentEnhanced.instance;
  }

  /**
   * Generate an intelligent, personalized proposal using Claude
   */
  async generateIntelligentProposal(context: ProposalContext): Promise<string> {
    const systemPrompt = `You are a master real estate closer for Sierra Estates, a luxury property developer in New Cairo.
Your job is to generate a personalized, compelling proposal that:
1. Addresses the buyer's specific needs (from their profile)
2. Highlights unique property features
3. Presents pricing competitively but profitably
4. Includes flexible payment terms options
5. Creates urgency without pressure
6. Is written in professional Arabic/English mix (Egyptian dialect)

Always include:
- Property overview with ROI/appreciation potential
- Payment plan options (cash, 10% down, installment schedules)
- Flexible closing timeline
- Warranty and after-sales support
- Next steps and decision timeline`;

    const userMessage = `Generate a proposal for:
Lead: ${context.buyerProfile ? JSON.stringify(context.buyerProfile) : 'Premium buyer'}
Property: ${context.propertyCode} (${JSON.stringify(context.propertyData)})
Previous offers: ${context.previousOffers.length > 0 ? context.previousOffers.map(o => `${o.amount} EGP on ${o.date}`).join(', ') : 'None'}
Negotiation history: ${context.negotiationHistory.slice(-3).join(' → ') || 'Fresh negotiation'}

Create a compelling proposal that closes this deal.`;

    return instrument(
      {
        agentId: 'closer',
        action: 'generateProposal',
        skillsUsed: ['proposal-writing', 'pricing'],
        context: { propertyCode: context.propertyCode },
      },
      async () => {
        const message = await anthropic.messages.create({
          model: 'claude-opus-5',
          max_tokens: 16000,
          // Adaptive thinking: proposals weigh buyer profile, offer history and
          // pricing together, which is exactly the kind of reasoning it helps.
          thinking: { type: 'adaptive' },
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        const text = message.content.find((b: any) => b.type === 'text') as { type: 'text'; text: string } | undefined;
        if (!text || text.type !== 'text' || !text.text.trim()) {
          // Treated as a failure so the learning loop sees it — an empty
          // proposal returned as success would look like a win.
          throw new Error('Proposal generation returned no text');
        }
        return text.text;
      }
    );
  }

  /**
   * Analyze counter-offer and suggest response using Claude
   */
  async analyzeCounterOffer(
    context: ProposalContext,
    counterOffer: { amount: number; terms: string }
  ): Promise<{ recommendation: string; suggestedResponse: string }> {
    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Buyer counter-offered: ${counterOffer.amount} EGP with terms: "${counterOffer.terms}"

Original property asking price from context: ${JSON.stringify(context.propertyData)}
Buyer profile: ${JSON.stringify(context.buyerProfile)}

Analyze this counter-offer:
1. Is it viable for us to accept?
2. Should we counter-offer again? If so, what amount and terms?
3. What's your recommended response to send to the buyer (in Egyptian Arabic, warm but professional)?

Format as JSON: { recommendation: "accept|counter|walk", suggestedAmount?: 0, suggestedResponse: "..." }`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(responseText);

    return {
      recommendation: parsed.recommendation,
      suggestedResponse: parsed.suggestedResponse,
    };
  }

  /**
   * Finalize and save proposal to database
   */
  async finalizeProposal(
    dealId: string,
    leadPhone: string,
    proposalContent: string,
    terms: Record<string, unknown>
  ): Promise<string> {
    const proposalRef = await db.collection('proposals').add({
      dealId,
      leadPhone,
      content: proposalContent,
      ...terms,
      status: 'finalized',
      stage: 'S9_proposal_finalized',
      createdAt: new Date().toISOString(),
      generatedBy: 'claude-opus',
    });

    await db.collection('deals').doc(dealId).update({
      proposalId: proposalRef.id,
      stage: 'S9_proposal_ready',
      updatedAt: new Date().toISOString(),
    });

    // Record in shared memory
    await sharedMemory.recordConversationTurn(
      leadPhone,
      'closer',
      'outbound',
      proposalContent
    );

    return proposalRef.id;
  }

  /**
   * Initiate signing with personalized follow-up message
   */
  async initiateSigning(dealId: string, leadPhone: string): Promise<{ envelopeId: string; message: string }> {
    const envelopeId = `ENV-${dealId}-${Date.now()}`;

    const signingMessage = await this.generateSigningMessage(leadPhone, dealId);

    await db.collection('deals').doc(dealId).update({
      signingEnvelope: {
        envelopeId,
        status: 'created',
        createdAt: new Date().toISOString(),
      },
      stage: 'S9_signing_initiated',
      updatedAt: new Date().toISOString(),
    });

    await sharedMemory.recordConversationTurn(leadPhone, 'closer', 'outbound', signingMessage);

    return { envelopeId, message: signingMessage };
  }

  /**
   * Generate personalized signing message using Claude
   */
  private async generateSigningMessage(leadPhone: string, dealId: string): Promise<string> {
    const leadProfile = await sharedMemory.getLeadProfile(leadPhone);

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Write a warm, professional closing message in Egyptian Arabic for a buyer about to sign their property agreement.
Lead name: ${leadProfile?.name || 'Valued Client'}
Property: ${leadProfile?.lastInterestedProperty || 'their selected property'}

Make it congratulatory, reassuring, and action-oriented. Keep it under 100 words.`,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : 'تهانينا! وصلنا للخطوة الأخيرة. التفاصيل قريبة.';
  }

  /**
   * Complete closing and create sale record
   */
  async completeClosing(dealId: string, leadPhone: string): Promise<void> {
    const doc = await db.collection('deals').doc(dealId).get();
    if (!doc.exists) throw new Error(`Deal not found: ${dealId}`);

    const data = doc.data()!;

    // Create sale record
    await db.collection('sales').add({
      dealId,
      assetId: data.assetId,
      leadId: data.stakeholderId,
      leadPhone,
      salePriceEGP: data.negotiatedPrice || 0,
      commissionRate: data.commissionRate || 2.5,
      commissionEGP: data.commissionEGP || 0,
      closeDate: new Date().toISOString(),
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      closedBy: 'claude-opus-closer',
    });

    await db.collection('deals').doc(dealId).update({
      stage: 'S10_complete',
      status: 'closed_won',
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Send celebration message
    const celebrationMsg = 'تم إتمام الصفقة بنجاح! مبروك على استثمارك. فريقنا سيتابع معك من الآن.';
    await sharedMemory.recordConversationTurn(leadPhone, 'closer', 'outbound', celebrationMsg);
  }
}

export const closerAgent = CloserAgentEnhanced.getInstance();
export default closerAgent;
