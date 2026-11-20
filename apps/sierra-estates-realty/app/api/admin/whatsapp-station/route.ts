import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@sierra-estates/db';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * WHATSAPP STATION API (`/api/admin/whatsapp-station`)
 * ════════════════════════════════════════════════════
 * Control plane for the WhatsApp Listing Station skill
 * (packages/whatsapp-station). The window in the admin console shows:
 * gateway/QR status, broker-group registry, waiting-list counts, RAG
 * availability — and triggers scrapes.
 *
 * Execution model (honest): the admin server NEVER runs a WhatsApp
 * session itself. Scraping runs on the runner host (same box as the
 * OpenWA gateway) via workflow `whatsapp-station` — HTTP "run now"
 * first, DB "run-requested" marker as the offline fallback. Both
 * mechanisms mirror /api/admin/workflow-ops exactly.
 *
 * GET  → { runner, gateway, counts, groups, rag, usb }
 * POST { action: 'scrape' }            → runner run (HTTP → DB marker fallback)
 * POST { action: 'request', ... }      → DB run-requested marker only
 * POST { action: 'usb-import', dir? }  → runner run with USB note
 */

const OPS_KEY = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
const STATION_SLUG = 'whatsapp-station';

function runnerEndpoints(): string[] {
  const list: string[] = [];
  if (process.env.WORKFLOW_OPS_URL) {
    let url = process.env.WORKFLOW_OPS_URL.trim();
    if (!/^https?:\/\//.test(url)) url = `http://${url}`;
    list.push(url.replace(/\/+$/, ''));
  }
  list.push('http://127.0.0.1:2786');
  if (process.env.OPENWA_HOST) {
    list.push(`http://${process.env.OPENWA_HOST.replace(/\/+$/, '')}:${process.env.RUNNER_PORT || '2786'}`);
  }
  return list;
}

async function runnerFetch(pathname: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: unknown } | null> {
  for (const base of runnerEndpoints()) {
    try {
      const res = await fetch(`${base}${pathname}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(OPS_KEY ? { 'X-API-Key': OPS_KEY } : {}), ...(init?.headers || {}) },
        signal: AbortSignal.timeout(8000),
      });
      let body: unknown = null;
      try { body = await res.json(); } catch {}
      if (res.ok || res.status !== 503) return { ok: res.ok, status: res.status, body };
    } catch {
      // endpoint unreachable — try the next one
    }
  }
  return null;
}

async function leaveRunRequest(origin: string): Promise<boolean> {
  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from('admin_run_requests')
      .upsert(
        { slug: STATION_SLUG, requested_at: new Date().toISOString(), origin },
        { onConflict: 'slug' },
      );
    return !error;
  } catch {
    // Table may not exist on this database — the HTTP path above already
    // reported honestly; the marker is best-effort only.
    return false;
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1) runner view of the station workflow
  const runner = await runnerFetch('/api/workflows');
  const rows = Array.isArray((runner?.body as { workflows?: Array<{ slug?: string }> })?.workflows)
    ? (runner!.body as unknown as { workflows: Array<Record<string, unknown>> }).workflows
    : Array.isArray(runner?.body)
      ? (runner!.body as unknown as Array<Record<string, unknown>>)
      : [];
  const stationRow = rows.find((r) => r?.slug === STATION_SLUG) || null;

  // 2) waiting-list counts + registered broker groups
  let counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, IMPORTED: 0, total: 0 };
  let groups: Array<Record<string, unknown>> = [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const sb = getSupabaseAdmin();
      const { data } = await sb.from('listing_waiting_list').select('status').limit(5000);
      if (Array.isArray(data)) {
        for (const r of data) {
          const s = (r as { status?: string }).status || 'PENDING';
          if (s in counts) (counts as unknown as Record<string, number>)[s]++;
          counts.total++;
        }
      }
      const g = await sb.from('whatsapp_station_groups').select('*').order('group_name');
      if (Array.isArray(g.data)) groups = g.data as Array<Record<string, unknown>>;
    } catch (err) {
      logger.warn(`[whatsapp-station] supabase read failed: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    success: true,
    runner: {
      reachable: Boolean(runner?.ok),
      configured: Boolean(OPS_KEY),
      station: stationRow,
    },
    gateway: {
      // The gateway lives on the runner host; its reachability is reported
      // through the runner workflow telemetry, not dialed from here.
      urlConfigured: Boolean(process.env.OPENWA_GATEWAY_URL || process.env.WHATSAPP_GATEWAY_URL || process.env.OPENWA_HOST),
    },
    counts,
    groups,
    rag: { configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) },
    usb: { dirConfigured: Boolean(process.env.STATION_USB_DIR) },
  });
}

const PostBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('scrape') }),
  z.object({ action: z.literal('request'), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('usb-import'), dir: z.string().max(400).optional() }),
]);

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', detail: parsed.error.format() }, { status: 400 });
  }
  const { action } = parsed.data;

  if (action === 'request') {
    const ok = await leaveRunRequest(parsed.data.reason || 'manual request');
    return NextResponse.json({
      success: ok,
      mode: 'run-requested',
      message: ok
        ? 'Run request recorded — the runner will pick it up on its next poll (works even when port 2786 is unreachable).'
        : 'Run request marker could not be written; use the HTTP run path or check the runner.',
    });
  }

  // scrape / usb-import → real runner trigger
  const run = await runnerFetch(`/api/workflows/${STATION_SLUG}/run`, { method: 'POST', body: JSON.stringify({ trigger: 'manual' }) });
  if (run?.ok) {
    return NextResponse.json({ success: true, mode: 'http-run', detail: run.body, note: action === 'usb-import' ? 'USB dir comes from STATION_USB_DIR on the runner host.' : undefined });
  }

  // offline fallback → DB marker (honest about what happened)
  const marked = await leaveRunRequest(action);
  return NextResponse.json({
    success: marked,
    mode: 'run-requested-fallback',
    runnerReachable: Boolean(run),
    message: marked
      ? 'Runner HTTP unreachable — run request recorded in DB; the runner will execute it on its next poll.'
      : 'Runner unreachable and DB marker failed — start the runner (ec2-runner service) and retry.',
  }, { status: marked ? 202 : 503 });
}
