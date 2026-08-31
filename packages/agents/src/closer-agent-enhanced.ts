/**
 * Enhanced Stage 9 Closer Agent
 * AI-powered proposal generation, negotiation, and deal closing
 * Uses Claude / Gemini for complex negotiation logic
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (!getApps().length) initializeApp();
  return getFirestore();
}

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
   * Generate an intelligent, personalized proposal
   */
  async generateIntelligentProposal(context: ProposalContext): Promise<string> {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    const systemPrompt = `You are a master real estate closer for Sierra Estates, a luxury property developer in New Cairo.
Your job is to generate a personalized, compelling proposal that:
1. Addresses the buyer's specific needs
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
Lead Phone: ${context.leadPhone}
Property: ${context.propertyCode} (${JSON.stringify(context.propertyData)})
Previous offers: ${context.previousOffers.length > 0 ? context.previousOffers.map(o => `${o.amount} EGP on ${o.date}`).join(', ') : 'None'}
Negotiation history: ${context.negotiationHistory.slice(-3).join(' → ') || 'Fresh negotiation'}`;

      if (process.env.ANTHROPIC_API_KEY) {
        try {
          // Dynamic safe require to prevent bundler errors when SDK is absent
          const anthropicModule = typeof require !== 'undefined' ? eval('require')('@anthropic-ai/sdk') : null;
          if (anthropicModule && anthropicModule.Anthropic) {
            const anthropic = new anthropicModule.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const message = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1500,
              system: systemPrompt,
              messages: [{ role: 'user', content: userMessage }],
            });
            return message.content[0]?.type === 'text' ? message.content[0].text : '';
          }
        } catch {
          // Fall through to fallback template if SDK is missing
      }
    }

    if (geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
            ],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          };
          return data.candidates?.[0]?.content?.parts?.[0]?.text || this.generateFallbackProposal(context);
        }
      } catch (err: any) {
        console.warn('[CloserAgentEnhanced] Gemini fetch error:', err.message);
      }
    }

    return this.generateFallbackProposal(context);
  }

  private generateFallbackProposal(context: ProposalContext): string {
    return `🏢 **عرض استثماري مخصص — سييرا إستيتس**

عزيزنا العميل، بناءً على اهتمامك بالوحدة رقم **${context.propertyCode}**، يسعدنا تقديم هذا العرض الاستثماري الحصري:

✨ **تفاصيل الوحدة والتسليم**:
• موقع متميز في التجمع الخامس / القاهرة الجديدة.
• تشطيب كامل وأعلى معدل عائد على الاستثمار (ROI).

جداول السداد المتاحة:
1️⃣ **كاش**: خصم يصل إلى 15% عند السداد الفوري.
2️⃣ **تقسيط على 6 سنوات**: 10% مقدم والباقي بأقساط متساوية.

للتنسيق وحجز معاينة فورا، تواصل معنا مباشرة.`;
  }

  /**
   * Analyze counter-offer and suggest response
   */
  async analyzeCounterOffer(
    context: ProposalContext,
    counterOffer: { amount: number; terms: string }
  ): Promise<{ recommendation: string; suggestedResponse: string }> {
    const askingPrice = (context.propertyData?.price as number) || counterOffer.amount * 1.1;
    const diffRatio = (askingPrice - counterOffer.amount) / askingPrice;

    if (diffRatio <= 0.05) {
      return {
        recommendation: 'accept',
        suggestedResponse: `عرض ممتاز! السعر المطلوب ${counterOffer.amount} ج.م مقبول ومناسب جداً. يسعدنا البدء في إجراءات التعاقد.`,
      };
    } else if (diffRatio <= 0.15) {
      const counterAmount = Math.round(counterOffer.amount + (askingPrice - counterOffer.amount) * 0.5);
      return {
        recommendation: 'counter',
        suggestedResponse: `نشكركم على العرض. تقريباً للمسافات، نود اقتراح سعر ${counterAmount} ج.م مع مرونة في جدول الأقساط.`,
      };
    } else {
      return {
        recommendation: 'walk',
        suggestedResponse: `العرض المقدم يبتعد عن القيمة السوقية الحقيقية للوحدة. يسعدنا تقديم وحدات بديلة تناسب ميزانيتكم.`,
      };
    }
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
    const db = getDb();

    const proposalRef = await db.collection('proposals').add({
      dealId,
      leadPhone,
      content: proposalContent,
      ...terms,
      status: 'finalized',
      stage: 'S9_proposal_finalized',
      createdAt: new Date().toISOString(),
      generatedBy: 'closer-agent-enhanced',
    });

    await db.collection('deals').doc(dealId).set({
      proposalId: proposalRef.id,
      stage: 'S9_proposal_ready',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return proposalRef.id;
  }

  /**
   * Initiate signing with personalized follow-up message
   */
  async initiateSigning(dealId: string, leadPhone: string): Promise<{ envelopeId: string; message: string }> {
    const envelopeId = `ENV-${dealId}-${Date.now()}`;
    const signingMessage = `تهانينا! تم إعداد عقد الوحدة للتعاقد الإكتروني/المباشر. معرف العقد: ${envelopeId}`;

    const db = getDb();

    await db.collection('deals').doc(dealId).set({
      signingEnvelope: {
        envelopeId,
        status: 'created',
        createdAt: new Date().toISOString(),
      },
      stage: 'S9_signing_initiated',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { envelopeId, message: signingMessage };
  }

  /**
   * Complete closing and create sale record
   */
  async completeClosing(dealId: string, leadPhone: string): Promise<void> {
    const db = getDb();

    const doc = await db.collection('deals').doc(dealId).get();
    const data = doc.exists ? doc.data()! : {};

    await db.collection('sales').add({
      dealId,
      assetId: data.assetId || 'ASSET_UNKNOWN',
      leadPhone,
      salePriceEGP: data.negotiatedPrice || 0,
      closeDate: new Date().toISOString(),
      paymentStatus: 'completed',
      createdAt: new Date().toISOString(),
      closedBy: 'closer-agent-enhanced',
    });

    await db.collection('deals').doc(dealId).set({
      stage: 'S10_complete',
      status: 'closed_won',
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
}

export const closerAgent = CloserAgentEnhanced.getInstance();
export default closerAgent;
