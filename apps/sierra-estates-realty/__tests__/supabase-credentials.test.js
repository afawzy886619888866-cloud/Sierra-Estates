/**
 * Supabase credential resolution guards.
 *
 * Every fallback in the old clients was silent. The dangerous one was the
 * admin client: a missing SUPABASE_SERVICE_ROLE_KEY fell through to the anon
 * key, so a client callers use *because* it bypasses RLS quietly became one
 * that does not. Reads then come back empty and writes get rejected, both
 * looking like "no data" rather than "not authorized".
 */
import {
  resolveSupabaseUrl,
  resolveSupabaseAnonKey,
  resolveSupabaseServiceRoleKey,
} from '@sierra-estates/db';

const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'POSTGRES_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
] ;

const original = {};

const setEnv = (key, value) => {
  const env = process.env ;
  if (value === undefined) delete env[key];
  else env[key] = value;
};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    setEnv(key, undefined);
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) setEnv(key, original[key]);
});

describe('resolveSupabaseServiceRoleKey', () => {
  it('never falls back to the anon key — that would downgrade privileges silently', () => {
    setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-value');
    setEnv('SUPABASE_ANON_KEY', 'anon-key-value');

    expect(() => resolveSupabaseServiceRoleKey()).toThrow(/SUPABASE_SERVICE_ROLE_KEY is required/);
  });

  it('throws outside production too — a missing key is a misconfiguration anywhere', () => {
    setEnv('NODE_ENV', 'development');
    expect(() => resolveSupabaseServiceRoleKey()).toThrow();
  });

  it('accepts either accepted variable name', () => {
    setEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-value');
    expect(resolveSupabaseServiceRoleKey()).toBe('service-role-value');

    setEnv('SUPABASE_SERVICE_ROLE_KEY', undefined);
    setEnv('SUPABASE_SERVICE_KEY', 'legacy-service-value');
    expect(resolveSupabaseServiceRoleKey()).toBe('legacy-service-value');
  });
});

describe('resolveSupabaseUrl', () => {
  it('refuses to fall back to a hardcoded project in production', () => {
    setEnv('NODE_ENV', 'production');
    expect(() => resolveSupabaseUrl()).toThrow(/must be set in production/);
  });

  it('allows a placeholder locally so dev and tests still run', () => {
    setEnv('NODE_ENV', 'development');
    expect(resolveSupabaseUrl()).toBe('https://placeholder.supabase.co');
  });

  it('prefers a configured url over any fallback', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://real-project.supabase.co');
    expect(resolveSupabaseUrl()).toBe('https://real-project.supabase.co');
  });
});

describe('resolveSupabaseAnonKey', () => {
  it('refuses the placeholder in production', () => {
    setEnv('NODE_ENV', 'production');
    expect(() => resolveSupabaseAnonKey()).toThrow(/must be set in production/);
  });

  it('allows the placeholder locally', () => {
    setEnv('NODE_ENV', 'development');
    expect(resolveSupabaseAnonKey()).toBe('placeholder-anon-key');
  });
});
