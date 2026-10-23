import {
    createLazyBrowserClient,
    getSupabaseAdmin as getSharedSupabaseAdmin,
} from '@sierra-estates/db';

/**
 * App-level Supabase clients.
 *
 * Credential resolution lives in @sierra-estates/db so the guards exist once:
 * placeholders only outside production, and the service-role key never falls
 * back to the anon key.
 */

/**
 * Browser client — persists the session so auth survives a reload.
 * Built on first use: the production guard must not fire during `next build`.
 */
export const supabase = createLazyBrowserClient();

/**
 * Server-side client using the service-role key (bypasses RLS).
 * Throws when SUPABASE_SERVICE_ROLE_KEY is absent — see the shared resolver.
 */
export const getSupabaseAdmin = getSharedSupabaseAdmin;

