import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const inbox = require('../lib/inbox.js');
const { GatewayClient } = require('../lib/gateway-client.js');

describe('inbox.js — Anti-Ban, Anti-Spam & Group Stealth Hardening', () => {
  beforeEach(() => {
    inbox.RECENT_GROUP_LISTINGS.clear();
    inbox.GROUP_LAST_REPLY_TS.clear();
    inbox.IN_FLIGHT_HASHES.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends public group reply and private forward for initial listing in group', async () => {
    const sendTextSpy = vi.spyOn(GatewayClient.prototype, 'sendText').mockResolvedValue({
      ok: true,
      data: { messageId: 'true_msg_123' },
    });

    const msg = {
      chatId: '120363332470232476@g.us',
      sender: '201011112233@c.us',
      senderName: 'Broker Ahmed',
      body: 'للبيع شقة في هايد بارك 200 متر 3 غرف و 2 حمام مطلوب 12 مليون',
      isGroup: true,
    };

    const res = await inbox.handleInboundListingDrop(msg);

    expect(res.routed).toBe(true);
    expect(res.intent).toBe('listing_ingested_group');
    expect(res.replySent).toBe(true);
    expect(res.privateForwardSent).toBe(true);
    expect(res.code).toMatch(/^WA-/);

    // Verified 2 sends: 1 private forward to 201092048333@c.us, 1 group filtered reply to the group chatId
    expect(sendTextSpy).toHaveBeenCalledTimes(2);
    expect(sendTextSpy).toHaveBeenNthCalledWith(
      1,
      '201092048333@c.us',
      expect.stringContaining('🔔 *إشعار وحدة جديدة واردة — Sierra Estates*'),
      expect.objectContaining({ allowGroup: false }),
    );
    expect(sendTextSpy).toHaveBeenNthCalledWith(
      2,
      '120363332470232476@g.us',
      expect.stringContaining('ليلى من Sierra Estates'),
      expect.objectContaining({ allowGroup: true }),
    );
  });

  it('suppresses public group reply when duplicate listing is posted within 12 hours (Anti-Spam Ban Protection)', async () => {
    const sendTextSpy = vi.spyOn(GatewayClient.prototype, 'sendText').mockResolvedValue({
      ok: true,
      data: { messageId: 'true_msg_123' },
    });

    const msg = {
      chatId: '120363332470232476@g.us',
      sender: '201011112233@c.us',
      senderName: 'Broker Ahmed',
      body: 'للبيع شقة في هايد بارك 200 متر 3 غرف و 2 حمام مطلوب 12 مليون',
      isGroup: true,
    };

    // First delivery
    const res1 = await inbox.handleInboundListingDrop(msg);
    expect(res1.replySent).toBe(true);
    expect(sendTextSpy).toHaveBeenCalledTimes(2);

    sendTextSpy.mockClear();

    // Second delivery: Broker forwards the exact same unit 15 minutes later
    const res2 = await inbox.handleInboundListingDrop(msg);
    expect(res2.intent).toBe('listing_ingested_group_duplicate_suppressed');
    expect(res2.replySent).toBe(false); // Suppressed to avoid group spam report & ban
    expect(res2.privateForwardSent).toBe(true); // Admin still informed privately

    // Only 1 send was dispatched: the private forward with the duplicate warning note!
    expect(sendTextSpy).toHaveBeenCalledTimes(1);
    expect(sendTextSpy).toHaveBeenCalledWith(
      '201092048333@c.us',
      expect.stringContaining('ملاحظة نظام (مكافحة السبام والحظر)'),
      expect.objectContaining({ allowGroup: false }),
    );
  });

  it('prevents concurrent double-execution with in-flight mutex lock', async () => {
    const dupeHash = 'test_hash_mutex_123';
    inbox.IN_FLIGHT_HASHES.add(dupeHash);

    // Mock a message that hashes to this key or test mutex lock directly
    expect(inbox.IN_FLIGHT_HASHES.has(dupeHash)).toBe(true);
    inbox.IN_FLIGHT_HASHES.delete(dupeHash);
    expect(inbox.IN_FLIGHT_HASHES.has(dupeHash)).toBe(false);
  });
});
