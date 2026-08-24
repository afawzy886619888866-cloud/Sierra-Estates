import { z } from 'zod';
import pino from 'pino';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import * as XLSX from 'xlsx';
import { obsidian } from '../obsidian/src/index';
import { VertexAgent } from '@sierra-estates/agents-core';
import {
  addListing,
  batchIngestListings,
  editInventory,
  AirtableConfig,
  UnitListingData,
  BatchIngestResult,
} from './tools/inventoryTools';
import { generateInventoryReport } from './tools/reportTools';
import {
  classifySourceType,
  isNewListing,
  findGroup,
  GroupSourceType,
  WhatsAppGroup,
  WHATSAPP_GROUP_REGISTRY,
} from './tools/whatsappGroupRegistry';

const logger = pino({ name: 'openclaw-agent' });

/** A raw WhatsApp message ready for batch ingestion */
export interface WhatsAppMessage {
  text: string;
  sender: string;
  groupName: string;
  groupId?: string;
  timestamp?: string;
}

/**
 * A single record from the master sheet (real-listings.json schema).
 * All fields mirror what is actually stored in data/real-listings.json.
 */
export interface MasterSheetUnit {
  id: number;
  code?: string;
  ownerName?: string;
  mobile?: string;
  status?: string;
  cmp?: string;
  compound?: string;
  zone?: string;
  type?: string;
  beds?: number;
  baths?: number;
  area?: number;
  gardenArea?: number;
  price?: number;
  mode?: string;
  finishing?: string;
  ownerType?: string;
  tag?: string;
  comment?: string;
  updatedAt?: string;
}

export class OpenClawAgent {
  private airtableConfig: AirtableConfig;
  private ai?: GoogleGenAI;
  public readonly vertexAgent: VertexAgent;
  private memoryStore = obsidian;

