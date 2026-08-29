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
  dialogue: string;
  focusTopic: string;
}

export interface AudioOverviewResponse {
  title: string;
  summary: string;
  script: AudioOverviewDialogueTurn[];
  totalEstimatedDurationMinutes: number;
}

export class NotebookLMEngine {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Performs strict grounded Q&A over multiple uploaded sources with inline citations.
   */
  async queryGroundedSources(
    sources: SourceDocument[],
    userQuery: string
  ): Promise<GroundedSynthesisResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const formattedSources = sources
      .map((s, idx) => `=== SOURCE [${idx + 1}]: ${s.title} (ID: ${s.id}, Type: ${s.type}) ===\n${s.content}\n`)
      .join('\n\n');

    const prompt = `You are the Sierra Estates NotebookLM Grounded Research Engine.
You have been provided with the following verified source documents regarding luxury real estate, developer payment plans, compound data, and investment portfolios in Egypt.

${formattedSources}

USER QUESTION:
"${userQuery}"

GROUNDING INSTRUCTIONS:
1. Base your answer EXCLUSIVELY on the facts presented in the sources above.
2. If the source material does not contain the answer, explicitly state that it is not in the provided documents.
3. For every major claim, provide direct citations matching the source ID and an exact excerpt.
4. Output your response as a valid JSON object matching this schema:
{
  "answer": "Comprehensive, structured explanation answering the user query.",
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
   * Generates a 2-person engaging Audio Overview (Deep Dive podcast script) from provided source documents.
   */
  async generateAudioOverview(
    sources: SourceDocument[],
    focusTopic?: string
  ): Promise<AudioOverviewResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured for NotebookLM Engine.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const formattedSources = sources
      .map((s, idx) => `[Source ${idx + 1} - ${s.title}]:\n${s.content}`)
      .join('\n\n');

    const prompt = `You are creating an elite "Audio Overview" (NotebookLM Deep Dive style podcast) for Sierra Estates Private Wealth & Real Estate Advisory.
Co-hosts:
- Host_Alex: Energetic, curious, frames strategic questions, sets the scene for investors.
- Analyst_Sara: Razor-sharp financial & real estate analyst, breaks down compound metrics, price per sqm, cap rates, cash flow, and market arbitrage.

Sources:
${formattedSources}

Focus Area: ${focusTopic || 'Comprehensive Portfolio & Compound Investment Analysis'}

Generate an engaging, natural-sounding multi-turn dialogue where the two hosts unpack the data, uncover hidden opportunities, compare compounds, and discuss actionable next steps.

Output strictly as a JSON object:
{
  "title": "Title of the Audio Overview episode",
  "summary": "1-2 sentence executive briefing of the episode",
  "totalEstimatedDurationMinutes": 5,
  "script": [
    {
      "speaker": "Host_Alex",
      "dialogue": "Welcome back to the Sierra Estates Deep Dive...",
      "focusTopic": "Introduction & Market Context"
    },
    {
      "speaker": "Analyst_Sara",
      "dialogue": "Thanks Alex. What really jumps out at me in these numbers is...",
      "focusTopic": "Data Breakdown"
    }
  ]
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) as AudioOverviewResponse;
  }
}
