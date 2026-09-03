 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Enhanced Stage 9 Closer Agent
 * AI-powered proposal generation, negotiation, and deal closing
 * Uses Claude / Gemini for complex negotiation logic
 */

import { getRecord, insertRecord, updateRecord } from '../../db/lib/index.js';

/**
 * The orchestration codes this agent tracks ('S9_proposal_ready', ...) are not
 * members of the deals.stage CHECK, which is the deal's own vocabulary. The
 * code is kept verbatim in metadata.orchestrationStage and the closest deal
 * stage is written to the column, so both survive and the write is accepted.
 */
const DEAL_STAGE_FOR = {
  S9_proposal_ready: 'proposal',
  S9_signing_initiated: 'under_contract',
  S10_complete: 'closed_won',
};

/** Merge into the deal's metadata rather than replacing it — one JSONB column. */
async function patchDeal(
  dealId,
  orchestrationStage,
  metadataPatch = {},
) {
  const deal = await getRecord('deals', dealId);
  await updateRecord('deals', dealId, {
    stage: _nullishCoalesce(DEAL_STAGE_FOR[orchestrationStage], () => ( 'proposal')),
    metadata: { ...(_nullishCoalesce(_optionalChain([deal, 'optionalAccess', _ => _.metadata]), () => ( {}))), ...metadataPatch, orchestrationStage },
  });
}











export class CloserAgentEnhanced {
  

  static getInstance() {
    if (!CloserAgentEnhanced.instance) {
      CloserAgentEnhanced.instance = new CloserAgentEnhanced();
    }
    return CloserAgentEnhanced.instance;
  }

  /**
   * Generate an intelligent, personalized proposal
   */
  async generateIntelligentProposal(context) {
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
            return _optionalChain([message, 'access', _2 => _2.content, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.type]) === 'text' ? message.content[0].text : '';
          }
        } catch (e) {
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
          const data = (await res.json()) 

;
          return _optionalChain([data, 'access', _5 => _5.candidates, 'optionalAccess', _6 => _6[0], 'optionalAccess', _7 => _7.content, 'optionalAccess', _8 => _8.parts, 'optionalAccess', _9 => _9[0], 'optionalAccess', _10 => _10.text]) || this.generateFallbackProposal(context);
        }
      } catch (err) {
        console.warn('[CloserAgentEnhanced] Gemini fetch error:', err.message);
      }
    }

    return this.generateFallbackProposal(context);
  }

   generateFallbackProposal(context) {
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
    context,
    counterOffer
  ) {
    const askingPrice = (_optionalChain([context, 'access', _11 => _11.propertyData, 'optionalAccess', _12 => _12.price]) ) || counterOffer.amount * 1.1;
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
    dealId,
    leadPhone,
    proposalContent,
    terms
  ) {
    // proposals has a fixed column set; the agent's free-form fields
    // (content, terms, provenance) go in roi_calculation, its JSONB column.
    // 'finalized' is not a member of the proposals status CHECK — 'draft' is
    // what a finalized-but-unsent proposal is in that vocabulary.
    const proposal = await insertRecord('proposals', {
      dealId,
      offeredPrice: Number(_nullishCoalesce(_nullishCoalesce(terms.offeredPrice, () => ( terms.price)), () => ( 0))),
      paymentTerms: typeof terms.paymentTerms === 'string' ? terms.paymentTerms : null,
      status: 'draft',
      roiCalculation: {
        leadPhone,
        content: proposalContent,
        ...terms,
        orchestrationStage: 'S9_proposal_finalized',
        generatedBy: 'closer-agent-enhanced',
      },
    });

    await patchDeal(dealId, 'S9_proposal_ready', { proposalId: proposal.id });

    return proposal.id;
  }

  /**
   * Initiate signing with personalized follow-up message
   */
  async initiateSigning(dealId, leadPhone) {
    const envelopeId = `ENV-${dealId}-${Date.now()}`;
    const signingMessage = `تهانينا! تم إعداد عقد الوحدة للتعاقد الإكتروني/المباشر. معرف العقد: ${envelopeId}`;

    await patchDeal(dealId, 'S9_signing_initiated', {
      signingEnvelope: {
        envelopeId,
        status: 'created',
        createdAt: new Date().toISOString(),
      },
    });

    return { envelopeId, message: signingMessage };
  }

  /**
   * Complete closing and create sale record
   */
  async completeClosing(dealId, leadPhone) {
    const deal = await getRecord




('deals', dealId);

    // Mapped onto the sales columns: unitId/salePrice/closingDate/status, not
    // the assetId/salePriceEGP/closeDate/paymentStatus names Firestore took.
    await insertRecord('sales', {
      unitId: _nullishCoalesce(_optionalChain([deal, 'optionalAccess', _13 => _13.listingId]), () => ( 'ASSET_UNKNOWN')),
      leadId: _nullishCoalesce(_optionalChain([deal, 'optionalAccess', _14 => _14.leadId]), () => ( null)),
      salePrice: Number(_nullishCoalesce(_nullishCoalesce(_optionalChain([deal, 'optionalAccess', _15 => _15.metadata, 'optionalAccess', _16 => _16.negotiatedPrice]), () => ( _optionalChain([deal, 'optionalAccess', _17 => _17.dealValue]))), () => ( 0))),
      closingDate: new Date().toISOString(),
      status: 'completed',
      notes: `Closed by closer-agent-enhanced for ${leadPhone}`,
    });

    await patchDeal(dealId, 'S10_complete', { closedAt: new Date().toISOString() });
  }
}

export const closerAgent = CloserAgentEnhanced.getInstance();
export default closerAgent;
