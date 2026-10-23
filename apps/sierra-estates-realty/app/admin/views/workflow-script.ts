/**
 * Workflow Studio model — graph types, n8n import, and the runnable
 * Node.js script generator.
 *
 * The graph shape matches what PATCH /api/admin/workflows/[id] already
 * persists (`nodes` / `edges` / `config` JSON columns) and mirrors the
 * n8n export format closely enough that the studio can import the team's
 * existing templates (workflows/n8n-templates/*.json,
 * infra/n8n-workflows/*.json) without conversion friction.
 */

/* ── Graph model ────────────────────────────────────────────────────── */

export type WorkflowNodeType =
  | 'trigger'
  | 'agent'
  | 'condition'
  | 'action'
  | 'notify'
  | 'delay'
  | 'webhook'
  | 'database';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  x: number;
  y: number;
  params?: Record<string, string | number | boolean>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface WorkflowGraph {
  id: string;
  name: string;
  status: 'active' | 'warning' | 'paused';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  config?: Record<string, unknown>;
}

export const NODE_TYPE_META: Record<
  WorkflowNodeType,
  { label: string; labelAr: string; color: string; bg: string; icon: string; description: string }
> = {
  trigger:   { label: 'Trigger',    labelAr: 'مُطلِق',     color: '#E9C176', bg: 'rgba(200,150,26,0.14)', icon: '⚡', description: 'Cron schedule, webhook or manual start' },
  agent:     { label: 'AI Agent',   labelAr: 'وكيل ذكي',  color: '#a78bfa', bg: 'rgba(124,58,237,0.14)',  icon: '🤖', description: 'LLM reasoning step (Leila, Scribe, Curator…)' },
  condition: { label: 'Condition',  labelAr: 'شرط',       color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  icon: '◈', description: 'Branch the flow on a rule' },
  action:    { label: 'Action',     labelAr: 'إجراء',     color: '#34d399', bg: 'rgba(52,211,153,0.14)',  icon: '▶', description: 'Execute a unit of work' },
  notify:    { label: 'Notify',     labelAr: 'تنبيه',     color: '#38bdf8', bg: 'rgba(56,189,248,0.14)',  icon: '🔔', description: 'WhatsApp / Telegram / e-mail dispatch' },
  delay:     { label: 'Delay',      labelAr: 'تأجيل',     color: '#94a3b8', bg: 'rgba(148,163,184,0.14)', icon: '⏱', description: 'Wait before the next step' },
  webhook:   { label: 'Webhook',    labelAr: 'خط ربط',    color: '#fb7185', bg: 'rgba(251,113,133,0.14)', icon: '🌐', description: 'Call an external HTTP endpoint' },
  database:  { label: 'DB / Sheet', labelAr: 'قاعدة بيانات', color: '#2dd4bf', bg: 'rgba(45,212,191,0.14)', icon: '🗄', description: 'Read/write Supabase or Google Sheets' },
};

/* ── Utilities ──────────────────────────────────────────────────────── */

export function slugifyId(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'workflow'
  );
}

