/** GET /api/admin/audit  (manager+) → AuditLog[] (last 100, newest first) */
import { NextResponse } from "next/server";
import { listRecords } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";
import { verifyRequest, verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

async function checkAuth(request: Request) {
  const auth = await verifyRequest(request as import('next/server').NextRequest);
  if (auth.authenticated && auth.method === 'secret-key') return null;
  const adminAuth = await verifyAdminRequest(request as import('next/server').NextRequest);
  if (adminAuth.authenticated) return null;
  return unauthorizedResponse();
}



export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req: Request) {
  const __authError = await checkAuth(req);
  if (__authError) return __authError;
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
