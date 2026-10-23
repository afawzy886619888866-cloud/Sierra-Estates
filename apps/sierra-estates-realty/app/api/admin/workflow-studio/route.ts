// ═══════════════════════════════════════════════════════════════════════════
// Workflow Studio — Admin API
// GET    /api/admin/workflow-studio            → studio definitions (graph+script)
// PUT    /api/admin/workflow-studio            → update graph / script / details
// POST   /api/admin/workflow-studio            → create a new studio workflow
// DELETE /api/admin/workflow-studio { id }      → remove from the studio registry
//
// Backed by public.workflows (migration 012: slug/graph/script/script_lang/
// source_path/category columns + trg_workflow_graph_guard). The DB trigger
// rejects graphs with dangling edges or > 60 nodes — surfaced as 422 here.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, getRecord, insertRecord, updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { toWorkflowColumns, toWorkflowRecord } from '@/lib/server/workflow-columns';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const graphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().min(1).max(64),
    type: z.enum(['trigger', 'action', 'condition', 'output', 'ai']).default('action'),
    label: z.string().min(1).max(120),
    sub: z.string().max(160).optional(),
    x: z.number().finite(),
    y: z.number().finite(),
  })).max(60),
  edges: z.array(z.object({
    id: z.string().min(1).max(64),
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().max(60).optional(),
  })).max(120),
}).superRefine((g, ctx) => {
  const ids = new Set(g.nodes.map((n) => n.id));
  if (ids.size !== g.nodes.length) {
    ctx.addIssue({ code: 'custom', message: 'duplicate node ids in graph' });
  }
  for (const e of g.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) {
      ctx.addIssue({ code: 'custom', message: `edge ${e.id} references a missing node` });
    }
    if (e.from === e.to) {
      ctx.addIssue({ code: 'custom', message: `edge ${e.id} is self-referential` });
    }
  }
});

const parsedGraph = z.union([
  graphSchema,
  z.string().transform((s, ctx) => {
    try { return JSON.parse(s) } catch { ctx.addIssue({ code: 'custom', message: 'graph is not valid JSON' }); return z.NEVER }
  }),
]);

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  desc: z.string().max(2000).optional(),
  status: z.enum(['active', 'paused', 'draft']).optional(),
  schedule: z.string().max(120).optional(),
  script: z.string().max(400_000).optional(),
  graph: parsedGraph.optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  desc: z.string().max(2000).optional(),
  category: z.enum(['ingestion', 'outreach', 'intelligence', 'operations']).default('operations'),
  scriptLang: z.enum(['javascript', 'typescript', 'json']).default('javascript'),
  script: z.string().max(400_000).optional(),
  graph: parsedGraph.optional(),
});

/** Normalize a DB row into the studio payload shape (graph always a string). */
function toStudio(row: RecordData): RecordData {
  const rec = toWorkflowRecord(row);
  let graph: unknown = rec.graph ?? null;
  if (graph && typeof graph === 'object') {
    graph = JSON.stringify(graph);
  }
  return { ...rec, graph };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await listRecords('workflows');
    const workflows = rows.map(toStudio);
    return NextResponse.json({ success: true, workflows });
  } catch (err) {
    logger.error('workflow-studio GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load workflows', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { id, name, nameAr, desc, status, schedule, script, graph } = parsed.data;
    const actor = auth.email || 'admin';

    const existing = await getRecord('workflows', id);
    if (!existing) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    const patch: RecordData = { updatedAt: new Date().toISOString(), updatedBy: actor };
    if (name !== undefined) patch.name = name;
    if (nameAr !== undefined) patch.nameAr = nameAr;
    if (desc !== undefined) patch.desc = desc;
    if (status !== undefined) { patch.status = status; patch.enabled = status === 'active'; }
    if (schedule !== undefined) patch.schedule = schedule;
    if (script !== undefined) patch.script = script;
    if (graph !== undefined) patch.graph = graph; // object → JSONB via record layer

    await updateRecord('workflows', id, toWorkflowColumns(patch));
    const row = await getRecord('workflows', id);
    return NextResponse.json({ success: true, workflow: toStudio(row ?? {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('workflow-studio PUT failed:', err);
    if (msg.includes('Workflow graph')) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: 'Update failed', details: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, nameAr, desc, category, scriptLang, script, graph } = parsed.data;
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 72) || 'workflow';
    const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
    const graphValue =
      graph === undefined
        ? { nodes: [{ id: 'n1', type: 'trigger', label: 'Trigger', x: 60, y: 100 }], edges: [] }
        : graph;

    const ref = await insertRecord<{ id: string }>('workflows', toWorkflowColumns({
      slug,
      name,
      nameAr: nameAr || '',
      desc: desc || '',
      category,
      status: 'draft',
      enabled: false,
      schedule: 'manual',
      triggerType: 'manual',
      scriptLang,
      script: script ?? '// New workflow script\n',
      graph: graphValue,
      color: '#D4AF37',
      runs: 0,
      successRate: 100,
      lastRunMs: 0,
      last: 'never',
      updatedAt: new Date().toISOString(),
      updatedBy: auth.email || 'admin',
    }));

    return NextResponse.json({ success: true, workflowId: ref.id, slug });
  } catch (err) {
    logger.error('workflow-studio POST failed:', err);
    return NextResponse.json(
      { error: 'Create failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await req.json();
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    await deleteRecord('workflows', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('workflow-studio DELETE failed:', err);
    return NextResponse.json(
      { error: 'Delete failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
