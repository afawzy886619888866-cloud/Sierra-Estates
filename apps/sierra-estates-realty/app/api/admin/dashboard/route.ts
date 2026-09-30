/**
 * GET /api/admin/dashboard  (manager+)
 *   → DashboardKPIs  (totalListings, newInquiries7d, conversionRate, ...)
 *     + inventoryHealth  (freshness buckets, publish readiness, verification
 *                         queue, duplicate bookkeeping — Phase 12)
 *     + automationHealth  (per-job last run + open DLQ — Phase 11/12 tie-in)
 *
 * Computes everything from Supabase. The Phase 12 sections are wrapped in
 * their own guards: if their tables/columns are not applied yet (migration
 * 013 for inventory columns, 017 for automation_runs), the endpoint still
 * returns the core KPIs and simply reports the sections as null — the
 * control center degrades honestly instead of taking the dashboard down.
 */
import { NextResponse } from "next/server";
import { listRecords, countRecords } from "@sierra-estates/db";
import { requireRole } from "@/lib/auth";
import type { DashboardKPIs, Inquiry, Lead, Listing } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

interface InventoryHealthRow {
  id: string;
  sourceVerifiedAt: string | null;
  publishStatus: string | null;
  verified: boolean | null;
  dupeCheckHash: string | null;
}

