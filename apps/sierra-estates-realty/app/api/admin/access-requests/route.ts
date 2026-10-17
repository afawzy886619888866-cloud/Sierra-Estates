/**
 * GET /api/admin/access-requests   (superadmin only)
 *   → AccessRequestRow[] — the durable Google OAuth / Magic-Link access
 *     request ledger (pending first, then recently decided).
 *
 * Phase 1 (Sierra Estates 3.0): the Access Approvals tab in the Admin
 * Portal lists these rows so a superadmin can assign a role and
 * approve/deny each request. Mutations stay on
 * POST /api/admin/users (approve/deny) — this route is read-only.
 *
 * Default-deny: any caller without `access:approve` is rejected, even
 * authenticated staff.
 */
import { NextResponse } from "next/server";
import { listRecords } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";
import { canElevateRoles } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let sess;
  try {
    sess = await requireRole(req, "admin");
  } catch (err) {
    if (process.env.NODE_ENV !== "production" && process.env.ENABLE_AUTHENTICATION === "false") {
      // Local development bypass (same policy as /api/admin/users).
    } else if (err instanceof Response) {
      return err;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Approval is a superadmin capability (`access:approve` / `roles:elevate`).
  if (sess && !canElevateRoles(sess.role)) {
    return NextResponse.json(
      { error: "Only a super admin may review access requests" },
      { status: 403 }
    );
  }

  try {
    const rows = await listRecords<{
      id: string;
      email: string;
      provider: string | null;
      state: string;
      requestedAt: string | null;
      decidedAt: string | null;
      decidedBy: string | null;
      grantedRole: string | null;
      note: string | null;
    }>("access_requests", {
      select: "id,email,provider,state,requested_at,decided_at,decided_by,granted_role,note",
      limit: 200,
    });

    const pendingFirst = (
      a: { state: string; requestedAt: string | null },
      b: { state: string; requestedAt: string | null },
    ) => {
      if ((a.state === "pending") !== (b.state === "pending")) return a.state === "pending" ? -1 : 1;
      return (b.requestedAt ?? "").localeCompare(a.requestedAt ?? "");
    };

    return NextResponse.json(rows.sort(pendingFirst));
  } catch (err) {
    console.error("[admin/access-requests] Supabase read failed:", err);
    return NextResponse.json(
      { error: "Failed to read access requests", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}
