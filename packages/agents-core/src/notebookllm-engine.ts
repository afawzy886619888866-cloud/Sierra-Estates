import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SourceDocument {
  id: string;
  title: string;
  type: 'pdf' | 'excel' | 'text' | 'chat' | 'contract';
  content: string;
  metadata?: Record<string, any>;
}

export interface SourceCitation {
  sourceId: string;
  sourceTitle: string;
  excerpt: string;
  confidence: number;
}

export interface GroundedSynthesisResponse {
  answer: string;
  citations: SourceCitation[];
  groundingScore: number;
  keyTakeaways: string[];
}

export interface AudioOverviewDialogueTurn {
  speaker: 'Host_Alex' | 'Analyst_Sara';
  speakerArabic: 'أحمد (المحاور)' | 'سارة (محللة الاستثمار)';
  dialogue: string;
  focusTopic: string;
}

export interface AudioOverviewResponse {
  title: string;
  summary: string;
  script: AudioOverviewDialogueTurn[];
  totalEstimatedDurationMinutes: number;
}

export interface StudyGuideResponse {
  title: string;
  executiveSummary: string;
  keyInvestmentMetrics: { metric: string; value: string; significance: string }[];
  glossary: { term: string; definition: string }[];
  faqs: { question: string; answer: string; sourceCitation: string }[];
  recommendedActions: string[];
}

export class NotebookLMEngine {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Returns default verified grounding documents from Sierra Estates repository
   */
  static getDefaultCorpus(): SourceDocument[] {
    return [
      {
        id: 'cairo-plaza-master-doc',
        title: 'Cairo Plaza Towers — Architectural & Investment Blueprint',
        type: 'contract',
        content: `Cairo Plaza Towers consists of twin 39-storey premier high-rise towers rising 126 meters along the Nile Corniche in Bulaq, Downtown Cairo.
Building specifications:
- Land Area: 10,000 sqm. Total Built Up Area: ~150,000 sqm across 39 floors.
- Key Tenants & Anchor Institutions: Banque Misr Headquarters, Cairo Amman Bank, Alfa Market Retail Concourse, and multinational diplomatic suites.
- Connectivity: Direct access to 26th July Corridor, 6th October Bridge, and Nasser & Orabi Metro Interchange (Lines 1, 2, 3).
- Financial Metrics: Commercial spaces command 18-22% annual rental yields due to downtown administrative scarcity. Corporate suites range from 150 sqm to full 1,200 sqm floor plates.
- Infrastructure: 4-level subterranean high-capacity parking, advanced BMS, 24/7 dual redundant emergency power generators, and integrated central air purification.`,
        metadata: { compound: 'Cairo Plaza', category: 'Administrative & Commercial' }
      },
      {
        id: 'new-cairo-prime-inventory',
        title: 'New Cairo & Golden Square Real Estate Pricing Matrix (2026)',
        type: 'excel',
        content: `Verified Market Statistics for 2026 Q1 across 9,094 Sierra Estates inventory units:
1. Mivida (Emaar):
   - Average Resale Price/sqm: 95,000 - 140,000 EGP.
   - Rental Yield: 7.8% - 9.2% annual net in USD/EGP.
   - Highlights: Gated luxury, Santa Barbara & Tuscan architecture, Lake District, international schools.
2. Hyde Park (New Cairo):
   - Average Price/sqm: 60,000 - 90,000 EGP.
   - 600,000 sqm Central Park, high liquidity in resale apartments and twin houses.
3. Mountain View iCity & Hyde Park:
   - Average Price/sqm: 55,000 - 85,000 EGP.
   - Distinctive iVillas with private garden/roof, 7-8 year payment structures on primary releases.
4. Palm Hills (New Cairo & Katameya Extension):
   - Standalone villas 35M - 85M EGP.
   - Premium golf community, low density, high capital appreciation (avg +28% YoY).
5. Villette by SODIC (Golden Square):
   - Sky Condos & Townhouses avg 80,000 - 115,000 EGP/sqm.
   - Club S sports complex, Pocket Parks.`,
        metadata: { category: 'Master Inventory' }
      },
      {
        id: 'sierra-financial-advisory-rules',
        title: 'Sierra Estates Investment Advisory & Arbitrage Rules',
        type: 'text',
        content: `Advisory Rules:
1. Underpriced Arbitrage: Any unit priced >= 12% below its compound trailing 90-day moving average is classified as an "Immediate Action Underpriced Opportunity".
2. Cash Discount Benchmark: Direct owner resale listings with 100% upfront cash offer an average 8% to 15% discount versus extended developer installment plans.
3. Inflation Hedge: Prime real estate in New Cairo and North Coast has consistently outperformed Egyptian inflation, yielding real asset preservation of +32% CAGR over 36 months.
4. Rental Demands: Furnished 2-3 bedroom units in Mivida and Palm Hills experience < 15 days vacancy between multinational tenant tenancies.`,
        metadata: { category: 'Advisory Engine' }
      }
    ];
  }

