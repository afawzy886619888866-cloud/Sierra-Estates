/**
 * Auth helpers — server-side session cookie (JWT-like, signed via HMAC).
 * No external JWT lib required: small HS256 impl. The session is stored
 * in the `sierra_sess` httpOnly cookie. Admin SDK verifies the Firebase
 * ID token at sign-in time, then we mint our own session cookie.
 *
 * For dev / sandbox (no FIREBASE_SERVICE_ACCOUNT), we accept a hardcoded
 * demo admin so the admin page is reachable without Firebase credentials.
 */
import { isAdminPortalRole } from "./types";
import type { Session, Role } from "./types";

const COOKIE_NAME = "sierra_sess";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Bootstrap admin. There is deliberately NO default password: a committed
 * credential is a published credential. The account exists only when
 * ADMIN_BOOTSTRAP_PASSWORD is explicitly set, so production fails closed
 * unless an operator opts in.
 */
const BOOTSTRAP_ADMIN_EMAIL =
  process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@sierra-estates.net";
const BOOTSTRAP_ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";

/** Dev-only fallback signing key. Never reachable in production — see getKey(). */
const DEV_FALLBACK_KEY = "sierra-dev-secret-change-me";

function getKey(): string {
  const secret =
    process.env.SESSION_SECRET || process.env.VERCEL_AUTOMATION_BYPASS_TOKEN;

  if (secret) return secret;

  // Falling back to a hard-coded key in production would let anyone who can
  // read this repo forge an admin session. Fail loudly instead.
  if (IS_PROD) {
    throw new Error(
      "SESSION_SECRET is not set. Refusing to sign sessions with the public development key."
    );
  }

  return DEV_FALLBACK_KEY;
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
    secure: process.env.NODE_ENV === "production",
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

/**
 * Bootstrap admin login — the way in before Firebase Admin is configured.
 *
 * Disabled unless ADMIN_BOOTSTRAP_PASSWORD is set, and disabled outright once
 * real Firebase credentials exist. Timing-safe comparison so the password is
 * not recoverable by measuring response times.
 */
export function tryDemoLogin(email: string, password: string): Session | null {
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    return null; // Real Firebase is configured; don't allow bootstrap login.
  }

  // No configured password means no bootstrap account. This is what makes
  // production fail closed rather than shipping a known credential.
  if (!BOOTSTRAP_ADMIN_PASSWORD) return null;

  const emailOk = safeEqual(
    email.trim().toLowerCase(),
    BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase()
  );
  const passwordOk = safeEqual(password, BOOTSTRAP_ADMIN_PASSWORD);

  if (emailOk && passwordOk) {
    return {
      uid: "bootstrap-admin",
      email: BOOTSTRAP_ADMIN_EMAIL,
      name: "Bootstrap Admin",
      role: "admin" as Role,
      exp: Date.now() + SESSION_TTL_MS,
    };
  }
  return null;
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when a bootstrap admin account is available to sign in with. */
export function bootstrapLoginAvailable(): boolean {
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    return false;
  }
  return Boolean(BOOTSTRAP_ADMIN_PASSWORD);
}

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
  const order: Role[] = ["viewer", "owner", "agent", "manager", "admin", "superadmin"];
  const roleIndex = order.indexOf(sess.role);
  const requiredIndex = order.indexOf(min);
  if (!isAdminPortalRole(sess.role) && sess.role !== "viewer") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  if (roleIndex === -1 || requiredIndex === -1 || roleIndex < requiredIndex) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return sess;
}
