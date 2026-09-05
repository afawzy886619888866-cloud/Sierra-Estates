import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase credential resolution — the single implementation for the monorepo.
 *
 * Previously each client resolved its own credentials and every fallback was
 * silent: a missing URL fell through to a hardcoded project, a missing anon key
 * to the literal 'placeholder-anon-key', and — worst — a missing service-role
 * key to the *anon* key. That last one is the dangerous case. Callers reach for
 * the admin client precisely because it bypasses RLS, so downgrading it to an
 * anon client does not fail: it silently returns empty result sets and rejected
 * writes that read as "no data" rather than "not authorized".
 *
 * So: placeholders are tolerated only outside production, and the service-role
 * key is never substituted with anything, in any environment.
 */

const isProduction = () => process.env.NODE_ENV === 'production';

/** Public project URL. Required in production; placeholder allowed locally. */
export function resolveSupabaseUrl(): string {
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        process.env.POSTGRES_URL;

    if (url) return url;
    if (isProduction()) {
        throw new Error(
            'NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) must be set in production. ' +
                'Refusing to fall back to a hardcoded project URL.'
        );
    }
    return 'https://placeholder.supabase.co';
}

/** Anon (publishable) key. Required in production; placeholder allowed locally. */
export function resolveSupabaseAnonKey(): string {
    const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (key) return key;
    if (isProduction()) {
        throw new Error(
            'NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) must be set in production.'
        );
    }
    return 'placeholder-anon-key';
}

/**
 * Service-role key. Never falls back — not to the anon key, not to a
 * placeholder, not outside production. A caller asking for this client is
 * asking to bypass RLS; if that is not possible it must fail, loudly, here.
 */
export function resolveSupabaseServiceRoleKey(): string {
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!key) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is required for the admin Supabase client. ' +
                'It is never substituted with the anon key: that would silently ' +
                'downgrade privileges instead of failing.'
        );
    }
    return key;
}

export function isSupabaseAdminConfigured(): boolean {
    return Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );
}

export function isSupabaseConfigured(): boolean {
    return Boolean(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.POSTGRES_URL) &&
            (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
    );
}

let cachedClient: SupabaseClient | null = null;
let cachedAdminClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
    if (cachedClient) return cachedClient;

    cachedClient = createClient(resolveSupabaseUrl(), resolveSupabaseAnonKey(), {
        auth: {
            persistSession: false,
        },
    });
    return cachedClient;
};

export const getSupabaseAdmin = (): SupabaseClient => {
    if (cachedAdminClient) return cachedAdminClient;

    cachedAdminClient = createClient(
        resolveSupabaseUrl(),
        resolveSupabaseServiceRoleKey(),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
    return cachedAdminClient;
};
