import { normalizeProviderRow, resolveApiKey } from '@/lib/llm/agent-router';

describe('agent-router normalizeProviderRow', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('converts camelCase toRecord() rows into canonical snake_case ProviderRow fields', () => {
    const normalized = normalizeProviderRow({
      id: 2,
      slug: 'gemini-openai',
      label: 'Google Gemini (OpenAI-compat endpoint)',
      kind: 'gemini-openai',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKeyEnv: 'GEMINI_API_KEY,GOOGLE_AI_API_KEY',
      defaultModel: 'gemini-2.5-flash',
      enabled: true,
      priority: 10,
      models: [{ id: 'gemini-2.5-flash', ownedBy: 'google' }],
      health: { status: 'ok', latencyMs: 145, checkedAt: '2026-11-21T17:00:00Z' },
    });

    expect(normalized).toEqual({
      id: 2,
      slug: 'gemini-openai',
      label: 'Google Gemini (OpenAI-compat endpoint)',
      kind: 'gemini-openai',
      base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
      api_key_env: 'GEMINI_API_KEY,GOOGLE_AI_API_KEY',
      default_model: 'gemini-2.5-flash',
      enabled: true,
      priority: 10,
      models: [{ id: 'gemini-2.5-flash', owned_by: 'google' }],
      health: { status: 'ok', latencyMs: 145, checkedAt: '2026-11-21T17:00:00Z' },
    });

    process.env.GEMINI_API_KEY = 'dummy-test-placeholder';
    expect(resolveApiKey(normalized)).toBe('dummy-test-placeholder');
  });

  it('preserves already-snake_case rows cleanly', () => {
    const normalized = normalizeProviderRow({
      id: 6,
      slug: 'pollinations',
      label: 'Pollinations (keyless tier)',
      kind: 'openai-compat',
      base_url: 'https://gen.pollinations.ai/v1',
      api_key_env: null,
      default_model: null,
      enabled: false,
      priority: 80,
      models: [{ id: 'openai', owned_by: 'pollinations' }],
      health: { status: 'error', latency_ms: 90, last_error: 'timeout' },
    });

    expect(normalized.base_url).toBe('https://gen.pollinations.ai/v1');
    expect(normalized.api_key_env).toBeNull();
    expect(normalized.default_model).toBeNull();
    expect(normalized.models).toEqual([{ id: 'openai', owned_by: 'pollinations' }]);
    expect(normalized.health).toEqual({ status: 'error', latencyMs: 90, lastError: 'timeout' });
  });
});
