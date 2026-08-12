/** GET /api/compounds → Compound[] (public, sorted featured → aiScore) */
import { NextResponse } from "next/server";
import { SEED_COMPOUNDS } from "@/lib/seed";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Compound } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getAdminDb();
  if (db) {
    try {
      const snap = await db.collection("compounds").get();
      if (!snap.empty) {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Compound[];
        items.sort((a, b) => {
          if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
          return b.aiScore - a.aiScore;
        });
        return NextResponse.json(items);
      }
    } catch (err) {
      console.warn("[compounds] Firestore read failed, using seed:", err);
    }
  }
  return NextResponse.json(SEED_COMPOUNDS);
}
