/** GET /api/compounds → Compound[] (public, sorted featured → aiScore) */
import { NextResponse } from "next/server";
import { SEED_COMPOUNDS } from "@/lib/seed";
import { listRecords } from "@sierra-estates/db";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = (await listRecords("compounds")) ;
    if (items.length > 0) {
      items.sort((a, b) => {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        return b.aiScore - a.aiScore;
      });
      return NextResponse.json(items);
    }
  } catch (err) {
    console.warn("[compounds] Supabase read failed, using seed:", err);
  }
  return NextResponse.json(SEED_COMPOUNDS);
}
