/**
 * GET /api/admin/inquiries          (manager+)
 *   → Inquiry[]
 * PUT /api/admin/inquiries?id=...   (manager+)
 *   body: Partial<Inquiry>
 *   → { ok: true }
 *
 * Backed by public.inquiries. `Inquiry.type` is stored as `property_type`
 * (`type` alone is too generic for a column), so it is translated in both
 * directions here and the API shape is unchanged.
 */
import { NextResponse } from "next/server";
import { listRecords, updateRecord, insertRecord, type RecordData } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rowToInquiry(row: RecordData): Record<string, unknown> {
  const { propertyType, ...rest } = row as Record<string, unknown>;
  return { ...rest, type: propertyType };
}

export async function GET(req: Request) {
  await requireRole(req, "manager");

  try {
    const rows = await listRecords("inquiries", {
      orderBy: { column: "createdAt", ascending: false },
      limit: 200,
    });
    return NextResponse.json(rows.map(rowToInquiry));
  } catch (err) {
    console.error("[admin/inquiries] Supabase read failed:", err);
    throw new Error("Failed to read from Supabase");
  }
}

export async function PUT(req: Request) {
  const sess = await requireRole(req, "manager");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const patch = await req.json().catch(() => ({}));

  const { type, ...rest } = patch as Record<string, unknown>;
  const update: RecordData = {
    ...rest,
    updatedAt: new Date().toISOString(),
    updatedBy: sess.uid,
  };
  if (type !== undefined) update.propertyType = type;

  const updated = await updateRecord("inquiries", id, update);
  if (!updated) {
    console.warn(`[admin/inquiries] no inquiry row for id ${id}; update skipped`);
  }

  // Write audit log
  await insertRecord("audit_logs", {
    actorUid: sess.uid,
    actorEmail: sess.email,
    action: "inquiry.update",
    target: `inquiries/${id}`,
    after: patch,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
