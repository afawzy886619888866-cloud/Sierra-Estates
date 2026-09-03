/**
 * sierra estates — OMNICHANNEL CHAT SERVICE
 * The master unified orchestrator coordinating all chat channels (WhatsApp, Telegram, Web).
 * Strictly manages Investment Stakeholders, the Strategic Pipeline, and Portfolio Assets.
 */

import { getSupabaseAdmin, insertRecord, listRecords } from '@sierra-estates/db';
import { COLLECTIONS, type InvestmentStakeholder } from '../models/schema';
import { processAgentCommand } from './antigravity-agent';
import { WhatsAppParserService } from './WhatsAppParserService';
import { WhatsAppStatusService } from './WhatsAppStatusService';
import { findActiveOwnerNegotiationByPhone, appendOwnerNegotiationMessage } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

export interface IncomingMessagePayload {
  platform: 'whatsapp' | 'telegram' | 'web';
  senderId: string; // phone number, telegram chat ID, or web session ID
  senderName: string;
  text: string;
  groupName?: string; // For group scrapers
  media?: { data: string; mimeType: string };
}

export interface ChatResponse {
  success: boolean;
  replyText: string;
  stakeholderId?: string;
  actionTaken?: string;
}

export class OmnichannelChatService {
  /**
   * Main orchestrator processing incoming messages from WhatsApp, Telegram, and Web.
   */
  static async handleIncomingMessage(payload: IncomingMessagePayload): Promise<ChatResponse> {
    const { platform, senderId, senderName, text, groupName, media } = payload;
    logger.info(`📥 [Omnichannel] Received message from ${senderName} via ${platform}: "${text.substring(0, 60)}"`);

    // 0. Owner negotiations take priority: an owner mid-negotiation is NOT a
    // buyer/renter lead, and we must not create a duplicate stakeholder for
    // them. Route the reply onto the negotiation thread and stop.
    if (platform === 'whatsapp') {
      const negotiation = await findActiveOwnerNegotiationByPhone(senderId);
      if (negotiation) {
        logger.info(`🤝 [Omnichannel] Message from ${senderId} matched active owner negotiation ${negotiation.id}.`);
        await appendOwnerNegotiationMessage(negotiation.id, { direction: 'inbound', message: text });
        return {
          success: true,
          replyText: '',
          actionTaken: 'owner_negotiation_reply',
        };
      }
    }

    // 1. If WhatsApp message contains property markers and is from a group, route to parsing engine immediately
    if (platform === 'whatsapp' && groupName && groupName !== 'Direct Message') {
      const isBrokerListing = this.isMessagePropertyListing(text);
      if (isBrokerListing) {
        logger.info(`🏢 [Omnichannel] WhatsApp message identified as Portfolio Asset signal. Routing to Parser Service.`);
        await WhatsAppStatusService.recordHeartbeat('syncing');
        const parseResult = await WhatsAppParserService.processIncomingMessage(text, senderId, groupName, media);
        return {
          success: true,
          replyText: `Ingested Portfolio Asset with code ${parseResult.data.sierraCode}`,
          actionTaken: 'asset_ingestion'
        };
      }
    }

    // 2. Identify or instantiate the Investment Stakeholder in the Strategic Pipeline
    const stakeholder = await this.resolveInvestmentStakeholder(platform, senderId, senderName);
    const stakeholderId = stakeholder.id!;

    // 3. Log user message to consolidated chat history
    await this.logChatMessage(stakeholderId, 'user', text, platform);

    // 4. Process command or conversation via the Antigravity Intelligence Agent
    const numericSenderId = platform === 'telegram' ? parseInt(senderId) || 0 : 0;
    const agentResult = await processAgentCommand(numericSenderId || stakeholderId as any, text);

    // 5. Log AI reply to consolidated chat history
    await this.logChatMessage(stakeholderId, 'sierra', agentResult.message, platform);

    // 6. Return response to platform gateway
    return {
      success: agentResult.success,
      replyText: agentResult.message,
      stakeholderId: stakeholderId,
      actionTaken: agentResult.actionTaken || 'conversation'
    };
  }

