// ═══════════════════════════════════════════════════════════════════════════
// Workflow Ops — Admin bridge to the EC2 workflow control plane (port 2786)
// GET    /api/admin/workflow-ops                  → runner health + all workflows (DB rows + local run state)
// GET    /api/admin/workflow-ops?logs=<slug>&n=10 → run history for one workflow
// POST   /api/admin/workflow-ops {action:'run', slug}      → trigger a run now (HTTP path)
// POST   /api/admin/workflow-ops {action:'request', slug}  → leave a DB 'run-requested' marker
//                                                            (the runner polls and executes it —
//                                                             works even when 2786 is blocked)
//
// Server side: the runner is an X-API-Key-guarded HTTP service on the same EC2
// box as the OpenWA gateway. Env: WORKFLOW_OPS_URL (default the EIP:2786),
// OPENWA_ADMIN_API_KEY doubles as RUNNER_API_KEY.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// PHASE 8/9 FIX: the runner endpoint must come from environment
// configuration ONLY. The hardcoded `http://54.89.162.250:2786` fallback
// baked a raw public IP into source (endpoint drift risk, cleartext HTTP,
// and a stale address the moment the instance changes). Unset env now
// yields an explicit configuration error instead of silently dialing an IP.
function normalizeRunnerUrl(raw: string): string {
  if (!raw) return '';
  let url = raw.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

function getRunnerEndpoints(): string[] {
  const list: string[] = [];
  if (process.env.WORKFLOW_OPS_URL) {
    list.push(normalizeRunnerUrl(process.env.WORKFLOW_OPS_URL));
  }
  // Local runner instance
  list.push('http://127.0.0.1:2786');
  if (process.env.OPENWA_HOST) {
    const port = process.env.RUNNER_PORT || '2786';
    list.push(normalizeRunnerUrl(`${process.env.OPENWA_HOST}:${port}`));
  }
  return Array.from(new Set(list.filter(Boolean)));
}

const OPS_KEY = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('run'), slug: z.string().min(1).max(64) }),
  z.object({ action: z.literal('request'), slug: z.string().min(1).max(64) }),
]);

// Valid workflow-slug allowlist — mirrors runner's SCRIPTS map including whatsapp-dispatch
const RUNNER_SLUGS = new Set([
  'whatsapp-scraper', 'owner-search', 'owner-contact', 'email-sender',
  'unit-adder', 'gateway-sentinel', 'daily-digest', 'units-sync', 'owner-outreach',
  'whatsapp-dispatch',
]);

function opsHeaders(): Record<string, string> {
  return OPS_KEY ? { 'X-API-Key': OPS_KEY } : {};
}

async function proxy(pathname: string, init?: RequestInit): Promise<NextResponse> {
  const endpoints = getRunnerEndpoints();
  if (endpoints.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'runner_not_configured', detail: 'Set WORKFLOW_OPS_URL or OPENWA_HOST (+ RUNNER_PORT) to reach the workflow runner.' },
      { status: 503 }
    );
  }
  let lastErr = 'runner_unreachable';
  for (const base of endpoints) {
    try {
      const res = await fetch(`${base}${pathname}`, {
        ...init,
        headers: { ...opsHeaders(), ...(init?.headers || {}) },
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      lastErr = err?.message || 'unknown';
    }
  }
  logger.error('workflow-ops proxy failed on all candidate endpoints:', lastErr);
  return NextResponse.json(
    { ok: false, error: 'runner_unreachable', detail: lastErr },
    { status: 502 }
  );
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const logsSlug = url.searchParams.get('logs');
  if (logsSlug) {
    const n = Math.min(parseInt(url.searchParams.get('n') || '10', 10) || 10, 20);
    return proxy(`/api/workflows/${encodeURIComponent(logsSlug)}/logs?n=${n}`);
  }

  // Merge runner health + workflow registry into one payload.
  //
  // Honest status contract (P0 2.4):
  //   - runner unreachable (BOTH probes failed) → 502 runner_unreachable;
  //     a 200 + ok:false here would let consumers treat a dead control plane
  //     as "degraded but ready".
  //   - partially reachable (one probe answered) → 200 with the merged truth;
  //     `ok` mirrors the runner's own health verdict, never the proxy's mood.
  try {
    const endpoints = getRunnerEndpoints();
    if (endpoints.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'runner_not_configured', detail: 'Set WORKFLOW_OPS_URL or OPENWA_HOST (+ RUNNER_PORT) to reach the workflow runner.' },
        { status: 503 }
      );
    }

    let health: any = null;
    let workflows: any[] = [];
    let connected = false;

    for (const base of endpoints) {
      try {
        const [healthRes, wfRes] = await Promise.all([
          fetch(`${base}/api/health`, {
            headers: opsHeaders(), signal: AbortSignal.timeout(4000), cache: 'no-store',
          }).catch(() => null),
          fetch(`${base}/api/workflows`, {
            headers: opsHeaders(), signal: AbortSignal.timeout(4000), cache: 'no-store',
          }).catch(() => null),
        ]);

        if (healthRes || wfRes) {
          health = healthRes && healthRes.ok ? await healthRes.json().catch(() => null) : { ok: false };
          workflows = wfRes && wfRes.ok ? (await wfRes.json().catch(() => ({})))?.workflows ?? [] : [];
          connected = true;
          break;
        }
      } catch (_) {}
    }

    if (!connected) {
      return NextResponse.json(
        { ok: false, error: 'runner_unreachable', health: { ok: false }, workflows: [] },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: Boolean(health?.ok),
      health,
      workflows,
      ...(workflows.length === 0 ? { degraded: true } : {}),
    });
  } catch (err: any) {
    logger.error('workflow-ops merge failed:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: 'runner_unreachable', health: { ok: false }, workflows: [] },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const { action, slug } = parsed.data;

  // P0 2.4: allowlist — an authorized operator still cannot point the runner
  // at an arbitrary slug; only the known workflow registry is triggerable.
  if (!RUNNER_SLUGS.has(slug)) {
    return NextResponse.json(
      { ok: false, error: 'unknown_workflow', detail: `slug '${slug}' is not a registered runner workflow` },
      { status: 400 }
    );
  }

  // 'request' path: DB marker the runner picks up within its 60s poll —
  // resilient when the control plane is unreachable from Vercel egress.
  if (action === 'request') {
    try {
      await updateRecord('workflows', slug, { last_run_label: 'run-requested' }, 'slug');
      return NextResponse.json({ ok: true, requested: slug, via: 'db-marker' });
    } catch (err: any) {
      logger.error('workflow-ops request marker failed:', err?.message || err);
      return NextResponse.json({ ok: false, error: 'marker_failed' }, { status: 500 });
    }
  }

  return proxy(`/api/workflows/${encodeURIComponent(slug)}/run`, { method: 'POST' });
}
