/**
 * GET /api/admin/inquiries          (manager+)
 *   → Inquiry[]
 * PUT /api/admin/inquiries?id=...   (manager+)
 *   body: Partial<Inquiry>
 *   → { ok: true }
 */
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireRole(req, "manager");
  const db = await getAdminDb();
  if (!db) {
    throw new Error("Firestore admin not initialized");
  }

  try {
    const snap = await db.collection("inquiries").orderBy("createdAt", "desc").limit(200).get();
    if (!snap.empty) {
      return NextResponse.json(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
    }
    return NextResponse.json([]);
  } catch (err) {
    console.error("[admin/inquiries] Firestore read failed:", err);
    throw new Error("Failed to read from Firestore");
  }
}

export async function PUT(req: Request) {
  const sess = await requireRole(req, "manager");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const patch = await req.json().catch(() => ({}));

  const db = await getAdminDb();
  if (!db) throw new Error("Firestore admin not initialized");

  const update = {
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: sess.uid,
  };
  await db.collection("inquiries").doc(id).set(update, { merge: true });
  // Write audit log
  await db.collection("audit_logs").add({
    actorUid: sess.uid,
    actorEmail: sess.email,
    action: "inquiry.update",
    target: `inquiries/${id}`,
    after: patch,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
