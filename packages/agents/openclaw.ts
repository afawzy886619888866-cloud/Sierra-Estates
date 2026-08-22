import { z } from 'zod';
import pino from 'pino';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { obsidian } from '../obsidian/src/index';
import { VertexAgent } from '@sierra-estates/agents-core';
import { addListing, editInventory, AirtableConfig, UnitListingData } from './tools/inventoryTools';
import { generateInventoryReport } from './tools/reportTools';

const logger = pino({ name: 'openclaw-agent' });

export class OpenClawAgent {
  private airtableConfig: AirtableConfig;
  private ai?: GoogleGenAI;
  public readonly vertexAgent: VertexAgent;
  private memoryStore = obsidian;

  constructor(config: { airtableApiKey?: string; airtableBaseId?: string; airtableTableName?: string; aiApiKey?: string }) {
    this.airtableConfig = {
      apiKey: config.airtableApiKey || '',
      baseId: config.airtableBaseId || '',
      tableName: config.airtableTableName || 'Listings',
    };
    
    if (config.aiApiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey: config.aiApiKey });
      } catch (e) {
        logger.warn({ msg: 'GoogleGenAI initialization skipped' });
      }
    }

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
      const memories = await this.memoryStore.search(query, []);
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
      await this.memoryStore.set(id, value, tags);
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
   * Intelligent Rule-based & LLM-grounded parser for WhatsApp broker group real estate messages (Arabic / English)
   */
  parseWhatsAppRealEstateText(rawText: string, sender: string = 'WhatsApp Broker', groupName: string = 'Broker Group') {
    const textLower = rawText.toLowerCase();

    // 1. Detect Compound / Location
    const compoundMap: Record<string, string> = {
      'mivida': 'Mivida',
      'ميفيدا': 'Mivida',
      'hyde park': 'Hyde Park',
      'هايد بارك': 'Hyde Park',
      'palm hills': 'Palm Hills',
      'بالم هيلز': 'Palm Hills',
      'mountain view': 'Mountain View',
      'ماونتن فيو': 'Mountain View',
      'marassi': 'Marassi',
      'مراسي': 'Marassi',
      'swan lake': 'Swan Lake',
      'سوان ليك': 'Swan Lake',
      'cfc': 'Cairo Festival City',
      'كايرو فيستيفال': 'Cairo Festival City',
      'madinaty': 'Madinaty',
      'مدينتي': 'Madinaty',
      'rehab': 'Al Rehab',
      'الرحاب': 'Al Rehab',
      'zed': 'Zed East',
      'زد': 'Zed East',
      'badya': 'Badya',
      'بادية': 'Badya',
      'tag sultan': 'Tag Sultan',
      'تاج سلطان': 'Tag Sultan',
      'new cairo': 'New Cairo',
      'التجمع': 'New Cairo',
      'التجمع الخامس': 'New Cairo - 5th Settlement'
    };

    let detectedCompound = 'New Cairo';
    for (const [key, val] of Object.entries(compoundMap)) {
      if (rawText.includes(key) || textLower.includes(key)) {
        detectedCompound = val;
        break;
      }
    }

    // 2. Detect Property Type
    let propertyType = 'Apartment';
    if (/(فيلا مستقلة|standalone|villa|فيلا)/i.test(rawText)) propertyType = 'Standalone Villa';
    else if (/(تاون هاوس|townhouse|town house)/i.test(rawText)) propertyType = 'Townhouse';
    else if (/(توين هاوس|twinhouse|twin house)/i.test(rawText)) propertyType = 'Twinhouse';
    else if (/(بنتهاوس|penthouse|روف)/i.test(rawText)) propertyType = 'Penthouse';
    else if (/(دوبلكس|duplex)/i.test(rawText)) propertyType = 'Duplex';
    else if (/(شالية|chalet|شاليه)/i.test(rawText)) propertyType = 'Chalet';
    else if (/(مكتب|office|تجاري|commercial|محل|clinic|عيادة)/i.test(rawText)) propertyType = 'Commercial/Office';
    else if (/(شقة|apartment|شقه)/i.test(rawText)) propertyType = 'Apartment';

    // 3. Extract Area (sqm) FIRST
    let area_sqm = 200;
    const areaMatch = rawText.match(/(\d{2,4})\s*(?:متر|م²|م2|sqm|sq\.m|m2|meter)/i);
    if (areaMatch) {
      area_sqm = parseInt(areaMatch[1], 10);
    }

    // 4. Extract Price
    let price = 0;
    const priceMillionMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:مليون|million|m\b)/i);
    if (priceMillionMatch) {
      price = parseFloat(priceMillionMatch[1]) * 1000000;
    } else {
      const priceRawMatch = rawText.match(/(?:سعر|price|إجمالي|total|مطلوب)\s*[:=]?\s*([\d,]+)/i);
      if (priceRawMatch) {
        price = parseFloat(priceRawMatch[1].replace(/,/g, ''));
      } else {
        const numbers = rawText.match(/\b\d{6,9}\b/g);
        if (numbers) {
          price = parseInt(numbers[0], 10);
        }
      }
    }
    if (price === 0) price = 12500000; // Sensible default luxury benchmark

    // 5. Extract Bedrooms
    let bedrooms = 3;
    const bedMatch = rawText.match(/(\d)\s*(?:غرف|نوم|غرفة|bed|beds|bedrooms|bd)/i);
    if (bedMatch) {
      bedrooms = parseInt(bedMatch[1], 10);
    }

    // 6. Finishing Grade
    let finishing = 'semi_finished';
    if (/(الترا سوبر لوكس|ultra super lux|fully finished|مفروش|تشطيب كامل|سوبر لوكس)/i.test(rawText)) {
      finishing = 'fully_finished';
    } else if (/(نصف تشطيب|semi finished|محارة وحلوق)/i.test(rawText)) {
      finishing = 'semi_finished';
    } else if (/(core and shell|طوب احمر|بدون تشطيب)/i.test(rawText)) {
      finishing = 'core_and_shell';
    }

    // 7. Extract Features
    const features: string[] = [];
    if (/(حديقة|garden|جاردن)/i.test(rawText)) features.push('G');
    if (/(حمام سباحة|pool|بسين)/i.test(rawText)) features.push('P');
    if (/(روف|roof|سطح)/i.test(rawText)) features.push('R');
    if (/(بحيرة|lake view|فيو بحيرات|water view)/i.test(rawText)) features.push('L');
    if (/(كورنر|corner|ناصية)/i.test(rawText)) features.push('C');

    // 8. Valuation Score & Urgency Score
    let urgencyScore = 60;
    let valuationScore = 75;
    if (/(لقطة|سعر محروق|فرصة|distress|urgent|مستعجل|اقل من سعر السوق|أقل من السوق)/i.test(rawText)) {
      urgencyScore = 95;
      valuationScore = 90;
    }

    // 9. Sierra Code Synthesis
    const locPrefix = detectedCompound.slice(0, 2).toUpperCase();
    const typePrefix = propertyType.slice(0, 1).toUpperCase();
    const finishPrefix = finishing === 'fully_finished' ? 'F' : finishing === 'semi_finished' ? 'S' : 'U';
    const priceM = (price / 1000000).toFixed(1).replace(/\.0$/, '');
    const featSuffix = features.length > 0 ? `+${features.join('+')}` : '';
    const sierraCode = `${locPrefix}-${typePrefix}-${bedrooms}${finishPrefix}-${priceM}M${featSuffix}`;

    return {
      type: propertyType,
      location: detectedCompound,
      compound: detectedCompound,
      price,
      currency: 'EGP',
      area_sqm,
      bedrooms,
      bathrooms: Math.max(1, bedrooms - 1),
      finishing,
      features,
      urgencyScore,
      valuationScore,
      sierraCode,
      contact_info: sender,
      sourceGroup: groupName,
      notes: rawText.slice(0, 250),
    };
  }

  /**
   * End-to-End WhatsApp Group Real Estate Ingestion & Inventory Pipeline
   */
  async ingestWhatsAppGroupMessage(rawText: string, sender: string = 'WhatsApp Broker Group', groupName: string = 'New Cairo Broker Network') {
    logger.info({ msg: 'OpenClaw: Ingesting WhatsApp real estate listing', sender, groupName });
    
    // Parse message
    const parsedData = this.parseWhatsAppRealEstateText(rawText, sender, groupName);

    // Save to Inventory & Memory
    const addResult = await addListing(this.airtableConfig, parsedData);

    // Save to Obsidian execution memory
    const memoryKey = `whatsapp-ingest-${Date.now()}`;
    await this.saveProjectMemory(memoryKey, {
      rawMessage: rawText,
      extracted: parsedData,
      source: groupName,
      sender,
      ingestedAt: new Date().toISOString()
    }, ['whatsapp-ingest', 'inventory-created', parsedData.location.toLowerCase().replace(/\s+/g, '-')]);

    return {
      success: true,
      sierraCode: parsedData.sierraCode,
      compound: parsedData.location,
      propertyType: parsedData.type,
      priceFormatted: `${parsedData.price.toLocaleString()} EGP`,
      valuationScore: parsedData.valuationScore,
      urgencyScore: parsedData.urgencyScore,
      resultMessage: addResult,
      data: parsedData,
    };
  }

  /**
   * Main entry point for a WhatsApp webhook
   */
  async handleWhatsAppMessage(messageText: string, sender: string, isGroup: boolean = false): Promise<string> {
    logger.info({ msg: 'Received WhatsApp message', hasSender: sender.length > 0, messageLength: messageText.length, isGroup });
    
    if (isGroup) {
      // Ingest listing directly from group chat
      const ingestResult = await this.ingestWhatsAppGroupMessage(messageText, sender, 'WhatsApp Luxury Group');
      return `🏰 *Sierra Estates Intelligence*\nListing successfully ingested!\n📌 *Code:* [${ingestResult.sierraCode}]\n📍 *Compound:* ${ingestResult.compound}\n💰 *Price:* ${ingestResult.priceFormatted}\n⭐ *Valuation Score:* ${ingestResult.valuationScore}/100`;
    }

    // If Gemini AI is not initialized, return a structured fallback response
    if (!this.ai) {
      return `🏰 *Sierra Estates AI Concierge*\nThank you for reaching out. Your inquiry regarding "${messageText}" has been logged and assigned to our luxury property advisors.`;
    }

    // Step 0: Fetch project memory to ground OpenClaw
    const memoryContext = await this.getProjectMemory(messageText);

    const systemInstruction = `You are OpenClaw, the senior AI real estate advisor & broker concierge on WhatsApp for Sierra Estates.
    You have access to shared project memory and tools.
    You can help the team by managing inventory, adding listings, generating reports, and reasoning with Google Vertex AI.
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
