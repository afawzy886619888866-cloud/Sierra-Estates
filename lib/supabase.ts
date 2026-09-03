import {
    createLazyBrowserClient,
    getSupabaseAdmin as getSharedSupabaseAdmin,
} from '@sierra-estates/db';

/**
 * Root Supabase client (used by lib/AuthContext.tsx).
 *
 * Credential resolution lives in @sierra-estates/db so the guards exist once.
 * This file previously carried a third copy of that logic, including the
 * service-role-to-anon fallback.
 */

/** Browser client — built on first use, session persisted across reloads. */
export const supabase = createLazyBrowserClient();

/** Server-side client using the service-role key (bypasses RLS). */
export const getSupabaseAdmin = getSharedSupabaseAdmin;

export default supabase;
