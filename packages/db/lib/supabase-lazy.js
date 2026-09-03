import { createClient, } from '@supabase/supabase-js';
import { resolveSupabaseUrl, resolveSupabaseAnonKey } from './supabase';

/**
 * A browser Supabase client that is built on first use, not on import.
 *
 * The credential resolvers throw in production when the env vars are missing.
 * Next.js runs `next build` with NODE_ENV=production and no runtime env, so
 * constructing the client at module scope made the guard fire during the build
 * and fail page-data collection. Deferring construction keeps the guard where
 * it belongs — the first real call — while preserving the `supabase.from(...)`
 * import shape every caller already uses.
 */
export function createLazyBrowserClient() {
    let client = null;

    const get = () => {
        if (!client) {
            client = createClient(resolveSupabaseUrl(), resolveSupabaseAnonKey(), {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                },
            });
        }
        return client;
    };

    return new Proxy({} , {
        get(_target, prop, receiver) {
            const value = Reflect.get(get() , prop, receiver);
            return typeof value === 'function' ? value.bind(get()) : value;
        },
        has: (_target, prop) => prop in (get() ),
    });
}
