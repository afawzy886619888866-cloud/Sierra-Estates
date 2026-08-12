/**
 * GET /api/admin/users            (manager+)   → User[]
 * PUT /api/admin/users?uid=...    (admin)      → { ok: true }
 *   body: { role?, status?, name? }
 */
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth";
import type { Role, User, UserStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireRole(req, "manager");
  const db = await getAdminDb();
  if (!db) {
    throw new Error("Firestore admin not initialized");
  }

  try {
    const snap = await db.collection("users").get();
    if (!snap.empty) {
      return NextResponse.json(
        snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }))
      );
    }
    return NextResponse.json([]);
  } catch (err) {
    console.error("[admin/users] Firestore read failed:", err);
    throw new Error("Failed to read from Firestore");
  }
}

export async function PUT(req: Request) {
  const sess = await requireRole(req, "admin");
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  const patch: Partial<User> = {};
  if (body.role && ["viewer", "manager", "admin"].includes(body.role))
    patch.role = body.role as Role;
  if (body.status && ["active", "suspended", "deleted"].includes(body.status))
    patch.status = body.status as UserStatus;
  if (body.name) patch.name = String(body.name).slice(0, 200);

  const db = await getAdminDb();
  if (!db) throw new Error("Firestore admin not initialized");

  await db.collection("users").doc(uid).set(
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  await db.collection("audit_logs").add({
    actorUid: sess.uid,
    actorEmail: sess.email,
    action: "user.update",
    target: `users/${uid}`,
    after: patch,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
