import { describe, it, expect, afterEach } from 'vitest';
import { insertRecord } from '../packages/db/lib/records';
import { assertCanonicalBackendForWrites, getCanonicalBackendStatus, isSupabaseCanonicalBackendConfigured } from '../packages/db/lib/backend-policy';

describe('Canonical backend policy', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepts the canonical Supabase backend when it is fully configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    expect(isSupabaseCanonicalBackendConfigured()).toBe(true);
    expect(getCanonicalBackendStatus().backend).toBe('supabase');
    expect(assertCanonicalBackendForWrites('inventory')).toMatchObject({ backend: 'supabase' });
  });

  it('rejects writes when the canonical backend is not configured', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;

    expect(() => assertCanonicalBackendForWrites('inventory')).toThrow(/Canonical backend is supabase/i);
  });

  it('rejects writes when the service-role key is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;

    expect(() => assertCanonicalBackendForWrites('lead-write')).toThrow(/service-role key is required/i);
  });

  it('blocks write helpers if the canonical backend is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;

    await expect(insertRecord('profiles', { id: 'blocked-write' })).rejects.toThrow(/Canonical backend is supabase/i);
  });
});
