import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedAdminClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
    if (cachedClient) return cachedClient;

    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        process.env.POSTGRES_URL ||
        'https://placeholder.supabase.co';

    const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        'placeholder-anon-key';

    cachedClient = createClient(url, key, {
        auth: {
            persistSession: false,
        },
    });
    return cachedClient;
};

export const getSupabaseAdmin = (): SupabaseClient => {
    if (cachedAdminClient) return cachedAdminClient;

    const url =
        process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://placeholder.supabase.co';

    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        'placeholder-key';

    cachedAdminClient = createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    return cachedAdminClient;
};
