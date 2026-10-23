/**
 * Tests for Arize OpenTelemetry integration.
 * These tests verify that tracing is properly initialized and that
 * graceful degradation works when credentials are missing.
 */
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger');

describe('lib/arize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('initArize()', () => {
    test('does not throw when called', async () => {
      const { initArize } = await import('@/lib/arize');
      expect(() => initArize()).not.toThrow();
    });

    test('skips client-side initialization (window guard)', async () => {
      (global as any).window = {};
      const { initArize } = await import('@/lib/arize');
      initArize();
      // Should return early without logging when window exists
      expect(logger.info).not.toHaveBeenCalled();
      delete (global as any).window;
    });

    test('is idempotent (safe to call multiple times)', async () => {
      const { initArize } = await import('@/lib/arize');
      expect(() => {
        initArize();
        initArize();
      }).not.toThrow();
    });
  });

  describe('getTracer()', () => {
    test('returns a tracer object', async () => {
      const { getTracer } = await import('@/lib/arize');
      const tracer = getTracer();
      expect(tracer).toBeDefined();
      expect(typeof tracer.startActiveSpan).toBe('function');
    });

    test('returns a usable tracer on repeated calls', async () => {
      const { getTracer } = await import('@/lib/arize');
      const tracer1 = getTracer();
      const tracer2 = getTracer();
      // Both calls return a usable tracer (no-op or real) with the span API
      expect(typeof tracer1.startActiveSpan).toBe('function');
      expect(typeof tracer2.startActiveSpan).toBe('function');
    });
  });

  describe('instrumentAgent<T>()', () => {
    test('wraps an async function in a span', async () => {
      const { instrumentAgent } = await import('@/lib/arize');
      const fn = jest.fn().mockResolvedValue('result');
      const result = await instrumentAgent('test-agent', 'S1', 'doc-123', fn);
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    test('handles sync functions', async () => {
      const { instrumentAgent } = await import('@/lib/arize');
      const fn = jest.fn().mockReturnValue('sync-result');
      const result = await instrumentAgent('test-agent', 'S1', 'doc-456', fn);
      expect(result).toBe('sync-result');
    });

    test('re-throws errors from instrumented function', async () => {
      const { instrumentAgent } = await import('@/lib/arize');
      const error = new Error('agent failure');
      const fn = jest.fn().mockRejectedValue(error);
      await expect(
        instrumentAgent('test-agent', 'S1', 'doc-789', fn)
      ).rejects.toThrow('agent failure');
    });
  });

  describe('graceful degradation', () => {
    test('app runs without Arize credentials', async () => {
      process.env.ARIZE_SPACE_ID = '';
      process.env.ARIZE_API_KEY = '';
      jest.resetModules();

      const { initArize, instrumentAgent, getTracer } = await import('@/lib/arize');

      // Should not throw
      initArize();

      const tracer = getTracer();
      expect(tracer).toBeDefined();

      const result = await instrumentAgent('agent', 'stage', 'docid', async () => 'success');
      expect(result).toBe('success');
    });
  });
});
