import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Supabase SSR session refresh for the proxy boundary (Next.js 16 proxy.ts).
 *
 * Creates a cookie-bound server client against the incoming request, refreshes
 * the auth session, and returns a response carrying any renewed session
 * cookies. `proxy.ts` forwards those cookies onto the final response, keeping
 * user sessions alive without client-side intervention.
 */
export const createClient = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // Refresh the auth session (Supabase SSR guidance): reads the session from
  // the request cookies and, when the access token was renewed, writes the
  // refreshed cookies back through setAll so they reach the final response.
  // With no session present this returns { data: { user: null } } locally —
  // no network call, no cookies written.
  await supabase.auth.getUser()

  return supabaseResponse
}
