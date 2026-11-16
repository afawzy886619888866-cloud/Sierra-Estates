/**
 * /api/inventory/hub
 *
 * Unified InvenTree-Powered Inventory & Memory RAG API
 *
 * GET endpoints:
 *   ?view=tree      → InvenTree hierarchical Location and Category trees with unit counts.
 *   ?view=map       → Geo-located Map pins with interactive status badges & QR links.
 *   ?view=rag&q=... → Natural language RAG inventory query for bots and search surfaces.
 *   ?view=items     → Filterable list of all InvenTree stock items.
 *
 * POST endpoint:
 *   action: "sync"        → Reconciles Local/Sheets/Supabase and indexes into RAG.
 *   action: "transition"  → Lifecycle status transition with ECC memory audit logging.
 */

import { NextRequest, NextResponse } from "next/server";
import { invenTreeHub, type InvenTreeStatus } from "@/lib/inventory/InvenTreeInventoryHub";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "tree";
    const q = searchParams.get("q");
    const compound = searchParams.get("compound") || undefined;

    if (view === "tree") {
      const locationTree = invenTreeHub.getLocationTree();
      const categoryTree = invenTreeHub.getCategoryTree();
      return NextResponse.json({
        success: true,
        locationTree,
        categoryTree,
      });
    }

    if (view === "map") {
      const pins = invenTreeHub.getMapPins();
      return NextResponse.json({
        success: true,
        pins,
        total: pins.length,
      });
    }

    if (view === "rag") {
      const results = invenTreeHub.queryRAG(q || "", {
        compound,
        maxResults: Number(searchParams.get("limit") || 5),
      });
      return NextResponse.json({
        success: true,
        query: q,
        results,
      });
    }

    // Default: map pins + summary
    const pins = invenTreeHub.getMapPins();
    return NextResponse.json({
      success: true,
      totalUnits: pins.length,
      pins,
    });
  } catch (error) {
    logger.error("[InvenTreeHub API] GET error:", (error as Error).message);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "sync") {
      const syncResult = await invenTreeHub.syncAndIndexToRAG();
      return NextResponse.json({
        success: true,
        syncResult,
      });
    }

    if (action === "transition") {
      const { code, to, note, actor } = body;
      if (!code || !to) {
        return NextResponse.json(
          { success: false, error: "Missing code or target status 'to'" },
          { status: 400 }
        );
      }

      const updated = invenTreeHub.updateStatus(code, to as InvenTreeStatus, actor || "Admin", note);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: `Unit with code ${code} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Status of ${code} updated to ${to}`,
        code,
        status: to,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    logger.error("[InvenTreeHub API] POST error:", (error as Error).message);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