  constructor(config: {
    airtableApiKey?: string;
    airtableBaseId?: string;
    airtableTableName?: string;
    aiApiKey?: string;
  }) {
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
      description:
        'OpenClaw Enterprise Vertex AI Agent wired with Gemini multi-modal reasoning and project memory',
      systemInstruction:
        'You are OpenClaw, the intelligent Sierra Estates real-estate agent powered by Google Vertex AI and Gemini. Learn from shared project memory and perform tasks cleanly.',
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
        .map(
          (m) =>
            `- [${m.id}] (${m.tags.join(', ')}): ${typeof m.value === 'string' ? m.value : JSON.stringify(m.value)}`,
        )
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
  async saveProjectMemory(id: string, value: unknown, tags: string[] = ['whatsapp-log']): Promise<void> {
    try {
      await this.memoryStore.set(id, value, tags);
    } catch (err) {
      logger.error({ err, msg: 'Failed to save project memory' });
    }
  }

  /**
   * Delegate complex tasks directly to Google Vertex AI Agent
   */
  async queryVertexAgent(prompt: string, context?: Record<string, unknown>) {
    logger.info({ msg: 'Delegating task to Google Vertex AI Agent', promptLength: prompt.length });
    const memory = await this.getProjectMemory(prompt);
    const fullPrompt = `${prompt}${memory}`;

    const result = await this.vertexAgent.executeTask(fullPrompt, context);
    if (result.success) {
      await this.saveProjectMemory(
        `vertex-execution-${Date.now()}`,
        { prompt, result: result.data },
        ['vertex-execution'],
      );
    }
    return result;
  }

  /**
   * Intelligent rule-based & LLM-grounded parser for WhatsApp broker group
   * real estate messages (Arabic / English).
   * Now also classifies sourceType from sender/group heuristics.
   */
  parseWhatsAppRealEstateText(
    rawText: string,
    sender: string = 'WhatsApp Broker',
    groupName: string = 'Broker Group',
    groupId?: string,
    timestamp?: string,
  ): UnitListingData {
    const textLower = rawText.toLowerCase();

    // 1. Detect Compound / Location
    const compoundMap: Record<string, string> = {
      mivida: 'Mivida',
      ميفيدا: 'Mivida',
      'hyde park': 'Hyde Park',
      'هايد بارك': 'Hyde Park',
      'palm hills': 'Palm Hills',
      'بالم هيلز': 'Palm Hills',
      'mountain view': 'Mountain View',
      'ماونتن فيو': 'Mountain View',
      marassi: 'Marassi',
      مراسي: 'Marassi',
      'swan lake': 'Swan Lake',
      'سوان ليك': 'Swan Lake',
      cfc: 'Cairo Festival City',
      'كايرو فيستيفال': 'Cairo Festival City',
      madinaty: 'Madinaty',
      مدينتي: 'Madinaty',
      rehab: 'Al Rehab',
      الرحاب: 'Al Rehab',
      zed: 'Zed East',
      زد: 'Zed East',
      badya: 'Badya',
      بادية: 'Badya',
      'tag sultan': 'Tag Sultan',
      'تاج سلطان': 'Tag Sultan',
      'new cairo': 'New Cairo',
      التجمع: 'New Cairo',
      'التجمع الخامس': 'New Cairo - 5th Settlement',
      eastown: 'Eastown',
      villette: 'Villette',
      sodic: 'SODIC',
      emaar: 'Emaar',
      'cairo festival': 'Cairo Festival City',
      'uptown cairo': 'Uptown Cairo',
      'أبتاون': 'Uptown Cairo',
      katameya: 'Katameya Heights',
      كتاميا: 'Katameya Heights',
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

    // 3. Extract Area (sqm)
    let area_sqm = 200;
    const areaMatch = rawText.match(/(\d{2,4})\s*(?:متر|م²|م2|sqm|sq\.m|m2|meter)/i);
    if (areaMatch) {
      area_sqm = parseInt(areaMatch[1], 10);
    }

    // 4. Extract Price
    let price = 0;
    const priceMillionMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:مليون|million|m\b)/i);
    if (priceMillionMatch) {
      price = parseFloat(priceMillionMatch[1]) * 1_000_000;
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
    if (price === 0) price = 12_500_000; // Sensible default luxury benchmark

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

    // 8. Valuation & Urgency Scores
    let urgencyScore = 60;
    let valuationScore = 75;
    if (/(لقطة|سعر محروق|فرصة|distress|urgent|مستعجل|اقل من سعر السوق|أقل من السوق)/i.test(rawText)) {
      urgencyScore = 95;
      valuationScore = 90;
    }

    // 9. Sierra Code Synthesis
    const locPrefix = detectedCompound.slice(0, 2).toUpperCase();
    const typePrefix = propertyType.slice(0, 1).toUpperCase();
    const finishPrefix =
      finishing === 'fully_finished' ? 'F' : finishing === 'semi_finished' ? 'S' : 'U';
    const priceM = (price / 1_000_000).toFixed(1).replace(/\.0$/, '');
    const featSuffix = features.length > 0 ? `+${features.join('+')}` : '';
    const sierraCode = `${locPrefix}-${typePrefix}-${bedrooms}${finishPrefix}-${priceM}M${featSuffix}`;

    // 10. Source Type & Group Classification
    const registryGroup = groupId ? findGroup(groupId) : findGroup(groupName);
    const sourceType: GroupSourceType = registryGroup
      ? registryGroup.type === 'mixed'
        ? classifySourceType(sender, groupName)
        : registryGroup.type
      : classifySourceType(sender, groupName);
    const fromArchivedGroup = registryGroup?.archived ?? false;

    // 11. New Listing Detection
    const listedAt = timestamp || new Date().toISOString();
    const newListing = isNewListing(listedAt);

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
      sierraCode,
      contact_info: sender,
      sourceType,
      whatsappGroupId: groupId,
      whatsappGroupName: groupName,
      listedAt,
      isNewListing: newListing,
      fromArchivedGroup,
      notes: rawText.slice(0, 250),
    };
  }

  /**
   * End-to-End WhatsApp Group Real Estate Ingestion & Inventory Pipeline
   * Processes a single message.
   */
  async ingestWhatsAppGroupMessage(
    rawText: string,
    sender: string = 'WhatsApp Broker Group',
    groupName: string = 'New Cairo Broker Network',
    groupId?: string,
    timestamp?: string,
  ) {
    logger.info({ msg: 'OpenClaw: Ingesting WhatsApp real estate listing', sender, groupName });

    const parsedData = this.parseWhatsAppRealEstateText(rawText, sender, groupName, groupId, timestamp);
    const addResult = await addListing(this.airtableConfig, parsedData);

    const memoryKey = `whatsapp-ingest-${Date.now()}`;
    await this.saveProjectMemory(
      memoryKey,
      {
        rawMessage: rawText,
        extracted: parsedData,
        source: groupName,
        sender,
        sourceType: parsedData.sourceType,
        ingestedAt: new Date().toISOString(),
      },
      ['whatsapp-ingest', 'inventory-created', parsedData.location.toLowerCase().replace(/\s+/g, '-')],
    );

    return {
      success: true,
      sierraCode: parsedData.sierraCode,
      compound: parsedData.location,
      propertyType: parsedData.type,
      priceFormatted: `${parsedData.price.toLocaleString()} EGP`,
      valuationScore: parsedData.valuationScore,
      urgencyScore: parsedData.urgencyScore,
      sourceType: parsedData.sourceType,
      isNewListing: parsedData.isNewListing,
      fromArchivedGroup: parsedData.fromArchivedGroup,
      resultMessage: addResult,
      data: parsedData,
    };
  }

