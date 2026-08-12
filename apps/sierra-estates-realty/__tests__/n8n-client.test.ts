/**
 * Tests for n8n webhook client.
 * Note: The client reads N8N_BASE_URL/N8N_API_KEY at module import time,
 * so tests mock at the integration level rather than unit level.
 */
jest.mock('@/lib/logger');

describe('lib/server/n8n-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('triggerN8nWebhook()', () => {
    test('skips when N8N_BASE_URL is not configured', async () => {
      process.env.N8N_BASE_URL = '';
      jest.resetModules();
      const { triggerN8nWebhook } = await import('@/lib/server/n8n-client');

      const result = await triggerN8nWebhook('test-webhook', { data: 'payload' });
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('posts to n8n webhook with correct URL and payload', async () => {
      process.env.N8N_BASE_URL = 'http://localhost:5678';
      process.env.N8N_API_KEY = 'test-api-key';
      jest.resetModules();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { triggerN8nWebhook } = await import('@/lib/server/n8n-client');
      const payload = { senderPhone: '+2010123456', owners: [{ id: '1' }] };
      const result = await triggerN8nWebhook('bulk-owner-outreach', payload);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/bulk-owner-outreach',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(payload),
        })
      );
    });

    test('handles HTTP errors gracefully', async () => {
      process.env.N8N_BASE_URL = 'http://localhost:5678';
      jest.resetModules();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const { triggerN8nWebhook } = await import('@/lib/server/n8n-client');
      const result = await triggerN8nWebhook('broken-webhook', {});
      expect(result).toBe(false);
    });

    test('handles network errors', async () => {
      process.env.N8N_BASE_URL = 'http://localhost:5678';
      jest.resetModules();

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused')
      );

      const { triggerN8nWebhook } = await import('@/lib/server/n8n-client');
      const result = await triggerN8nWebhook('unreachable', {});
      expect(result).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    test('n8n calls are no-op when base URL is missing', async () => {
      process.env.N8N_BASE_URL = '';
      jest.resetModules();

      const { triggerN8nWebhook } = await import('@/lib/server/n8n-client');
      const result = await triggerN8nWebhook('any-path', { data: 'test' });
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
