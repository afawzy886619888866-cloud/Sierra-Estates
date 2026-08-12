import { BaseAgent, type AgentResult } from '../base-agent';
import type { ExchangeRecord } from '@sierra-estates/exchange/exchange-client';
import { GoogleGenAI, Type } from '@google/genai';

export class PropertyMatcherAgent extends BaseAgent {
  public readonly name = 'property-matcher';
  public readonly description = 'Matches a lead with suitable properties based on criteria.';
  
  private ai: GoogleGenAI;

  constructor() {
    super();
    // Vertex AI mode: billed to the GCP project via IAM/ADC instead of a
    // personal Gemini API key. Requires Application Default Credentials in
    // the runtime environment (GOOGLE_APPLICATION_CREDENTIALS or Workload
    // Identity Federation) with the Vertex AI User role on the project.
    this.ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
  }

  public async execute(record: ExchangeRecord): Promise<AgentResult> {
    console.log(`[Agent: ${this.name}] Executing task: ${record.id}`);
    
    const criteria = record.payload.criteria as Record<string, unknown> | undefined;

    if (!criteria) {
      return {
        success: false,
        error: 'Missing search criteria in payload.',
      };
    }

    try {
      // Prompt Gemini to act as a luxury agent and return a structured JSON list of properties
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `You are an elite luxury real estate agent at Sierra Estates.
Match the following client criteria to 3 highly tailored (fictional) luxury properties from our exclusive portfolio.
Ensure the properties sound ultra-luxurious, cinematic, and perfectly aligned with the request.

CLIENT CRITERIA:
${JSON.stringify(criteria, null, 2)}
`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of matched luxury properties',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'A unique identifier for the property (e.g. prop_982)' },
                name: { type: Type.STRING, description: 'The ultra-luxury property name (e.g. The Sapphire Penthouse)' },
                matchScore: { type: Type.INTEGER, description: 'Match score out of 100 based on the criteria' },
                rationale: { type: Type.STRING, description: 'A 1-sentence cinematic explanation of why this property is the perfect match' }
              },
              required: ['id', 'name', 'matchScore', 'rationale']
            }
          }
        }
      });

      let matchedProperties = [];
      if (response.text) {
        matchedProperties = JSON.parse(response.text);
      }

      console.log(`[Agent: ${this.name}] Task ${record.id} complete. Found ${matchedProperties.length} matches.`);

      return {
        success: true,
        data: {
          matches: matchedProperties,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error(`[Agent: ${this.name}] Error during Gemini generation:`, error);
      return {
        success: false,
        error: error.message || 'Gemini generation failed',
      };
    }
  }
}