  /**
   * Batch ingest an array of WhatsApp messages — the core engine for
   * processing hundreds of listings from multiple groups at once.
   *
   * @param messages Array of raw WhatsApp messages with sender/group metadata
   * @param options  Concurrency limit and deduplication flag
   * @returns BatchIngestResult with full summary
   */
  async ingestWhatsAppGroupBatch(
    messages: WhatsAppMessage[],
    options: { concurrency?: number; deduplicate?: boolean } = {},
  ): Promise<BatchIngestResult> {
    logger.info({ msg: 'OpenClaw: Batch ingesting WhatsApp messages', count: messages.length });

    const units: UnitListingData[] = messages.map((msg) =>
      this.parseWhatsAppRealEstateText(msg.text, msg.sender, msg.groupName, msg.groupId, msg.timestamp),
    );

    const result = await batchIngestListings(this.airtableConfig, units, options);

    await this.saveProjectMemory(
      `batch-ingest-${Date.now()}`,
      {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        duplicates: result.duplicates,
        ingestedAt: new Date().toISOString(),
      },
      ['batch-ingest', 'inventory-bulk'],
    );

    return result;
  }

  /**
   * Import all units from the master sheet (real-listings.json schema).
   * Maps ownerType → sourceType, preserves original codes, and batch-ingests.
   *
   * @param masterSheetUnits Array of units from real-listings.json
   * @returns BatchIngestResult
   */
  async ingestMasterSheet(masterSheetUnits: MasterSheetUnit[]): Promise<BatchIngestResult> {
    logger.info({ msg: 'OpenClaw: Ingesting master sheet', count: masterSheetUnits.length });

    const units: UnitListingData[] = masterSheetUnits
      .filter((u) => u.price && u.price > 0)
      .map((u): UnitListingData => {
        const ownerType = (u.ownerType || '').toLowerCase();
        const sourceType: GroupSourceType = ownerType === 'owner' ? 'owner' : 'broker';
        const listedAt = u.updatedAt || new Date().toISOString();

        return {
          type: u.type || 'Apartment',
          location: u.compound || u.cmp || u.zone || 'New Cairo',
          compound: u.compound || u.cmp || 'New Cairo',
          price: u.price || 0,
          currency: 'EGP',
          area_sqm: u.area || 0,
          bedrooms: u.beds || 3,
          bathrooms: u.baths || 2,
          contact_info: u.mobile ? `+20${u.mobile}` : u.ownerName || '',
          notes: u.comment || u.tag || '',
          sierraCode: u.code || undefined,
          finishing: u.finishing || 'semi_finished',
          sourceType,
          whatsappGroupName: 'Master Sheet Import',
          operation: u.mode === 'rent' ? 'Rent' : 'Sale',
          listedAt,
          isNewListing: isNewListing(listedAt),
          fromArchivedGroup: false,
        };
      });

    return batchIngestListings(this.airtableConfig, units, { concurrency: 20, deduplicate: true });
  }

  /**
   * Ingest all units from the inventory_extracted_units.json schema
   * (the WhatsApp-scraped units with full metadata).
   */
  async ingestExtractedUnits(
    extractedUnits: Array<{
      id: string;
      groupName: string;
      groupId: string;
      type: string;
      compound: string;
      location: string;
      operation: string;
      price: number;
      currency: string;
      area_sqm: number;
      bedrooms: number;
      bathrooms: number;
      furnishing: string;
      dateAdded: string;
      sender: string;
      description: string;
    }>,
  ): Promise<BatchIngestResult> {
    logger.info({ msg: 'OpenClaw: Ingesting extracted WhatsApp units', count: extractedUnits.length });

    const units: UnitListingData[] = extractedUnits.map((u): UnitListingData => {
      const registryGroup = findGroup(u.groupId) || findGroup(u.groupName);
      const sourceType: GroupSourceType = registryGroup
        ? registryGroup.type === 'mixed'
          ? classifySourceType(u.sender, u.groupName)
          : registryGroup.type
        : classifySourceType(u.sender, u.groupName);

      return {
        type: u.type,
        location: u.compound || u.location,
        compound: u.compound,
        price: u.price,
        currency: u.currency || 'EGP',
        area_sqm: u.area_sqm,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        contact_info: u.sender,
        notes: u.description?.slice(0, 250),
        sierraCode: u.id, // use extracted ID as sierra code seed
        sourceType,
        whatsappGroupId: u.groupId,
        whatsappGroupName: u.groupName,
        operation: u.operation,
        furnishing: u.furnishing,
        listedAt: u.dateAdded,
        isNewListing: isNewListing(u.dateAdded),
        fromArchivedGroup: registryGroup?.archived ?? false,
      };
    });

    return batchIngestListings(this.airtableConfig, units, { concurrency: 10, deduplicate: true });
  }

