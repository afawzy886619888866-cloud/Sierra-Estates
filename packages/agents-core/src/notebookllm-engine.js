import { GoogleGenerativeAI } from '@google/generative-ai';














































export class NotebookLMEngine {
  
  

  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Returns default verified grounding documents from Sierra Estates Information Bank
   */
  static getDefaultCorpus() {
    return [
      {
        id: 'new-cairo-master-directory',
        title: 'New Cairo & Golden Square Real Estate Master Directory (2026)',
        type: 'excel',
        content: `Comprehensive New Cairo (التجمع الخامس والقاهرة الجديدة) Compound & Pricing Encyclopedia (2026 Q1 Verified Data):

1. Mivida by Emaar Misr (Golden Square - 90th Street South):
   - Master Plan: 890 acres, Santa Barbara & Tuscan Spanish architecture, 33 acres central park, Lake District, international schools (Repton & ESNK).
   - Unit Types & Price Range:
     * Apartments (135 - 230 sqm): 13,500,000 - 24,000,000 EGP (Avg: 95,000 - 135,000 EGP/sqm).
     * Twin Houses & Townhouses (240 - 320 sqm): 26,000,000 - 38,000,000 EGP.
     * Standalone Villas (330 - 520 sqm): 42,000,000 - 85,000,000 EGP.
   - Financial Metrics: Highest resale liquidity and rental yield in New Cairo (8.5% - 10.2% annual net in USD/EGP). Preferred by multinational corporate expats.

2. Palm Hills New Cairo & Katameya Extension:
   - Master Plan: 500 acres, 82% open greenery, championship golf views, direct access from Middle Ring Road & 90th Street North.
   - Unit Types & Price Range:
     * Palm Hills Village Luxury Apartments: 12,000,000 - 21,000,000 EGP (85,000 - 115,000 EGP/sqm).
     * Signature Standalone Villas (380 - 750 sqm): 45,000,000 - 110,000,000 EGP.
   - Highlights: Ultra-low density, private clubhouses, steady +28% YoY capital appreciation.

3. Mountain View iCity (New Cairo - North of 90th Street):
   - Master Plan: 500 acres, 4D biophilic design, car-free ground level with underground ring road, central crystal lagoon.
   - Unit Types & Price Range:
     * iVillas (Sky / Garden with private pool/roof, 180 - 280 sqm): 14,000,000 - 24,000,000 EGP (Avg: 65,000 - 85,000 EGP/sqm).
     * Millennial Apartments (115 - 165 sqm): 7,500,000 - 12,500,000 EGP.
   - Payment Plans: 10% down payment with 7 to 8 years equal installments on primary releases.

4. Hyde Park New Cairo (Main 90th Street):
   - Master Plan: 6 Million sqm, featuring Egypt's largest private park (600,000 sqm Central Park), Park Corner district, and HydeOut lifestyle concourse.
   - Unit Types & Price Range:
     * Apartments (135 - 210 sqm): 8,500,000 - 16,500,000 EGP (60,000 - 88,000 EGP/sqm).
     * Townhouses & Twin Houses: 19,000,000 - 32,000,000 EGP.
     * Standalone Villas: 36,000,000 - 78,000,000 EGP.
   - Highlights: Exceptional green footprint, high livability, ready-to-move and immediate delivery options.

5. Villette & Eastown by SODIC (Golden Square & AUC District):
   - Villette: 300 acres, 4 Pocket Parks, Club S sports complex. Sky Condos & Townhouses avg 85,000 - 125,000 EGP/sqm.
   - Eastown: Directly adjacent to AUC on South 90th St. Unbeatable student and corporate rental occupancy (11% - 13% gross yield).

6. Swan Lake Residences by Hassan Allam (1st Settlement):
   - Master Plan: 438 acres, prime connectivity between Suez Road and New Cairo.
   - Unit Types & Price Range: Luxury apartments from 18M EGP; Standalone lakefront villas from 55M to 140M EGP. Highest luxury tier.

7. Mostakbal City (مدينة المستقبل - The Green Extension of New Cairo):
   - Key Compounds: Il Bosco City (Misr Italia), Haptown (Hassan Allam), Bloomfields (Tatweer Misr), Aliva (Mountain View).
   - Entry Price/sqm: 42,000 - 68,000 EGP/sqm.
   - Payment Structure: 5% down payment, 8 to 10 years installments. Best high-leverage capital growth for long-term investors (2028-2032 horizon).`,
        metadata: { compound: 'New Cairo Master Encyclopedia', category: 'Information Bank' }
      },
      {
        id: 'new-cairo-investment-rules',
        title: 'New Cairo Unit Selection & Investment Arbitrage Framework',
        type: 'text',
        content: `Decision Matrix for New Cairo Real Estate Buyers & Investors:

1. Best for Immediate Move-in & Family Luxury:
   - #1 Recommendation: Mivida (Emaar) or Villette (SODIC) in Golden Square. Complete infrastructure, operational schools, and high community standards.

2. Best Value-for-Money with Extended Installments:
   - #1 Recommendation: Mountain View iCity (iVillas offer villa-living at apartment budget with 8-year payment plans) or Mostakbal City primary releases (up to 10-year plans).

3. Best for High Rental Cashflow:
   - Eastown (SODIC) near AUC or Mivida (Emaar) 2-bedroom furnished apartments (average monthly rent 45,000 - 85,000 EGP / $1,000 - $1,800 USD).

4. Underpriced Arbitrage Rule:
   - Any resale listing priced >= 12% below its compound trailing 90-day moving average is flagged as an "Immediate Action Bargain".
   - Direct owner resale with 100% cash commands an 8% to 15% discount versus developer installment pricing.

5. Capital Protection & Inflation Hedge:
   - New Cairo prime gated compounds generated +34% compound annual capital appreciation over the last 36 months, significantly beating local inflation.`,
        metadata: { category: 'Advisory Engine' }
      },
      {
        id: 'cairo-plaza-blueprint',
        title: 'Cairo Plaza Towers & Nile Front Commercial Blueprint',
        type: 'contract',
        content: `Cairo Plaza Towers Overview:
- Twin 39-storey premier high-rise towers rising 126 meters along the Nile Corniche in Downtown Cairo.
- Total Built Up Area: ~150,000 sqm.
- Key Anchor Tenants: Banque Misr Headquarters, Cairo Amman Bank, Alfa Market Concourse.
- Commercial & Administrative space generates 18-22% annual rental yields with corporate institutional tenants.`,
        metadata: { compound: 'Cairo Plaza', category: 'Administrative & Commercial' }
      }
    ];
  }

