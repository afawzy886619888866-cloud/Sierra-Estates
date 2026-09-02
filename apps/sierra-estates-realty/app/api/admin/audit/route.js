/** GET /api/admin/audit  (manager+) → AuditLog[] (last 100, newest first) */
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req) {
  await requireRole(req, "manager");
  const db = await getAdminDb();
  if (db) {
    try {
      const snap = await db.collection("audit_logs")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      if (!snap.empty)
        return NextResponse.json(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() ) }))
        );
    } catch (err) {
      console.warn("[audit] Firestore read failed:", err);
    }
  }
  return NextResponse.json([]);
}
