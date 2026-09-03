/**
 * GET    /api/listings/[id]   (public)
 * PUT    /api/listings/[id]   (manager+)
 * DELETE /api/listings/[id]   (admin) — soft delete (status=archived)
 */
import { NextResponse } from "next/server";
import { SEED_LISTINGS } from "@/lib/seed";
import { getRecord, updateRecord } from "@sierra-estates/db";
import { toListingColumns, toListingRecord } from "@/lib/server/listing-columns";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  const { id } = await ctx.params;
  try {
    const row = await getRecord("listings", id);
    // toListingRecord puts the row back into the app vocabulary the Firestore
    // documents used, so the response body is unchanged for the frontend.
    if (row) return NextResponse.json(toListingRecord(row));
  } catch (err) {
    console.warn("[listings/[id]] Supabase read failed:", err);
  }
  const item = SEED_LISTINGS.find((l) => l.id === id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req, ctx) {
  await requireRole(req, "manager");
  const { id } = await ctx.params;
  const patch = await req.json().catch(() => ({}));

  // The two Firestore collections (listings + houyez_listings) are one table
  // now, so the denormalised aliases the dual-write maintained (cmp / ai /
  // active) are no longer written — `compound`, `aiScore` and `status` are the
  // single source for all three.
  await updateRecord("listings", id, {
    ...toListingColumns(patch),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, ctx) {
  await requireRole(req, "admin");
  const { id } = await ctx.params;
  await updateRecord("listings", id, {
    status: "archived",
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
