/** GET /api/admin/audit  (manager+) → AuditLog[] (last 100, newest first) */
import { NextResponse } from "next/server";
import { listRecords } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req: Request) {
  await requireRole(req, "manager");
  try {
    const rows = await listRecords("audit_logs", {
      orderBy: { column: "createdAt", ascending: false },
      limit: 100,
    });
    return NextResponse.json(rows);
  } catch (err) {
    // An unreadable audit log must not 500 the admin console; the previous
    // Firestore path degraded to [] the same way.
    console.warn("[audit] read failed:", err);
    return NextResponse.json([]);
  }
}
