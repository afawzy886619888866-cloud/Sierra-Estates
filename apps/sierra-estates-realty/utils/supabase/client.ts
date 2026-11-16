import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Cookie-backed browser client (@supabase/ssr).
 *
 * Unlike the legacy localStorage clients (`lib/supabaseClient.ts` and
 * `@sierra-estates/db`'s `createLazyBrowserClient`), sessions are stored in
 * cookies, so Server Components using `utils/supabase/server` see the same
 * session and the proxy boundary can refresh it. New browser features that
 * rely on server-side session reads should use this client.
 */
export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  )
