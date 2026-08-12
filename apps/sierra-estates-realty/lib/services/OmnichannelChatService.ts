/**
 * sierra estates — OMNICHANNEL CHAT SERVICE
 * The master unified orchestrator coordinating all chat channels (WhatsApp, Telegram, Web).
 * Strictly manages Investment Stakeholders, the Strategic Pipeline, and Portfolio Assets.
 */

import { adminDb } from '../server/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
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
   * Resolves or instantiates an Investment Stakeholder in Firestore.
   */
  private static async resolveInvestmentStakeholder(
    platform: 'whatsapp' | 'telegram' | 'web',
    senderId: string,
    senderName: string
  ): Promise<Partial<InvestmentStakeholder>> {
    let querySnapshot;

    if (platform === 'telegram') {
      querySnapshot = await adminDb.collection(COLLECTIONS.stakeholders)
        .where('automation.telegramId', '==', parseInt(senderId) || 0)
        .limit(1)
        .get();
    } else if (platform === 'whatsapp') {
      querySnapshot = await adminDb.collection(COLLECTIONS.stakeholders)
        .where('phone', '==', senderId)
        .limit(1)
        .get();
    } else {
      querySnapshot = await adminDb.collection(COLLECTIONS.stakeholders)
        .where('automation.sessionId', '==', senderId)
        .limit(1)
        .get();
    }

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as InvestmentStakeholder;
    }

    // Instantiate new Investment Stakeholder in the Strategic Pipeline
    logger.info(`👤 [Omnichannel] Creating new Investment Stakeholder for ${senderName} on ${platform}`);
    const newStakeholder: any = {
      name: senderName || `Stakeholder-${senderId.substring(0, 6)}`,
      phone: platform === 'whatsapp' ? senderId : `GATEWAY:${senderId}`,
      stage: 'inbound',
      source: platform as any,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
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

    const docRef = await adminDb.collection(COLLECTIONS.stakeholders).add(newStakeholder);
    return { id: docRef.id, ...newStakeholder };
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
      await adminDb.collection(COLLECTIONS.stakeholders)
        .doc(stakeholderId)
        .collection('messages')
        .add({
          sender,
          text,
          platform,
          timestamp: Timestamp.now()
        });

      // Update basic activity triggers
      await adminDb.collection(COLLECTIONS.stakeholders).doc(stakeholderId).update({
        lastContactAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        interactionCount: FieldValue.increment(1) as any
      });
    } catch (err) {
      logger.error("❌ Failed to log chat message:", err);
    }
  }
}
