/**
 * Auth helpers — server-side session cookie (JWT-like, signed via HMAC).
 * No external JWT lib required: small HS256 impl. The session is stored
 * in the `sierra_sess` httpOnly cookie. Admin SDK verifies the Firebase
 * ID token at sign-in time, then we mint our own session cookie.
 *
 * For dev / sandbox (no FIREBASE_SERVICE_ACCOUNT), we accept a hardcoded
 * demo admin so the admin page is reachable without Firebase credentials.
 */
import type { Session, Role } from "./types";

const COOKIE_NAME = "sierra_sess";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const DEMO_ADMIN_EMAIL = "admin@sierra-estates.net";
const DEMO_ADMIN_PASSWORD = "sierra-admin";

function getKey(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.VERCEL_AUTOMATION_BYPASS_TOKEN ||
    "sierra-dev-secret-change-me"
  );
}

async function hmacSha256(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Buffer.from(new Uint8Array(sig)).toString("base64url");
}

export async function signSession(s: Omit<Session, "exp">): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = { ...s, exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await hmacSha256(body, getKey());
  return `${body}.${sig}`;
}

export async function verifySession(token: string | null | undefined): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = await hmacSha256(body, getKey());
  if (sig !== expectedSig) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as Session;
    if (s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;

export function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL === "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    // When COOKIE_DOMAIN is set (e.g., ".sierra-estates.net"), the session
    // cookie is shared across sierra-estates.net AND admin.sierra-estates.net,
    // so the user signs in once and is authenticated on both subdomains.
    // When unset (local dev), the cookie is host-only.
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

/** Demo admin login — only used when Firebase Admin is not configured. */
export function tryDemoLogin(email: string, password: string): Session | null {
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    return null; // Real Firebase is configured; don't allow demo login.
  }
  if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
    return {
      uid: "demo-admin",
      email,
      name: "Demo Admin",
      role: "admin" as Role,
      exp: Date.now() + SESSION_TTL_MS,
    };
  }
  return null;
}

export const DEMO_ADMIN = { email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD };

/** Parse cookie header into a map. */
export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

/** Read session from a Next.js Request. */
export async function getSessionFromRequest(req: Request): Promise<Session | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  return verifySession(cookies[COOKIE_NAME]);
}

/** Throws 401 if no session, 403 if role insufficient. */
export async function requireRole(req: Request, min: Role): Promise<Session> {
  const sess = await getSessionFromRequest(req);
  if (!sess) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const order: Role[] = ["viewer", "manager", "admin"];
  if (order.indexOf(sess.role) < order.indexOf(min)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return sess;
}
