/**
 * GET /api/admin/users            (manager+)   → User[]
 * PUT /api/admin/users?uid=...    (admin)      → { ok: true }
 *   body: { role?, status?, name? }
 *
 * Backed by public.profiles. The Firestore `users` docs were keyed by uid and
 * carried `name`; the table is keyed by `id` (FK to auth.users) and carries
 * `full_name`, so both are translated here — the API shape is unchanged.
 */
import { NextResponse } from "next/server";
import { listRecords, updateRecord, insertRecord, type RecordData } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";
import type { Role, UserStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // database-design: select only existing profile columns in Supabase
    const rows = await listRecords("profiles", {
      select: "id,full_name,email,role,avatar_url,phone,created_at,updated_at",
    });
    return NextResponse.json(
      rows.map((row) => {
        const { id, fullName, ...rest } = row as Record<string, unknown>;
        return { uid: id, ...rest, name: fullName, status: "active" };
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
  if (body.role && ["viewer", "manager", "admin"].includes(body.role))
    patch.role = body.role as Role;
  if (body.status && ["active", "suspended", "deleted"].includes(body.status))
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
