import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  probeRemote,
  probeRagLive,
  probeTelegramLeg,
  classifyRagFailure,
} from '../scripts/check-live-services.mjs';

/**
 * Sierra Estates 3.0 — live-services status tool deep-probe suite.
 *
 * §21 contract under test: PRESENCE IS NOT VALIDITY.
 *   ① The RAG live probe must distinguish a capability report that merely
 *      says "configured" from an embedding → RPC round-trip that actually
 *      succeeds — a present-but-invalid GOOGLE_GENAI_API_KEY must surface
 *      as `failed` with the server's reason, never as verified.
 *   ② The Telegram leg probe must distinguish a valid bot token from a
 *      bot that can actually see the listings channel.
 *   ③ Unreachable endpoints report `unreachable` — never a fake degraded.
 *   ④ No probe ever returns or prints secret VALUES.
 */

const BASE = 'https://sierra-estates.test';

const ENV_KEYS = [
  'SBR_SECRET_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_ADMIN_CHAT_ID',
  'GOOGLE_GENAI_API_KEY',
  'GEMINI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LIVE_APP_URL',
] as const;

const savedEnv: Record<string, string | undefined> = {};
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// probeRemote — capability report (GET /api/internal/rag-search)
// ─────────────────────────────────────────────────────────────────────────────