let idCounter = 0;
export function freshNodeId(prefix = 'n'): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36).slice(-4)}${idCounter}`;
}

/** Layered auto-layout: BFS depth → columns, sibling order → rows. */
export function autoLayout(graph: Pick<WorkflowGraph, 'nodes' | 'edges'>): WorkflowNode[] {
  const nodes = graph.nodes;
  const edges = graph.edges;
  const inDeg = new Map<string, number>();
  nodes.forEach((n) => inDeg.set(n.id, 0));
  edges.forEach((e) => inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1));

  let layer = nodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const depth = new Map<string, number>();
  layer.forEach((id) => depth.set(id, 0));
  const byLayer = new Map<number, string[]>([ [0, [...layer]] ]);
  let guard = 0;

  while (layer.length && guard < 200) {
    guard += 1;
    const next: string[] = [];
    for (const id of layer) {
      for (const e of edges.filter((ed) => ed.from === id)) {
        const d = (depth.get(id) ?? 0) + 1;
        if (!depth.has(e.to) || d > (depth.get(e.to) ?? 0)) {
          depth.set(e.to, d);
          const arr = byLayer.get(d) ?? [];
          if (!arr.includes(e.to)) arr.push(e.to);
          byLayer.set(d, arr);
          if (!next.includes(e.to)) next.push(e.to);
        }
      }
    }
    layer = next;
  }

  // Any nodes missed by BFS (cycles / orphans) land in a tail layer.
  const placed = new Set(Array.from(depth.keys()));
  let tailCol = Math.max(0, ...Array.from(byLayer.keys())) + 1;
  nodes.forEach((n) => {
    if (!placed.has(n.id)) {
      const arr = byLayer.get(tailCol) ?? [];
      arr.push(n.id);
      byLayer.set(tailCol, arr);
    }
  });
  if (byLayer.has(tailCol) && !placed.size) tailCol = 0;

  const COL_W = 270;
  const ROW_H = 130;
  return nodes.map((n) => {
    let col = depth.get(n.id);
    if (col == null) {
      // find which tail column contains it
      for (const [c, arr] of byLayer) if (arr.includes(n.id)) col = c;
    }
    const colIdx = col ?? 0;
    const siblings = byLayer.get(colIdx) ?? [n.id];
    const rowIdx = siblings.indexOf(n.id);
    const rows = siblings.length;
    const canvasMid = 340; // rough vertical center of the canvas
    return {
      ...n,
      x: 40 + colIdx * COL_W,
      y: Math.max(20, canvasMid - ((rows - 1) * ROW_H) / 2 + rowIdx * ROW_H),
    };
  });
}

/* ── n8n import ─────────────────────────────────────────────────────── */

/** n8n connections: { [sourceNode]: { [outputKey]: [ [ { node: target } ] ] } } */
type N8nConnections = Record<string, Record<string, Array<Array<{ node: string }>>>>;

interface N8nWorkflow {
  name?: string;
  nodes?: Array<{
    id?: string;
    name: string;
    type?: string;
    position?: [number, number];
    parameters?: Record<string, unknown>;
  }>;
  connections?: N8nConnections;
}

function n8nTypeToNodeType(n8nType: string, nodeName: string): WorkflowNodeType {
  const t = (n8nType || '').toLowerCase();
  const n = nodeName.toLowerCase();
  if (t.includes('cron') || t.includes('scheduletrigger') || t.includes('interval')) return 'trigger';
  if (t.includes('webhook')) return 'webhook';
  if (t.includes('if') || t.includes('switch') || t.includes('filter')) return 'condition';
  if (t.includes('wait') || t.includes('delay')) return 'delay';
  if (t.includes('openai') || t.includes('gemini') || t.includes('llm') || t.includes('agent') || n.includes('gpt')) return 'agent';
  if (t.includes('telegram') || t.includes('whatsapp') || t.includes('gmail') || t.includes('email') || t.includes('send')) return 'notify';
  if (t.includes('supabase') || t.includes('postgres') || t.includes('googleSheets') || t.includes('firestore')) return 'database';
  return 'action';
}

export function importN8n(raw: string, fallbackName = 'Imported n8n Workflow'): WorkflowGraph | { error: string } {
  let parsed: N8nWorkflow;
  try {
    parsed = JSON.parse(raw) as N8nWorkflow;
  } catch {
    return { error: 'Invalid JSON — could not parse the n8n export.' };
  }
  if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    return { error: 'No nodes found — expected an n8n workflow export with a "nodes" array.' };
  }

  const nodes: WorkflowNode[] = parsed.nodes.map((n, i) => ({
    id: n.id || freshNodeId('n8n'),
    type: n8nTypeToNodeType(n.type || '', n.name),
    label: n.name,
    x: 40 + ((n.position?.[0] ?? i * 260) / 2.2),
    y: 40 + ((n.position?.[1] ?? i * 120) / 1.6),
  }));

  const edges: WorkflowEdge[] = [];
  const byName = new Map(parsed.nodes.map((n) => [n.name, n.id || n.name]));
  for (const [srcName, outputs] of Object.entries(parsed.connections ?? {})) {
    const from = byName.get(srcName);
    if (!from) continue;
    for (const outputList of Object.values(outputs)) {
      const first = (outputList as Array<Array<{ node: string }>>)?.[0];
      for (const conn of first ?? []) {
        const to = byName.get(conn.node);
        if (to && from !== to) {
          edges.push({ id: freshNodeId('e'), from, to });
        }
      }
    }
  }

  return {
    id: slugifyId(parsed.name || fallbackName),
    name: parsed.name || fallbackName,
    status: 'active',
    nodes,
    edges,
    config: { importedFrom: 'n8n' },
  };
}

/* ── Node.js script generator ───────────────────────────────────────── */

function jsString(value: unknown): string {
  return JSON.stringify(String(value ?? ''));
}

/**
 * Generate a runnable standalone Node.js workflow script in the exact style
 * of workflows/01..05/*: env-var config, an async step per node, a runner
 * that walks the graph in dependency order, and per-step status logging.
 */
export function generateNodeScript(graph: WorkflowGraph): string {
  const ordered = autoLayout(graph);
  const steps = ordered.map((n, i) => {
    const meta = NODE_TYPE_META[n.type];
    const params = n.params ?? {};
    switch (n.type) {
      case 'trigger':
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  ctx.log('trigger fired: ${n.label.replace(/'/g, "\\'")}');
  // Schedules belong in cron / GitHub Actions — see workflows/README.md
}`;
      case 'agent':
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  const prompt = ${jsString(params.prompt ?? `Process: ${n.label}`)};
  ctx.log('agent prompt:', prompt);
  // TODO: call @sierra-estates/ai-orchestrator with this prompt and store the result.
  ctx.memory['${n.id}'] = { prompt, at: new Date().toISOString() };
}`;
      case 'condition':
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  const expression = ${jsString(params.when ?? 'true')};
  const passed = Boolean(expression);
  ctx.log('condition ${n.label.replace(/'/g, "\\'")}:', passed ? 'PASS' : 'FAIL');
  if (!passed) ctx.skipBranch('${n.id}');
}`;
      case 'notify':
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  const channel = ${jsString(params.channel ?? 'whatsapp')};
  const message = ${jsString(params.message ?? n.label)};
  ctx.log(\`notify[\${channel}]:\`, message);
  // TODO: dispatch via the WhatsApp gateway (12:00–20:00 Cairo window) or Telegram bot.
}`;
      case 'delay':
        return `async function step${i}(ctx) {
  const minutes = Number(${jsString(params.minutes ?? 5)});
  ctx.log(\`sleeping \${minutes}m (anti-spam pacing)\`);
  await new Promise((r) => setTimeout(r, Math.min(minutes, 15) * 60_000));
}`;
      case 'webhook':
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  const url = process.env.WORKFLOW_WEBHOOK_URL || ${jsString(params.url ?? 'https://example.com/hook')};
  ctx.log('calling webhook', url);
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ctx.memory) });
  ctx.memory['${n.id}'] = { status: res.status };
}`;
      case 'database':
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  const table = ${jsString(params.table ?? 'listings')};
  ctx.log('db write →', table);
  // TODO: persist through @sierra-estates/db record helpers (never raw SQL from here).
  ctx.memory['${n.id}'] = { table, rows: Object.keys(ctx.memory).length };
}`;
      default:
        return `async function step${i}(ctx) {
  // ${meta.label}: ${n.label}
  ctx.log('action: ${n.label.replace(/'/g, "\\'")}');
  // TODO: implement the action body.
}`;
    }
  });

  const stepIds = ordered.map((n) => n.id);
  const edgesLiteral = JSON.stringify(graph.edges.map((e) => ({ from: e.from, to: e.to })), null, 2);

  return `#!/usr/bin/env node
/**
 * ${graph.name} — generated by Sierra Admin · Workflow Studio
 * Graph: ${graph.nodes.length} nodes / ${graph.edges.length} edges · status: ${graph.status}
 *
 * Style follows workflows/01-05 (Node ≥18, no build step). Wire the TODOs to
 * the shared packages and schedule the trigger via cron or GitHub Actions.
 */
'use strict';

const GRAPH_EDGES = ${edgesLiteral};
const NODE_ORDER = ${JSON.stringify(stepIds)};

const ctx = {
  memory: {},
  skipped: new Set(),
  log: (...args) => console.log(\`[\${new Date().toISOString()}]\`, ...args),
  skipBranch: (id) => ctx.skipped.add(id),
};

${steps.map((s, i) => `/* ${ordered[i].label} */\n${s}`).join('\n\n')}

const STEPS = [${steps.map((_, i) => `step${i}`).join(', ')}];

async function main() {
  ctx.log('▶ ${graph.name.replace(/'/g, "\\'")} — starting');
  for (let i = 0; i < STEPS.length; i++) {
    if (ctx.skipped.has(NODE_ORDER[i])) {
      ctx.log('↷ skipping step', NODE_ORDER[i]);
      continue;
    }
    try {
      await STEPS[i](ctx);
    } catch (err) {
      ctx.log('✗ step failed:', NODE_ORDER[i], err instanceof Error ? err.message : err);
      process.exitCode = 1;
      break;
    }
  }
  ctx.log('■ done — memory keys:', Object.keys(ctx.memory).join(', ') || '(none)');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
`;
}