  /**
   * Main entry point for a WhatsApp webhook — single message handler
   */
  async handleWhatsAppMessage(
    messageText: string,
    sender: string,
    isGroup: boolean = false,
    groupName?: string,
    groupId?: string,
  ): Promise<string> {
    logger.info({
      msg: 'Received WhatsApp message',
      hasSender: sender.length > 0,
      messageLength: messageText.length,
      isGroup,
    });

    if (isGroup) {
      const ingestResult = await this.ingestWhatsAppGroupMessage(
        messageText,
        sender,
        groupName || 'WhatsApp Luxury Group',
        groupId,
      );
      return (
        `🏰 *Sierra Estates Intelligence*\nListing successfully ingested!\n` +
        `📌 *Code:* [${ingestResult.sierraCode}]\n` +
        `📍 *Compound:* ${ingestResult.compound}\n` +
        `💰 *Price:* ${ingestResult.priceFormatted}\n` +
        `🏷️ *Source:* ${ingestResult.sourceType === 'owner' ? '🟢 Direct Owner' : '🔵 Broker'}\n` +
        `🆕 *New Listing:* ${ingestResult.isNewListing ? 'Yes' : 'No'}`
      );
    }

    // If Gemini AI is not initialized, return a structured fallback response
    if (!this.ai) {
      return `🏰 *Sierra Estates AI Concierge*\nThank you for reaching out. Your inquiry regarding "${messageText}" has been logged and assigned to our luxury property advisors.`;
    }

    // Step 0: Fetch project memory to ground OpenClaw
    const memoryContext = await this.getProjectMemory(messageText);

    const systemInstruction =
      `You are OpenClaw, the senior AI real estate advisor & broker concierge on WhatsApp for Sierra Estates.\n` +
      `You have access to shared project memory and tools.\n` +
      `You can help the team by managing inventory, adding listings, generating reports, and reasoning with Google Vertex AI.\n` +
      `Be extremely polite, concise, and professional. Use emojis appropriately.${memoryContext}`;

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
          notes: { type: Type.STRING, description: 'Additional notes' },
        },
        required: ['type', 'location'],
      },
    };

    const editInventoryDeclaration: FunctionDeclaration = {
      name: 'editInventory',
      description: 'Edits the price of an existing real estate listing based on location.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: 'Location of the property' },
          newPrice: { type: Type.NUMBER, description: 'The new price to set' },
        },
        required: ['location', 'newPrice'],
      },
    };

    const generateReportDeclaration: FunctionDeclaration = {
      name: 'generateInventoryReport',
      description: 'Generates a report of the current real estate inventory.',
      parameters: { type: Type.OBJECT, properties: {} },
    };

    try {
      // Step 1: Call Gemini
      let response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `[Sender: ${sender}]\n\n${messageText}` }] }],
        config: {
          systemInstruction: systemInstruction,
          tools: [
            {
              functionDeclarations: [
                addListingDeclaration,
                editInventoryDeclaration,
                generateReportDeclaration,
              ],
            },
          ],
        },
      });

      // Step 2: Handle Tool Calls
      let finalResponseText = response.text || '';

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        let toolResponseStr = '';

        if (call.name === 'addListing') {
          const args = (call.args || {}) as unknown as UnitListingData & { contact_info?: string };
          if (!args.contact_info) args.contact_info = sender;
          toolResponseStr = await addListing(this.airtableConfig, args);
        } else if (call.name === 'editInventory') {
          const args = (call.args || {}) as unknown as { location: string; newPrice: number };
          toolResponseStr = await editInventory(this.airtableConfig, args.location, args.newPrice);
        } else if (call.name === 'generateInventoryReport') {
          toolResponseStr = await generateInventoryReport(this.airtableConfig);
        }


        response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: `[Sender: ${sender}]\n\n${messageText}` }] },
            { role: 'model', parts: [{ functionCall: call }] },
            {
              role: 'user',
              parts: [{ functionResponse: { name: call.name!, response: { result: toolResponseStr } } }],
            },
          ],
          config: {
            systemInstruction: systemInstruction,
            tools: [
              {
                functionDeclarations: [
                  addListingDeclaration,
                  editInventoryDeclaration,
                  generateReportDeclaration,
                ],
              },
            ],
          },
        });

        finalResponseText = response.text || toolResponseStr;
      }

      // Step 3: Record conversation memory
      await this.saveProjectMemory(
        `whatsapp-msg-${Date.now()}`,
        { sender, message: messageText, reply: finalResponseText },
        ['whatsapp-interaction'],
      );

      return finalResponseText;
    } catch (error) {
      logger.error({ err: error, msg: 'Gemini API Error' });
      return 'Sorry, I encountered an internal error while processing your request. Please try again.';
    }
  }
}
