/**
 * POST /api/telegram/broadcast   (permission: inventory:write)
 *
 * Sierra Estates 3.0 — Phase 2 end-to-end listing pipeline:
 *
 *   raw specs → canonical unit code → Gemini Arabic formatter →
 *   Telegram channel album (sendMediaGroup) → multi-destination syndication
 *   (Supabase listings upsert · Owners-Rent master CSV · coordinate
 *   resolution for the interactive map · Property Finder feed refresh).
 *
 * `dryRun: true` runs formatting + syndication planning WITHOUT sending to
 * the channel and WITHOUT writing destinations — the response shows exactly
 * what a live run would do (§21: honest reporting, never fabricated success).
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { roleHasPermission } from "@/lib/types";
import { insertRecord } from "@sierra-estates/db";
import { formatListingForTelegram, type TelegramListingSpec } from "@/lib/server/telegram-listing-formatter";
import { sendListingToTelegramChannel } from "@/lib/server/telegram-broadcaster";
import { syndicateListingBroadcast } from "@/lib/server/listing-syndication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTOS = 10;

export async function POST(req: Request) {
  // Auth: a verified staff session holding inventory:write (default-deny).
  let sess;
  try {
    sess = await requireRole(req, "inventory_manager");
  } catch (err) {
    if (process.env.NODE_ENV !== "production" && process.env.ENABLE_AUTHENTICATION === "false") {
      // Local development bypass — same policy as the other admin routes.
    } else if (err instanceof Response) {
      return err;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (sess && !roleHasPermission(sess.role, "inventory:write")) {
    return NextResponse.json(
      { error: `Role '${sess.role}' lacks inventory:write — listing broadcast denied` },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const unit = body?.unit as TelegramListingSpec | undefined;
  if (!unit || typeof unit !== "object" || !unit.compound || String(unit.compound).trim() === "") {
    return NextResponse.json(
      { error: "Missing `unit` payload with at least a `compound`" },
      { status: 400 },
    );
  }
  const photoUrls: string[] = Array.isArray(body?.photoUrls)
    ? body.photoUrls.map((u: unknown) => String(u ?? "")).filter((u: string) => /^https?:\/\//i.test(u)).slice(0, MAX_PHOTOS)
    : [];
  const dryRun = body?.dryRun === true;

  // 1. Gemini (or honest template) Arabic luxury copy.
  const formatted = await formatListingForTelegram(unit);

  // 2. Channel broadcast (skipped on dryRun).
  const broadcast = dryRun
    ? {
        ok: false,
        skipped: true,
        chatId: "dry-run",
        mode: "none" as const,
        messageId: null,
        error: "dryRun — channel send suppressed",
        captionTruncated: false,
      }
    : await sendListingToTelegramChannel(unit, formatted.caption, photoUrls);

  // 3. Multi-destination syndication (suppressed on dryRun).
  const syndication = dryRun
    ? await syndicateListingBroadcastDryRun({ unit, formattedCaption: formatted.caption, photoUrls })
    : await syndicateListingBroadcast({ unit, formattedCaption: formatted.caption, photoUrls, broadcast });

  // 4. Durable audit trail (never fabricated).
  if (!dryRun && sess) {
    try {
      await insertRecord("audit_logs", {
        actorUid: sess.uid,
        actorEmail: sess.email,
        action: "listing.telegram_broadcast",
        target: `listings/${syndication.unitCode}`,
        after: {
          unitCode: syndication.unitCode,
          channelPost: broadcast.ok,
          captionSource: formatted.source,
          supabase: syndication.supabase.action,
          masterCsv: syndication.masterCsv.action,
          propertyFinder: syndication.propertyFinder.mode,
        },
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Audit write failure must not flip the broadcast outcome.
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    unitCode: syndication.unitCode,
    formatted,
    broadcast,
    syndication,
  });
}

/** Dry-run variant: resolves codes + coordinates but writes nothing. */
async function syndicateListingBroadcastDryRun(params: {
  unit: TelegramListingSpec;
  formattedCaption: string;
  photoUrls: string[];
}) {
  const { resolveListingCoordinates, triggerPropertyFinderFeed } = await import(
    "@/lib/server/listing-syndication"
  );
  const { resolveUnitCode } = await import("@/lib/server/unit-codes");
  const coordinates = await resolveListingCoordinates(params.unit);
  const propertyFinder = triggerPropertyFinderFeed();
  return {
    unitCode: resolveUnitCode(params.unit).code,
    supabase: {
      ok: false,
      action: "unavailable" as const,
      refId: resolveUnitCode(params.unit).code,
      error: "dryRun — Supabase upsert suppressed",
    },
    masterCsv: {
      ok: false,
      action: "skipped" as const,
      note: "dryRun — master CSV append suppressed",
    },
    coordinates,
    propertyFinder: {
      ...propertyFinder,
      triggered: false,
      note: `dryRun — ${propertyFinder.note ?? "feed refresh suppressed"}`,
    },
  };
}
