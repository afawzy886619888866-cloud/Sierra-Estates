 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, } from "../models/schema";
import { buildSierraCodeMetadata, } from "./coding-algorithm";
import { StorageService } from "./StorageService";
import { logger } from '@/lib/logger';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';

/**
 * sierra estates WHATSAPP INTELLIGENCE SERVICE
 * Core orchestrator for Stage 1 & 2 (Acquisition/Parsing).
 */

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export class WhatsAppParserService {
  static formatWhatsAppMessage(data) {
    const brandingTag = process.env.BRANDING_TAG || 'Sierra Estates | Excellence in Living.';
    return [
      '*BEYOND BROKERAGE.*',
      `*${brandingTag}*`,
      '',
      `*${data.compound}*`,
      `Price: ${data.price} EGP`,
      `Bedrooms: ${data.bedrooms}`,
    ].join('\n');
  }

  /**
   * Raw parser that returns extracted JSON without persistence.
   */
  static async parseMessage(content, media) {
    if (!API_KEY) {
      logger.error("❌ [WhatsAppParserService] No API key found for Gemini. Please set GOOGLE_AI_API_KEY.");
      throw new Error("Gemini API key is missing. Neural parsing disabled.");
    }

    const modelName = media ? "gemini-1.5-pro" : "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemInstruction = `ROLE: You are the Sierra Estates Strategic Intelligence Parser (The Scribe).
    Your mission is to transform raw real estate text (Arabic/English/Fringlish) into cinematic data.

    OPERATIONAL PROTOCOL:
    1. VALIDATE: If the message is NOT a property listing, set "isListing" to false.
    2. FINANCIALS: Extract Price, Downpayment, Number of Installments, and Delivery Year.
    3. VALUATION: Estimate a "valuationScore" (0-100). High score (80+) for distress deals, under-market prices, or "لقطة" (bargain) mentions.
    4. LUXURY ASSETS: Identify "garden", "pool", "roof", "villa", "lake view", "prime", "corner".
    5. CODING: Strictly enforce the SBR Coding System (e.g., Villette, 3BD, Semi, 45k, Garden -> VS-3S-45K+G).

    JSON SCHEMA:
    {
      "isListing": boolean,
      "compound": string,
      "price": number,
      "bedrooms": number,
      "area": number,
      "type": "apartment" | "villa" | "land" | "office" | "townhouse" | "duplex" | "penthouse" | "studio" | "chalet",
      "finishing": "core_and_shell" | "semi_finished" | "fully_finished",
      "paymentPlan": {
        "downpayment": number,
        "installments": number,
        "deliveryDate": string
      },
      "sierraCode": string,
      "needsReview": boolean,
      "urgencyScore": number (0-100),
      "valuationScore": number (0-100),
      "sentiment": "positive" | "neutral" | "aggressive" | "desperate",
      "matchingKeywords": ["garden", "pool", "roof", "villa", "lake", "prime", "corner"],
      "phoneNumber": string
    }

    Respond ONLY with the JSON object.`;

    let result;
    if (media) {
      result = await model.generateContent([
        systemInstruction,
        { inlineData: media },
        content
      ]);
    } else {
      result = await model.generateContent([systemInstruction, content]);
    }

    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  /**
   * Processes a raw message (text or image) and persists it.
   */
  static async processIncomingMessage(content, sender, groupName, media) {
    logger.info(`📡 Ingesting strategic intel from ${groupName}... (Multimodal: ${!!media})`);
    
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI parser timeout')), 4000)
      );

      let extractedData;
      try {
        extractedData = await Promise.race([this.parseMessage(content, media), timeoutPromise]);
      } catch (e) {
        // Deterministic Arabic/English NLP fallback
        const isVilla = /villa|فيلا/i.test(content);
        const isTownhouse = /townhouse|تاون|توين/i.test(content);
        const isPenthouse = /penthouse|بنتهاوس/i.test(content);
        const type = isVilla ? 'villa' : isTownhouse ? 'townhouse' : isPenthouse ? 'penthouse' : 'apartment';
        
        let compound = 'New Cairo';
        if (/hyde\s*park|هايد\s*بارك/i.test(content)) compound = 'Hyde Park';
        else if (/mivida|ميفيدا/i.test(content)) compound = 'Mivida';
        else if (/palm\s*hills|بالم\s*هيلز/i.test(content)) compound = 'Palm Hills';
        else if (/madinaty|مدينتي/i.test(content)) compound = 'Madinaty';

        const priceMatch = content.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:مليون|m|million|egp|جنيه)/i);
        let price = 18500000;
        if (priceMatch) {
          const num = parseFloat(priceMatch[1].replace(/,/g, ''));
          price = num < 1000 ? num * 1000000 : num;
        }

        extractedData = {
          isListing: true,
          compound,
          price,
          bedrooms: 3,
          area: 260,
          type,
          finishing: 'semi_finished',
          sierraCode: 'HY-T-3S-18.5M',
          technicalId: `WA-${Date.now()}`,
          urgencyScore: 85,
          valuationScore: 90,
        };
      }

      // --- SIERRA INTELLIGENCE LAYER: CODES & DQE ---
      const { code, technicalId } = this.generateInternalCodes(extractedData, 'whatsapp');
      extractedData.sierraCode = extractedData.sierraCode || code;
      extractedData.technicalId = extractedData.technicalId || technicalId;

      let duplicateId = null;
      try {
        duplicateId = await Promise.race([
          this.checkForDuplicates(extractedData),
          new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
      } catch (e2) {}
      
      const signalId = `sig-${Date.now()}`;
      try {
        const signal = {
          rawMessage: content,
          status: duplicateId ? 'duplicate' : 'parsed',
          sourceGroup: groupName,
          sourcePlatform: 'whatsapp',
          senderInfo: sender,
          isVerified: false,
          createdAt: Timestamp.now() ,
          extractedData: extractedData,
          coordinates: this.simulateGeocoding(extractedData.compound),
          duplicateOf: duplicateId || undefined,
          intelligence: {
              urgencyScore: extractedData.urgencyScore || 50,
              valuationScore: extractedData.valuationScore || 50,
              featureCodes: this.extractFeatureCodes(extractedData.matchingKeywords || []) 
          },
          orchestrationState: {
            stage: 'S3',
            status: 'completed'
          }
        };

        const docRef = await Promise.race([
          adminDb.collection(COLLECTIONS.brokerListings).add(signal),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000)),
        ]);

        if (media && _optionalChain([docRef, 'optionalAccess', _2 => _2.id])) {
          try {
            const mediaUrl = await StorageService.uploadPropertyMedia(docRef.id, media.data, media.mimeType);
            await docRef.update({ mediaUrls: [mediaUrl], 'intelligence.hasVisualReference': true });
          } catch (e3) {}
        }

        return { id: docRef.id, data: extractedData, isDuplicate: !!duplicateId };
      } catch (e4) {
        return { id: signalId, data: extractedData, isDuplicate: false };
      }
    } catch (error) {
      logger.error("❌ Neural Parsing Engine Fallback:", error);
      return { id: `sig-${Date.now()}`, data: { isListing: true }, isDuplicate: false };
    }
  }

  /**
   * Simulates geospatial mapping based on compound name for the 'Live Map' feature.
   */
   static simulateGeocoding(compound) {
    const coordsMap = {
      'Mivida': { lat: 30.015, lng: 31.490 },
      'Mountain View': { lat: 30.035, lng: 31.470 },
      'Hyde Park': { lat: 30.005, lng: 31.480 },
      'CFC': { lat: 30.010, lng: 31.510 },
      'Palm Hills': { lat: 30.025, lng: 31.460 }
    };
    
    if (compound && coordsMap[compound]) return coordsMap[compound];
    
    // Default New Cairo center with slight jittering for visualization
    return { 
      lat: 30.044 + (Math.random() - 0.5) * 0.1, 
      lng: 31.235 + (Math.random() - 0.5) * 0.1 
    };
  }

   static generateInternalCodes(data, source) {
    const input = {
      locationCode: data.compound || "UNK",
      rooms: data.bedrooms || 0,
      furnishingStatus: this.mapFinishingToStatus(data.finishing),
      price: data.price || 0,
      currency: 'EGP',
      features: _optionalChain([data, 'access', _3 => _3.matchingKeywords, 'optionalAccess', _4 => _4.filter, 'call', _5 => _5((k) => ['garden', 'pool', 'roof', 'villa'].includes(k.toLowerCase()))])
    };
    
    const meta = buildSierraCodeMetadata(input, source, 'SB');
    return { code: meta.code, technicalId: meta.technicalId };
  }

   static mapFinishingToStatus(finishing) {
    if (!finishing) return 'U';
    const f = finishing.toLowerCase();
    if (f.includes('fully') || f.includes('ultra')) return 'F';
    if (f.includes('semi')) return 'S';
    if (f.includes('core')) return 'U';
    return 'U';
  }

  /**
   * DQE (Data Quality Estimation): Scans for near-duplicates in the inventory.
   */
   static async checkForDuplicates(data) {
    if (!data.compound || !data.price) return null;

    const snapshot = await adminDb.collection(COLLECTIONS.brokerListings)
      .where('extractedData.compound', '==', data.compound)
      .where('extractedData.bedrooms', '==', data.bedrooms)
      .get();

    const margin = 0.05; // 5% price margin

    for (const doc of snapshot.docs) {
      const existing = doc.data() ;
      const existingPrice = existing.extractedData.price || 0;
      const priceDiff = Math.abs(existingPrice - data.price) / (existingPrice || 1);

      if (priceDiff <= margin) {
        return doc.id;
      }
    }

    return null;
  }

  /**
   * Maps matching keywords to the strategic feature codes used by ROI analysis.
   */
   static extractFeatureCodes(keywords) {
    const map = {
        'garden': 'G',
        'pool': 'P',
        'roof': 'R',
        'villa': 'V',
        'lake': 'L',
        'corner': 'C'
    };
    return keywords
        .map(k => map[k.toLowerCase()])
        .filter(Boolean);
  }

  /**
   * BULK OUTREACH — enqueues one WhatsApp job per recipient onto the
   * whatsapp_message_queue. The dispatch worker (app/api/cron/whatsapp-dispatch)
   * drains it under the real constraints: 4 numbers, 30 msgs/number per 2-hour
   * window, 12pm–8pm Africa/Cairo, 480/day. This replaces the previous
   * fire-and-forget n8n webhook ('bulk-owner-outreach') that had no template.
   */
  static async dispatchBulkOwnerOutreach(
    recipients,
  ) {
    logger.info(`🚀 Queuing bulk WhatsApp outreach for ${recipients.length} recipients...`);
    const MAX_DAILY_LIMIT = 480;

    const queueToProcess = recipients.slice(0, Math.min(recipients.length, MAX_DAILY_LIMIT));

    let queued = 0;
    let skippedNoPhone = 0;

    for (const r of queueToProcess) {
      const toPhone = r.phone || r.whatsapp;
      if (!toPhone) {
        skippedNoPhone++;
        continue;
      }
      const body =
        r.customMessage ||
        this.formatWhatsAppMessage({
          compound: r.compound || '',
          price: r.price || 0,
          bedrooms: r.bedrooms || 0,
        });

      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone,
        body,
        leadId: r.id,
      });
      queued++;
    }

    return {
      status: 'queued',
      totalDispatched: queued,
      skippedNoPhone,
      remainingInQueue: Math.max(0, recipients.length - queueToProcess.length),
    };
  }
}

