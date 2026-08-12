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
  parseCookies,
} from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
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

  if (body.action === "signout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (body.action === "signin") {
    const { email, password, token: firebaseIdToken } = body;
    if (!email || (!password && !firebaseIdToken)) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Path A — real Firebase: verify ID token, fetch role.
    const db = await getAdminDb();
    if (db && firebaseIdToken) {
      try {
        const { getAuth } = await import("firebase-admin/auth");
        const decoded = await getAuth().verifyIdToken(firebaseIdToken);
        const userDoc = await db.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data() as Partial<User> | undefined;
        let role: Role = (userData?.role as Role) ?? "viewer";

        if (!userDoc.exists) {
          const anyUser = await db.collection("users").limit(1).get();
          if (anyUser.empty) {
            role = "admin";
          }
          await db.collection("users").doc(decoded.uid).set({
            email: decoded.email ?? email,
            name: decoded.name ?? email,
            role,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
        const sess = await signSession({
          uid: decoded.uid,
          email: decoded.email ?? email,
          name: userData?.name ?? decoded.name ?? email,
          role,
        });
        const res = NextResponse.json({ ok: true, role });
        res.cookies.set(SESSION_COOKIE, sess, cookieOpts());
        return res;
      } catch {
        return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
      }
    }

    // Path B — demo admin (sandbox only).
    const demo = tryDemoLogin(email, password);
    if (!demo) {
      return NextResponse.json(
        { error: "Invalid credentials. In production, sign in via Firebase." },
        { status: 401 }
      );
    }
    const sess = await signSession({
      uid: demo.uid, email: demo.email, name: demo.name, role: demo.role,
    });
    const res = NextResponse.json({ ok: true, role: demo.role });
    res.cookies.set(SESSION_COOKIE, sess, cookieOpts());
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
