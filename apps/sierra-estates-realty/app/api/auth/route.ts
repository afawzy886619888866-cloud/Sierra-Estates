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
        const userData = userDoc.data() as Partial<User> | undefined;
        const rawRole = String(userData?.role ?? "").trim().toLowerCase();
        
        const isApprovedAdmin = isAdminEmail(verifiedEmail) || body.provider === 'google';

        let role: Role;
        if (isAdminPortalRole(rawRole)) {
          role = rawRole as Role;
        } else if (isApprovedAdmin) {
          role = "admin";
        } else {
          role = "viewer";
        }

        if (!userDoc.exists || (isApprovedAdmin && !isAdminPortalRole(userData?.role))) {
          await db.collection("users").doc(decoded.uid).set({
            email: decoded.email ?? verifiedEmail,
            name: decoded.name ?? verifiedEmail.split("@")[0] ?? "Sierra Staff",
            role,
            createdAt: userData?.createdAt || new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          }, { merge: true });
        }

        if (!isAdminPortalRole(role)) {
          return NextResponse.json({ error: "This account is not approved for the admin portal." }, { status: 403 });
        }

        const sess = await signSession({
          uid: decoded.uid,
          email: decoded.email ?? verifiedEmail,
          name: userData?.name ?? decoded.name ?? verifiedEmail.split("@")[0] ?? "Sierra Staff",
          role,
        });
        const res = NextResponse.json({ ok: true, role });
        res.cookies.set(SESSION_COOKIE, sess, cookieOpts());
        return res;
      } catch (fbErr: any) {
        console.warn("[api/auth] Firebase verification failed, falling back to staff auth:", fbErr?.message);
      }
    }

    // Path B — Google Sign-In Direct Fallback (Firebase popup succeeded but
    // Admin SDK verification failed or isn't configured). Only approved
    // admin emails are allowed — no blanket @gmail.com access.
    if (body.provider === 'google' && targetEmail) {
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
      res.cookies.set(SESSION_COOKIE, sess, cookieOpts());
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
    res.cookies.set(SESSION_COOKIE, sess, cookieOpts());
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
