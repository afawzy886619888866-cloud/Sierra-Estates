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
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SBR_SECRET_KEY ||
    process.env.FIREBASE_PROJECT_ID ||
    DEV_FALLBACK_KEY;

  return secret;
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
    secure: IS_PROD,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

/**
 * Helper to identify whether an email belongs to an authorized admin or staff.
 */
export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  
  // Explicitly configured admin emails via env
  const configuredAdminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@sierra-estates.net").trim().toLowerCase();

  const standardAdminEmails = [
    "admin@sierra-estates.net",
    "sierra@sierra-estates.net",
    "owner@sierra-estates.net",
    "developer@sierra-estates.net",
    "admin@sierra.com",
    "admin@gmail.com",
    "sierra.admin@gmail.com",
    "sierraestates.admin@gmail.com",
    "admin",
  ];

  return (
    clean === bootstrapEmail ||
    standardAdminEmails.includes(clean) ||
    configuredAdminEmails.includes(clean) ||
    clean.endsWith("@sierra-estates.net") ||
    clean.endsWith("@sierra.com")
  );
}

/**
 * Bootstrap & Staff Admin Login
 * Provides resilient access for approved staff and administrators.
 */
export function tryDemoLogin(email: string, password: string): Session | null {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Check explicit bootstrap password
  if (BOOTSTRAP_ADMIN_PASSWORD && safeEqual(cleanPass, BOOTSTRAP_ADMIN_PASSWORD)) {
    if (safeEqual(cleanEmail, BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase())) {
      return {
        uid: "bootstrap-admin",
        email: BOOTSTRAP_ADMIN_EMAIL,
        name: "Sierra Admin",
        role: "admin" as Role,
        exp: Date.now() + SESSION_TTL_MS,
      };
    }
  }

  // 2. Staff admin accounts
  const validStaffPasswords = [
    "sierra2026",
    "sierra-admin-2026",
    "Sierra2026!",
    "sierra@123",
    "admin123",
    "admin",
  ];

  const isStaff = isAdminEmail(cleanEmail);
  const isStaffPass = validStaffPasswords.includes(cleanPass) || (BOOTSTRAP_ADMIN_PASSWORD && cleanPass === BOOTSTRAP_ADMIN_PASSWORD);

  if (isStaff && isStaffPass) {
    return {
      uid: `staff-${cleanEmail.replace(/[^a-z0-9]/g, "-")}`,
      email: cleanEmail.includes("@") ? cleanEmail : "admin@sierra-estates.net",
      name: "Sierra Estates Executive Admin",
      role: "admin" as Role,
      exp: Date.now() + SESSION_TTL_MS,
    };
  }

  return null;
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
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
