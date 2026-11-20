/**
 * OpenClaw brain wiring tests (2026-11-20).
 *
 * Covers the PR that made the "4-Engine Brain" real instead of prompt text:
 *  - ordered provider candidates with failover beyond the primary
 *  - env-gated web-search grounding (Tavily) with the §21 honesty contract
 * Route-level grounding (pgvector injection) degrades silently and is
 * exercised in CI via the app build; here we pin the deterministic pieces.
 */
import {
  isWebSearchConfigured,
  webSearch,
} from '../lib/server/web-search';

// resolveProviderCandidates is exported from the route for testability —
// importing the route module is safe in Jest (same pattern as
// rag-search-route.test.ts).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveProviderCandidates } = require('../app/api/openclaw-terminal/route');

const ENV_KEYS = [
  'OPENCLAW_PROVIDER',
  'OPENCLAW_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'OPENCLAW_MODEL',
  'TAVILY_API_KEY',
] as const;

function withEnv(env: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    if (k in env) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k] as string;
    }
  }
  return Promise.resolve(fn()).finally(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
}

describe('resolveProviderCandidates (failover chain)', () => {
  it('puts the explicit provider first and keeps only configured providers', () =>
    withEnv(
      { OPENCLAW_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-oai', GEMINI_API_KEY: 'g-key' },
      () => {
        const candidates = resolveProviderCandidates();
        expect(candidates[0].provider).toBe('openai');
        expect(candidates.map((c: { provider: string }) => c.provider)).toEqual(['openai', 'gemini']);
        expect(candidates[0].apiKey).toBe('sk-oai');
        expect(candidates[0].baseUrl).toContain('api.openai.com');
      },
    ));

  it('defaults to gemini primary when a gemini key exists, then openai', () =>
    withEnv({ GEMINI_API_KEY: 'g-key', OPENAI_API_KEY: 'sk-oai' }, () => {
      const candidates = resolveProviderCandidates();
      expect(candidates.map((c: { provider: string }) => c.provider)).toEqual(['gemini', 'openai']);
      expect(candidates[0].apiKey).toBe('g-key');
      expect(candidates[1].apiKey).toBe('sk-oai');
    }));

  it('falls back to openai primary when no gemini key is present', () =>
    withEnv({ GEMINI_API_KEY: undefined, OPENAI_API_KEY: 'sk-oai' }, () => {
      const candidates = resolveProviderCandidates();
      expect(candidates[0].provider).toBe('openai');
    }));

  it('OPENCLAW_API_KEY overrides every candidate key', () =>
    withEnv(
      { OPENCLAW_API_KEY: 'oc-master', GEMINI_API_KEY: 'g-key', OPENAI_API_KEY: 'sk-oai' },
      () => {
        const candidates = resolveProviderCandidates();
        expect(candidates.length).toBeGreaterThan(0);
        for (const c of candidates) expect(c.apiKey).toBe('oc-master');
      },
    ));

  it('returns an empty chain when no provider key exists (callLLM degrades to the not-configured reply)', () =>
    withEnv(
      {
        OPENCLAW_PROVIDER: undefined,
        OPENCLAW_API_KEY: undefined,
        GEMINI_API_KEY: undefined,
        GOOGLE_AI_API_KEY: undefined,
        GOOGLE_GENAI_API_KEY: undefined,
        OPENAI_API_KEY: undefined,
        OPENROUTER_API_KEY: undefined,
      },
      () => {
        expect(resolveProviderCandidates()).toEqual([]);
      },
    ));

  it('honours OPENCLAW_MODEL across the chain', () =>
    withEnv({ GEMINI_API_KEY: 'g-key', OPENCLAW_MODEL: 'gemini-2.0-flash-test' }, () => {
      const candidates = resolveProviderCandidates();
      for (const c of candidates) expect(c.model).toBe('gemini-2.0-flash-test');
    }));
});

describe('web-search grounding (Tavily, env-gated)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('reports honestly when TAVILY_API_KEY is absent — never fabricates hits', () =>
    withEnv({ TAVILY_API_KEY: undefined }, async () => {
      expect(isWebSearchConfigured()).toBe(false);
      const result = await webSearch('new cairo compounds');
      expect(result.available).toBe(false);
      expect(result.hits).toEqual([]);
      expect(result.reason).toContain('TAVILY_API_KEY');
    }));

  it('maps Tavily results to trimmed hits when configured', () =>
    withEnv({ TAVILY_API_KEY: 'tvly-test' }, async () => {
      expect(isWebSearchConfigured()).toBe(true);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { title: 'Mivida overview', url: 'https://example.com/mivida', content: 'x'.repeat(500) },
            { title: 'No url entry', url: '', content: 'dropped' },
          ],
        }),
      }) as unknown as typeof fetch;
      const result = await webSearch('mivida');
      expect(result.available).toBe(true);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].url).toBe('https://example.com/mivida');
      expect(result.hits[0].snippet.length).toBeLessThanOrEqual(240);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.tavily.com/search',
        expect.objectContaining({ method: 'POST' }),
      );
    }));

  it('degrades to unavailable on provider error status', () =>
    withEnv({ TAVILY_API_KEY: 'tvly-test' }, async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
      const result = await webSearch('q');
      expect(result.available).toBe(false);
      expect(result.reason).toContain('503');
      expect(result.hits).toEqual([]);
    }));

  it('degrades to unavailable on network failure', () =>
    withEnv({ TAVILY_API_KEY: 'tvly-test' }, async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('socket down')) as unknown as typeof fetch;
      const result = await webSearch('q');
      expect(result.available).toBe(false);
      expect(result.reason).toContain('socket down');
      expect(result.hits).toEqual([]);
    }));
});
