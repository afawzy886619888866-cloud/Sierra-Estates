/**
 * POST /api/auth
 *   { action: "signin", email, password }  → sets cookie, { ok: true }
 *   { action: "signout" }                  → clears cookie, { ok: true }
 * GET /api/auth
 *   → { signedIn: boolean, role?, name?, email? }
 *
 * "signin" verifies the Supabase access token (passed in the `token` field)
 * and reads the caller's role from public.profiles. When no token is supplied
 * it falls back to the env-gated bootstrap login (see lib/auth.ts
 * tryDemoLogin), which exists so the portal is reachable before the first
 * Supabase account is provisioned.
 */
import { NextResponse } from "next/server";
import {
  signSession, verifySession, tryDemoLogin, cookieOpts, SESSION_COOKIE,
  parseCookies, isAdminEmail,
} from "@/lib/auth";
import { getSupabaseAdmin, getRecord, updateRecord } from "@sierra-estates/db";
import { isAdminPortalRole } from "@/lib/types";
import type { Role, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const sess = await verifySession(cookies[SESSION_COOKIE]);
  if (!sess) return NextResponse.json({ signedIn: false });
  return NextResponse.json({
    signedIn: true,
    role: sess.role,
    name: sess.name,
    email: sess.email,
    uid: sess.uid,
  });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const reqHost = (() => {
    try { return new URL(req.url).hostname; } catch { return req.headers.get("host") || undefined; }
  })();

  if (body.action === "signout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (body.action === "signin") {
    const { email, password, token: accessToken } = body;
    if (!email && !accessToken) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const targetEmail = (email || "").trim().toLowerCase();

    // Path A — verify the Supabase access token, then read the stored role.
    if (accessToken) {
      try {
        const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
        const user = error ? null : data?.user;

        if (user) {
          const verifiedEmail = (user.email || targetEmail || "").trim().toLowerCase();
          const profile = await getRecord<Partial<User> & { fullName?: string; role?: string }>(
            "profiles",
            user.id
          );

          let role: Role;
          if (!profile) {
            if (isAdminEmail(verifiedEmail)) {
              role = "admin";
              try {
                await updateRecord("profiles", user.id, {
                  email: verifiedEmail,
                  role: "admin",
                  fullName: user.user_metadata?.full_name || verifiedEmail.split("@")[0],
                  lastLogin: new Date().toISOString(),
                });
              } catch {}
            } else {
              return NextResponse.json(
                { error: "This account is not provisioned for the admin portal." },
                { status: 403 }
              );
            }
          } else {
            const rawRole = String(profile.role ?? "").trim().toLowerCase();
            if (isAdminPortalRole(rawRole)) {
              role = rawRole as Role;
            } else if (isAdminEmail(verifiedEmail)) {
              role = "admin";
            } else {
              return NextResponse.json(
                { error: "This account is not approved for the admin portal." },
                { status: 403 }
              );
            }
          }

          await updateRecord("profiles", user.id, { lastLogin: new Date().toISOString() });

          const sess = await signSession({
            uid: user.id,
            email: user.email ?? verifiedEmail,
            name:
              profile.fullName ??
              (user.user_metadata?.full_name as string | undefined) ??
              verifiedEmail.split("@")[0] ??
              "Sierra Staff",
            role,
          });
          const res = NextResponse.json({ ok: true, role });
          res.cookies.set(SESSION_COOKIE, sess, cookieOpts(reqHost));
          return res;
        }

        console.warn("[api/auth] Supabase token verification failed:", error?.message);
      } catch (err: any) {
        console.warn("[api/auth] Supabase token verification threw:", err?.message);
      }

      // A token was supplied and did not verify. Falling through to a
      // password path here would let a caller bypass token verification by
      // sending a bad token alongside credentials, so refuse outright.
      return NextResponse.json({ error: "Invalid or expired session token." }, { status: 401 });
    }

    // NOTE: the former "Path B" (Google Sign-In direct fallback) is gone.
    // It trusted `provider`, `email` and `uid` straight from the request body
    // and minted an admin session from those claims alone. Under Supabase Auth
    // a Google sign-in returns a real access token, so Path A covers it and
    // the unverified path has no reason to exist.

    // Path C — Staff Admin Fallback (Email + Password)
    const demo = tryDemoLogin(targetEmail, password || "");
    if (!demo) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your email and password or use Google Mail sign in." },
        { status: 401 }
      );
    }
    const sess = await signSession({
      uid: demo.uid, email: demo.email, name: demo.name, role: demo.role,
    });
    const res = NextResponse.json({ ok: true, role: demo.role });
    res.cookies.set(SESSION_COOKIE, sess, cookieOpts(reqHost));
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
