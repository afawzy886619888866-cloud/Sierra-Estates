/**
 * GET    /api/listings/[id]   (public)
 * PUT    /api/listings/[id]   (manager+)
 * DELETE /api/listings/[id]   (admin) — soft delete (status=archived)
 */
import { NextResponse } from "next/server";
import { SEED_LISTINGS } from "@/lib/seed";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getAdminDb();
  if (db) {
    try {
      const doc = await db.collection("listings").doc(id).get();
      if (doc.exists) return NextResponse.json({ id: doc.id, ...doc.data() });
    } catch (err) {
      console.warn("[listings/[id]] Firestore read failed:", err);
    }
  }
  const item = SEED_LISTINGS.find((l) => l.id === id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireRole(req, "manager");
  const { id } = await ctx.params;
  const patch = await req.json().catch(() => ({}));
  const db = await getAdminDb();
  if (db) {
    const update = { ...patch, updatedAt: new Date().toISOString() };
    await db.collection("listings").doc(id).set(update, { merge: true });

    const houyezUpdate: Record<string, any> = { ...update };
    if (patch.compound) houyezUpdate.cmp = patch.compound;
    if (patch.aiScore != null) houyezUpdate.ai = patch.aiScore;
    if (patch.status != null) houyezUpdate.active = patch.status !== "archived";

    await db.collection("houyez_listings").doc(id).set(houyezUpdate, { merge: true });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireRole(req, "admin");
  const { id } = await ctx.params;
  const db = await getAdminDb();
  if (db) {
    const update = { status: "archived", active: false, updatedAt: new Date().toISOString() };
    await db.collection("listings").doc(id).set(update, { merge: true });
    await db.collection("houyez_listings").doc(id).set(update, { merge: true });
  }
  return NextResponse.json({ ok: true });
}
