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
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
  }

  public async execute(record: ExchangeRecord): Promise<AgentResult> {
    console.log(`[Agent: ${this.name}] Executing task: ${record.id}`);
    
    const criteria = record.payload.criteria as Record<string, unknown> | undefined;
    const inventory = (record.payload.inventory as Array<Record<string, unknown>> | undefined) ?? [];

    if (!criteria) {
      return {
        success: false,
        error: 'Missing search criteria in payload.',
      };
    }

    // ANTI-FABRICATION GUARD (Master Rule 5): without a real inventory slice
    // we must refuse to match rather than let the LLM invent properties.
    if (!Array.isArray(inventory) || inventory.length === 0) {
      return {
        success: true,
        data: {
          matches: [],
          noMatchReason: 'NO_REAL_INVENTORY_PROVIDED',
          message: 'No live inventory records were supplied with this task. Refusing to generate fictional property matches. Attach a database inventory slice in payload.inventory and re-run.',
          timestamp: new Date().toISOString(),
        },
      };
    }

    try {
      // Prompt Gemini to rank ONLY the supplied real inventory against the criteria.
      // The model is explicitly forbidden from inventing units, prices or availability.
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `You are a luxury real estate matching agent at Sierra Estates.
Rank the following REAL inventory records against the client criteria.
STRICT RULES:
- Use ONLY the units provided in INVENTORY below. Never invent, rename, or embellish a unit.
- Never change or estimate prices, availability, or compound names.
- If no provided unit fits the criteria, return an empty array.
- matchScore reflects fit against the criteria (budget, location, bedrooms, type).

CLIENT CRITERIA:
${JSON.stringify(criteria, null, 2)}

INVENTORY (real database records only):
${JSON.stringify(inventory, null, 2)}
`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Ranked subset of the provided real inventory. Empty if none fit.',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'The exact id of the inventory record being recommended' },
                name: { type: Type.STRING, description: 'The exact compound/title of that inventory record' },
                matchScore: { type: Type.INTEGER, description: 'Match score out of 100 based on the criteria' },
                rationale: { type: Type.STRING, description: 'A 1-sentence factual explanation of why this REAL unit fits the criteria' }
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
