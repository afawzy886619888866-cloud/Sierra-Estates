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

const OPS_BASE = (process.env.WORKFLOW_OPS_URL
  || (process.env.OPENWA_HOST ? `http://${process.env.OPENWA_HOST}:${process.env.RUNNER_PORT || '2786'}` : '')
  || 'http://54.89.162.250:2786').replace(/\/+$/, '');
const OPS_KEY = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('run'), slug: z.string().min(1).max(64) }),
  z.object({ action: z.literal('request'), slug: z.string().min(1).max(64) }),
]);

function opsHeaders(): Record<string, string> {
  return OPS_KEY ? { 'X-API-Key': OPS_KEY } : {};
}

async function proxy(pathname: string, init?: RequestInit): Promise<NextResponse> {
  try {
    const res = await fetch(`${OPS_BASE}${pathname}`, {
      ...init,
      headers: { ...opsHeaders(), ...(init?.headers || {}) },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    logger.error('workflow-ops proxy failed:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: 'runner_unreachable', detail: err?.message || 'unknown' },
      { status: 502 }
    );
  }
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
  try {
    const [healthRes, wfRes] = await Promise.all([
      fetch(`${OPS_BASE}/api/health`, {
        headers: opsHeaders(), signal: AbortSignal.timeout(8000), cache: 'no-store',
      }).catch(() => null),
      fetch(`${OPS_BASE}/api/workflows`, {
        headers: opsHeaders(), signal: AbortSignal.timeout(8000), cache: 'no-store',
      }).catch(() => null),
    ]);
    const health = healthRes && healthRes.ok ? await healthRes.json().catch(() => null) : { ok: false };
    const workflows = wfRes && wfRes.ok ? (await wfRes.json().catch(() => ({})))?.workflows ?? [] : [];
    return NextResponse.json({ ok: Boolean(health?.ok), health, workflows });
  } catch (err: any) {
    logger.error('workflow-ops merge failed:', err?.message || err);
    return NextResponse.json({ ok: false, health: { ok: false }, workflows: [] }, { status: 200 });
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