  /**
   * Performs strict grounded Q&A and intelligent unit recommendations over New Cairo Information Bank.
   */
  async queryGroundedSources(
    sources,
    userQuery,
    language = 'ar'
  ) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const activeSources = sources.length > 0 ? sources : NotebookLMEngine.getDefaultCorpus();

    const formattedSources = activeSources
      .map((s, idx) => `=== SOURCE [${idx + 1}]: ${s.title} (ID: ${s.id}, Type: ${s.type}) ===\n${s.content}\n`)
      .join('\n\n');

    const prompt = `You are the "Sierra Information Bank" (بنك معلومات سييرا العقاري) — the definitive AI Real Estate Authority for New Cairo (التجمع الخامس، المربع الذهبي، ومدينة المستقبل) and luxury Egyptian developments.

You know everything about New Cairo: every major compound (Mivida, Palm Hills, Mountain View iCity, Hyde Park, Villette, Eastown, Swan Lake, Azzar, Mostakbal City), price per square meter, payment structures, down payments, delivery dates, developer reputation, and rental yields.

When a user asks ANY question about units or property in New Cairo, you must:
1. Analyze their exact requirements (budget, unit type, family needs, investment yield vs immediate move-in).
2. Recommend the best matching compound(s) and specific unit types based on verified data.
3. Compare options with exact prices per sqm, total cost ranges, and payment plans (cash discounts vs installments).
4. Provide direct citations matching the source ID and excerpt.

GROUNDING REPOSITORY:
${formattedSources}

USER QUESTION:
"${userQuery}"

TARGET LANGUAGE: ${language === 'ar' ? 'Arabic (اللغة العربية الاحترافية والواضحة مع مصطلحات السوق العقاري المصري)' : 'English'}

Output your response strictly as a JSON object matching this schema:
{
  "answer": "Comprehensive, structured, and authoritative answer. If recommending units, provide top picks with prices, payment plans, advantages, and key considerations.",
  "citations": [
    {
      "sourceId": "Source identifier",
      "sourceTitle": "Title of the source document",
      "excerpt": "Verbatim quote or tight factual excerpt from the source supporting the recommendation",
      "confidence": 0.98
    }
  ],
  "groundingScore": 0.98,
  "keyTakeaways": [
    "Key recommendation or price benchmark 1",
    "Key recommendation or payment structure 2",
    "Actionable next step 3"
  ]
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) ;
  }

  /**
   * Generates a 2-person engaging Audio Overview (Deep Dive podcast script) from provided source documents.
   */
  async generateAudioOverview(
    sources,
    focusTopic,
    language = 'ar'
  ) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const activeSources = sources.length > 0 ? sources : NotebookLMEngine.getDefaultCorpus();

    const formattedSources = activeSources
      .map((s, idx) => `[Source ${idx + 1} - ${s.title}]:\n${s.content}`)
      .join('\n\n');

    const prompt = `You are creating an elite "Sierra Information Bank Audio Overview" (Deep Dive podcast style) analyzing New Cairo real estate and investment opportunities.
Co-hosts:
- Host_Alex (أحمد): Energetic, asks the questions every buyer and investor is wondering about in New Cairo.
- Analyst_Sara (سارة): Expert real estate analyst, breaks down compound comparisons (Mivida vs Palm Hills vs iCity), price per sqm, ROI, and best payment strategies.

Sources:
${formattedSources}

Focus Area: ${focusTopic || 'دليل المقارنة الشامل لأفضل كمبوندات ووحدات القاهرة الجديدة والمربع الذهبي'}
Language: ${language === 'ar' ? 'Arabic (حوار عربي حيوي، ذكي، وسلس باللهجة المصرية الراقية المناسبة للاستثمار)' : 'English'}

Generate an engaging, natural-sounding multi-turn dialogue (6 to 10 turns) where the two hosts unpack the data, uncover hidden opportunities, compare compounds, and discuss actionable next steps.

Output strictly as a JSON object:
{
  "title": "Title of the Audio Overview episode",
  "summary": "1-2 sentence executive briefing of the episode",
  "totalEstimatedDurationMinutes": 4,
  "script": [
    {
      "speaker": "Host_Alex",
      "speakerArabic": "أحمد (المحاور)",
      "dialogue": "النص الحواري للمتحدث الأول...",
      "focusTopic": "مقدمة الحلقة والمشهد العام"
    },
    {
      "speaker": "Analyst_Sara",
      "speakerArabic": "سارة (محللة الاستثمار)",
      "dialogue": "الرد الحواري التحليلي بالأرقام والفرص...",
      "focusTopic": "تحليل الأرقام وعوائد المتر المربع"
    }
  ]
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) ;
  }

  /**
   * Generates a comprehensive Executive Study Guide & Investment Briefing Memo.
   */
  async generateStudyGuide(
    sources,
    language = 'ar'
  ) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const activeSources = sources.length > 0 ? sources : NotebookLMEngine.getDefaultCorpus();

    const formattedSources = activeSources
      .map((s, idx) => `[Source ${idx + 1} - ${s.title}]:\n${s.content}`)
      .join('\n\n');

    const prompt = `You are the Sierra Information Bank Study Guide Synthesizer for New Cairo Real Estate.
Synthesize the provided source documents into an executive briefing study guide for New Cairo property acquisition and investment.

Sources:
${formattedSources}

Language: ${language === 'ar' ? 'Arabic' : 'English'}

Output strictly as a JSON object:
{
  "title": "New Cairo Real Estate Executive Guide — بنك المعلومات العقاري",
  "executiveSummary": "Concise high-level synthesis of New Cairo compounds, price per sqm benchmarks, and investment recommendations.",
  "keyInvestmentMetrics": [
    { "metric": "Golden Square Avg Resale", "value": "95,000 - 135,000 EGP/sqm", "significance": "Premium benchmark in Mivida and Villette" }
  ],
  "glossary": [
    { "term": "Golden Square (المربع الذهبي)", "definition": "The most prestigious residential corridor in New Cairo along North & South 90th streets." }
  ],
  "faqs": [
    { "question": "ما هو أفضل كمبوند للسكن الفوري في التجمع الخامس؟", "answer": "كمبوند ميفيدا (إعمار) وفيليت (سوديك) بفضل اكتمال البنية التحتية والخدمات التشغيلية.", "sourceCitation": "New Cairo & Golden Square Real Estate Master Directory" }
  ],
  "recommendedActions": [
    "حدد أولويتك بين الاستلام الفوري كاش أو خطط السداد الطويلة حتى 8-10 سنوات.",
    "استغل فرص إعادة البيع المباشرة من الملاك لتحقيق خصم فوري يتراوح بين 10-15%."
  ]
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) ;
  }
}
