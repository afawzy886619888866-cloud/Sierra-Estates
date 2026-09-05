/**
 * GET /api/admin/dashboard  (manager+)
 *   → DashboardKPIs  (totalListings, newInquiries7d, conversionRate, ...)
 *
 * Computes KPIs from Supabase.
 */
import { NextResponse } from "next/server";
import { listRecords, countRecords } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";
import type { DashboardKPIs, Inquiry, Lead, Listing } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireRole(req, "manager");

  let listings: Listing[] = [];
  let inquiries: Inquiry[] = [];
  let leads: Lead[] = [];
  let usersCount = 0;
  let compoundsCount = 0;

  try {
    const [listingRows, inquiryRows, leadRows, uCount, cCount] = await Promise.all([
      listRecords("listings"),
      listRecords("inquiries", { orderBy: { column: "createdAt", ascending: false }, limit: 100 }),
      listRecords("leads", { orderBy: { column: "createdAt", ascending: false }, limit: 100 }),
      countRecords("profiles"),
      countRecords("compounds"),
    ]);

    listings = listingRows as unknown as Listing[];
    inquiries = inquiryRows as unknown as Inquiry[];
    // leads.full_name is the Firestore `name` field (see app/api/admin/leads).
    leads = leadRows.map((row) => {
      const { fullName, ...rest } = row as Record<string, unknown>;
      return { ...rest, name: fullName };
    }) as unknown as Lead[];
    usersCount = uCount;
    compoundsCount = cCount;
  } catch (err) {
    console.error("[dashboard] Supabase read failed:", err);
    throw new Error("Failed to read from Supabase");
  }

  const activeListings = listings.filter((l) => l.status === "available");
  const now = Date.now();
  const weekAgo = now - 7 * 86400_000;
  const newInquiries7d = inquiries.filter(
    (i) => new Date(i.createdAt).getTime() > weekAgo
  ).length;
  const closed = inquiries.filter((i) => i.status === "closed").length;
  const conversionRate = inquiries.length
    ? (closed / inquiries.length) * 100
    : 0;
  const pendingApprovals = inquiries.filter((i) => i.status === "new").length;
  const avgAiScore = listings.length
    ? listings.reduce((s, l) => s + (l.aiScore || 0), 0) / listings.length
    : 0;

  // Recent activity feed (merge inquiries + leads, top 10)
  const recentActivity: DashboardKPIs["recentActivity"] = [
    ...inquiries.map((i) => ({
      id: i.id, type: "inquiry" as const,
      message: `New inquiry from ${i.name} (${i.mode})`,
      at: i.createdAt,
    })),
    ...leads.map((l) => ({
      id: l.id, type: "lead" as const,
      message: `Lead from ${l.source}: ${l.name}`,
      at: l.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  // Top agents (by listings count)
  const byAgent = new Map<string, { listings: number }>();
  for (const l of listings) {
    if (!l.agent) continue;
    const cur = byAgent.get(l.agent) ?? { listings: 0 };
    cur.listings++;
    byAgent.set(l.agent, cur);
  }
  const topAgents = [...byAgent.entries()]
    .map(([name, v]) => ({
      name,
      listings: v.listings,
      rating: 5.0,
    }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 5);

  return NextResponse.json<DashboardKPIs>({
    totalListings: listings.length,
    activeListings: activeListings.length,
    newInquiries7d,
    conversionRate,
    activeCompounds: compoundsCount,
    totalUsers: usersCount,
    pendingApprovals,
    avgAiScore,
    recentActivity,
    topAgents,
  });
}
