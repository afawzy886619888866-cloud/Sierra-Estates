import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';
import { sharedMemory } from '@sierra-estates/memory-engine';
import { scheduleViewing } from './viewing-engine';
import snapshot from '@/lib/inventory/snapshot.json';

export interface VerificationUnitItem {
  unitId: string;
  unitCode: string;
  compound: string;
  propertyType: string;
  operation: 'rent' | 'buy' | string;
  priceLabel: string;
  price: number;
  contactPhone: string;
  contactName: string;
  ownerType: 'owner' | 'broker' | 'unknown';
  status: 'inquiry_sent' | 'available' | 'unavailable' | 'expired';
  sentAt: number;
  expiresAt: number;
  replyReceivedAt?: number;
  refinedNotes?: string;
  photoUrls: string[];
  rawReplyText?: string;
}

export interface BatchAvailabilitySession {
  id: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  createdAt: number;
  expiresAt: number; // 1 hour after createdAt
  status: 'active' | 'completed' | 'expired';
  units: VerificationUnitItem[];
  viewingProposed: boolean;
  viewingScheduled: boolean;
  scheduledViewingId?: string;
}

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// In-memory / persistent fallback registry for batch requests
const SESSIONS_STORE_KEY = 'availability_batch_sessions';

export class AvailabilityVerificationService {
  public static readonly MAX_UNITS_LIMIT = 40;
  public static readonly SLA_TIMEOUT_MS = 60 * 60 * 1000; // 1 Hour (3600s)

  /**
   * Look up unit details from snapshot.json
   */
  public static findUnitById(unitId: string): any | null {
    const rawUnits: any[] = (snapshot as any)?.units || [];
    const found = rawUnits.find(
      (u) => u.id === unitId || u.code === unitId || String(u.id) === String(unitId)
    );
    return found || null;
  }

  /**
   * Helper to fetch all sessions from shared memory
   */
  public static async getSessions(): Promise<Record<string, BatchAvailabilitySession>> {
    try {
      const stored = await sharedMemory.read(SESSIONS_STORE_KEY);
      return (stored as Record<string, BatchAvailabilitySession>) || {};
    } catch {
      return {};
    }
  }

  /**
   * Helper to persist sessions to shared memory
   */
  public static async saveSessions(sessions: Record<string, BatchAvailabilitySession>): Promise<void> {
    try {
      await sharedMemory.write(SESSIONS_STORE_KEY, sessions, {
        author: 'system',
        tags: ['availability', 'radar-net'],
      });
    } catch (err) {
      logger.warn(`[AvailabilityService] Failed to persist sessions to sharedMemory: ${(err as Error).message}`);
    }
  }

