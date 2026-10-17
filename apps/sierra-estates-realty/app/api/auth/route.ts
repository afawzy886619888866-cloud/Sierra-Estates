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
  signSession, verifySession, tryDemoLogin, tryPartnerLogin, cookieOpts, SESSION_COOKIE,
  parseCookies, enforceSessionAccountStatus,
} from "@/lib/auth";
import { getSupabaseAdmin, getRecord, updateRecord, insertRecord, listRecords } from "@sierra-estates/db";
import { isAdminPortalRole } from "@/lib/types";
import { isPartnerRole } from "@/lib/partner-access";
import { scopeFromProfile } from "@/lib/server/partner-scope";
import { notifyAccessRequestCreated } from "@/lib/server/access-request-notifier";
import type { Role, User } from "@/lib/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: Request) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const sess = await verifySession(cookies[SESSION_COOKIE]);
  if (!sess) {
    // Mirror the auth-guard dev bypass (non-production + explicitly disabled):
    // report it so the client shell can render in dev without a session.
    const authDisabled =
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_AUTHENTICATION === "false";
    return NextResponse.json(
      { signedIn: false, authDisabled },
      { headers: NO_STORE_HEADERS }
    );
  }

  // PHASE 7 — session revocation: a signed cookie proves a PAST login, not
  // current entitlement. Suspended/deleted (or still-pending) accounts are
  // rejected here and by every API guard, even mid-cookie-TTL.
  const statusCheck = await enforceSessionAccountStatus(sess);
  if (!statusCheck.ok) {
    return NextResponse.json(
      { signedIn: false, reason: statusCheck.reason },
      { headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      signedIn: true,
      role: sess.role,
      name: sess.name,
      email: sess.email,
      uid: sess.uid,
      // Partners carry their portfolio scope so the portal shell can adapt
      // (restricted nav) without another round trip.
      ...(isPartnerRole(sess.role) ? { scope: sess.scope } : {}),
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const reqHost = (() => {
    try { return new URL(req.url).hostname; } catch { return req.headers.get("host") || undefined; }
  })();

  if (body.action === "signout") {
    const res = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (body.action === "signin") {
    const { email, password, token: accessToken } = body;
    if (!email && !accessToken) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const targetEmail = (email || "").trim().toLowerCase();

    // Path A — verify the Supabase access token, then read the stored role.
    if (accessToken) {
      try {
        const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
        const user = error ? null : data?.user;

        if (user) {
          const verifiedEmail = (user.email || targetEmail || "").trim().toLowerCase();
          const profile = await getRecord<Partial<User> & { fullName?: string; role?: string; status?: string | null }>(
            "profiles",
            user.id
          );

          // ── PHASE 7: OAuth access-request lifecycle ──
          // An authenticated Google identity that is not provisioned gets NO
          // staff access. Its request is now DURABLE: a pending profile row +
          // an access_requests record, so a super admin can approve/deny from
          // the admin queue, and the configured ADMIN_APPROVAL_EMAIL is
          // notified. The old flow discarded the attempt silently.
          if (!profile) {
            const requestCreated = await recordPendingAccessRequest({
              authUid: user.id,
              email: verifiedEmail,
              fullName:
                (user.user_metadata?.full_name as string | undefined) ??
                verifiedEmail.split("@")[0] ??
                "Google User",
              provider: (user.app_metadata?.provider as string | undefined) ?? "google",
            });
            return NextResponse.json(
              {
                error: "This account is not provisioned for the admin portal.",
                accessRequest: requestCreated ? "pending" : "record_failed",
              },
              { status: 403, headers: NO_STORE_HEADERS }
            );
          }

          // Pending/suspended/deleted accounts never receive a session.
          const profileStatus = (profile.status ?? "").toString().toLowerCase();
          if (profileStatus === "pending") {
            // Honest requester notification (the delivery channel that IS
            // wired): the sign-in attempt itself reports the real ledger
            // state — a request that was denied says denied, not "pending".
            const latestState = await latestAccessRequestState(verifiedEmail);
            if (latestState === "denied") {
              return NextResponse.json(
                {
                  error:
                    "Your access request was denied by an administrator. " +
                    "Contact your Sierra Estates account manager to request reconsideration.",
                },
                { status: 403, headers: NO_STORE_HEADERS }
              );
            }
            return NextResponse.json(
              { error: "Your access request is pending super-admin approval." },
              { status: 403, headers: NO_STORE_HEADERS }
            );
          }
          if (profileStatus === "suspended" || profileStatus === "deleted") {
            return NextResponse.json(
              { error: `This account is ${profileStatus}.` },
              { status: 403, headers: NO_STORE_HEADERS }
            );
          }

          const rawRole = String(profile.role ?? "").trim().toLowerCase();
          if (!isAdminPortalRole(rawRole)) {
            return NextResponse.json(
              { error: "This account is not approved for the admin portal." },
              { status: 403, headers: NO_STORE_HEADERS }
            );
          }

          const role: Role = rawRole as Role;

          try {
            await updateRecord("profiles", user.id, { lastLogin: new Date().toISOString() });
          } catch {
            // Non-fatal if profile write fails
          }

          const sess = await signSession({
            uid: user.id,
            email: user.email ?? verifiedEmail,
            name:
              profile?.fullName ??
              (user.user_metadata?.full_name as string | undefined) ??
              verifiedEmail.split("@")[0] ??
              "Sierra Staff",
            role,
            // Partner accounts carry their portfolio scope into the session;
            // source of truth is profiles.metadata.partner_scope.
            ...(isPartnerRole(role) ? { scope: scopeFromProfile(profile) } : {}),
          });
          const res = NextResponse.json({ ok: true, role }, { headers: NO_STORE_HEADERS });
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
      return NextResponse.json(
        { error: "Invalid or expired session token." },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    // Path B — Partner accounts (email + password, PARTNER_ACCOUNTS env).
    // Merged-in property accounts: restricted portal, own-data scope only.
    const partner = tryPartnerLogin(targetEmail, password || "");
    if (partner) {
      const sess = await signSession({
        uid: partner.uid, email: partner.email, name: partner.name, role: partner.role,
        scope: partner.scope,
      });
      const res = NextResponse.json({ ok: true, role: partner.role }, { headers: NO_STORE_HEADERS });
      res.cookies.set(SESSION_COOKIE, sess, cookieOpts(reqHost));
      return res;
    }

    // Path C — Staff Admin Fallback (Email + Password)
    const demo = tryDemoLogin(targetEmail, password || "");
    if (!demo) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your email and password or use Google Mail sign in." },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }
    const sess = await signSession({
      uid: demo.uid, email: demo.email, name: demo.name, role: demo.role,
    });
    const res = NextResponse.json({ ok: true, role: demo.role }, { headers: NO_STORE_HEADERS });
    res.cookies.set(SESSION_COOKIE, sess, cookieOpts(reqHost));
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: NO_STORE_HEADERS });
}

/**
 * Latest real state of the access-request ledger for an email: a pending
 * request outranks old decisions; otherwise the most recent decided state
 * wins. Lookup failure returns "pending"-equivalent null so the caller shows
 * the cautious message (never a fabricated denial).
 */
async function latestAccessRequestState(email: string): Promise<"pending" | "approved" | "denied" | null> {
  try {
    const rows = await listRecords<{ state: string; requestedAt: string | null; decidedAt: string | null }>(
      "access_requests",
      { where: [{ column: "email", value: email }], limit: 50 }
    );
    if (rows.length === 0) return null;
    if (rows.some((r) => (r.state ?? "").toLowerCase() === "pending")) return "pending";
    const decided = rows
      .filter((r) => (r.state ?? "").toLowerCase() === "approved" || (r.state ?? "").toLowerCase() === "denied")
      .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
    return decided[0] ? (decided[0].state.toLowerCase() as "approved" | "denied") : null;
  } catch {
    return null;
  }
}

/**
 * PHASE 7 — durable pending access request for an unprovisioned identity.
 *
 * Creates (idempotently) a pending profile row + access_requests record and
 * notifies the operations staff through whatever channels are configured
 * (internal Telegram admin chat today). No configured channel → the request
 * is still durable and visible in the admin queue; the notification gap is
 * logged by name, never silently approved (default-deny).
 */
async function recordPendingAccessRequest(params: {
  authUid: string;
  email: string;
  fullName: string;
  provider: string;
}): Promise<boolean> {
  const { authUid, email, fullName, provider } = params;
  try {
    // Pending profile row (durable status; least-privilege role until approved).
    const existing = await listRecords<{ id: string }>("profiles", {
      where: [{ column: "id", value: authUid }],
      select: "id",
      limit: 1,
    });
    if (existing.length === 0) {
      await insertRecord("profiles", {
        id: authUid,
        email,
        fullName,
        role: "viewer",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawData: { accessRequest: { provider, requestedAt: new Date().toISOString() } },
      });
    } else {
      await updateRecord("profiles", authUid, {
        status: "pending",
        updatedAt: new Date().toISOString(),
      });
    }

    // Durable access request (unique open request per email).
    const open = await listRecords<{ id: string }>("access_requests", {
      where: [{ column: "email", value: email }, { column: "state", value: "pending" }],
      select: "id",
      limit: 1,
    });
    if (open.length === 0) {
      await insertRecord("access_requests", {
        email,
        authUid,
        provider,
        state: "pending",
        requestedAt: new Date().toISOString(),
      });
    } else {
      await updateRecord("access_requests", open[0].id, {
        authUid,
        requestedAt: new Date().toISOString(),
      });
    }

    // Notification adapters, honestly reported:
    //  1. Telegram internal admin chat (TELEGRAM_ADMIN_CHAT_ID) — armed when
    //     TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID exist in the runtime.
    //  2. ADMIN_APPROVAL_EMAIL names the approver inbox for the server log.
    // Neither is required for durability — the request is already committed
    // above and stays visible in the super-admin queue either way.
    const adminAlert = await notifyAccessRequestCreated({
      email,
      fullName,
      provider,
      requestedAt: new Date().toISOString(),
    });
    const approvalEmail = process.env.ADMIN_APPROVAL_EMAIL;
    if (adminAlert.ok) {
      logger.info(
        `[auth] NEW ACCESS REQUEST: ${email} (${provider}) — admin chat alerted (message ${adminAlert.messageId ?? 'n/a'}); pending approval${approvalEmail ? ` by ${approvalEmail}` : ''}.`
      );
    } else {
      logger.warn(
        `[auth] NEW ACCESS REQUEST: ${email} (${provider}) — admin alert not delivered (${adminAlert.error ?? 'unconfigured'}); ` +
        `the request is durable in the admin queue. Arm TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID in Vercel for live alerts.`
      );
    }

    // Audit trail.
    try {
      await insertRecord("audit_logs", {
        actorUid: authUid,
        actorEmail: email,
        action: "access_request.created",
        target: `access_requests/${email}`,
        after: { email, provider, state: "pending" },
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Audit write failure must not flip the request outcome.
    }

    return true;
  } catch (err: any) {
    logger.warn(`[auth] pending access request could not be recorded: ${err?.message}`);
    return false;
  }
}
