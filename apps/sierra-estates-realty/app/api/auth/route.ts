/**
 * POST /api/auth
 *   { action: "signin", email, password }  → sets cookie, { ok: true }
 *   { action: "signout" }                  → clears cookie, { ok: true }
 * GET /api/auth
 *   → { signedIn: boolean, role?, name?, email? }
 *
 * When Firebase Admin is configured, "signin" verifies the Firebase ID
 * token (passed in `token` field) and reads the user's role from
 * Firestore /users/{uid}. When NOT configured, falls back to demo admin
 * (see lib/auth.ts tryDemoLogin).
 */
import { NextResponse } from "next/server";
import {
  signSession, verifySession, tryDemoLogin, cookieOpts, SESSION_COOKIE,
  parseCookies, isAdminEmail,
} from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
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
    const { email, password, token: firebaseIdToken } = body;
    if (!email && !firebaseIdToken) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const targetEmail = (email || "").trim().toLowerCase();

    // Path A — real Firebase: verify ID token, fetch role.
    const db = await getAdminDb();
    if (db && firebaseIdToken) {
      try {
        const { getAuth } = await import("firebase-admin/auth");
        const decoded = await getAuth().verifyIdToken(firebaseIdToken);
        const verifiedEmail = (decoded.email || targetEmail || "").trim().toLowerCase();
        const userDoc = await db.collection("users").doc(decoded.uid).get();

        // Accounts are provisioned out-of-band only (scripts/seed-admin.mjs).
        // A verified token for a uid we have never provisioned is NOT a new
        // staff member — it is anyone who managed to create a Firebase account.
        // Reject it; never write a users/ document from this request path.
        if (!userDoc.exists) {
          return NextResponse.json(
            { error: "This account is not provisioned for the admin portal." },
            { status: 403 }
          );
        }

        const userData = userDoc.data() as Partial<User> | undefined;
        const rawRole = String(userData?.role ?? "").trim().toLowerCase();

        // The stored role is the only source of truth — no email allowlist or
        // sign-in provider may promote an account at login time.
        if (!isAdminPortalRole(rawRole)) {
          return NextResponse.json({ error: "This account is not approved for the admin portal." }, { status: 403 });
        }
        const role = rawRole as Role;

        await db.collection("users").doc(decoded.uid).set(
          { lastLogin: new Date().toISOString() },
          { merge: true }
        );

        const sess = await signSession({
          uid: decoded.uid,
          email: decoded.email ?? verifiedEmail,
          name: userData?.name ?? decoded.name ?? verifiedEmail.split("@")[0] ?? "Sierra Staff",
          role,
        });
        const res = NextResponse.json({ ok: true, role });
        res.cookies.set(SESSION_COOKIE, sess, cookieOpts(reqHost));
        return res;
      } catch (fbErr: any) {
        console.warn("[api/auth] Firebase verification failed, falling back to staff auth:", fbErr?.message);
      }
    }

    // Path B — Google Sign-In Direct Fallback (Firebase popup succeeded but
    // Admin SDK verification failed or isn't configured).
    //
    // Everything this path trusts — provider, email, uid — comes from the
    // request body, and none of it is verified. It previously minted a signed
    // admin session from those claims alone, so any POST carrying
    // {provider:'google', email:'<anything>@sierra-estates.net'} was issued an
    // admin cookie whenever the Admin SDK was unconfigured or verifyIdToken
    // threw. isAdminEmail() accepts any address on that domain, so it gated
    // nothing an attacker could not satisfy.
    //
    // It stays available for local development, where the Admin SDK often is
    // not configured, and is closed in production: there, a real ID token
    // verified by Path A is the only way in.
    if (body.provider === 'google' && targetEmail) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[api/auth] Path B refused in production: Firebase Admin verification is required.');
        return NextResponse.json(
          { error: 'Sign-in is temporarily unavailable. Firebase Admin verification is not configured.' },
          { status: 503 }
        );
      }
      if (!isAdminEmail(targetEmail)) {
        return NextResponse.json(
          { error: `The Google account "${targetEmail}" is not authorized for the admin portal. Contact your administrator to add this email to the approved list.` },
          { status: 403 }
        );
      }
      const googleRole: Role = "admin";
      const sess = await signSession({
        uid: body.uid || `google-${targetEmail.replace(/[^a-z0-9]/g, "-")}`,
        email: targetEmail,
        name: body.name || targetEmail.split("@")[0] || "Executive Admin",
        role: googleRole,
      });
      const res = NextResponse.json({ ok: true, role: googleRole });
      res.cookies.set(SESSION_COOKIE, sess, cookieOpts(reqHost));
      return res;
    }

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
