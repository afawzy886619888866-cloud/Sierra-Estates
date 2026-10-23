import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client — environment-configured ONLY.
 *
 * Previously this file hardcoded a project URL as a fallback, which leaked
 * the project ref publicly and silently targeted the wrong project when env
 * vars were missing. Now the client is created lazily and throws a clear
 * error on first use when the environment is not configured, instead of
 * failing at import time (which would break static builds).
 */

let cached: SupabaseClient | null = null;

function resolveConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      '[supabaseClient] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not configured.'
    );
  }
  return { url, anonKey };
}

function getClient(): SupabaseClient {
  if (!cached) {
    const { url, anonKey } = resolveConfig();
    cached = createClient(url, anonKey);
  }
  return cached;
}

/**
 * Lazy proxy: `supabase.from(...)` works as before, but misconfiguration
 * surfaces at call time with a clear message rather than at import time.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as unknown as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default supabase;