/* ── Seed graphs for the built-in workflows ─────────────────────────── */

export function seedGraphFor(name: string): WorkflowGraph {
  const id = slugifyId(name);
  const mk = (
    type: WorkflowNodeType,
    label: string,
    x: number,
    y: number,
    params?: WorkflowNode['params']
  ): WorkflowNode => ({ id: freshNodeId('s'), type, label, x, y, params });

  const e = (from: WorkflowNode, to: WorkflowNode, label?: string): WorkflowEdge => ({
    id: freshNodeId('e'),
    from: from.id,
    to: to.id,
    label,
  });

  if (name.includes('WhatsApp Scraper')) {
    const a = mk('trigger', 'Every 30 minutes', 40, 120);
    const b = mk('action', 'Scan broker groups', 310, 120, { groups: 'New Cairo ×4' });
    const c = mk('agent', 'Parse Arabic listings', 580, 40, { prompt: 'Extract type, area, price, compound' });
    const d = mk('condition', 'Valid & new?', 580, 220, { when: 'dedupeHash not seen' });
    const f = mk('database', 'Write raw_messages', 850, 120, { table: 'broker_listings' });
    const g = mk('notify', 'Telegram: review queue', 1120, 120, { channel: 'telegram' });
    return { id, name, status: 'active', nodes: [a, b, c, d, f, g], edges: [e(a, b), e(b, c), e(b, d), e(c, f), e(d, f), e(f, g)] };
  }

  if (name.includes('AVM') || name.includes('Price')) {
    const a = mk('trigger', 'Hourly', 40, 160);
    const b = mk('database', 'Fetch active listings', 310, 160, { table: 'listings' });
    const c = mk('agent', 'AVM scoring pass', 580, 160, { prompt: 'Score fair value vs market comps' });
    const d = mk('condition', 'Underpriced > 12%?', 850, 160, { when: 'avmDelta < -0.12' });
    const g = mk('notify', 'Arbitrage alert', 1120, 60, { channel: 'whatsapp' });
    const f = mk('database', 'Update valuation_status', 1120, 260, { table: 'listings' });
    return { id, name, status: 'active', nodes: [a, b, c, d, g, f], edges: [e(a, b), e(b, c), e(c, d), e(d, g), e(d, f)] };
  }

  if (name.includes('Contract') || name.includes('Stage-9')) {
    const a = mk('trigger', 'Deal marked Won', 40, 160);
    const b = mk('agent', 'Draft contract terms', 310, 160, { prompt: 'Generate reservation contract' });
    const c = mk('action', 'Commission split calc', 580, 160);
    const d = mk('webhook', 'E-sign provider', 850, 160, { url: 'https://api.esign.example/draft' });
    const g = mk('notify', 'WhatsApp: sign link', 1120, 160, { channel: 'whatsapp' });
    return { id, name, status: 'active', nodes: [a, b, c, d, g], edges: [e(a, b), e(b, c), e(c, d), e(d, g)] };
  }

  if (name.includes('Email')) {
    const a = mk('trigger', 'Daily 08:00 Cairo', 40, 120);
    const b = mk('database', 'Read email_campaigns', 310, 120, { table: 'communications' });
    const c = mk('condition', 'Segment ready?', 580, 120, { when: 'recipients > 0' });
    const d = mk('action', 'Send via SendGrid', 850, 40, { template: 'welcome|property_alert' });
    const f = mk('delay', 'Rate-limit pause', 850, 220, { minutes: 5 });
    return { id, name, status: 'paused', nodes: [a, b, c, d, f], edges: [e(a, b), e(b, c), e(c, d), e(d, f)] };
  }

  if (name.includes('Telegram')) {
    const a = mk('trigger', 'Event: hot lead', 40, 120);
    const b = mk('action', 'Render alert card', 310, 120);
    const c = mk('webhook', '@sierra_estates_bot', 580, 120, { url: 'https://api.telegram.org/bot/sendMessage' });
    return { id, name, status: 'active', nodes: [a, b, c], edges: [e(a, b), e(b, c)] };
  }

  // Generic lead-ingestion starter (also the Blank template).
  const a = mk('trigger', 'New lead captured', 40, 140);
  const b = mk('agent', 'Enrich & score (Leila)', 310, 60, { prompt: 'Score lead 0–100 with intent extraction' });
  const c = mk('condition', 'Score ≥ 70?', 310, 240, { when: 'score >= 70' });
  const d = mk('notify', 'WhatsApp within 5 min', 580, 240, { channel: 'whatsapp' });
  const f = mk('database', 'Upsert into leads', 580, 60, { table: 'leads' });
  return { id, name, status: 'active', nodes: [a, b, c, d, f], edges: [e(a, b), e(a, c), e(b, f), e(c, d)] };
}
