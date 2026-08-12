/**
 * POST /api/inquiries  (public — site contact form)
 *   { mode, name, phone, email, zone, type, budget, notes }
 *   → { id }
 * Writes to Firestore /leads with status="new", source="website".
 * Falls back to local-only when Firebase Admin is not configured.
 */
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Inquiry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { mode, name, phone, email, zone, type, budget, notes } = body;

  // Minimal server-side validation
  if (!name || !phone) {
    return NextResponse.json(
      { error: "Name and phone are required" },
      { status: 400 }
    );
  }

  const payload: Omit<Inquiry, "id"> = {
    mode: mode === "rent" ? "rent" : "sale",
    name: String(name).slice(0, 200),
    phone: String(phone).slice(0, 50),
    email: email ? String(email).slice(0, 200) : undefined,
    zone: zone || undefined,
    type: type || undefined,
    budget: budget || undefined,
    notes: notes ? String(notes).slice(0, 2000) : undefined,
    status: "new",
    source: "website",
    createdAt: new Date().toISOString(),
  };

  const db = await getAdminDb();
  if (db) {
    try {
      const ref = await db.collection("leads").add(payload);
      return NextResponse.json({ id: ref.id });
    } catch (err) {
      console.warn("[inquiries] Firestore write failed:", err);
    }
  }
  // Sandbox fallback
  return NextResponse.json({ id: `local-${Date.now()}`, fallback: true });
}
