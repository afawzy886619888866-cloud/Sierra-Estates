import { z } from 'zod';
import pino from 'pino';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { obsidian } from '@sierra-estates/obsidian';
import { VertexAgent } from '@sierra-estates/agents-core';
import { addListing, editInventory, AirtableConfig } from './tools/inventoryTools';
import { generateInventoryReport } from './tools/reportTools';

const logger = pino({ name: 'openclaw-agent' });

export class OpenClawAgent {
  private airtableConfig: AirtableConfig;
  private ai: GoogleGenAI;
  public readonly vertexAgent: VertexAgent;

  constructor(config: { airtableApiKey: string; airtableBaseId: string; airtableTableName: string; aiApiKey: string }) {
    this.airtableConfig = {
      apiKey: config.airtableApiKey,
      baseId: config.airtableBaseId,
      tableName: config.airtableTableName,
    };
    this.ai = new GoogleGenAI({ apiKey: config.aiApiKey });
    this.vertexAgent = new VertexAgent({
      name: 'openclaw-vertex-agent',
      description: 'OpenClaw Enterprise Vertex AI Agent wired with Gemini multi-modal reasoning and project memory',
      systemInstruction: 'You are OpenClaw, the intelligent Sierra Estates real-estate agent powered by Google Vertex AI and Gemini. Learn from shared project memory and perform tasks cleanly.',
    });
  }

  /**
   * Search and retrieve shared project memory from Obsidian store
   */
  async getProjectMemory(query: string = ''): Promise<string> {
    try {
      const memories = await obsidian.search(query, []);
      if (!memories || memories.length === 0) return '';

      const formatted = memories
        .slice(-15) // Keep most recent 15 entries for context window efficiency
        .map((m) => `- [${m.id}] (${m.tags.join(', ')}): ${typeof m.value === 'string' ? m.value : JSON.stringify(m.value)}`)
        .join('\n');

      return `\n\n[Shared Project Memory]\n${formatted}`;
    } catch (err) {
      logger.error({ err, msg: 'Failed to retrieve project memory' });
      return '';
    }
  }

  /**
   * Record conversation or action memory into Obsidian store
   */
  async saveProjectMemory(id: string, value: any, tags: string[] = ['whatsapp-log']): Promise<void> {
    try {
      await obsidian.set(id, value, tags);
    } catch (err) {
      logger.error({ err, msg: 'Failed to save project memory' });
    }
  }

  /**
   * Delegate complex tasks directly to Google Vertex AI Agent
   */
  async queryVertexAgent(prompt: string, context?: Record<string, any>) {
    logger.info({ msg: 'Delegating task to Google Vertex AI Agent', promptLength: prompt.length });
    const memory = await this.getProjectMemory(prompt);
    const fullPrompt = `${prompt}${memory}`;
    
    const result = await this.vertexAgent.executeTask(fullPrompt, context);
    if (result.success) {
      await this.saveProjectMemory(`vertex-execution-${Date.now()}`, {
        prompt,
        result: result.data,
      }, ['vertex-execution']);
    }
    return result;
  }

  /**
   * Main entry point for a WhatsApp webhook
   */
  async handleWhatsAppMessage(messageText: string, sender: string, isGroup: boolean = false): Promise<string> {
    logger.info({ msg: 'Received WhatsApp message', hasSender: sender.length > 0, messageLength: messageText.length, isGroup });
    
    // Step 0: Fetch project memory to ground OpenClaw
    const memoryContext = await this.getProjectMemory(messageText);

    const systemInstruction = `You are OpenClaw, a real estate assistant & intelligent agent on WhatsApp for Sierra Estates.
    You have access to shared project memory and tools.
    You can help the team by managing inventory, adding listings, generating reports, and reasoning with Google Vertex AI.
    If asked to add a listing, extract details and call addListing.
    If asked for a report, call generateInventoryReport.
    If asked to edit inventory, call editInventory.
    Be extremely polite, concise, and professional. Use emojis appropriately.${memoryContext}`;

    const addListingDeclaration: FunctionDeclaration = {
      name: 'addListing',
      description: 'Adds a new real estate listing to the database.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: 'Property type (e.g., Villa, Apartment, Office)' },
          location: { type: Type.STRING, description: 'Location (e.g., Mivida, New Cairo)' },
          price: { type: Type.NUMBER, description: 'Price' },
          currency: { type: Type.STRING, description: 'Currency (e.g., EGP, USD)' },
          area_sqm: { type: Type.NUMBER, description: 'Area in square meters' },
          bedrooms: { type: Type.NUMBER, description: 'Number of bedrooms' },
          bathrooms: { type: Type.NUMBER, description: 'Number of bathrooms' },
          contact_info: { type: Type.STRING, description: 'Contact info (defaults to sender)' },
          notes: { type: Type.STRING, description: 'Additional notes' }
        },
        required: ['type', 'location']
      }
    };

    const editInventoryDeclaration: FunctionDeclaration = {
      name: 'editInventory',
      description: 'Edits the price of an existing real estate listing based on location.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: 'Location of the property' },
          newPrice: { type: Type.NUMBER, description: 'The new price to set' }
        },
        required: ['location', 'newPrice']
      }
    };

    const generateReportDeclaration: FunctionDeclaration = {
      name: 'generateInventoryReport',
      description: 'Generates a report of the current real estate inventory.',
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    };

    try {
      // Step 1: Call Gemini
      let response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `[Sender: ${sender}]\n\n${messageText}` }] }],
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [addListingDeclaration, editInventoryDeclaration, generateReportDeclaration] }]
        }
      });

      // Step 2: Handle Tool Calls
      let finalResponseText = response.text || '';
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        let toolResponseStr = '';

        if (call.name === 'addListing') {
          const args = call.args as any;
          if (!args.contact_info) args.contact_info = sender;
          toolResponseStr = await addListing(this.airtableConfig, args);
        } else if (call.name === 'editInventory') {
          const args = call.args as any;
          toolResponseStr = await editInventory(this.airtableConfig, args.location, args.newPrice);
        } else if (call.name === 'generateInventoryReport') {
          toolResponseStr = await generateInventoryReport(this.airtableConfig);
        }

        response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: `[Sender: ${sender}]\n\n${messageText}` }] },
            { role: 'model', parts: [{ functionCall: call }] },
            { role: 'user', parts: [{ functionResponse: { name: call.name, response: { result: toolResponseStr } } }] }
          ],
          config: {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [addListingDeclaration, editInventoryDeclaration, generateReportDeclaration] }]
          }
        });

        finalResponseText = response.text || toolResponseStr;
      }

      // Step 3: Record conversation memory into Obsidian store
      await this.saveProjectMemory(`whatsapp-msg-${Date.now()}`, {
        sender,
        message: messageText,
        reply: finalResponseText,
      }, ['whatsapp-interaction']);

      return finalResponseText;
    } catch (error) {
      logger.error({ err: error, msg: 'Gemini API Error' });
      return 'Sorry, I encountered an internal error while processing your request. Please try again.';
    }
  }
}