export async function GET(req: Request) {
  try {
    await requireRole(req, "manager");
  } catch (err) {
    if (process.env.NODE_ENV !== "production" && process.env.ENABLE_AUTHENTICATION === "false") {
      // Allow local development preview when authentication is bypassed
    } else if (err instanceof Response) {
      return err;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let listings: Listing[] = [];
  let inquiries: Inquiry[] = [];
  let leads: Lead[] = [];
  let usersCount = 0;
  let compoundsCount = 0;
  let inventoryRows: InventoryHealthRow[] = [];
  let inventoryHealthAvailable = false;

  try {
    // database-design optimization: select only required columns to avoid
    // loading heavy pgvector embeddings (1536 floats) and unneeded media arrays into memory
    //
    // The Phase 12 projection rides along in the same Promise.all; when the
    // 013 columns are not applied on this database the WHOLE read rejects,
    // and the catch below retries the core KPIs without the new columns
    // (inventoryHealth then reports null — unavailable, never fake zeros).
    const [listingRows, inquiryRows, leadRows, uCount, cCount, inventoryHealthRows] = await Promise.all([
      listRecords("listings", {
        select: "id,status,agent_name,valuation_status,price",
      }),
      listRecords("inquiries", {
        select: "id,name,mode,status,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 100,
      }),
      listRecords("leads", {
        select: "id,full_name,source,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 100,
      }),
      countRecords("profiles"),
      countRecords("compounds"),
      // Phase 12 control center: freshness / publishability / verification
      // columns (013) — one lightweight projection of the whole table.
      listRecords("listings", {
        select: "id,source_verified_at,publish_status,verified,dupe_check_hash",
      }),
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
    inventoryRows = inventoryHealthRows as unknown as InventoryHealthRow[];
    inventoryHealthAvailable = true;
  } catch (err) {
    console.error("[dashboard] Supabase read failed (013 applied?):", err);
    try {
      const [listingRows, inquiryRows, leadRows, uCount, cCount] = await Promise.all([
        listRecords("listings", { select: "id,status,agent_name,valuation_status,price" }),
        listRecords("inquiries", {
          select: "id,name,mode,status,created_at",
          orderBy: { column: "created_at", ascending: false },
          limit: 100,
        }),
        listRecords("leads", {
          select: "id,full_name,source,created_at",
          orderBy: { column: "created_at", ascending: false },
          limit: 100,
        }),
        countRecords("profiles"),
        countRecords("compounds"),
      ]);
      listings = listingRows as unknown as Listing[];
      inquiries = inquiryRows as unknown as Inquiry[];
      leads = leadRows.map((row) => {
        const { fullName, ...rest } = row as Record<string, unknown>;
        return { ...rest, name: fullName };
      }) as unknown as Lead[];
      usersCount = uCount;
      compoundsCount = cCount;
    } catch (fallbackErr) {
      console.error("[dashboard] Supabase fallback read failed:", fallbackErr);
      return NextResponse.json(
        { error: "Failed to read from database", details: (fallbackErr as Error)?.message },
        { status: 500 }
      );
    }
  }

  // ── Phase 12: Data Integrity (inventory health) ────────────────────────────
  // All values derive from the real listings rows above — no assumptions, no
  // defaults. An empty database renders every bucket at 0, which is the truth.
  // When the 013 projection was unavailable the section is null — the widget
  // then shows "not available" instead of fake zeros.
  let inventoryHealth: DashboardKPIs["inventoryHealth"] = null;
  const now = Date.now();
  if (inventoryHealthAvailable) {
    const freshness = { fresh: 0, aging: 0, stale: 0, never: 0 };
    const publishStatusCounts: Record<string, number> = {};
    let needsVerification = 0;
    let unfingerprinted = 0;
    for (const row of inventoryRows) {
      const verifiedAt = row.sourceVerifiedAt ? new Date(row.sourceVerifiedAt).getTime() : null;
      if (verifiedAt === null || Number.isNaN(verifiedAt)) {
        freshness.never++;
      } else if (now - verifiedAt <= 30 * DAY_MS) {
        freshness.fresh++;
      } else if (now - verifiedAt <= 90 * DAY_MS) {
        freshness.aging++;
      } else {
        freshness.stale++;
      }
      const publish = row.publishStatus ?? "UNCLASSIFIED";
      publishStatusCounts[publish] = (publishStatusCounts[publish] ?? 0) + 1;
      if (row.verified !== true) needsVerification++;
      if (!row.dupeCheckHash) unfingerprinted++;
    }
    inventoryHealth = {
      freshness,
      publishStatusCounts,
      needsVerification,
      unfingerprinted,
      totalListings: inventoryRows.length,
    };
  }

  // ── Phase 11/12: Automation health (guarded — needs migration 017) ────────
  let automationHealth: DashboardKPIs["automationHealth"] = null;
  try {
    const [recentRuns, openDlq] = await Promise.all([
      listRecords<{ job: string; status: string; finishedAt: string | null; durationMs: number | null; triggerSource: string }>(
        "automation_runs",
        {
          select: "job,status,finished_at,duration_ms,trigger_source",
          orderBy: { column: "started_at", ascending: false },
          limit: 60,
        }
      ),
      countRecords("failed_orchestrations", [{ column: "resolvedAt", value: null }]),
    ]);
    // Fold newest-first rows into one "last run" entry per job.
    const lastRunByJob = new Map<string, { status: string; finishedAt: string | null; durationMs: number | null; triggerSource: string }>();
    for (const run of recentRuns) {
      if (!lastRunByJob.has(run.job)) lastRunByJob.set(run.job, run);
    }
    automationHealth = {
      jobs: [...lastRunByJob.entries()].map(([job, run]) => ({ job, ...run })),
      openDeadLetterQueue: openDlq,
    };
  } catch (err) {
    // migration 017 not applied yet — the control center shows "not
    // configured" instead of breaking the dashboard.
    console.error("[dashboard] automation_runs read failed (017 applied?):", err);
  }

  const activeListings = listings.filter((l) => l.status === "available" || (l.status as string) === "active");
  const weekAgo = now - 7 * DAY_MS;
  const newInquiries7d = inquiries.filter(
    (i) => new Date(i.createdAt).getTime() > weekAgo
  ).length;
  const closed = inquiries.filter((i) => i.status === "closed").length;
  const conversionRate = inquiries.length
    ? (closed / inquiries.length) * 100
    : 0;
  const pendingApprovals = inquiries.filter((i) => i.status === "new" || (i.status as string) === "pending").length;
  // Honest average: only over listings that actually carry an aiScore. The
  // previous fallback invented 8.5/9.5 per listing (and 8.8 when empty),
  // fabricating an "AI quality" figure for the admin dashboard.
  const realScores = (listings as any[])
    .map((l) => (typeof l.aiScore === 'number' ? l.aiScore : null))
    .filter((v): v is number => v !== null);
  const avgAiScore = realScores.length
    ? realScores.reduce((s, v) => s + v, 0) / realScores.length
    : null;

  // Recent activity feed (merge inquiries + leads, top 10)
  const recentActivity: DashboardKPIs["recentActivity"] = [
    ...inquiries.map((i) => ({
      id: i.id, type: "inquiry" as const,
      message: `New inquiry from ${i.name} (${i.mode})`,
      at: i.createdAt,
    })),
    ...leads.map((l) => ({
      id: l.id, type: "lead" as const,
      message: `Lead from ${l.source || 'web'}: ${l.name}`,
      at: l.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  // Top agents (by listings count, supporting agentName and brokerName)
  const byAgent = new Map<string, { listings: number }>();
  for (const l of listings as any[]) {
    const agent = l.agentName || l.agent || l.brokerName;
    if (!agent) continue;
    const cur = byAgent.get(agent) ?? { listings: 0 };
    cur.listings++;
    byAgent.set(agent, cur);
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
    inventoryHealth,
    automationHealth,
  });
}