describe('probeRemote — capability report', () => {
  it('parses presence flags, model, dimensions and rpc from a 200 report', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        endpoint: '/api/internal/rag-search',
        model: 'gemini-embedding-001',
        dimensions: 768,
        rpc: 'match_listings_gemini',
        configured: { geminiEmbeddings: true, supabaseAdmin: true },
      }),
    ) as unknown as typeof fetch;

    const report = await probeRemote(BASE);
    expect(report.ok).toBe(true);
    expect(report.geminiEmbeddings).toBe(true);
    expect(report.supabaseAdmin).toBe(true);
    expect(report.model).toBe('gemini-embedding-001');
    expect(report.dimensions).toBe(768);
    expect(report.rpc).toBe('match_listings_gemini');
  });

  it('reports a 401 as an honest live gate (gated), not a dead endpoint', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ error: 'Unauthorized internal request' }, 401),
    ) as unknown as typeof fetch;

    const report = await probeRemote(BASE);
    expect(report.ok).toBe(false);
    expect(report.gated).toBe(true);
  });

  it('attaches the local SBR secret as a header when present', async () => {
    process.env.SBR_SECRET_KEY = 'sbr_test_secret';
    const spy = vi.fn(async () =>
      jsonResponse({ configured: { geminiEmbeddings: true, supabaseAdmin: true } }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;

    await probeRemote(BASE);
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init?.headers as Record<string, string>)['x-sbr-secret-key']).toBe('sbr_test_secret');
  });

  it('reports network failure as unreachable with the error message', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof fetch;

    const report = await probeRemote(BASE);
    expect(report.ok).toBe(false);
    expect(report.error).toBe('ECONNRESET');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// probeRagLive — the §21 deep probe for service ①
// ─────────────────────────────────────────────────────────────────────────────

describe('probeRagLive — live embedding → RPC round-trip', () => {
  it('classifies a 200 search as verified with the match count', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: true, query: 'probe', count: 2, matches: [{ id: 'x' }] }),
    ) as unknown as typeof fetch;

    const probe = await probeRagLive(BASE);
    expect(probe.state).toBe('verified');
    expect(probe.httpStatus).toBe(200);
    expect(probe.matches).toBe(2);
  });

  it('classifies a 200 search with zero matches as verified (embedding call succeeded)', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: true, count: 0, matches: [] }),
    ) as unknown as typeof fetch;

    const probe = await probeRagLive(BASE);
    expect(probe.state).toBe('verified');
    expect(probe.matches).toBe(0);
  });

  it('classifies a present-but-REJECTED Gemini key (503) as failed with the reason', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(
        {
          error: 'Semantic search unavailable',
          reason:
            'Gemini embedding unavailable: [401 Unauthorized] API key not valid. ACCESS_TOKEN_TYPE_UNSUPPORTED',
        },
        503,
      ),
    ) as unknown as typeof fetch;

    const probe = await probeRagLive(BASE);
    expect(probe.state).toBe('failed');
    expect(probe.httpStatus).toBe(503);
    expect(probe.reason).toContain('Gemini embedding unavailable');
    expect(probe.reason).toContain('API key not valid');
  });

  it('classifies a missing Supabase service key (503) as failed with the reason', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(
        {
          error: 'Semantic search unavailable',
          reason: 'SUPABASE_SERVICE_ROLE_KEY is not configured — cannot call match_listings_gemini.',
        },
        503,
      ),
    ) as unknown as typeof fetch;

    const probe = await probeRagLive(BASE);
    expect(probe.state).toBe('failed');
    expect(probe.reason).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('classifies a 401 as gated (presence-only fallback, not degraded)', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ error: 'Unauthorized internal request' }, 401),
    ) as unknown as typeof fetch;

    const probe = await probeRagLive(BASE);
    expect(probe.state).toBe('gated');
    expect(probe.httpStatus).toBe(401);
  });

  it('reports network failure as unreachable — never fabricated as degraded', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ENOTFOUND');
    }) as unknown as typeof fetch;

    const probe = await probeRagLive(BASE);
    expect(probe.state).toBe('unreachable');
    expect(probe.error).toBe('ENOTFOUND');
  });

  it('POSTs a minimal probe query with matchCount 1', async () => {
    const spy = vi.fn(async () => jsonResponse({ ok: true, count: 0, matches: [] }));
    globalThis.fetch = spy as unknown as typeof fetch;

    await probeRagLive(BASE);
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe(`${BASE}/api/internal/rag-search`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ query: 'probe', matchCount: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// probeTelegramLeg — the §21 deep probe for service ②
// ─────────────────────────────────────────────────────────────────────────────

describe('probeTelegramLeg — bot token + channel visibility', () => {
  it('skips (presence-only) when no local token exists', async () => {
    const probe = await probeTelegramLeg({});
    expect(probe.state).toBe('skipped');
  });

  it('verifies a working token AND a channel the bot can see', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/getMe')) {
        return jsonResponse({ ok: true, result: { id: 1, username: 'ariasierrablubot' } });
      }
      if (url.includes('/getChat')) {
        return jsonResponse({
          ok: true,
          result: { id: -100, type: 'channel', title: 'Sierra Estates New Cairo', username: 'SierraEstatesNewCairo' },
        });
      }
      return jsonResponse({ ok: false }, 404);
    }) as unknown as typeof fetch;

    const probe = await probeTelegramLeg({ token: '8529262692:TEST', chatId: '@SierraEstatesNewCairo' });
    expect(probe.state).toBe('verified');
    expect(probe.botUsername).toBe('ariasierrablubot');
    expect(probe.chatHandle).toBe('@SierraEstatesNewCairo');
  });

  it('reports token-only verification when TELEGRAM_CHAT_ID is absent', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: true, result: { id: 1, username: 'ariasierrablubot' } }),
    ) as unknown as typeof fetch;

    const probe = await probeTelegramLeg({ token: '8529262692:TEST' });
    expect(probe.state).toBe('verified-token-only');
    expect(probe.botUsername).toBe('ariasierrablubot');
  });

  it('classifies a rejected token (getMe ok:false) as token-rejected', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: false, error_code: 401, description: 'Unauthorized' }, 401),
    ) as unknown as typeof fetch;

    const probe = await probeTelegramLeg({ token: '8529262692:BAD', chatId: '@SierraEstatesNewCairo' });
    expect(probe.state).toBe('token-rejected');
    expect(probe.reason).toBe('Unauthorized');
  });

  it('classifies a valid token that cannot see the channel as channel-unreachable', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/getMe')) {
        return jsonResponse({ ok: true, result: { id: 1, username: 'ariasierrablubot' } });
      }
      return jsonResponse(
        { ok: false, error_code: 400, description: 'Bad Request: chat not found' },
        400,
      );
    }) as unknown as typeof fetch;

    const probe = await probeTelegramLeg({ token: '8529262692:TEST', chatId: '@SierraEstatesNewCairo' });
    expect(probe.state).toBe('channel-unreachable');
    expect(probe.reason).toContain('chat not found');
    expect(probe.chatId).toBe('@SierraEstatesNewCairo');
    // The token itself is fine — the failure is the channel leg only.
    expect(probe.botUsername).toBe('ariasierrablubot');
  });

  it('reports network failure honestly (failed, not channel-unreachable)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ETIMEDOUT');
    }) as unknown as typeof fetch;

    const probe = await probeTelegramLeg({ token: '8529262692:TEST', chatId: '@SierraEstatesNewCairo' });
    expect(probe.state).toBe('failed');
    expect(probe.reason).toBe('ETIMEDOUT');
  });

  it('never includes the raw bot token in probe results', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: true, result: { id: 1, username: 'ariasierrablubot' } }),
    ) as unknown as typeof fetch;

    const probe = await probeTelegramLeg({ token: '8529262692:SECRETVALUE', chatId: '@chan' });
    const serialized = JSON.stringify(probe);
    expect(serialized).not.toContain('SECRETVALUE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// classifyRagFailure — reason → missing-secret guidance
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyRagFailure — reason to secret mapping', () => {
  it('maps Gemini embedding failures to GOOGLE_GENAI_API_KEY', () => {
    expect(
      classifyRagFailure('Gemini embedding unavailable: 401 API key not valid'),
    ).toBe('GOOGLE_GENAI_API_KEY');
  });

  it('maps generic API-key failures to GOOGLE_GENAI_API_KEY', () => {
    expect(classifyRagFailure('API key not valid. Please pass a valid API key')).toBe(
      'GOOGLE_GENAI_API_KEY',
    );
  });

  it('maps Supabase failures to SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(
      classifyRagFailure('SUPABASE_SERVICE_ROLE_KEY is not configured — cannot call the RPC'),
    ).toBe('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('maps service-role phrasing to SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(classifyRagFailure('supabase admin client unavailable (service role missing)')).toBe(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
  });

  it('returns null for unrecognized reasons', () => {
    expect(classifyRagFailure('boom')).toBeNull();
    expect(classifyRagFailure('')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Module import safety — the CLI entry-point guard must not fire on import
// ─────────────────────────────────────────────────────────────────────────────

describe('CLI entry-point guard', () => {
  it('imports without executing main() (no fetch happens on module evaluation)', async () => {
    // Force a fresh module evaluation — if the entry-point guard were broken,
    // main() would run here, call fetch, and fail this assertion.
    vi.resetModules();
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await import('../scripts/check-live-services.mjs');
    expect(spy).not.toHaveBeenCalled();
  });
});
