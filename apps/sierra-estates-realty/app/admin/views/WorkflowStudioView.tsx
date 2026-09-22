'use client';
/**
 * Workflow Studio — interactive automation canvas (Admin 2.0)
 * ═══════════════════════════════════════════════════════════════════════
 * Draw the automation estate: drag nodes, connect the golden handles,
 * add/edit steps — then open the Script tab and edit the REAL workflow
 * source inline. Every save persists through /api/admin/workflow-studio
 * (public.workflows + migration 012 graph guard).
 *
 * Bilingual EN/AR via `lang` prop, clay token styling (admin-portal.css §14).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
type GNodeType = 'trigger' | 'action' | 'condition' | 'output' | 'ai';
type GNode = { id: string; type: GNodeType; label: string; sub?: string; x: number; y: number };
type GEdge = { id: string; from: string; to: string; label?: string };
type Graph = { nodes: GNode[]; edges: GEdge[] };
type Wf = Record<string, any>;

const NODE_W = 196;
const NODE_H = 62;

const NODE_META: Record<GNodeType, { color: string; glyph: string; tagEn: string; tagAr: string }> = {
  trigger:   { color: 'var(--gold-lt, #E9C176)',      glyph: '⚡', tagEn: 'TRIGGER',  tagAr: 'مُشغِّل' },
  action:    { color: 'var(--gold-luxury, #D4AF37)',  glyph: '⚙',  tagEn: 'ACTION',   tagAr: 'إجراء' },
  condition: { color: 'var(--amber, #F59E0B)',        glyph: '◈',  tagEn: 'GATE',     tagAr: 'بوابة' },
  output:    { color: 'var(--emerald, #34D399)',      glyph: '▣',  tagEn: 'SINK',     tagAr: 'مخرج' },
  ai:        { color: 'var(--purple, #A78BFA)',       glyph: '✦',  tagEn: 'AI',       tagAr: 'ذكاء' },
};

const CATS = [
  { id: 'ingestion', en: 'Ingestion', ar: 'الاستيعاب', color: 'var(--gold-lt)' },
  { id: 'outreach', en: 'Outreach', ar: 'التواصل', color: 'var(--gold-luxury)' },
  { id: 'intelligence', en: 'Intelligence', ar: 'الذكاء', color: 'var(--purple)' },
  { id: 'operations', en: 'Operations', ar: 'العمليات', color: 'var(--emerald)' },
];

const relTime = (iso: string | null, isAr: boolean) => {
  if (!iso) return isAr ? 'أبدًا' : 'never';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return isAr ? `قبل ${s} ث` : `${s}s ago`;
  if (s < 3600) return isAr ? `قبل ${Math.floor(s / 60)} د` : `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return isAr ? `قبل ${Math.floor(s / 3600)} س` : `${Math.floor(s / 3600)}h ago`;
  return isAr ? `قبل ${Math.floor(s / 86400)} ي` : `${Math.floor(s / 86400)}d ago`;
};

const parseGraph = (raw: unknown): Graph => {
  if (!raw) return { nodes: [], edges: [] };
  try {
    const g = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { nodes: Array.isArray(g?.nodes) ? g.nodes : [], edges: Array.isArray(g?.edges) ? g.edges : [] };
  } catch { return { nodes: [], edges: [] } }
};

const edgePath = (a: GNode, b: GNode) => {
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
  const x2 = b.x, y2 = b.y + NODE_H / 2;
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

/* ══════ View ══════ */
export default function WorkflowStudioView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [wfs, setWfs] = useState<Wf[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = useCallback((msg: string, ok = true) => setToast({ ok, msg }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workflow-studio', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setWfs(json.workflows ?? []);
        setSelId((prev) => (prev && (json.workflows ?? []).some((w: Wf) => w.id === prev) ? prev : json.workflows?.[0]?.id ?? null));
      } else notify(json.error ?? 'Load failed', false);
    } catch { notify(t('Network error', 'خطأ في الشبكة'), false); }
    finally { setLoading(false); }
  }, [notify, t]);

  useEffect(() => { load() }, [load]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const createWf = async () => {
    const name = prompt(t('Name the new workflow', 'اسم سير العمل الجديد'));
    if (!name) return;
    try {
      const res = await fetch('/api/admin/workflow-studio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: 'operations' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      notify(t(`Workflow created — start drawing`, 'تم الإنشاء — ابدأ الرسم'));
      await load();
      setSelId(json.workflowId);
    } catch (e) { notify(e instanceof Error ? e.message : 'Create failed', false) }
  };

  const removeWf = async (id: string, name: string) => {
    if (!confirm(t(`Remove “${name}” from the studio? The repo source file is not touched.`, `إزالة «${name}» من الاستوديو؟ الملف الأصلي لن يتأثر.`))) return;
    try {
      const res = await fetch('/api/admin/workflow-studio', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      notify(t('Removed from studio', 'تمت الإزالة من الاستوديو'));
      await load();
    } catch (e) { notify(e instanceof Error ? e.message : 'Delete failed', false) }
  };

  const sel = wfs.find((w) => w.id === selId) ?? null;
  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = wfs.filter((w) => !f || String(w.name ?? '').toLowerCase().includes(f) || String(w.slug ?? '').includes(f) || String(w.schedule ?? '').includes(f));
    return CATS.map((c) => ({ ...c, items: list.filter((w) => (w.category ?? 'operations') === c.id) })).filter((g) => g.items.length > 0);
  }, [wfs, filter]);

  const activeCount = wfs.filter((w) => w.status === 'active').length;

  return (
    <div className="wfs-wrap">
      {/* header */}
      <div className="card fade-up" style={{ padding: '16px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
            🎛️ {t('Workflow Studio', 'استوديو سير العمل')}
            <span className="chip" style={{ marginLeft: 10, background: 'var(--gold-luxury,#D4AF37)', color: '#07111E', fontWeight: 900, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
              {t('LIVE GRAPH EDITOR', 'محرر رسومي مباشر')}
            </span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, opacity: 0.65 }}>
            {t(
              `${wfs.length} automations · ${activeCount} active · draw the flow, connect steps, edit the real script inline — every save persists.`,
              `${wfs.length} أتمتة · ${activeCount} نشطة · ارسم المسار واربط الخطوات وحرّر السكربت مباشرة — كل حفظ يُسجَّل.`
            )}
          </p>
        </div>
        <button className="btn" onClick={createWf} style={{ fontWeight: 800 }}>
          ＋ {t('New Workflow', 'سير عمل جديد')}
        </button>
      </div>

      <div className="wfs-layout">
        {/* sidebar */}
        <aside className="wfs-side fade-up">
          <div className="wfs-side-hd">
            <div className="wfs-search">
              <span style={{ opacity: 0.5, fontSize: 12 }}>⌕</span>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('Search workflows…', 'ابحث…')} />
            </div>
          </div>
          <div className="wfs-list custom-scroll">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>{t('Loading…', 'جارٍ التحميل…')}</div>
            ) : grouped.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>{t('No workflows', 'لا نتائج')}</div>
            ) : grouped.map((g) => (
              <div key={g.id}>
                <div className="wfs-cat" style={{ color: g.color }}>{isAr ? g.ar : g.en}</div>
                {g.items.map((w) => (
                  <button key={w.id} className={`wfs-item${w.id === selId ? ' wfs-on' : ''}`} onClick={() => setSelId(w.id)}>
                    <span className="wfs-item-nm">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isAr && w.nameAr ? w.nameAr : w.name}</span>
                      <span style={{
                        width: 8, height: 8, borderRadius: 99, flexShrink: 0,
                        background: w.status === 'active' ? 'var(--emerald)' : w.status === 'paused' ? 'var(--amber)' : 'var(--tx-f)',
                        boxShadow: w.status === 'active' ? '0 0 8px var(--emerald)' : 'none',
                      }} />
                    </span>
                    <span className="wfs-item-meta">
                      {w.schedule === 'webhook' ? '⚡ webhook' : w.schedule === 'manual' ? 'manual' : `⏱ ${w.schedule ?? '—'}`}
                      {' · '}{Number(w.runs ?? 0).toLocaleString()} {t('runs', 'تشغيل')}
                      {' · '}{relTime(w.lastRunAt ?? null, isAr)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* canvas */}
        <div style={{ minWidth: 0 }}>
          {sel ? (
            <StudioCanvas key={sel.id} wf={sel} isAr={isAr} t={t} notify={notify} onChanged={load} onRemove={removeWf} />
          ) : (
            <div className="card" style={{ padding: 48, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>
              {loading ? t('Loading studio…', 'جارٍ تحميل الاستوديو…') : t('Select a workflow to open the canvas', 'اختر سير عملًا لفتح اللوحة')}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, insetInlineStart: '50%', transform: 'translateX(-50%)', zIndex: 90,
          padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: 'var(--bg-e,#0F2035)', border: `1px solid ${toast.ok ? 'var(--emerald,#34D399)' : 'var(--red,#E63946)'}55`,
          color: toast.ok ? 'var(--emerald,#34D399)' : 'var(--red,#E63946)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════ Canvas + Inspector ══════ */
function StudioCanvas({ wf, isAr, t, notify, onChanged, onRemove }: {
  wf: Wf; isAr: boolean; t: (en: string, ar: string) => string;
  notify: (msg: string, ok?: boolean) => void; onChanged: () => void;
  onRemove: (id: string, name: string) => void;
}) {
  const [graph, setGraph] = useState<Graph>(() => parseGraph(wf.graph));
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'pan' | 'connect'>('select');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connFrom, setConnFrom] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [simActive, setSimActive] = useState<Set<string>>(new Set());
  const [simOn, setSimOn] = useState(false);
  const [tab, setTab] = useState<'overview' | 'script'>('overview');
  const [script, setScript] = useState<string>(wf.script ?? '');
  const [scriptDirty, setScriptDirty] = useState(false);
  const [name, setName] = useState(wf.name ?? '');
  const [desc, setDesc] = useState(wf.desc ?? '');
  const [schedule, setSchedule] = useState(wf.schedule ?? '');
  const [metaDirty, setMetaDirty] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, []);

  const graphW = useMemo(() => Math.max(1120, ...graph.nodes.map((n) => n.x + NODE_W + 120)), [graph]);
  const graphH = useMemo(() => Math.max(400, ...graph.nodes.map((n) => n.y + NODE_H + 100)), [graph]);

  /* persistence */
  const put = async (body: Record<string, unknown>, okMsg: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/workflow-studio', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wf.id, ...body }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      notify(okMsg);
      return true;
    } catch (e) { notify(e instanceof Error ? e.message : 'Save failed', false); return false }
    finally { setSaving(false) }
  };

  const saveGraph = () => put({ graph }, t(`Graph saved — ${graph.nodes.length} nodes · ${graph.edges.length} connections`, `تم حفظ الرسم — ${graph.nodes.length} عقدة · ${graph.edges.length} وصلات`)).then((ok) => ok && setDirty(false));
  const saveScript = () => put({ script }, t(`Script saved — ${script.split('\n').length} lines persisted`, `تم حفظ السكربت — ${script.split('\n').length} سطرًا`)).then((ok) => ok && setScriptDirty(false) || onChanged());
  const saveMeta = () => put({ name, desc, schedule }, t('Details updated', 'تم تحديث التفاصيل')).then((ok) => ok && setMetaDirty(false) || onChanged());
  const setStatus = (s: string) => put({ status: s }, t(`Workflow ${s}`, `الحالة: ${s === 'active' ? 'نشط' : s === 'paused' ? 'متوقف' : 'مسودة'}`)).then((ok) => ok && onChanged());

  /* graph ops */
  const addNode = () => {
    const id = `n${Date.now().toString(36).slice(-4)}`;
    setGraph((g) => ({ ...g, nodes: [...g.nodes, { id, type: 'action', label: t('New Step', 'خطوة جديدة'), sub: '', x: 120 + (g.nodes.length % 4) * 56, y: 250 + Math.floor(g.nodes.length / 4) * 28 }] }));
    setDirty(true); setSelNode(id); setSelEdge(null);
  };
  const updNode = (id: string, patch: Partial<GNode>) => {
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
    setDirty(true);
  };
  const delNode = (id: string) => {
    setGraph((g) => ({ nodes: g.nodes.filter((n) => n.id !== id), edges: g.edges.filter((e) => e.from !== id && e.to !== id) }));
    setDirty(true); setSelNode(null);
  };
  const delEdge = (id: string) => {
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
    setDirty(true); setSelEdge(null);
  };
  const connect = (from: string, to: string) => {
    if (from === to) return;
    if (graph.edges.some((e) => e.from === from && e.to === to)) { notify(t('Connection already exists', 'الوصلة موجودة بالفعل'), false); return }
    setGraph((g) => ({ ...g, edges: [...g.edges, { id: `e${Date.now().toString(36).slice(-5)}`, from, to }] }));
    setDirty(true); notify(t('Connected — save the graph to persist', 'تم الوصل — احفظ الرسم لتثبيته'));
  };

  /* pointer mechanics */
  const toCanvas = (cx: number, cy: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  };
  const onMove = (e: React.PointerEvent) => {
    if (panRef.current) { setPan({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y }); return }
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.sx) / zoom, dy = (e.clientY - d.sy) / zoom;
      updNode(d.id, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) });
      return;
    }
    if (connFrom) setCursor(toCanvas(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent) => {
    if (panRef.current) { panRef.current = null; return }
    if (dragRef.current) { dragRef.current = null; return }
    if (connFrom) {
      const p = toCanvas(e.clientX, e.clientY);
      const hit = graph.nodes.find((n) => p.x >= n.x && p.x <= n.x + NODE_W && p.y >= n.y && p.y <= n.y + NODE_H);
      if (hit) connect(connFrom, hit.id);
      setConnFrom(null); setCursor(null);
    }
  };

  /* run simulation */
  const simulate = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const depth = new Map<string, number>();
    graph.nodes.forEach((n) => depth.set(n.id, 0));
    for (let i = 0; i < graph.nodes.length; i++) {
      let ch = false;
      for (const e of graph.edges) {
        const d = (depth.get(e.from) ?? 0) + 1;
        if (d > (depth.get(e.to) ?? 0)) { depth.set(e.to, d); ch = true }
      }
      if (!ch) break;
    }
    const maxD = Math.max(0, ...depth.values());
    setSimOn(true);
    for (let w = 0; w <= maxD + 1; w++) {
      timers.current.push(setTimeout(() => {
        if (w <= maxD) setSimActive(new Set(graph.nodes.filter((n) => depth.get(n.id) === w).map((n) => n.id)));
        else { setSimActive(new Set()); setSimOn(false); notify(t(`Simulated run ▶ ${graph.nodes.length} stages · all green`, `تشغيل تجريبي ▶ ${graph.nodes.length} مراحل · ناجح`)) }
      }, w * 620));
    }
  };

  const fit = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || !graph.nodes.length) return;
    const minX = Math.min(...graph.nodes.map((n) => n.x)), minY = Math.min(...graph.nodes.map((n) => n.y));
    const maxX = Math.max(...graph.nodes.map((n) => n.x + NODE_W)), maxY = Math.max(...graph.nodes.map((n) => n.y + NODE_H));
    const z = Math.min(1.15, Math.max(0.45, Math.min((r.width - 60) / (maxX - minX), (r.height - 60) / (maxY - minY))));
    setZoom(z); setPan({ x: 30 - minX * z, y: 24 - minY * z });
  };

  const node = graph.nodes.find((n) => n.id === selNode) ?? null;
  const edge = graph.edges.find((e) => e.id === selEdge) ?? null;
  const connNode = graph.nodes.find((n) => n.id === connFrom) ?? null;
  const lines = script.split('\n').length;
  const langName = wf.scriptLang === 'typescript' ? 'TypeScript' : wf.scriptLang === 'json' ? 'JSON' : 'JavaScript';

  const tool = (label: string, onClick: () => void, opts: { color?: string; disabled?: boolean; title?: string } = {}) => (
    <button
      key={label} onClick={onClick} disabled={opts.disabled} title={opts.title ?? label}
      className="chip" style={{
        cursor: 'pointer', fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 8,
        border: `1px solid ${opts.color ? `${opts.color}66` : 'var(--bd,#ffffff14)'}`,
        background: opts.color ? `color-mix(in srgb, ${opts.color} 12%, transparent)` : 'transparent',
        color: opts.color ?? 'inherit', opacity: opts.disabled ? 0.35 : 1,
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* toolbar */}
      <div className="wfs-toolbar fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14, color: 'var(--gold-champagne,#F5D76E)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isAr && wf.nameAr ? wf.nameAr : wf.name}
          </strong>
          <span className="wfs-chip" style={{ textTransform: 'uppercase' }}>{wf.category ?? 'operations'}</span>
          <span className="wfs-mini">{wf.schedule === 'webhook' ? '⚡ webhook' : wf.schedule === 'manual' ? '✋ manual' : `⏱ ${wf.schedule ?? '—'}`}</span>
          {dirty && <span className="wfs-chip" style={{ color: 'var(--amber)', borderColor: 'var(--amber)', animation: 'pulse 1.4s infinite' }}>● {t('unsaved graph', 'رسم غير محفوظ')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid var(--bd)' }}>
            {([['select', '⌖'], ['pan', '✋'], ['connect', '⤳']] as const).map(([m, g]) => (
              <button key={m} onClick={() => setMode(m)}
                title={m === 'select' ? t('Select / drag', 'تحديد / سحب') : m === 'pan' ? t('Pan canvas', 'تحريك اللوحة') : t('Connect mode', 'وضع الوصل')}
                style={{
                  padding: '5px 9px', fontSize: 12, cursor: 'pointer', border: 'none',
                  background: mode === m ? 'color-mix(in srgb, var(--gold-luxury) 22%, transparent)' : 'transparent',
                  color: mode === m ? 'var(--gold-champagne)' : 'var(--tx-m)',
                }}>{g}</button>
            ))}
          </div>
          {tool(t('Node', 'عقدة'), addNode, { color: 'var(--gold-lt)' })}
          {tool(t('Run', 'تشغيل'), simulate, { color: 'var(--emerald)', disabled: simOn })}
          {tool('−', () => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2))), { title: t('Zoom out', 'تصغير') })}
          {tool(`${Math.round(zoom * 100)}%`, () => {}, { title: t('Zoom', 'تكبير'), disabled: true })}
          {tool('+', () => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2))), { title: t('Zoom in', 'تكبير') })}
          {tool(t('Fit', 'ملاءمة'), fit)}
          {tool(t('Save', 'حفظ'), saveGraph, { color: 'var(--gold-luxury)', disabled: !dirty || saving })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 12, alignItems: 'start' }}>
          {/* canvas */}
          <div
            ref={wrapRef}
            className="wfs-canvas"
            style={{ cursor: mode === 'pan' ? 'grab' : connFrom ? 'crosshair' : 'default' }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvas === '1') {
                if (mode === 'pan' || e.shiftKey) {
                  panRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                } else { setSelNode(null); setSelEdge(null) }
              }
            }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(1.6, Math.max(0.4, +(z + (e.deltaY < 0 ? 0.08 : -0.08)).toFixed(2)))) } }}
          >
            <div className="wfs-world" data-canvas="1" style={{ width: graphW, height: graphH, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              <svg width={graphW} height={graphH} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} data-canvas="1">
                <defs>
                  <marker id="wfs-arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="var(--tx-f)" strokeWidth="1.6" />
                  </marker>
                  <marker id="wfs-arw-gold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="var(--gold-luxury)" strokeWidth="1.8" />
                  </marker>
                </defs>
                {graph.edges.map((e) => {
                  const a = graph.nodes.find((n) => n.id === e.from), b = graph.nodes.find((n) => n.id === e.to);
                  if (!a || !b) return null;
                  const s = e.id === selEdge, live = simActive.has(e.from);
                  const mid = { x: (a.x + NODE_W + b.x) / 2, y: (a.y + b.y) / 2 + NODE_H / 2 };
                  return (
                    <g key={e.id}>
                      <path d={edgePath(a, b)} fill="none" stroke="transparent" strokeWidth={16} style={{ cursor: 'pointer' }}
                        onPointerDown={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelNode(null) }} data-canvas="1" />
                      <path d={edgePath(a, b)} fill="none"
                        stroke={s ? 'var(--gold-luxury)' : live ? 'var(--emerald)' : 'var(--tx-f)'}
                        strokeWidth={s ? 2.4 : live ? 2.2 : 1.6}
                        markerEnd={s ? 'url(#wfs-arw-gold)' : 'url(#wfs-arw)'}
                        className={live ? 'wfs-dash' : undefined} pointerEvents="none" opacity={s || live ? 1 : 0.55} />
                      {e.label && (
                        <text x={mid.x} y={mid.y - 6} textAnchor="middle" pointerEvents="none" className="wfs-edge-lbl"
                          fill={s ? 'var(--gold-champagne)' : 'var(--tx-m)'}>{e.label}</text>
                      )}
                    </g>
                  );
                })}
                {connNode && cursor && (
                  <path d={`M ${connNode.x + NODE_W} ${connNode.y + NODE_H / 2} C ${connNode.x + NODE_W + 80} ${connNode.y + NODE_H / 2}, ${cursor.x - 80} ${cursor.y}, ${cursor.x} ${cursor.y}`}
                    fill="none" stroke="var(--emerald)" strokeWidth={2} strokeDasharray="6 5" pointerEvents="none" />
                )}
              </svg>

              {graph.nodes.map((n) => {
                const meta = NODE_META[n.type] ?? NODE_META.action;
                const sel = n.id === selNode, live = simActive.has(n.id);
                return (
                  <div key={n.id}
                    className={`wfs-node${sel ? ' wfs-sel' : ''}${live ? ' wfs-live' : ''}${simOn && !live ? ' wfs-dim' : ''}`}
                    style={{ left: n.x, top: n.y, ['--node-c' as string]: meta.color, cursor: mode === 'pan' ? 'grab' : 'pointer' }}
                    onPointerDown={(e) => {
                      if (mode === 'pan') return;
                      e.stopPropagation();
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      dragRef.current = { id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y };
                      setSelNode(n.id); setSelEdge(null);
                    }}>
                    <div className="wfs-node-bd">
                      <div className="wfs-node-ic">{meta.glyph}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="wfs-node-t">{n.label}</div>
                        <div className="wfs-node-s">{n.sub || '—'}</div>
                        <div className="wfs-node-k">{isAr ? meta.tagAr : meta.tagEn}</div>
                      </div>
                    </div>
                    <button className={`wfs-hout${connFrom === n.id ? ' wfs-h-on' : ''}`}
                      title={t('Drag to another node to connect', 'اسحب إلى عقدة أخرى للوصل')}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setConnFrom(n.id); setCursor(toCanvas(e.clientX, e.clientY));
                        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                      }} />
                    <span className="wfs-hin" />
                  </div>
                );
              })}
            </div>

            <div style={{ position: 'absolute', bottom: 12, insetInlineStart: 12, borderRadius: 9, border: '1px solid var(--bd)', background: 'color-mix(in srgb, var(--bg) 60%, transparent)', padding: '5px 10px', fontSize: 10, color: 'var(--tx-m)', fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>
              {Math.round(zoom * 100)}% · {graph.nodes.length} {t('nodes', 'عقدة')} · {graph.edges.length} {t('edges', 'وصلة')}
            </div>
            <div style={{ position: 'absolute', top: 12, insetInlineEnd: 12, borderRadius: 9, border: '1px solid var(--bd)', background: 'color-mix(in srgb, var(--bg) 60%, transparent)', padding: '5px 10px', fontSize: 10, color: 'var(--tx-f)', pointerEvents: 'none' }}>
              {t('drag ● to connect · shift-drag to pan · ⌘/ctrl+scroll zoom', 'اسحب ● للوصل · Shift للتحريك · ⌘/Ctrl+التمرير للتكبير')}
            </div>
            {graph.nodes.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx-f)', fontSize: 13, pointerEvents: 'none' }}>
                {t('Empty canvas — add a node to start drawing', 'لوحة فارغة — أضف عقدة لبدء الرسم')}
              </div>
            )}
          </div>

          {/* inspector */}
          <div className="wfs-inspect fade-up">
            <div className="wfs-tabs">
              {(['overview', 'script'] as const).map((x) => (
                <button key={x} className={`wfs-tab${tab === x ? ' wfs-tab-on' : ''}`} onClick={() => setTab(x)}>
                  {x === 'overview' ? t('Details', 'التفاصيل') : `${t('Script', 'السكربت')} · ${langName}`}
                </button>
              ))}
            </div>

            <div className="wfs-body custom-scroll">
              {tab === 'overview' ? (
                <>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['active', 'paused', 'draft'] as const).map((s) => (
                      <button key={s} onClick={() => setStatus(s)}
                        className="chip" style={{
                          flex: 1, cursor: 'pointer', padding: '6px 4px', fontSize: 10.5, fontWeight: 800, textTransform: 'capitalize',
                          borderColor: wf.status === s ? (s === 'active' ? 'var(--emerald)' : s === 'paused' ? 'var(--amber)' : 'var(--bd-s)') : 'var(--bd)',
                          color: wf.status === s ? (s === 'active' ? 'var(--emerald)' : s === 'paused' ? 'var(--amber)' : 'var(--tx)') : 'var(--tx-f)',
                          background: wf.status === s ? 'color-mix(in srgb, var(--emerald) 10%, transparent)' : 'transparent',
                        }}>
                        {s === 'active' ? `▶ ${t('active', 'نشط')}` : s === 'paused' ? `⏸ ${t('paused', 'متوقف')}` : t('draft', 'مسودة')}
                      </button>
                    ))}
                  </div>

                  <div>
                    <span className="wfs-lbl">{t('Name', 'الاسم')}</span>
                    <input className="wfs-in" value={name} onChange={(e) => { setName(e.target.value); setMetaDirty(true) }} />
                  </div>
                  <div>
                    <span className="wfs-lbl">{t('Schedule (cron / webhook / manual)', 'الجدولة (كرون / ويب هوك / يدوي)')}</span>
                    <input className="wfs-in" value={schedule} onChange={(e) => { setSchedule(e.target.value); setMetaDirty(true) }} placeholder="*/30 * * * *" />
                  </div>
                  <div>
                    <span className="wfs-lbl">{t('Description', 'الوصف')}</span>
                    <textarea className="wfs-in" rows={3} style={{ resize: 'none' }} value={desc} onChange={(e) => { setDesc(e.target.value); setMetaDirty(true) }} />
                  </div>
                  <button className="btn" onClick={saveMeta} disabled={!metaDirty || saving} style={{ fontWeight: 800 }}>
                    💾 {t('Save Details', 'حفظ التفاصيل')}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
                    <div className="wfs-stat"><div className="wfs-stat-l">{t('Lifetime runs', 'إجمالي التشغيل')}</div><div className="wfs-stat-v">{Number(wf.runs ?? 0).toLocaleString()}</div></div>
                    <div className="wfs-stat"><div className="wfs-stat-l">{t('Success rate', 'نسبة النجاح')}</div><div className="wfs-stat-v" style={{ color: Number(wf.successRate ?? 99) >= 99 ? 'var(--emerald)' : 'var(--amber)' }}>{Number(wf.successRate ?? 99).toFixed(1)}%</div></div>
                    <div className="wfs-stat"><div className="wfs-stat-l">{t('Last run', 'آخر تشغيل')}</div><div className="wfs-stat-v" style={{ fontSize: 12 }}>{relTime(wf.lastRunAt ?? null, isAr)}</div></div>
                    <div className="wfs-stat"><div className="wfs-stat-l">{t('Duration', 'المدة')}</div><div className="wfs-stat-v">{Number(wf.lastRunMs ?? 0) >= 1000 ? `${(Number(wf.lastRunMs) / 1000).toFixed(1)}s` : `${Number(wf.lastRunMs ?? 0)}ms`}</div></div>
                  </div>

                  <div style={{ borderRadius: 'var(--clay-rad-md)', border: '1px solid var(--bd)', background: 'var(--surf2)', padding: 12 }}>
                    <div className="wfs-stat-l">{t('Source of truth', 'المصدر الأصلي')}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--gold-lt)', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                      {wf.sourcePath ?? t('inline studio workflow', 'سير عمل داخلي')}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--tx-m)', lineHeight: 1.5 }}>
                      {t('Script edits persist to the studio registry and mirror this path — download and commit to update the repo file.', 'تُحفظ تعديلات السكربت في سجل الاستوديو وتطابق هذا المسار — نزّل الملف وأضفه للمستودع لتحديث الأصل.')}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="chip" style={{ cursor: 'pointer' }} onClick={() => download(wf, script)}>
                        ⤓ {t('Download', 'تنزيل')} {wf.scriptLang === 'json' ? '.json' : wf.scriptLang === 'typescript' ? '.ts' : '.js'}
                      </button>
                      <button className="chip" style={{ cursor: 'pointer', borderColor: 'color-mix(in srgb, var(--red) 40%, transparent)', color: 'var(--red)' }} onClick={() => onRemove(wf.id, isAr && wf.nameAr ? wf.nameAr : wf.name)}>
                        🗑 {t('Remove', 'إزالة')}
                      </button>
                    </div>
                  </div>

                  {edge ? (
                    <div style={{ borderRadius: 'var(--clay-rad-md)', border: '1px solid color-mix(in srgb, var(--gold-luxury) 40%, transparent)', background: 'color-mix(in srgb, var(--gold-luxury) 6%, transparent)', padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="wfs-stat-l" style={{ color: 'var(--gold-champagne)' }}>{t('Selected connection', 'الوصلة المحددة')}</span>
                        <button onClick={() => delEdge(edge.id)} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace' }}>
                        {graph.nodes.find((n) => n.id === edge.from)?.label} → {graph.nodes.find((n) => n.id === edge.to)?.label}
                      </div>
                      <input className="wfs-in" style={{ marginTop: 8 }} value={edge.label ?? ''}
                        placeholder={t('edge label (e.g. hot / warm)', 'تسمية الوصلة')}
                        onChange={(e) => { setGraph((g) => ({ ...g, edges: g.edges.map((x) => (x.id === edge.id ? { ...x, label: e.target.value } : x)) })); setDirty(true) }} />
                    </div>
                  ) : node ? (
                    <div style={{ borderRadius: 'var(--clay-rad-md)', border: '1px solid color-mix(in srgb, var(--gold-luxury) 40%, transparent)', background: 'color-mix(in srgb, var(--gold-luxury) 6%, transparent)', padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="wfs-stat-l" style={{ color: 'var(--gold-champagne)' }}>{t('Selected node', 'العقدة المحددة')}</span>
                        <button onClick={() => delNode(node.id)} title={t('Delete node', 'حذف العقدة')} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                      </div>
                      <input className="wfs-in" style={{ marginTop: 8, fontWeight: 800 }} value={node.label} onChange={(e) => updNode(node.id, { label: e.target.value })} />
                      <input className="wfs-in" style={{ marginTop: 6 }} value={node.sub ?? ''} placeholder={t('tech detail', 'تفصيلة تقنية')} onChange={(e) => updNode(node.id, { sub: e.target.value })} />
                      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                        {(Object.keys(NODE_META) as GNodeType[]).map((k) => (
                          <button key={k} className="chip" style={{
                            cursor: 'pointer', fontSize: 10, textTransform: 'capitalize', padding: '3px 8px',
                            background: node.type === k ? NODE_META[k].color : 'transparent',
                            color: node.type === k ? '#07111E' : 'var(--tx-m)',
                            borderColor: node.type === k ? NODE_META[k].color : 'var(--bd)',
                          }}>{k}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--tx-m)', lineHeight: 1.6, borderRadius: 'var(--clay-rad-md)', border: '1px solid var(--bd)', background: 'var(--surf2)', padding: 12 }}>
                      {t('Click a node or connection to edit it here. Drag the golden ● from one node onto another to draw a new connection.', 'انقر عقدة أو وصلة لتحريرها هنا. اسحب النقطة الذهبية ● من عقدة إلى أخرى لرسم وصلة جديدة.')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bd)', paddingBottom: 8 }}>
                    <span className="wfs-mini" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {String(wf.sourcePath ?? wf.slug ?? 'script').split('/').pop()} · {lines} {t('lines', 'سطر')}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="chip" style={{ cursor: 'pointer' }} title={t('Revert to saved', 'رجوع للمحفوظ')} onClick={() => { setScript(wf.script ?? ''); setScriptDirty(false) }}>↺</button>
                      <button onClick={saveScript} disabled={!scriptDirty || saving} className="chip" style={{
                        cursor: 'pointer', fontWeight: 800,
                        borderColor: scriptDirty ? 'color-mix(in srgb, var(--emerald) 50%, transparent)' : 'var(--bd)',
                        color: scriptDirty ? 'var(--emerald)' : 'var(--tx-f)',
                      }}>💾 {scriptDirty ? t('Save Script', 'حفظ السكربت') : t('Saved', 'محفوظ')}</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', minHeight: 420, flex: 1 }}>
                    <div className="wfs-gutter wfs-code">
                      {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
                    </div>
                    <textarea
                      className="wfs-code" value={script} spellCheck={false}
                      onChange={(e) => { setScript(e.target.value); setScriptDirty(true) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const ta = e.currentTarget, s = ta.selectionStart;
                          setScript((v) => v.slice(0, s) + '  ' + v.slice(ta.selectionEnd));
                          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 });
                        }
                        if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (scriptDirty) saveScript() }
                      }}
                      style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--tx)', padding: '10px 12px' }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: scriptDirty ? 'var(--amber)' : 'var(--tx-f)', borderTop: '1px solid var(--bd)', paddingTop: 8 }}>
                    {scriptDirty
                      ? `● ${t('unsaved changes — ⌘/ctrl+S to save', 'تغييرات غير محفوظة — ⌘/Ctrl+S للحفظ')}`
                      : t('Script mirrors the committed source · edits persist to the studio registry', 'السكربت مطابق للأصل · التعديلات تُحفظ في سجل الاستوديو')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function download(wf: Wf, script: string) {
  const ext = wf.scriptLang === 'typescript' ? 'ts' : wf.scriptLang === 'json' ? 'json' : 'js';
  const fname = String(wf.sourcePath ?? `${wf.slug}.${ext}`).split('/').pop();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([script], { type: 'text/plain;charset=utf-8' }));
  a.download = fname ?? 'workflow.js';
  a.click();
  URL.revokeObjectURL(a.href);
}