  /**
   * Dispatches an outbound WhatsApp message using Meta API or fallback simulation
   */
  public static async sendWhatsApp(toPhone: string, message: string): Promise<boolean> {
    const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_META_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

    const cleanPhone = toPhone.replace(/[^0-9+]/g, '').replace(/^00/, '+');

    if (!token || !phoneId) {
      logger.info(`[WhatsApp Dispatch: MOCK] Outbound to ${cleanPhone}:\n${message}`);
      return true;
    }

    try {
      const apiPhone = cleanPhone.replace(/^\+/, '');
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: apiPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      if (!res.ok) {
        logger.error(`[WhatsApp Dispatch] Error sending to ${cleanPhone}: ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error(`[WhatsApp Dispatch] Exception sending to ${cleanPhone}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Creates a new Batch Availability Verification Session.
   * Maximum allowed units: 40.
   */
  public static async createBatchRequest(params: {
    clientName: string;
    clientPhone: string;
    unitIds: string[];
    notes?: string;
  }): Promise<BatchAvailabilitySession> {
    const { clientName, clientPhone, unitIds, notes } = params;

    if (!unitIds || unitIds.length === 0) {
      throw new Error('Selection Net is empty. Please select at least 1 unit.');
    }

    if (unitIds.length > this.MAX_UNITS_LIMIT) {
      throw new Error(
        `Maximum selection limit exceeded: ${unitIds.length} units selected. Maximum allowed is ${this.MAX_UNITS_LIMIT} units.`
      );
    }

    const now = Date.now();
    const expiresAt = now + this.SLA_TIMEOUT_MS;
    const sessionId = `req-net-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const verificationUnits: VerificationUnitItem[] = [];

    for (const id of unitIds) {
      const unit = this.findUnitById(id);
      const unitCode = unit?.code || id;
      const compound = unit?.compound || 'New Cairo';
      const propertyType = unit?.type || 'Apartment';
      const operation = (unit?.mode || 'sale').toLowerCase();
      const priceLabel = unit?.priceLabel || (unit?.price ? `${Number(unit.price).toLocaleString()} EGP` : 'Price on request');
      const price = Number(unit?.price) || 0;

      // Extract contact details
      let contactPhone = '';
      let contactName = 'Property Representative';
      let ownerType: 'owner' | 'broker' | 'unknown' = 'unknown';

      if (unit?.whatsapp) {
        contactPhone = unit.whatsapp.replace('https://wa.me/', '+');
      }

      if (!contactPhone && unit?.description) {
        const phoneMatch = unit.description.match(/contact:\s*([0-9+.]+)/i);
        if (phoneMatch) contactPhone = phoneMatch[1].replace('.0', '');
        const nameMatch = unit.description.match(/name:\s*([^|]+)/i);
        if (nameMatch) contactName = nameMatch[1].trim();
      }

      if (unit?.segment?.includes('owner') || unit?.party?.toLowerCase() === 'owner') {
        ownerType = 'owner';
      } else if (unit?.segment?.includes('broker') || unit?.party?.toLowerCase() === 'broker') {
        ownerType = 'broker';
      }

      // Default fallback phone if not present in dataset
      if (!contactPhone) {
        contactPhone = '+201000000000';
      }

      const item: VerificationUnitItem = {
        unitId: id,
        unitCode,
        compound,
        propertyType,
        operation,
        priceLabel,
        price,
        contactPhone,
        contactName,
        ownerType,
        status: 'inquiry_sent',
        sentAt: now,
        expiresAt,
        photoUrls: unit?.img ? [unit.img] : [],
      };

      verificationUnits.push(item);

      // Dispatch WhatsApp to unit owner/broker
      const inquiryMsg =
        `مرحباً ${contactName}،\n` +
        `مع حضرتك مستشار العمليات من سييرا العقارية (Sierra Estates).\n\n` +
        `نستفسر بخصوص الوحدة كود: *${unitCode}* في كمبوند *${compound}* (${propertyType} معروضة لـ ${operation === 'rent' ? 'الإيجار' : 'البيع'} بسعر ${priceLabel}).\n\n` +
        `🎯 لدينا عميل مباشر يرغب في الحجز والمعاينة.\n` +
        `برجاء التكرم بالتأكيد:\n` +
        `1. هل الوحدة ما زالت متاحة حالياً؟\n` +
        `2. برجاء إرسال أحدث صور وفيديو للوحدة إن وجد.\n\n` +
        `⏱️ نرجو الرد خلال ساعة لتأكيد الحجز للعميل.\nشكراً لتعاونكم المثمر.`;

      await this.sendWhatsApp(contactPhone, inquiryMsg);
    }

    const session: BatchAvailabilitySession = {
      id: sessionId,
      clientName,
      clientPhone,
      notes,
      createdAt: now,
      expiresAt,
      status: 'active',
      units: verificationUnits,
      viewingProposed: false,
      viewingScheduled: false,
    };

    const sessions = await this.getSessions();
    sessions[sessionId] = session;
    await this.saveSessions(sessions);

    // Send confirmation to client
    const clientConfirmation =
      `أهلاً أستاذ ${clientName}،\n` +
      `تم استلام طلب التحقق لعدد (${verificationUnits.length}) وحدة تم اختيارها عبر رادار سييرا العقارية بنجاح! 🎯\n\n` +
      `جاري التواصل الفوري مع الملاك والوسطاء لطلب أحدث الصور وتأكيد التوافر.\n` +
      `⏱️ نطبق معيار استجابة سريع (ساعة واحدة كحد أقصى)، وسيتم استبعاد أي وحدة لا يتم الرد عليها للحفاظ على وقتكم الثمين.\n\n` +
      `سنوافيكم هنا بالصور والتفاصيل المؤكدة تباعاً! 📸`;

    await this.sendWhatsApp(clientPhone, clientConfirmation);

    return session;
  }

  /**
   * Sweeps active sessions and enforces the 1-Hour SLA.
   * If an owner/broker does not reply within 1 hour, mark as unavailable.
   */
  public static async sweepTimeouts(): Promise<{ expiredUnitsCount: number; updatedSessions: number }> {
    const sessions = await this.getSessions();
    const now = Date.now();
    let expiredUnitsCount = 0;
    let updatedSessions = 0;

    for (const sessionId of Object.keys(sessions)) {
      const session = sessions[sessionId];
      if (session.status !== 'active') continue;

      let sessionModified = false;
      let allSettled = true;

      for (const unit of session.units) {
        if (unit.status === 'inquiry_sent') {
          if (now >= unit.expiresAt) {
            unit.status = 'unavailable';
            unit.refinedNotes = 'غير متاحة (لم يتم الرد من جهة الاتصال خلال مهلة الساعة)';
            expiredUnitsCount++;
            sessionModified = true;
          } else {
            allSettled = false;
          }
        }
      }

      if (allSettled) {
        session.status = 'completed';
        sessionModified = true;
      }

      if (sessionModified) {
        updatedSessions++;
      }
    }

    if (updatedSessions > 0) {
      await this.saveSessions(sessions);
    }

    return { expiredUnitsCount, updatedSessions };
  }

  /**
   * Handles inbound replies from owners/brokers.
   * Uses Gemini AI to analyze availability, refine description & photos,
   * then automatically forwards verified details to the client and proposes a viewing date.
   */
  public static async handleOwnerReply(params: {
    fromPhone: string;
    replyText: string;
    mediaUrls?: string[];
  }): Promise<{ matchedUnitCode?: string; clientNotified: boolean; responseSummary: string } | null> {
    const { fromPhone, replyText, mediaUrls = [] } = params;
    const cleanFrom = fromPhone.replace(/[^0-9]/g, '');

    const sessions = await this.getSessions();
    let matchedSession: BatchAvailabilitySession | null = null;
    let matchedUnit: VerificationUnitItem | null = null;

    // Locate active unit inquiry matching sender phone
    for (const sessionId of Object.keys(sessions)) {
      const s = sessions[sessionId];
      for (const u of s.units) {
        const cleanContact = u.contactPhone.replace(/[^0-9]/g, '');
        if (
          (cleanContact.includes(cleanFrom) || cleanFrom.includes(cleanContact)) &&
          u.status === 'inquiry_sent'
        ) {
          matchedSession = s;
          matchedUnit = u;
          break;
        }
      }
      if (matchedUnit) break;
    }

    if (!matchedSession || !matchedUnit) {
      logger.info(`[AvailabilityService] Inbound message from ${fromPhone} did not match any pending inquiry.`);
      return null;
    }

    // AI Refinement of owner response
    let isAvailable = true;
    let refinedSummary = replyText;

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
Analyze this real estate owner/broker reply regarding unit "${matchedUnit.unitCode}" in "${matchedUnit.compound}":
Reply text: "${replyText}"

Determine:
1. Is the unit currently available? (YES / NO)
2. Extract refined key details (Price negotiation, delivery condition, availability date, view notes).
3. Return clean JSON in this format:
{"available": true, "refinedNotes": "short arabic summary of availability and key conditions"}`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          isAvailable = Boolean(parsed.available);
          refinedSummary = parsed.refinedNotes || replyText;
        }
      } catch (err) {
        logger.warn(`[AvailabilityService] Gemini extraction fallback used: ${(err as Error).message}`);
      }
    } else {
      // Heuristic fallback
      const lower = replyText.toLowerCase();
      if (
        lower.includes('غير متاح') ||
        lower.includes('اتأجرت') ||
        lower.includes('اتباعت') ||
        lower.includes('sold') ||
        lower.includes('rented') ||
        lower.includes('not available')
      ) {
        isAvailable = false;
      }
    }

    matchedUnit.replyReceivedAt = Date.now();
    matchedUnit.rawReplyText = replyText;
    matchedUnit.status = isAvailable ? 'available' : 'unavailable';
    matchedUnit.refinedNotes = refinedSummary;

    if (mediaUrls.length > 0) {
      matchedUnit.photoUrls = Array.from(new Set([...matchedUnit.photoUrls, ...mediaUrls]));
    }

    await this.saveSessions(sessions);

    // If unit is confirmed available, forward refined details to the client
    if (isAvailable) {
      const clientUpdate =
        `أهلاً أستاذ ${matchedSession.clientName}،\n` +
        `بشرى سارة! 🌟 تم تأكيد توافر الوحدة التي طلبتها:\n\n` +
        `🏢 *الوحدة:* كود ${matchedUnit.unitCode} (${matchedUnit.propertyType})\n` +
        `📍 *الكمبوند:* ${matchedUnit.compound}\n` +
        `💰 *السعر:* ${matchedUnit.priceLabel}\n` +
        `📝 *تأكيد المالك/الوسيط:* ${refinedSummary}\n` +
        (matchedUnit.photoUrls.length > 0
          ? `📸 *الصور المؤكدة:* تم إرفاق صور الوحدة الحديثة بنجاح.\n\n`
          : `\n`) +
        `ما رأي حضرتك في الوحدة وتفاصيلها؟ وهل ترغب في تحديد موعد لمعاينتها على الطبيعة؟ 🗓️`;

      await this.sendWhatsApp(matchedSession.clientPhone, clientUpdate);
      matchedSession.viewingProposed = true;
      await this.saveSessions(sessions);
      return { matchedUnitCode: matchedUnit.unitCode, clientNotified: true, responseSummary: refinedSummary };
    } else {
      const clientUnavailableUpdate =
        `أهلاً أستاذ ${matchedSession.clientName}،\n` +
        `إفادة سريعة بخصوص الوحدة كود ${matchedUnit.unitCode} في ${matchedUnit.compound}:\n` +
        `أفادت جهة الاتصال بأن الوحدة غير متاحة حالياً (${refinedSummary}).\n` +
        `نواصل فحص باقي الوحدات المختارة في رادارك وسنوافيكم بالمتاح فوراً! 🔍`;

      await this.sendWhatsApp(matchedSession.clientPhone, clientUnavailableUpdate);
      return { matchedUnitCode: matchedUnit.unitCode, clientNotified: true, responseSummary: 'Unit unavailable' };
    }
  }

  /**
   * Handles client confirming viewing date after receiving photos.
   */
  public static async handleClientViewingConfirmation(params: {
    clientPhone: string;
    clientMessage: string;
  }): Promise<{ scheduled: boolean; viewingId?: string; message: string }> {
    const { clientPhone, clientMessage } = params;
    const cleanClient = clientPhone.replace(/[^0-9]/g, '');

    const sessions = await this.getSessions();
    let matchedSession: BatchAvailabilitySession | null = null;

    for (const sessionId of Object.keys(sessions)) {
      const s = sessions[sessionId];
      if (s.clientPhone.replace(/[^0-9]/g, '').includes(cleanClient)) {
        matchedSession = s;
        break;
      }
    }

    if (!matchedSession) {
      return { scheduled: false, message: 'No active inquiry session found for client.' };
    }

    // Identify first available unit in the session
    const availableUnit = matchedSession.units.find((u) => u.status === 'available');
    const unitId = availableUnit ? availableUnit.unitId : 'general-tour';

    // Parse date or set to tomorrow at 4 PM
    const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    scheduledDate.setHours(16, 0, 0, 0);

    const viewingId = await scheduleViewing(
      matchedSession.clientPhone,
      unitId,
      'advisor-hermes',
      scheduledDate
    );

    matchedSession.viewingScheduled = true;
    matchedSession.scheduledViewingId = viewingId;
    await this.saveSessions(sessions);

    const confirmationMsg =
      `تم تسجيل موعد المعاينة المبدئي بنجاح! 🗓️✨\n\n` +
      `الموعد: ${scheduledDate.toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })} في تمام الساعة 4:00 عصراً.\n` +
      `سيتواصل معكم مستشار المعاينات الميدانية الخاص بكم لتأكيد نقطة الالتقاء وتنسيق تصريح الدخول. يسعدنا دائماً خدمتكم في سييرا العقارية!`;

    await this.sendWhatsApp(matchedSession.clientPhone, confirmationMsg);

    return { scheduled: true, viewingId, message: confirmationMsg };
  }
}