  /**
   * Performs strict grounded Q&A over multiple uploaded sources with inline citations.
   */
  async queryGroundedSources(
    sources: SourceDocument[],
    userQuery: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<GroundedSynthesisResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const activeSources = sources.length > 0 ? sources : NotebookLMEngine.getDefaultCorpus();

    const formattedSources = activeSources
      .map((s, idx) => `=== SOURCE [${idx + 1}]: ${s.title} (ID: ${s.id}, Type: ${s.type}) ===\n${s.content}\n`)
      .join('\n\n');

    const prompt = `You are the Google NotebookLM Grounded Research Engine for Sierra Estates (سييرا العقارية).
You have been provided with the following verified source documents regarding luxury real estate, developer payment plans, compound data, and investment portfolios in Egypt.

${formattedSources}

USER QUESTION:
"${userQuery}"

TARGET LANGUAGE: ${language === 'ar' ? 'Arabic (اللغة العربية الواضحة والدقيقة مع المصطلحات العقارية)' : 'English'}

GROUNDING INSTRUCTIONS:
1. Base your answer EXCLUSIVELY on the facts presented in the sources above.
2. If the source material does not contain the answer, explicitly state that it is not in the provided documents.
3. For every major claim, provide direct citations matching the source ID and an exact excerpt.
4. Output your response as a valid JSON object matching this schema:
{
  "answer": "Comprehensive, structured explanation answering the user query in the target language.",
  "citations": [
    {
      "sourceId": "Source identifier",
      "sourceTitle": "Title of the source document",
      "excerpt": "Verbatim quote or tight paraphrase directly supporting the statement",
      "confidence": 0.95
    }
  ],
  "groundingScore": 0.98,
  "keyTakeaways": ["Takeaway 1", "Takeaway 2"]
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) as GroundedSynthesisResponse;
  }

  /**
   * Generates a 2-person engaging Audio Overview (NotebookLM Deep Dive podcast script) from provided source documents.
   */
  async generateAudioOverview(
    sources: SourceDocument[],
    focusTopic?: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<AudioOverviewResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const activeSources = sources.length > 0 ? sources : NotebookLMEngine.getDefaultCorpus();

    const formattedSources = activeSources
      .map((s, idx) => `[Source ${idx + 1} - ${s.title}]:\n${s.content}`)
      .join('\n\n');

    const prompt = `You are creating an elite "Google NotebookLM Audio Overview" (Deep Dive podcast style) for Sierra Estates.
Co-hosts:
- Host_Alex (أحمد): Energetic, curious, frames strategic questions, sets the scene for real estate investors.
- Analyst_Sara (سارة): Razor-sharp financial & real estate analyst, breaks down compound metrics, price per sqm, cap rates, cash flow, and market arbitrage.

Sources:
${formattedSources}

Focus Area: ${focusTopic || 'تحليل شامل لعوائد الاستثمار العقاري وفرص الماستر إنفنتوري في القاهرة الجديدة وكايرو بلازا'}
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
    return JSON.parse(text) as AudioOverviewResponse;
  }

  /**
   * Generates a comprehensive Executive Study Guide & Investment Briefing Memo.
   */
  async generateStudyGuide(
    sources: SourceDocument[],
    language: 'ar' | 'en' = 'ar'
  ): Promise<StudyGuideResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const activeSources = sources.length > 0 ? sources : NotebookLMEngine.getDefaultCorpus();

    const formattedSources = activeSources
      .map((s, idx) => `[Source ${idx + 1} - ${s.title}]:\n${s.content}`)
      .join('\n\n');

    const prompt = `You are the Google NotebookLM Study Guide Synthesizer for Sierra Estates.
Synthesize the provided source documents into an executive briefing study guide.

Sources:
${formattedSources}

Language: ${language === 'ar' ? 'Arabic' : 'English'}

Output strictly as a JSON object:
{
  "title": "Executive Study Guide & Investment Briefing",
  "executiveSummary": "Concise high-level synthesis of all provided documents.",
  "keyInvestmentMetrics": [
    { "metric": "Metric Name", "value": "120K EGP/sqm", "significance": "Why it matters" }
  ],
  "glossary": [
    { "term": "Cap Rate", "definition": "Annual net rental income divided by total asset purchase price." }
  ],
  "faqs": [
    { "question": "Key Question?", "answer": "Grounded answer", "sourceCitation": "Source document reference" }
  ],
  "recommendedActions": [
    "Actionable step 1",
    "Actionable step 2"
  ]
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) as StudyGuideResponse;
  }
}