  /**
   * Resolves or instantiates an Investment Stakeholder.
   */
  private static async resolveInvestmentStakeholder(
    platform: 'whatsapp' | 'telegram' | 'web',
    senderId: string,
    senderName: string
  ): Promise<Partial<InvestmentStakeholder>> {
    const existing = await this.findStakeholder(platform, senderId);
    if (existing) return existing;

    // Instantiate new Investment Stakeholder in the Strategic Pipeline
    logger.info(`👤 [Omnichannel] Creating new Investment Stakeholder for ${senderName} on ${platform}`);
    const newStakeholder: any = {
      // `fullName` is the column; the admin API is what maps it back to `name`
      // for the client. Writing `name` here would be an unknown column and
      // would also leave full_name (NOT NULL) unset.
      fullName: senderName || `Stakeholder-${senderId.substring(0, 6)}`,
      phone: platform === 'whatsapp' ? senderId : `GATEWAY:${senderId}`,
      stage: 'inbound',
      source: platform as any,
      interactionCount: 1,
      automation: {
        botInitiated: true,
        scoringCompleted: false,
        whatsappFollowupSent: false,
        viewingReminderSent: false,
        telegramId: platform === 'telegram' ? parseInt(senderId) || undefined : undefined,
        sessionId: platform === 'web' ? senderId : undefined
      }
    };

    const created = await insertRecord<{ id: string }>(COLLECTIONS.stakeholders, newStakeholder);
    return { ...newStakeholder, id: created.id };
  }

  /**
   * Looks the stakeholder up by whichever identifier the platform carries.
   *
   * Telegram and web sessions are addressed through keys inside the JSONB
   * `automation` column, which the record layer cannot express — it snake_cases
   * whole column names, which would corrupt a JSON path — so those two go
   * through the client directly. The keys read snake_cased because the record
   * layer converts payload keys recursively on write.
   */
  private static async findStakeholder(
    platform: 'whatsapp' | 'telegram' | 'web',
    senderId: string
  ): Promise<InvestmentStakeholder | null> {
    if (platform === 'whatsapp') {
      const rows = await listRecords<InvestmentStakeholder>(COLLECTIONS.stakeholders, {
        where: [{ column: 'phone', value: senderId }],
        limit: 1,
      });
      return rows[0] ?? null;
    }

    const path = platform === 'telegram'
      ? 'automation->>telegram_id'
      : 'automation->>session_id';
    const value = platform === 'telegram'
      ? String(parseInt(senderId) || 0)
      : senderId;

    const { data, error } = await getSupabaseAdmin()
      .from(COLLECTIONS.stakeholders)
      .select('*')
      .eq(path, value)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`[supabase:findStakeholder ${platform}] ${error.message}`);
    }
    return (data as InvestmentStakeholder | null) ?? null;
  }

  /**
   * Evaluates if raw text is a structured Portfolio Asset listing rather than an inquiry.
   */
  private static isMessagePropertyListing(text: string): boolean {
    const lower = text.toLowerCase();
    const keywords = ['sale', 'rent', 'bedroom', 'villa', 'apartment', 'downpayment', 'installment', 'delivery', 'compound', 'للبيع', 'للايجار', 'مطلوب', 'كمبوند', 'شقة'];
    const hits = keywords.filter(word => lower.includes(word));
    // Require at least two distinct property-related terms to avoid false positives
    return hits.length >= 2;
  }

  /**
   * Consolidated chat history persistence.
   */
  private static async logChatMessage(
    stakeholderId: string,
    sender: 'user' | 'sierra',
    text: string,
    platform: string
  ) {
    try {
      await insertRecord('lead_messages', {
        leadId: stakeholderId,
        sender,
        text,
        platform,
        timestamp: new Date().toISOString(),
      });

      // Update basic activity triggers. FieldValue.increment() was atomic;
      // a read-modify-write here would drop a count whenever two messages land
      // together, so the increment happens inside one SQL statement.
      const { error } = await getSupabaseAdmin()
        .rpc('bump_lead_interaction', { p_lead_id: stakeholderId });
      if (error) throw new Error(error.message);
    } catch (err) {
      logger.error("❌ Failed to log chat message:", err);
    }
  }
}
