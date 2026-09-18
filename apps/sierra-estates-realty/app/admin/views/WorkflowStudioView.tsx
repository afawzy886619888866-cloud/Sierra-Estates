'use client';

/**
 * Workflow Studio — the interactive workflow designer for Sierra's
 * automation fleet.
 *
 * • Draw workflows on a drag-and-drop canvas (SVG bezier edges, node
 *   palette, layered auto-layout).
 * • Edit the workflow definition as a script — JSON two-way sync with the
 *   canvas, plus a generated runnable Node.js export in the
 *   workflows/01-05 style.
 * • Import the team's existing n8n template exports directly.
 * • Save to PATCH /api/admin/workflows/[id] (nodes/edges/config columns)
 *   and trigger runs via POST — with a graceful local mode when the live
 *   DB is unreachable.
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Workflow as WorkflowIcon,
  Play,
  Save,
  Download,
  Copy,
  Check,
  Trash2,
  Wand2,
  Upload,
  ChevronDown,
  Terminal,
  CircleDot,
  X,
} from 'lucide-react';
import {
  NODE_TYPE_META,
  autoLayout,
  freshNodeId,
  generateNodeScript,
  importN8n,
  seedGraphFor,
  slugifyId,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowNodeType,
} from './workflow-script';
import { WORKFLOWS_DATA } from './data-constants';

const NODE_W = 208;
const NODE_H = 64;

interface StudioLogLine {
  ts: string;
  kind: 'info' | 'ok' | 'warn' | 'err';
  text: string;
}

export default function WorkflowStudioView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [graph, setGraph] = useState<WorkflowGraph>(() => seedGraphFor(WORKFLOWS_DATA[0].name));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'inspect' | 'json' | 'script'>('inspect');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [logs, setLogs] = useState<StudioLogLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const t = useMemo(
    () => ({
      title: isAr ? 'استوديو سير العمل' : 'Workflow Studio',
      subtitle: isAr
        ? 'ارسم الأتمتة تفاعلياً وحرّر النص البرمجي من نفس المكان'
        : 'Draw automations interactively and edit the workflow script from the same place',
      save: isAr ? 'حفظ' : 'Save',
      run: isAr ? 'تشغيل' : 'Run',
      autoLayout: isAr ? 'ترتيب تلقائي' : 'Auto Layout',
      blank: isAr ? 'ورقة فارغة' : 'Blank canvas',
      importN8n: isAr ? 'استيراد n8n' : 'Import n8n',
      palette: isAr ? 'الكتل' : 'Node Palette',
      canvas: isAr ? 'اللوحة' : 'Canvas',
      inspect: isAr ? 'الفحص' : 'Inspect',
      script: isAr ? 'السكربت' : 'Script',
      nodeJson: 'JSON',
      label: isAr ? 'التسمية' : 'Label',
      type: isAr ? 'النوع' : 'Type',
      params: isAr ? 'المعاملات' : 'Params',
      addParam: isAr ? '+ معامل' : '+ param',
      deleteNode: isAr ? 'حذف الكتلة' : 'Delete node',
      edgeSelected: isAr ? 'وصلة محددة' : 'Edge selected',
      deleteEdge: isAr ? 'حذف الوصلة' : 'Delete edge',
      connecting: isAr ? 'اختر الكتلة الهدف…' : 'Click the target node to connect… (Esc to cancel)',
      pull: isAr ? 'اجلب من اللوحة' : 'Pull from canvas',
      apply: isAr ? 'طبّق على اللوحة' : 'Apply to canvas',
      download: isAr ? 'تنزيل .js' : 'Download .js',
      copy: isAr ? 'نسخ' : 'Copy',
      console: isAr ? 'السجل' : 'Run Console',
      nodes: isAr ? 'كتل' : 'nodes',
      edges: isAr ? 'وصلات' : 'edges',
      savedLive: isAr ? 'تم الحفظ في قاعدة البيانات' : 'Saved to live database',
      savedLocal: isAr ? 'قاعدة البيانات غير متاحة — حرّر وصدّر محلياً' : 'Live DB unreachable — edits kept locally, export to persist',
      runStarted: isAr ? 'بدأ التشغيل' : 'Run started',
      runDone: isAr ? 'انتهى التشغيل' : 'Run finished',
      cleared: isAr ? 'تم مسح اللوحة' : 'Canvas cleared',
      importTitle: isAr ? 'استيراد سير عمل n8n' : 'Import an n8n workflow export',
      importHint: 'الصق ملف JSON من workflows/n8n-templates أو infra/n8n-workflows',
      importBtn: isAr ? 'استيراد' : 'Import',
      imported: isAr ? 'تم الاستيراد' : 'Workflow imported',
      noSelection: isAr ? 'اختر كتلة لتحريرها' : 'Select a node to edit its properties',
      status: isAr ? 'الحالة' : 'Status',
    }),
    [isAr]
  );

  const pushLog = useCallback((kind: StudioLogLine['kind'], text: string) => {
    setLogs((prev) => [
      ...prev.slice(-120),
      { ts: new Date().toLocaleTimeString('en-EG', { hour12: false }), kind, text },
    ]);
  }, []);

  const flashNotice = useCallback((text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3200);
  }, []);

  /* ── Graph mutations ── */

  const addNode = useCallback(
    (type: WorkflowNodeType) => {
      const meta = NODE_TYPE_META[type];
      const id = freshNodeId();
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = Math.max(20, (rect ? 160 : 160) + Math.random() * 80);
      const y = Math.max(20, 120 + Math.random() * 160);
      setGraph((g) => ({
        ...g,
        nodes: [...g.nodes, { id, type, label: `${meta.label} ${g.nodes.length + 1}`, x, y, params: {} }],
      }));
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
    },
    []
  );

  const updateNode = useCallback((id: string, patch: Partial<WorkflowNode>) => {
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    setSelectedNodeId(null);
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
    setSelectedEdgeId(null);
  }, []);

  const completeConnection = useCallback(
    (targetId: string) => {
      if (!connectFrom || connectFrom === targetId) {
        setConnectFrom(null);
        return;
      }
      setGraph((g) => {
        const exists = g.edges.some((e) => e.from === connectFrom && e.to === targetId);
        if (exists) return g;
        return { ...g, edges: [...g.edges, { id: freshNodeId('e'), from: connectFrom, to: targetId }] };
      });
      setConnectFrom(null);
    },
    [connectFrom]
  );

  const applyAutoLayout = useCallback(() => {
    setGraph((g) => ({ ...g, nodes: autoLayout(g) }));
    pushLog('info', 'auto-layout applied');
  }, [pushLog]);

  /* ── Drag handling (pointer capture) ── */

  const onNodePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, node: WorkflowNode) => {
      if ((e.target as HTMLElement).closest('button')) return; // ports/controls
      e.preventDefault();
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { id: node.id, offX: e.clientX - node.x, offY: e.clientY - node.y };
    },
    []
  );

  const onNodePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const x = Math.max(0, e.clientX - drag.offX);
    const y = Math.max(0, e.clientY - drag.offY);
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === drag.id ? { ...n, x, y } : n)) }));
  }, []);

  const onNodePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  /* ── Keyboard: Delete removes selection, Escape cancels connect ── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectFrom(null);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEdgeId) deleteEdge(selectedEdgeId);
        else if (selectedNodeId) deleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, selectedEdgeId, deleteEdge, deleteNode]);

  /* ── JSON draft sync ── */

  const pullJson = useCallback(() => {
    setJsonDraft(JSON.stringify({ name: graph.name, status: graph.status, nodes: graph.nodes, edges: graph.edges }, null, 2));
    setJsonError(null);
  }, [graph]);

  useEffect(() => {
    pullJson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes.length, graph.edges.length, graph.name]);

  const applyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonDraft) as Partial<WorkflowGraph>;
      if (!Array.isArray(parsed.nodes)) throw new Error('`nodes` must be an array');
      if (!Array.isArray(parsed.edges)) throw new Error('`edges` must be an array');
      // Capture the narrowed arrays: TS does not keep the isArray narrowing of
      // `parsed.nodes` / `parsed.edges` alive inside the setGraph callback below.
      const parsedNodes = parsed.nodes;
      const parsedEdges = parsed.edges;
      const nodeIds = new Set(parsedNodes.map((n) => n.id));
      const edges = parsedEdges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
      setGraph((g) => ({
        ...g,
        name: parsed.name || g.name,
        status: parsed.status || g.status,
        nodes: parsedNodes.map((n) => ({
          id: n.id || freshNodeId(),
          type: (n.type && n.type in NODE_TYPE_META ? n.type : 'action') as WorkflowNodeType,
          label: n.label || 'Untitled',
          x: Number(n.x) || 40,
          y: Number(n.y) || 40,
          params: n.params ?? {},
        })),
        edges: edges.map((e) => ({ id: e.id || freshNodeId('e'), from: e.from, to: e.to, label: e.label })),
      }));
      setJsonError(null);
      pushLog('ok', 'JSON applied to canvas');
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, [jsonDraft, pushLog]);

  /* ── Generated script ── */

  const generatedScript = useMemo(() => generateNodeScript(graph), [graph]);

  const downloadScript = useCallback(() => {
    const blob = new Blob([generatedScript], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slugifyId(graph.name)}.js`;
    a.click();
    pushLog('ok', `downloaded ${slugifyId(graph.name)}.js`);
  }, [generatedScript, graph.name, pushLog]);

  const copyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, [generatedScript]);

  /* ── Save / Run ── */

  const saveWorkflow = useCallback(async () => {
    setSaving(true);
    pushLog('info', `saving "${graph.name}" (${graph.nodes.length} ${t.nodes}, ${graph.edges.length} ${t.edges})…`);
    try {
      const res = await fetch(`/api/admin/workflows/${encodeURIComponent(graph.id || slugifyId(graph.name))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: graph.name,
          status: graph.status,
          nodes: graph.nodes,
          edges: graph.edges,
          config: { ...(graph.config ?? {}), studio: { version: 1, savedAt: new Date().toISOString() } },
        }),
      });
      if (res.ok) {
        pushLog('ok', 'saved to live database');
        flashNotice(t.savedLive);
      } else {
        pushLog('warn', `live save failed (HTTP ${res.status}) — keeping edits locally`);
        flashNotice(t.savedLocal);
      }
    } catch {
      pushLog('warn', 'live save failed (network) — keeping edits locally');
      flashNotice(t.savedLocal);
    } finally {
      setSaving(false);
    }
  }, [graph, pushLog, flashNotice, t]);

  const runWorkflow = useCallback(async () => {
    setRunning(true);
    pushLog('info', `▶ run "${graph.name}" triggered`);
    let liveOk = false;
    try {
      const res = await fetch(`/api/admin/workflows/${encodeURIComponent(graph.id || slugifyId(graph.name))}`, { method: 'POST' });
      liveOk = res.ok;
      if (res.ok) pushLog('ok', 'execution recorded on the live workflow');
    } catch {
      /* fall through to simulation */
    }
    if (!liveOk) pushLog('warn', 'live trigger unavailable — running local dry simulation');
    // Dry simulation: walk nodes in layout order with pacing.
    const ordered = autoLayout(graph);
    for (const n of ordered) {
      const meta = NODE_TYPE_META[n.type];
      await new Promise((r) => setTimeout(r, 240));
      pushLog('info', `  ${meta.icon} ${n.label} → ok`);
    }
    pushLog('ok', `■ ${graph.name} finished (${ordered.length} steps)`);
    setRunning(false);
  }, [graph, pushLog]);

  /* ── Derived ── */

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = graph.edges.find((e) => e.id === selectedEdgeId) ?? null;

  const canvasSize = useMemo(() => {
    const maxX = graph.nodes.reduce((m, n) => Math.max(m, n.x + NODE_W + 120), 900);
    const maxY = graph.nodes.reduce((m, n) => Math.max(m, n.y + NODE_H + 120), 520);
    return { w: maxX, h: maxY };
  }, [graph.nodes]);

  const nodePos = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  const workflowOptions = useMemo(
    () => [...WORKFLOWS_DATA.map((w) => w.name), t.blank],
    [t.blank]
  );

  const loadWorkflowByName = useCallback(
    (name: string) => {
      const next = name === t.blank
        ? { id: 'blank', name: 'Untitled Workflow', status: 'active' as const, nodes: [], edges: [] }
        : seedGraphFor(name);
      setGraph(next);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      pushLog('info', `loaded "${next.name}"`);
    },
    [pushLog, t.blank]
  );

  const doImport = useCallback(() => {
    const result = importN8n(importText);
    if ('error' in result) {
      setJsonError(result.error);
      return;
    }
    setGraph(result);
    setImportOpen(false);
    setImportText('');
    pushLog('ok', `imported n8n workflow "${result.name}" (${result.nodes.length} nodes)`);
    flashNotice(t.imported);
  }, [importText, pushLog, flashNotice, t.imported]);

  /* ── Render ── */

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-[#0d1a2c]/70 p-4 rounded-2xl border border-[#C8961A]/25">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176]">
            <WorkflowIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">{t.title}</h1>
            <p className="text-slate-400 text-xs">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={graph.name === 'Untitled Workflow' ? t.blank : workflowOptions.includes(graph.name) ? graph.name : workflowOptions[0]}
            onChange={(e) => loadWorkflowByName(e.target.value)}
            className="bg-[#0a1424] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#E9C176]/60 cursor-pointer max-w-56"
            aria-label="Workflow"
          >
            {workflowOptions.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="px-3 py-2 text-[11px] font-bold rounded-xl bg-[#0a1424] border border-white/10 text-slate-300 hover:text-white hover:border-[#E9C176]/50 cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> {t.importN8n}
          </button>
          <button
            type="button"
            onClick={applyAutoLayout}
            className="px-3 py-2 text-[11px] font-bold rounded-xl bg-[#0a1424] border border-white/10 text-slate-300 hover:text-white hover:border-[#E9C176]/50 cursor-pointer flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" /> {t.autoLayout}
          </button>
          <button
            type="button"
            onClick={saveWorkflow}
            disabled={saving}
            className="px-4 py-2 text-[11px] font-extrabold rounded-xl bg-gradient-to-r from-[#E9C176] to-[#C8961A] text-[#0d0d0f] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> {t.save}
          </button>
          <button
            type="button"
            onClick={runWorkflow}
            disabled={running}
            className="px-4 py-2 text-[11px] font-extrabold rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Play className={`w-3.5 h-3.5 ${running ? 'animate-pulse' : ''}`} /> {t.run}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[172px_1fr_340px] gap-4">
        {/* ── Palette ── */}
        <div className="bg-[#0d1a2c]/70 rounded-2xl border border-white/10 p-3 space-y-1.5 self-start">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[#E9C176] px-1 pb-1">{t.palette}</div>
          {(Object.keys(NODE_TYPE_META) as WorkflowNodeType[]).map((type) => {
            const meta = NODE_TYPE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                title={meta.description}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border border-white/10 bg-[#0a1424] hover:border-[#E9C176]/60 text-left cursor-pointer transition-colors"
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}
                >
                  {meta.icon}
                </span>
                <span className="text-[11px] font-bold text-slate-200 truncate">{isAr ? meta.labelAr : meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Canvas ── */}
        <div className="relative bg-[#0d1a2c]/70 rounded-2xl border border-white/10 overflow-hidden" style={{ height: 'calc(100vh - 420px)', minHeight: 420 }}>
          {connectFrom && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#C8961A] text-[#0d0d0f] text-[11px] font-extrabold shadow-lg">
              ⇢ {t.connecting}
            </div>
          )}
          <div
            ref={canvasRef}
            className="absolute inset-0 overflow-auto"
            style={{
              backgroundImage:
                'radial-gradient(rgba(233,193,118,0.10) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            <div className="relative" style={{ width: canvasSize.w, height: canvasSize.h }}>
              {/* Edges */}
              <svg className="absolute inset-0 pointer-events-none" width={canvasSize.w} height={canvasSize.h}>
                <defs>
                  <marker id="wf-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L8,4.5 L0,9 Z" fill="#E9C176" />
                  </marker>
                </defs>
                {graph.edges.map((edge) => {
                  const from = nodePos.get(edge.from);
                  const to = nodePos.get(edge.to);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_W;
                  const y1 = from.y + NODE_H / 2;
                  const x2 = to.x;
                  const y2 = to.y + NODE_H / 2;
                  const dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  const isActive = edge.id === selectedEdgeId;
                  return (
                    <g key={edge.id} className="pointer-events-auto">
                      <path
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={16}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedEdgeId(edge.id);
                          setSelectedNodeId(null);
                        }}
                      />
                      <path
                        d={d}
                        fill="none"
                        stroke={isActive ? '#F5D78E' : 'rgba(233,193,118,0.45)'}
                        strokeWidth={isActive ? 2.5 : 1.6}
                        markerEnd="url(#wf-arrow)"
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const meta = NODE_TYPE_META[node.type];
                const isSelected = node.id === selectedNodeId;
                const isConnectSource = node.id === connectFrom;
                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => onNodePointerDown(e, node)}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                    onPointerCancel={onNodePointerUp}
                    onClick={() => connectFrom && completeConnection(node.id)}
                    className="absolute select-none"
                    style={{
                      left: node.x,
                      top: node.y,
                      width: NODE_W,
                      height: NODE_H,
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                  >
                    <div
                      className="w-full h-full rounded-2xl border px-3 py-2.5 flex items-center gap-2.5 transition-shadow"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(145deg, #172c47, #0e1e32)'
                          : 'linear-gradient(145deg, #10203a, #0b1626)',
                        borderColor: isConnectSource ? '#F5D78E' : isSelected ? '#E9C176' : `${meta.color}55`,
                        boxShadow: isSelected ? '0 0 0 2px rgba(233,193,118,0.35), 0 12px 28px rgba(0,0,0,0.5)' : '0 6px 18px rgba(0,0,0,0.4)',
                      }}
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}55` }}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-white truncate leading-tight">{node.label}</div>
                        <div className="font-mono text-[8.5px] uppercase tracking-widest" style={{ color: meta.color }}>
                          {isAr ? meta.labelAr : meta.label}
                        </div>
                      </div>
                      {/* Connect port */}
                      <button
                        type="button"
                        title="Drag connection →"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectFrom(node.id);
                        }}
                        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 cursor-pointer"
                        style={{
                          background: '#0b1626',
                          borderColor: '#E9C176',
                          boxShadow: '0 0 0 3px rgba(233,193,118,0.15)',
                        }}
                      >
                        <CircleDot className="w-full h-full p-0.5 text-[#E9C176]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canvas stats */}
          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#0a1424]/90 border border-white/10 font-mono text-[10px] text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {graph.nodes.length} {t.nodes} · {graph.edges.length} {t.edges}
          </div>
        </div>

        {/* ── Right panel: Inspect / JSON / Script ── */}
        <div className="bg-[#0d1a2c]/70 rounded-2xl border border-white/10 overflow-hidden self-start" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className="flex border-b border-white/10">
            {([['inspect', t.inspect], ['json', t.nodeJson], ['script', t.script]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanelTab(key)}
                className={`flex-1 px-3 py-2.5 text-[11px] font-bold cursor-pointer transition-colors ${panelTab === key ? 'bg-[#211A0D] text-[#E9C176] border-b-2 border-[#C8961A]' : 'text-slate-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 480px)' }}>
            {panelTab === 'inspect' && (
              selectedEdge ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#E9C176]">⇢ {t.edgeSelected}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {nodePos.get(selectedEdge.from)?.label} → {nodePos.get(selectedEdge.to)?.label}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteEdge(selectedEdge.id)}
                    className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer hover:bg-red-500/20 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.deleteEdge}
                  </button>
                </div>
              ) : selectedNode ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">{t.label}</label>
                    <input
                      value={selectedNode.label}
                      onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                      className="w-full bg-[#0a1424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E9C176]/60"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">{t.type}</label>
                    <select
                      value={selectedNode.type}
                      onChange={(e) => updateNode(selectedNode.id, { type: e.target.value as WorkflowNodeType })}
                      className="w-full bg-[#0a1424] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer"
                    >
                      {(Object.keys(NODE_TYPE_META) as WorkflowNodeType[]).map((ty) => (
                        <option key={ty} value={ty}>{NODE_TYPE_META[ty].label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">{NODE_TYPE_META[selectedNode.type].description}</p>
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1.5">{t.params}</label>
                    <div className="space-y-1.5">
                      {Object.entries(selectedNode.params ?? {}).map(([k, v]) => (
                        <div key={k} className="flex gap-1.5">
                          <input
                            value={k}
                            onChange={(e) => {
                              const next = { ...(selectedNode.params ?? {}) };
                              delete next[k];
                              next[e.target.value] = v;
                              updateNode(selectedNode.id, { params: next });
                            }}
                            className="flex-1 bg-[#0a1424] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-[#E9C176] outline-none"
                          />
                          <input
                            value={String(v)}
                            onChange={(e) => updateNode(selectedNode.id, { params: { ...(selectedNode.params ?? {}), [k]: e.target.value } })}
                            className="flex-1 bg-[#0a1424] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...(selectedNode.params ?? {}) };
                              delete next[k];
                              updateNode(selectedNode.id, { params: next });
                            }}
                            className="px-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-red-300 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateNode(selectedNode.id, { params: { ...(selectedNode.params ?? {}), '': '' } })}
                        className="w-full py-1.5 rounded-lg bg-[#211A0D] border border-[#C8961A]/30 text-[#E9C176] text-[10.5px] font-bold cursor-pointer"
                      >
                        {t.addParam}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNode(selectedNode.id)}
                    className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer hover:bg-red-500/20 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.deleteNode}
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs space-y-2">
                  <WorkflowIcon className="w-8 h-8 mx-auto opacity-40" />
                  {t.noSelection}
                </div>
              )
            )}

            {panelTab === 'json' && (
              <div className="space-y-2">
                <textarea
                  value={jsonDraft}
                  onChange={(e) => setJsonDraft(e.target.value)}
                  spellCheck={false}
                  className="w-full h-72 bg-[#0a1424] border border-white/10 rounded-xl p-3 font-mono text-[10.5px] leading-relaxed text-emerald-200/90 outline-none focus:border-[#E9C176]/60 resize-none"
                />
                {jsonError && (
                  <div className="text-[10.5px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-mono">{jsonError}</div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={pullJson}
                    className="flex-1 py-2 rounded-xl bg-[#0a1424] border border-white/10 text-slate-300 text-[11px] font-bold cursor-pointer hover:border-[#E9C176]/50"
                  >
                    ↻ {t.pull}
                  </button>
                  <button
                    type="button"
                    onClick={applyJson}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#E9C176] to-[#C8961A] text-[#0d0d0f] text-[11px] font-extrabold cursor-pointer"
                  >
                    {t.apply}
                  </button>
                </div>
              </div>
            )}

            {panelTab === 'script' && (
              <div className="space-y-2">
                <pre className="w-full h-72 overflow-auto bg-[#050B14] border border-white/10 rounded-xl p-3 font-mono text-[9.5px] leading-relaxed text-[#E9C176] whitespace-pre">
                  {generatedScript}
                </pre>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={downloadScript}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#E9C176] to-[#C8961A] text-[#0d0d0f] text-[11px] font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> {t.download}
                  </button>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="px-3 py-2 rounded-xl bg-[#0a1424] border border-white/10 text-slate-300 text-[11px] font-bold cursor-pointer hover:border-[#E9C176]/50 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '✓' : t.copy}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Run console ── */}
      <div className="bg-[#050B14] rounded-2xl border border-[#C8961A]/25 overflow-hidden">
        <button
          type="button"
          onClick={() => setConsoleOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.02]"
        >
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#E9C176]">
            <Terminal className="w-3.5 h-3.5" /> {t.console}
            <span className="text-slate-600">({logs.length})</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${consoleOpen ? '' : '-rotate-90'}`} />
        </button>
        {consoleOpen && (
          <div className="px-4 pb-3 max-h-44 overflow-y-auto font-mono text-[10.5px] leading-relaxed" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {logs.length === 0 && <div className="text-slate-600 py-2">$ awaiting first run…</div>}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-slate-600 shrink-0">{l.ts}</span>
                <span
                  className={
                    l.kind === 'ok' ? 'text-emerald-400' : l.kind === 'warn' ? 'text-amber-400' : l.kind === 'err' ? 'text-red-400' : 'text-slate-300'
                  }
                >
                  {l.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── n8n import dialog ── */}
      {importOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0b1a2e] border border-[#C8961A]/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">{t.importTitle}</h3>
              <button type="button" onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">{t.importHint}</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              spellCheck={false}
              placeholder='{ "name": "My Workflow", "nodes": [ … ], "connections": { … } }'
              className="w-full h-52 bg-[#0a1424] border border-white/10 rounded-xl p-3 font-mono text-[10.5px] text-emerald-200/90 outline-none focus:border-[#E9C176]/60 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doImport}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E9C176] to-[#C8961A] text-[#0d0d0f] text-xs font-extrabold cursor-pointer"
              >
                {t.importBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-[1300] px-4 py-3 rounded-xl bg-[#211A0D] border border-[#C8961A]/50 text-[#E9C176] text-xs font-bold shadow-2xl">
          {notice}
        </div>
      )}
    </div>
  );
}
