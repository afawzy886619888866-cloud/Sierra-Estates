import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  classifyError,
  withBoundedRetry,
  IdempotencyCache,
  globalIdempotencyCache,
} from '../lib/reliability';
import { processIncomingWhatsAppWebhook } from '../01-whatsapp-scraper';
import { runUnitAdder, generateSBRCode } from '../05-unit-adder';
import * as dbLib from '../lib/db';

describe('Worker Orchestration & Reliability Suite', () => {
  beforeEach(() => {
    globalIdempotencyCache.clear();
    vi.restoreAllMocks();
  });

  describe('1. Error Classification', () => {
    it('classifies rate limit errors as retryable', () => {
      const err = new Error('Resource has been exhausted (e.g. check quota)');
      (err as any).status = 429;
      const classified = classifyError(err);

      expect(classified.category).toBe('rate_limit');
      expect(classified.isRetryable).toBe(true);
      expect(classified.statusCode).toBe(429);
    });

    it('classifies auth failures as non-retryable', () => {
      const err = new Error('Invalid JWT token');
      (err as any).status = 401;
      const classified = classifyError(err);

      expect(classified.category).toBe('auth_failure');
      expect(classified.isRetryable).toBe(false);
    });

    it('classifies network connection drops and timeouts as retryable', () => {
      const connErr = new Error('read ECONNRESET');
      (connErr as any).code = 'ECONNRESET';
      const classified1 = classifyError(connErr);
      expect(classified1.category).toBe('transient_network');
      expect(classified1.isRetryable).toBe(true);

      const timeoutErr = new Error('Gateway Timeout');
      (timeoutErr as any).status = 504;
      const classified2 = classifyError(timeoutErr);
      expect(classified2.category).toBe('transient_network');
      expect(classified2.isRetryable).toBe(true);
    });

    it('classifies duplicate / unique key violations as duplicate_conflict', () => {
      const dupErr = new Error('duplicate key value violates unique constraint "listings_sbr_code_key"');
      (dupErr as any).code = '23505';
      const classified = classifyError(dupErr);

      expect(classified.category).toBe('duplicate_conflict');
      expect(classified.isRetryable).toBe(false);
      expect(classified.statusCode).toBe(409);
    });

    it('classifies validation / malformed inputs as validation_error', () => {
      const valErr = new Error('schema mismatch: field compound is required');
      (valErr as any).status = 400;
      const classified = classifyError(valErr);

      expect(classified.category).toBe('validation_error');
      expect(classified.isRetryable).toBe(false);
    });
  });

  describe('2. Bounded Retries with Exponential Backoff', () => {
    it('retries transient failures and resolves when successful', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const err = new Error('Socket hang up');
          (err as any).code = 'ECONNRESET';
          throw err;
        }
        return 'SUCCESS_DATA';
      });

      const result = await withBoundedRetry(operation, {
        maxRetries: 3,
        baseDelayMs: 10,
        jitter: false,
      });

      expect(result).toBe('SUCCESS_DATA');
      expect(attempts).toBe(3);
    });

    it('stops retrying and throws immediately if error is non-retryable', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        const authErr = new Error('Unauthorized');
        (authErr as any).status = 401;
        throw authErr;
      });

      await expect(
        withBoundedRetry(operation, {
          maxRetries: 3,
          baseDelayMs: 10,
        })
      ).rejects.toThrow('Unauthorized');

      expect(attempts).toBe(1);
    });

    it('exhausts retries and throws the last error after maxRetries', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        const netErr = new Error('ETIMEDOUT');
        (netErr as any).code = 'ETIMEDOUT';
        throw netErr;
      });

      await expect(
        withBoundedRetry(operation, {
          maxRetries: 2,
          baseDelayMs: 5,
          jitter: false,
        })
      ).rejects.toThrow('ETIMEDOUT');

      expect(attempts).toBe(3); // Initial attempt + 2 retries
    });
  });

  describe('3. Idempotency & Deduplication Cache', () => {
    it('identifies duplicates and supports TTL expiration', async () => {
      const cache = new IdempotencyCache(50); // 50ms TTL

      expect(cache.isDuplicate('task-100')).toBe(false);
      cache.markProcessed('task-100');
      expect(cache.isDuplicate('task-100')).toBe(true);

      // Wait for expiration
      await new Promise((res) => setTimeout(res, 60));
      expect(cache.isDuplicate('task-100')).toBe(false);
    });

    it('generates deterministic SHA256 hashes for payloads', () => {
      const payload1 = { sender: '201012345678', body: 'Villa for sale in Mivida' };
      const payload2 = { sender: '201012345678', body: 'Villa for sale in Mivida' };
      const payload3 = { sender: '201099999999', body: 'Villa for sale in Mivida' };

      const hash1 = IdempotencyCache.hashPayload(payload1);
      const hash2 = IdempotencyCache.hashPayload(payload2);
      const hash3 = IdempotencyCache.hashPayload(payload3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('4. WhatsApp Webhook Scraper Orchestration', () => {
    it('deduplicates incoming webhook re-deliveries', async () => {
      const payload = {
        id: 'msg-unique-12345',
        sender: '201011112222',
        message: 'Luxury villa for sale in Mivida 35M',
      };

      vi.spyOn(dbLib, 'assertDbConfigured').mockReturnValue(true);
      vi.spyOn(dbLib, 'insertRecord').mockResolvedValue({ id: 'rec-1' } as any);

      // First delivery
      const res1 = await processIncomingWhatsAppWebhook(payload);
      expect(res1.status).toBe('ok');
      expect(res1.leadCaptured).toBe(true);

      // Second delivery (duplicate)
      const res2 = await processIncomingWhatsAppWebhook(payload);
      expect(res2.status).toBe('duplicate_skipped');
    });

    it('ignores non-property messages safely without database writes', async () => {
      const payload = {
        id: 'msg-chat-999',
        sender: '201011112222',
        message: 'صباح الخير، كيف الحال؟',
      };

      const insertSpy = vi.spyOn(dbLib, 'insertRecord');
      const res = await processIncomingWhatsAppWebhook(payload);

      expect(res.status).toBe('not_property');
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  describe('5. Unit Adder Deduplication & Validation', () => {
    it('validates price and compound before attempting database operations', async () => {
      const res1 = await runUnitAdder({ compound: '', price: 1000 });
      expect(res1.success).toBe(false);
      expect(res1.status).toBe('validation_error');

      const res2 = await runUnitAdder({ compound: 'Mivida', price: -500 });
      expect(res2.success).toBe(false);
      expect(res2.status).toBe('validation_error');
    });

    it('generates standard SBR codes correctly based on price and furnishing', () => {
      const code1 = generateSBRCode('Mivida', 3, true, 35000000, 'EGP');
      expect(code1).toBe('MIV-3F-35.0M');

      const code2 = generateSBRCode('Hyde Park', 2, false, 8500, 'USD');
      expect(code2).toBe('HYD-2U-8.5K');
    });

    it('deduplicates existing units by SBR code', async () => {
      vi.spyOn(dbLib, 'assertDbConfigured').mockReturnValue(true);
      vi.spyOn(dbLib, 'listRecords').mockResolvedValue([{ id: 'existing-unit-id' }] as any);
      const insertSpy = vi.spyOn(dbLib, 'insertRecord');

      const res = await runUnitAdder({
        compound: 'Mivida',
        rooms: 3,
        isFurnished: true,
        price: 35000000,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('duplicate');
      expect(res.sbrCode).toBe('MIV-3F-35.0M');
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('inserts fresh units with bounded retry on transient failure', async () => {
      vi.spyOn(dbLib, 'assertDbConfigured').mockReturnValue(true);
      vi.spyOn(dbLib, 'listRecords').mockResolvedValue([]);

      let insertAttempts = 0;
      vi.spyOn(dbLib, 'insertRecord').mockImplementation(async (table: string) => {
        if (table === 'listings') {
          insertAttempts++;
          if (insertAttempts === 1) {
            const netErr = new Error('connection reset');
            (netErr as any).code = 'ECONNRESET';
            throw netErr;
          }
          return { id: 'new-unit-999' } as any;
        }
        return { id: 'exchange-1' } as any;
      });

      const res = await runUnitAdder({
        compound: 'Palm Hills',
        rooms: 4,
        isFurnished: false,
        price: 25000000,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('inserted');
      expect(res.id).toBe('new-unit-999');
      expect(insertAttempts).toBe(2);
    });
  });
});
