/**
 * Tests that inbound WhatsApp messages are routed to the right handler:
 * an active owner negotiation takes priority over generic lead/listing
 * handling (an owner mid-negotiation must not get a duplicate stakeholder
 * record, and their reply must land on the negotiation thread).
 */

const findActiveOwnerNegotiationByPhoneMock = jest.fn();
const appendOwnerNegotiationMessageMock = jest.fn();
const processAgentCommandMock = jest.fn();

jest.mock('@/lib/server/whatsapp-queue', () => ({
  findActiveOwnerNegotiationByPhone: (...args: unknown[]) => findActiveOwnerNegotiationByPhoneMock(...args),
  appendOwnerNegotiationMessage: (...args: unknown[]) => appendOwnerNegotiationMessageMock(...args),
}));

jest.mock('@/lib/services/antigravity-agent', () => ({
  processAgentCommand: (...args: unknown[]) => processAgentCommandMock(...args),
}));

jest.mock('@/lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: { processIncomingMessage: jest.fn(), formatWhatsAppMessage: jest.fn() },
}));

jest.mock('@/lib/services/WhatsAppStatusService', () => ({
  WhatsAppStatusService: { recordHeartbeat: jest.fn() },
}));

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: { collection: jest.fn() },
}));

import { OmnichannelChatService } from '@/lib/services/OmnichannelChatService';

describe('OmnichannelChatService.handleIncomingMessage — owner negotiation priority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('routes a reply from an active negotiation owner to the negotiation, not the lead pipeline', async () => {
    findActiveOwnerNegotiationByPhoneMock.mockResolvedValue({
      id: 'neg-123',
      data: { ownerPhone: '+201032206443', status: 'negotiating', history: [] },
    });

    const result = await OmnichannelChatService.handleIncomingMessage({
      platform: 'whatsapp',
      senderId: '+201032206443',
      senderName: 'Property Owner',
      text: 'I can do 4.2M, final offer',
    });

    expect(findActiveOwnerNegotiationByPhoneMock).toHaveBeenCalledWith('+201032206443');
    expect(appendOwnerNegotiationMessageMock).toHaveBeenCalledWith('neg-123', {
      direction: 'inbound',
      message: 'I can do 4.2M, final offer',
    });
    expect(result.actionTaken).toBe('owner_negotiation_reply');

    // Must NOT fall through to the generic AI-agent/lead pipeline.
    expect(processAgentCommandMock).not.toHaveBeenCalled();
  });

  test('falls through to the generic pipeline when the sender has no active negotiation', async () => {
    findActiveOwnerNegotiationByPhoneMock.mockResolvedValue(null);
    processAgentCommandMock.mockResolvedValue({ success: true, message: 'ack', actionTaken: 'conversation' });

    // adminDb.collection(...).where(...).limit(...).get() chain used by
    // resolveInvestmentStakeholder / logChatMessage downstream of the
    // owner-negotiation check — stub it minimally so the fallthrough path
    // (which we're not asserting the internals of) doesn't throw.
    const chain: any = {
      where: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      get: jest.fn(async () => ({ empty: true, docs: [] })),
      add: jest.fn(async () => ({ id: 'new-stakeholder' })),
      doc: jest.fn(() => ({ collection: jest.fn(() => chain), update: jest.fn(), set: jest.fn() })),
    };
    const { adminDb } = require('@/lib/server/firebase-admin');
    adminDb.collection.mockReturnValue(chain);

    await OmnichannelChatService.handleIncomingMessage({
      platform: 'whatsapp',
      senderId: '+201000000000',
      senderName: 'Some Buyer',
      text: 'Is this unit still available?',
    });

    expect(findActiveOwnerNegotiationByPhoneMock).toHaveBeenCalledWith('+201000000000');
    expect(appendOwnerNegotiationMessageMock).not.toHaveBeenCalled();
    expect(processAgentCommandMock).toHaveBeenCalled();
  });
});
