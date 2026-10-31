import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Cookie-bound server client (@supabase/ssr) for Server Components and Route
 * Handlers that must run under RLS with the signed-in user's session.
 *
 * Use this instead of `getSupabaseAdmin` (service-role, bypasses RLS) whenever
 * the caller should be subject to row-level security. The companion session
 * refresh lives in the proxy boundary — see `proxy.ts` and
 * `utils/supabase/middleware.ts`.
 */
export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
