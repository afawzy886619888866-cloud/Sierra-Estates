import { BaseAgent, type AgentResult } from './base-agent';
import { GoogleGenAI } from '@google/genai';
import { ObsidianMemory } from '@sierra-estates/obsidian';

export interface VertexAgentOptions {
  name?: string;
  description?: string;
  projectId?: string;
  location?: string;
  modelName?: string;
  systemInstruction?: string;
  tools?: any[];
  /** Optional GenAI App Builder / Vertex AI Search datastore resource path or ID */
  datastoreId?: string;
}

export class VertexAgent extends BaseAgent {
  public readonly name: string;
  public readonly description: string;
  private ai: GoogleGenAI;
  private modelName: string;
  private systemInstruction: string;
  private tools: any[];
  private datastoreId?: string;
  private memory: ObsidianMemory;

  constructor(options: VertexAgentOptions = {}) {
    super();
    this.name = options.name || 'vertex-agent';
    this.description = options.description || 'Enterprise Vertex AI Agent with Gemini multi-modal reasoning, GenAI App Builder grounding, and tool orchestration.';
    this.modelName = options.modelName || 'gemini-2.5-pro';
    this.systemInstruction = options.systemInstruction || 'You are an advanced Vertex AI Agent powered by Gemini on Google Cloud.';
    this.tools = options.tools || [];
    this.datastoreId = options.datastoreId || process.env.VERTEX_SEARCH_DATASTORE_ID;
    this.memory = new ObsidianMemory();

    const projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT || 'sierra-estates-core';
    const location = options.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    this.ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: location,
    });
  }

  /**
   * Execute a task prompt using Vertex AI Gemini model
   */
  public async executeTask(prompt: string, context?: Record<string, any>): Promise<AgentResult> {
    console.log(`[VertexAgent:${this.name}] Executing task with prompt length: ${prompt.length}`);

    try {
      // 1. Fetch relevant memory context from Obsidian Memory
      let memoryContext = '';
      if (this.memory && typeof this.memory.search === 'function') {
        const memories = await this.memory.search(prompt, [this.name, 'vertex-agent']);
        if (memories.length > 0) {
          memoryContext = `\n\nRELEVANT MEMORY CONTEXT:\n${memories.map((m: any) => `- ${typeof m.value === 'string' ? m.value : JSON.stringify(m.value)}`).join('\n')}`;
        }
      }

      const fullPrompt = `${prompt}${memoryContext}${context ? `\n\nADDITIONAL CONTEXT:\n${JSON.stringify(context, null, 2)}` : ''}`;

      // 2. Prepare GenAI App Builder Retrieval grounding tool if datastoreId is present
      const activeTools = [...this.tools];
      if (this.datastoreId) {
        activeTools.push({
          retrieval: {
            vertexAiSearch: {
              datastore: this.datastoreId,
            },
          },
        });
      }

      // 3. Call Vertex AI
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
        config: {
          systemInstruction: this.systemInstruction,
          ...(activeTools.length > 0 ? { tools: activeTools } : {}),
        },
      });

      const responseText = response.text || '';

      // 4. Store execution result in Obsidian Memory
      if (this.memory && typeof this.memory.set === 'function') {
        await this.memory.set(`vertex-task-${this.name}-${Date.now()}`, {
          prompt,
          response: responseText,
          datastoreId: this.datastoreId,
          timestamp: new Date().toISOString(),
        }, ['vertex-agent', this.name]);
      }

      return {
        success: true,
        data: {
          text: responseText,
          candidates: response.candidates,
          functionCalls: response.functionCalls,
        },
      };
    } catch (error: any) {
      // PHASE 10 FIX (no-fabrication): the old catch block returned
      // success:true with an invented "Titan Vertex AI Engine" market
      // briefing — fabricated prices, yields and appreciation numbers
      // presented as grounded Vertex AI Search output. A failed provider
      // call is now an honest failure: the caller learns the API call did
      // not happen and no synthetic market data is emitted anywhere.
      console.warn(`[VertexAgent:${this.name}] Vertex API call failed (${error.message || 'unknown'}). Reporting the failure honestly — no fabricated briefing.`);

      if (this.memory && typeof this.memory.set === 'function') {
        await this.memory.set(`vertex-task-${this.name}-${Date.now()}`, {
          prompt,
          error: error?.message ?? String(error),
          timestamp: new Date().toISOString(),
        }, ['vertex-agent', this.name, 'failed']);
      }

      return {
        success: false,
        error: `Vertex AI call failed: ${error?.message ?? 'unknown error'}`,
        data: {
          text: 'Vertex AI grounded search is unavailable — no market briefing can be produced without the provider. Configure GOOGLE_CLOUD_PROJECT and VERTEX_SEARCH_DATASTORE_ID credentials; no fabricated figures are shown.',
          mode: 'unavailable-honest-failure',
        },
      };
    }
  }

  public async execute(record: any): Promise<AgentResult> {
    const prompt = typeof record.payload === 'string' 
      ? record.payload 
      : record.payload?.prompt || JSON.stringify(record.payload);
      
    return this.executeTask(prompt, record.payload?.context);
  }
}
