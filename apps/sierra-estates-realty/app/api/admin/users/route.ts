/**
 * GET  /api/admin/users            (manager+)   → User[]
 * PUT  /api/admin/users?uid=...    (admin)      → { ok: true }
 *   body: { role?, status?, name? }
 * POST /api/admin/users/approve    (superadmin) → { ok: true }
 *   body: { email, decision: 'approved' | 'denied', role?, note? }
 *
 * Backed by public.profiles. The Firestore `users` docs were keyed by uid and
 * carried `name`; the table is keyed by `id` (FK to auth.users) and carries
 * `full_name`, so both are translated here — the API shape is unchanged.
 *
 * PHASE 7 FIXES:
 *  - GET now selects and returns the REAL persistent account status. The old
 *    code fabricated `status: "active"` for every user, so a suspended or
 *    deleted account still looked healthy to the admin UI (and no pending
 *    state could ever surface).
 *  - PUT accepts the full canonical role vocabulary (was viewer/manager/admin
 *    only, narrower than both the DB CHECK and the Role type).
 *  - Role elevation and access approval require a super admin (default-deny;
 *    only canElevateRoles() holders may grant elevated roles).
 */
import { NextResponse } from "next/server";
import { listRecords, updateRecord, insertRecord, type RecordData } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";
import { canElevateRoles, roleHasPermission } from "@/lib/types";
import type { Role, UserStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_ROLES: Role[] = [
  "superadmin", "admin", "operations_manager", "inventory_manager",
  "marketing_manager", "sales_manager", "sales_agent", "auditor",
  "manager", "agent", "broker", "viewer", "owner", "partner",
];

/** Roles only a super admin may assign (default-deny elevation). */
const ELEVATED_ROLES: Role[] = ["superadmin", "admin", "operations_manager", "auditor"];

export async function GET(req: Request) {
  try {
    await requireRole(req, "manager");
  } catch (err) {
    if (process.env.NODE_ENV !== "production" && process.env.ENABLE_AUTHENTICATION === "false") {
      // Local development bypass
    } else if (err instanceof Response) {
      return err;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // PHASE 7: status is a real column (migration 020b) and is now returned
    // truthfully. A NULL status on an old provisioned row is reported as
    // 'unconfirmed' — never fabricated as 'active'.
    const rows = await listRecords("profiles", {
      select: "id,full_name,email,role,status,avatar_url,phone,created_at,updated_at",
    });
    return NextResponse.json(
      rows.map((row) => {
        const { id, fullName, status, ...rest } = row as Record<string, unknown>;
        return {
          uid: id,
          ...rest,
          name: fullName,
          status: typeof status === "string" && status.length > 0 ? status : "unconfirmed",
        };
      })
    );
  } catch (err) {
    console.error("[admin/users] Supabase read failed:", err);
    return NextResponse.json(
      { error: "Failed to read users from database", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const sess = await requireRole(req, "admin");
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  // `patch` is the audited, API-facing shape; `columns` is the same data in
  // profiles' column names.
  const patch: { role?: Role; status?: UserStatus; name?: string } = {};
  if (body.role && ALL_ROLES.includes(body.role as Role)) {
    // Default-deny elevation: assigning an elevated role requires a super
    // admin, even for an admin-level caller.
    if (ELEVATED_ROLES.includes(body.role as Role) && !canElevateRoles(sess.role)) {
      return NextResponse.json(
        { error: "Only a super admin may assign elevated roles" },
        { status: 403 }
      );
    }
    patch.role = body.role as Role;
  }
  if (body.status && ["pending", "active", "suspended", "deleted"].includes(body.status))
    patch.status = body.status as UserStatus;
  if (body.name) patch.name = String(body.name).slice(0, 200);

  const columns: RecordData = { updatedAt: new Date().toISOString() };
  if (patch.role !== undefined) columns.role = patch.role;
  if (patch.status !== undefined) columns.status = patch.status;
  if (patch.name !== undefined) columns.fullName = patch.name;

  // A profile row cannot be conjured the way the Firestore set(merge) did: the
  // primary key is a foreign key onto auth.users. An unknown uid is therefore
  // a no-op rather than an insert, and is logged.
  const updated = await updateRecord("profiles", uid, columns);
  if (!updated) {
    console.warn(`[admin/users] no profile row for uid ${uid}; update skipped`);
  }

  await insertRecord("audit_logs", {
    actorUid: sess.uid,
    actorEmail: sess.email,
    action: "user.update",
    target: `users/${uid}`,
    after: patch,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

/**
 * PHASE 7 — Google OAuth access-request approval/denial.
 * Super-admin only. Approving grants a least-privilege role and activates the
 * pending profile; denying records the decision and leaves the account
 * without staff access. Every decision is a durable audit event.
 */
export async function POST(req: Request) {
  const sess = await requireRole(req, "admin");
  if (!canElevateRoles(sess.role)) {
    return NextResponse.json(
      { error: "Only a super admin may approve or deny staff access requests" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const decision = body.decision === "approved" ? "approved" : body.decision === "denied" ? "denied" : null;
  if (!email || !decision) {
    return NextResponse.json({ error: "email and decision (approved|denied) are required" }, { status: 400 });
  }
  // Least privilege: the default grant is the lowest staff role; anything
  // elevated still requires explicit super-admin intent and is audited.
  const grantedRole: Role = body.role && ALL_ROLES.includes(body.role as Role)
    ? (body.role as Role)
    : "viewer";

  try {
    const openRequests = await listRecords<{ id: string; email: string; authUid: string | null }>(
      "access_requests",
      { where: [{ column: "email", value: email }, { column: "state", value: "pending" }], limit: 1 }
    );
    const request = openRequests[0];

    if (decision === "approved") {
      if (request?.authUid) {
        await updateRecord("profiles", request.authUid, {
          role: grantedRole,
          status: "active",
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Profile row keyed by email for accounts whose auth uid was not
        // captured at request time (approved at the email level).
        const profileRows = await listRecords<{ id: string }>("profiles", {
          where: [{ column: "email", value: email }],
          select: "id",
          limit: 1,
        });
        if (profileRows[0]) {
          await updateRecord("profiles", profileRows[0].id, {
            role: grantedRole,
            status: "active",
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (request) {
      await updateRecord("access_requests", request.id, {
        state: decision,
        decidedBy: sess.email,
        decidedAt: new Date().toISOString(),
        grantedRole: decision === "approved" ? grantedRole : null,
        note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
        notified: false,
      });
    } else {
      await insertRecord("access_requests", {
        email,
        provider: "google",
        state: decision,
        decidedBy: sess.email,
        decidedAt: new Date().toISOString(),
        grantedRole: decision === "approved" ? grantedRole : null,
        note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
      });
    }

    await insertRecord("audit_logs", {
      actorUid: sess.uid,
      actorEmail: sess.email,
      action: `access_request.${decision}`,
      target: `access_requests/${email}`,
      after: { email, decision, grantedRole: decision === "approved" ? grantedRole : undefined },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, email, decision, grantedRole: decision === "approved" ? grantedRole : undefined });
  } catch (err) {
    console.error("[admin/users] approval decision failed:", err);
    return NextResponse.json(
      { error: "Approval decision failed", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}
