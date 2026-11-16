/**
 * Tests: lib/server/webhook-log.ts — the unified inbound webhook ledger.
 *
 *   · Records the payload WITHOUT consuming the request body (the route
 *     handler still reads it).
 *   · Redacts auth material (signatures, secrets, cookies) from the stored
 *     headers; keeps the rest for observability.
 *   · Never throws: a ledger failure resolves to null / no-op so the webhook
 *     response contract is untouched.
 */
const insertRecordMock = jest.fn();
const updateRecordMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
}));

import { logWebhookReceived, finalizeWebhookLog } from '@/lib/server/webhook-log';
import { NextRequest } from 'next/server';

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': 'sha256=deadbeef',
      'x-telegram-bot-api-secret-token': 'super-secret',
      'user-agent': 'test-runner',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('logWebhookReceived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertRecordMock.mockResolvedValue({ id: 'log-1' });
  });

  test('inserts the ledger row and returns its id', async () => {
    const req = makeReq({ entry: [{ id: 'wamid.1' }] });
    const id = await logWebhookReceived(req, { source: 'whatsapp' });

    expect(id).toBe('log-1');
    expect(insertRecordMock).toHaveBeenCalledTimes(1);

    const [table, values] = insertRecordMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(table).toBe('webhook_logs');
    expect(values.source).toBe('whatsapp');
    expect(values.status).toBe('received');
    // Payload + request metadata ride along…
    const payload = values.payload as Record<string, unknown>;
    expect((payload as { entry: unknown[] }).entry).toHaveLength(1);
    const meta = (payload._sierraMeta ?? {}) as { headers: Record<string, string>; url: string };
    expect(meta.url).toContain('/api/webhooks/whatsapp');
    expect(meta.headers['user-agent']).toBe('test-runner');
    // …but auth material is redacted.
    expect(meta.headers['x-hub-signature-256']).toBe('[redacted]');
    expect(meta.headers['x-telegram-bot-api-secret-token']).toBe('[redacted]');
  });

  test('does not consume the request body — the handler can still read it', async () => {
    const req = makeReq({ keep: 'intact' });
    await logWebhookReceived(req, { source: 'whatsapp' });

    const text = await req.text();
    expect(JSON.parse(text)).toEqual({ keep: 'intact' });
  });

  test('never throws when the ledger is unavailable', async () => {
    insertRecordMock.mockRejectedValue(new Error('relation "webhook_logs" does not exist'));

    const req = makeReq({});
    await expect(logWebhookReceived(req, { source: 'telegram' })).resolves.toBeNull();
  });
});

describe('finalizeWebhookLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateRecordMock.mockResolvedValue({ id: 'log-1' });
  });

  test('updates status and latency for a completed webhook', async () => {
    const started = performance.now() - 120;
    await finalizeWebhookLog('log-1', 'processed', started);

    expect(updateRecordMock).toHaveBeenCalledWith('webhook_logs', 'log-1', {
      status: 'processed',
      latencyMs: expect.any(Number),
      error: null,
    });
  });

  test('records the error message for a failed webhook', async () => {
    await finalizeWebhookLog('log-1', 'error', performance.now(), new Error('boom'));

    const [, , values] = updateRecordMock.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(values.status).toBe('error');
    expect(values.error).toBe('boom');
  });

  test('no-ops without a ledger row and never throws', async () => {
    updateRecordMock.mockRejectedValue(new Error('ledger down'));

    await expect(finalizeWebhookLog(null, 'processed', 0)).resolves.toBeUndefined();
    await expect(finalizeWebhookLog('log-1', 'processed', 0)).resolves.toBeUndefined();
    expect(updateRecordMock).toHaveBeenCalledTimes(1);
  });
});
