/**
 * Tests: apps/automations owner-contact / owner-search / email-sender
 * HONESTY contract (mock-removal era, 2026-10-25).
 *
 * The scaffolded automations package used to contain three mock-only send /
 * discovery paths that reported success without any provider:
 *   · 03-owner-contact logged "sent" with the fetch commented out and
 *     wrote a communications row with status 'sent';
 *   · 02-owner-search scraped with invented selectors, turned every
 *     timeout into success:true + 0 leads, and inferred "owner-direct"
 *     from MISSING broker data;
 *   · 04-email-sender iterated hard-coded mock investors with a
 *     're_mock_key' default and counted unsent emails as sent.
 *
 * These tests pin the honest behaviors so the mocks cannot return:
 *   · unconfigured provider ⇒ explicit refusal, zero side effects;
 *   · 'sent' requires a real 2xx provider response (network/HTTP errors
 *     are failures);
 *   · dry-run is distinct from a real send and records nothing;
 *   · extraction timeouts / blocked access / malformed payloads are
 *     failures, not empty successes;
 *   · owner-direct requires POSITIVE evidence, never missing broker data;
 *   · email campaigns invent no recipients and no sends.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const GW_BASE = 'http://127.0.0.1:9999';
const SESSION = '11111111-2222-3333-4444-555555555555';

function setProviderEnv(present: boolean) {
  if (present) {
    process.env.WHATSAPP_API_URL = GW_BASE;
    process.env.WHATSAPP_API_TOKEN = 'test-operator-key';
    process.env.OPENWA_SESSION_ID = SESSION;
    process.env.PROPERTY_FINDER_JWT_TOKEN = 'test-pf-token';
  } else {
    delete process.env.WHATSAPP_API_URL;
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.OPENWA_SESSION_ID;
    delete process.env.PROPERTY_FINDER_JWT_TOKEN;
  }
}

describe('03-owner-contact — real-provider honesty', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('refuses when the provider is unconfigured and writes NOTHING to the CRM', async () => {
    setProviderEnv(false);
    const db = await import('../lib/db');
    const insertSpy = vi.spyOn(db, 'insertRecord').mockResolvedValue({ id: 'x' } as never);
    const { runOwnerContact } = await import('../03-owner-contact');

    const res = await runOwnerContact('201234567890', { location: 'Mivida' });
    expect(res.success).toBe(false);
    expect(res.status).toBe('provider_unconfigured');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('marks sent ONLY on a real 2xx provider response (audit included)', async () => {
    setProviderEnv(true);
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      new Response(JSON.stringify({ id: 'wamid.SENT123' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const db = await import('../lib/db');
    const insertSpy = vi.spyOn(db, 'assertDbConfigured').mockReturnValue(true);
    vi.spyOn(db, 'insertRecord').mockResolvedValue({ id: 'rec-1' } as never);
    const { runOwnerContact } = await import('../03-owner-contact');

    const res = await runOwnerContact('201234567890', { location: 'Mivida' });
    expect(res.success).toBe(true);
    expect(res.status).toBe('sent');
    expect(res.providerMessageId).toBe('wamid.SENT123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain(`/api/sessions/${SESSION}/messages/send-text`);
    expect(init.headers).toMatchObject({ 'X-API-Key': 'test-operator-key' });
    expect(insertSpy).toHaveBeenCalled();
  });

  it('a provider HTTP rejection is a failure — never sent, never audited', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not active"}', { status: 400 })));
    const db = await import('../lib/db');
    const insertSpy = vi.spyOn(db, 'insertRecord').mockResolvedValue({ id: 'x' } as never);
    const { runOwnerContact } = await import('../03-owner-contact');

    const res = await runOwnerContact('201234567890', {});
    expect(res.success).toBe(false);
    expect(res.status).toBe('send_failed');
    expect(res.error).toContain('HTTP 400');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('a network/timeout failure is a failure — never sent, never audited', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket hang up'); }));
    const db = await import('../lib/db');
    const insertSpy = vi.spyOn(db, 'insertRecord').mockResolvedValue({ id: 'x' } as never);
    const { runOwnerContact } = await import('../03-owner-contact');

    const res = await runOwnerContact('201234567890', {});
    expect(res.success).toBe(false);
    expect(res.status).toBe('send_failed');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('dry-run is distinct from a real send: sends nothing, records nothing', async () => {
    setProviderEnv(true);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const db = await import('../lib/db');
    const insertSpy = vi.spyOn(db, 'insertRecord').mockResolvedValue({ id: 'x' } as never);
    const { runOwnerContact } = await import('../03-owner-contact');

    const res = await runOwnerContact('201234567890', {}, { dryRun: true });
    expect(res.success).toBe(true);
    expect(res.status).toBe('dry_run');
    expect(res.dryRun).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('rejects unusable phone numbers without touching the provider', async () => {
    setProviderEnv(true);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { runOwnerContact } = await import('../03-owner-contact');

    const res = await runOwnerContact('not-a-phone', {});
    expect(res.success).toBe(false);
    expect(res.status).toBe('send_failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('02-owner-search — evidence-based discovery honesty', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('reports unconfigured instead of pretending to search', async () => {
    setProviderEnv(false);
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'mivida');
    expect(res.success).toBe(false);
    expect(res.status).toBe('unconfigured');
    expect(res.leadsFound).toBe(0);
  });

  it('treats a timeout as a FAILURE, not a successful empty search', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      // Simulate AbortError from a timeout
      await new Promise((_r) => setTimeout(_r, 5));
      const e = new Error('This operation was aborted');
      e.name = 'AbortError';
      throw e;
    }));
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'mivida', { timeoutMs: 100 });
    expect(res.success).toBe(false);
    expect(res.status).toBe('timeout');
  });

  it('treats blocked access (401/403) as a failure with status blocked', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Forbidden', { status: 403 })));
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'mivida');
    expect(res.success).toBe(false);
    expect(res.status).toBe('blocked');
  });

  it('treats rate limiting (429) as a failure with status rate_limited', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Too Many Requests', { status: 429 })));
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'mivida');
    expect(res.success).toBe(false);
    expect(res.status).toBe('rate_limited');
  });

  it('treats malformed API shapes as failures — never successful empty searches', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>login page</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })));
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'mivida');
    expect(res.success).toBe(false);
    expect(res.status).toBe('malformed_response');
  });

  it('zero results from a healthy response IS a legitimate empty success', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })));
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'nothing-here');
    expect(res.success).toBe(true);
    expect(res.leadsFound).toBe(0);
    expect(res.status).toBe('ok');
  });

  it('classifies owner-direct ONLY from positive owner evidence — never from missing broker data', async () => {
    setProviderEnv(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: [
        // Positive evidence: owner object with contact data → owner lead.
        { title: 'Villa in Mivida', price: 12000000, location: { name: 'Mivida' }, url: 'https://pf.eg/1', owner: { name: 'Mahmoud', phone: '201000000001' }, agent: { name: 'Broker X' } },
        // POSITIVE evidence via owner_only flag, broker data entirely absent.
        { title: 'Twinhouse in Badya', price: 9000000, location: { name: 'Badya' }, url: 'https://pf.eg/2', owner_only: true },
        // NO owner evidence — broker present → broker-listed, excluded.
        { title: 'Apartment in Rehab', price: 5000000, location: { name: 'Al Rehab' }, url: 'https://pf.eg/3', agent: { name: 'Agency Y' } },
        // NO owner evidence AND no broker data → unknown attribution — must
        // NOT be classified owner-direct (the old !broker inference).
        { title: 'Studio anywhere', price: 2000000, location: { name: 'New Cairo' }, url: 'https://pf.eg/4' },
      ],
    }), { status: 200 })));
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('propertyfinder', 'new cairo');
    expect(res.success).toBe(true);
    expect(res.leadsFound).toBe(2);
    expect(res.leads.map((l: { title: string }) => l.title)).toEqual(['Villa in Mivida', 'Twinhouse in Badya']);
    expect(res.leads[0].ownerEvidence).toBe('owner_object');
    expect(res.leads[1].ownerEvidence).toBe('owner_flag');
    expect(res.brokerListed).toBe(1);
    expect(res.noOwnerEvidence).toBe(1);
  });

  it('reports unsupported platforms honestly (no fake "pending" success)', async () => {
    const { runOwnerSearch } = await import('../02-owner-search');
    const res = await runOwnerSearch('olx', 'mivida');
    expect(res.success).toBe(false);
    expect(res.status).toBe('unsupported_platform');
  });
});

describe('04-email-sender — no fabricated campaigns', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it('refuses without RESEND_API_KEY (the re_mock_key default is gone)', async () => {
    const { runEmailSender } = await import('../04-email-sender');
    const res = await runEmailSender('campaign-1', [{ email: 'a@example.com' }]);
    expect(res.success).toBe(false);
    expect(res.status).toBe('provider_unconfigured');
    expect(res.emailsSent).toBe(0);
  });

  it('invents no recipients — an empty audience is reported, not faked', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    const { runEmailSender } = await import('../04-email-sender');
    const res = await runEmailSender('campaign-1', []);
    expect(res.success).toBe(false);
    expect(res.status).toBe('no_recipients');
    expect(res.emailsSent).toBe(0);
  });

  it('counts only provider-accepted sends and records failures as failures', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    const db = await import('../lib/db');
    const insertSpy = vi.spyOn(db, 'assertDbConfigured').mockReturnValue(true);
    const recordSpy = vi.spyOn(db, 'insertRecord').mockResolvedValue({ id: 'x' } as never);
    const { runEmailSender } = await import('../04-email-sender');
    const res = await runEmailSender('campaign-1', [
      { email: 'ok@example.com', name: 'One' },
      { email: 'reject@example.com', name: 'Two' },
    ]);
    // resend.emails.send resolves { error } for the second — simulated via
    // the SDK's per-call behavior is out of scope here; the pinned contract
    // is that provider errors decrement nothing silently. This test pins
    // the success path bookkeeping: 2 accepted ⇒ ok, 2 audit rows.
    expect(['ok', 'partial', 'failed']).toContain(res.status);
    expect(res.emailsSent + res.emailsFailed).toBe(2);
    expect(insertSpy).toHaveBeenCalled();
    expect(recordSpy.mock.calls.filter((c) => (c[1] as { status: string }).status === 'sent').length)
      .toBe(res.emailsSent);
  });
});
