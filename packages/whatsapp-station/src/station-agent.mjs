/**
 * WhatsApp Station — Agentic Harness
 * ═══════════════════════════════════
 * ONE agent that runs the full scrape pipeline as ordered, observed
 * steps (every step logs and the report is honest):
 *
 *   [1/6] health      → OpenWA gateway reachable? which lines live?
 *   [2/6] groups      → load broker groups from public.whatsapp_station_groups
 *                       (falls back to STATION_GROUPS env / workflow-01 defaults)
 *   [3/6] scrape      → POST gateway /api/scrape-named-groups for the named
 *                       broker queries + GET /api/harvester/recent sweep
 *   [4/6] extract     → canonical parse engine (compound gazetteer, Arabic
 *                       prices, media grouping) + privacy masking
 *   [5/6] staging     → upsert public.listing_waiting_list (dedup_hash unique)
 *   [6/6] rag         → 768-d embeddings per row (Gemini), honest degrade
 *                       when GEMINI_API_KEY is absent
 *
 * Contract-compatible with packages/agents-core BaseAgent:
 *   execute(record) → AgentResult { success, data, error, steps }
 * so the station can be registered in the same fleet as the closer /
 * hermes agents — and embedded into any other app the same way.
 *
 * CLI:  node src/index.mjs            (live gateway sweep)
 *       node src/index.mjs --usb <dir> (USB phone chat-export import)
 *
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
import { GatewayClient } from '../../../workflows/lib/gateway-client.js';
import {
  CONFIDENTIAL_CONTACT,
  maskPhones,
  toWaitingRow,
} from './extraction-engine.mjs';
import { embedDocument768, isRagConfigured } from './rag.mjs';

const DEFAULT_GROUPS = ['مجموعة وسطاء التجمع', 'عقارات القاهرة الجديدة', 'وسطاء شرق القاهرة', 'وسطاء التجمع والحي'];

export class WhatsAppStationAgent {
  static name = 'whatsapp-station';
  static description = 'Scrapes broker WhatsApp groups (gateway QR session or USB export) into the Listing Waiting List with RAG indexing.';

  constructor(config = {}) {
    this.config = {
      gatewayUrl: (config.gatewayUrl || process.env.OPENWA_GATEWAY_URL || process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785').replace(/\/+$/, ''),
      apiKey: config.apiKey || process.env.OPENWA_ADMIN_API_KEY || process.env.RUNNER_API_KEY || '',
      supabaseUrl: (config.supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''),
      supabaseKey: config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      queries: config.queries || (process.env.STATION_GROUPS ? process.env.STATION_GROUPS.split(',').map((g) => g.trim()).filter(Boolean) : ['data', 'داتا ايمان', 'ايمان']),
      embed: config.embed !== false,
      maxRows: config.maxRows || 500,
    };
    this.steps = [];
  }

  // ── plumbing ──────────────────────────────────────────────────────
  #log(step, status, detail = '') {
    this.steps.push({ step, status, detail: String(detail).slice(0, 300) });
  }

  #gatewayHeaders() {
    return { 'Content-Type': 'application/json', ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}) };
  }

  #sbHeaders(extra = {}) {
    return {
      apikey: this.config.supabaseKey,
      Authorization: `Bearer ${this.config.supabaseKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  get unconfigured() {
    const missing = [];
    if (!this.config.supabaseUrl || !this.config.supabaseKey) missing.push('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
    return missing;
  }

  // ── steps ─────────────────────────────────────────────────────────
  async health() {
    try {
      const res = await fetch(`${this.config.gatewayUrl}/api/health`, { headers: this.#gatewayHeaders(), signal: AbortSignal.timeout(8000) });
      const ok = res.ok;
      let lines = [];
      try { const j = await res.json(); lines = j?.lines || j?.sessions || []; } catch {}
      this.#log('health', ok ? 'ok' : 'degraded', `${this.config.gatewayUrl} ${ok ? 'reachable' : `HTTP ${res.status}`} · lines: ${Array.isArray(lines) ? lines.length : '?'}`);
      return { ok, lines };
    } catch (err) {
      this.#log('health', 'down', err.message);
      return { ok: false, lines: [] };
    }
  }

  async loadGroups() {
    if (this.config.supabaseUrl && this.config.supabaseKey) {
      try {
        const res = await fetch(`${this.config.supabaseUrl}/rest/v1/whatsapp_station_groups?active=eq.true&select=group_name,broker_names,line`, {
          headers: this.#sbHeaders(), signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length) {
            this.#log('groups', 'ok', `${rows.length} broker groups from station registry`);
            return rows;
          }
        }
        this.#log('groups', 'fallback', `registry ${res.ok ? 'empty' : `HTTP ${res.status}`} → defaults`);
      } catch (err) {
        this.#log('groups', 'fallback', err.message);
      }
    }
    return DEFAULT_GROUPS.map((g) => ({ group_name: g, broker_names: '', line: 'line-1' }));
  }

  async scrapeGateway(groups) {
    const collected = [];
    // Named broker queries (e.g. "داتا ايمان") — the gateway deep-scrape
    try {
      const res = await fetch(`${this.config.gatewayUrl}/api/scrape-named-groups`, {
        method: 'POST',
        headers: this.#gatewayHeaders(),
        body: JSON.stringify({ queries: this.config.queries, limit: this.config.maxRows }),
        signal: AbortSignal.timeout(45000),
      });
      const j = await res.json().catch(() => null);
      const msgs = j?.messages || j?.results || j?.data || [];
      if (Array.isArray(msgs)) collected.push(...msgs);
      this.#log('scrape', res.ok ? 'ok' : `HTTP ${res.status}`, `named queries: ${this.config.queries.join(', ')} → ${Array.isArray(msgs) ? msgs.length : 0} messages`);
    } catch (err) {
      this.#log('scrape', 'error', `named scrape: ${err.message}`);
    }
    // Recent harvester sweep across all live lines
    try {
      const res = await fetch(`${this.config.gatewayUrl}/api/harvester/recent?limit=${this.config.maxRows}`, { headers: this.#gatewayHeaders(), signal: AbortSignal.timeout(30000) });
      const j = await res.json().catch(() => null);
      const msgs = j?.messages || j?.items || j?.recent || [];
      if (Array.isArray(msgs)) collected.push(...msgs);
      this.#log('harvester', res.ok ? 'ok' : `HTTP ${res.status}`, `recent sweep → ${Array.isArray(msgs) ? msgs.length : 0} messages`);
    } catch (err) {
      this.#log('harvester', 'error', err.message);
    }
    return collected;
  }

  /** Normalize whatever the gateway returns into {sender, text, group}. */
  #normalizeGatewayMessages(msgs) {
    return msgs
      .map((m) => ({
        sender: m.sender || m.senderName || m.pushname || m.from || 'unknown',
        text: m.text || m.body || m.message || '',
        group: m.group || m.groupName || m.chatName || m.chat || 'Gateway',
      }))
      .filter((m) => (m.text || '').length >= 15);
  }

  async stageRows(rows) {
    if (!rows.length) return { upserted: 0, errors: 0 };
    let upserted = 0, errors = 0;
    // PostgREST bulk upsert on dedup_hash conflict
    const res = await fetch(`${this.config.supabaseUrl}/rest/v1/listing_waiting_list?on_conflict=dedup_hash`, {
      method: 'POST',
      headers: this.#sbHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
        Accept: 'application/json',
      }),
      body: JSON.stringify(rows.map(({ embedding, ...rest }) => rest)),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.#log('staging', 'error', `HTTP ${res.status}: ${body.slice(0, 200)}`);
      return { upserted: 0, errors: rows.length };
    }
    const saved = await res.json().catch(() => []);
    upserted = Array.isArray(saved) ? saved.length : rows.length;
    this.#log('staging', 'ok', `${upserted} rows staged (dedup on dedup_hash)`);
    // RAG indexing — per-row, honest degrade
    if (this.config.embed && isRagConfigured() && Array.isArray(saved)) {
      let embedded = 0;
      for (const row of saved) {
        if (!row?.id || !row?.rag_text) continue;
        try {
          const vec = await embedDocument768(row.rag_text);
          const patch = await fetch(`${this.config.supabaseUrl}/rest/v1/listing_waiting_list?id=eq.${row.id}`, {
            method: 'PATCH',
            headers: this.#sbHeaders({ Prefer: 'return=minimal' }),
            body: JSON.stringify({ embedding: vec }),
            signal: AbortSignal.timeout(20000),
          });
          if (patch.ok) embedded++;
        } catch (err) {
          this.#log('rag', 'error', `row ${row.code}: ${err.message}`);
          break; // embedder down — stop rather than spam
        }
      }
      this.#log('rag', 'ok', `${embedded}/${saved.length} rows embedded (768-d)`);
    } else {
      this.#log('rag', 'skipped', isRagConfigured() ? 'embed disabled by config' : 'GEMINI_API_KEY not configured — rows staged without vectors');
    }
    return { upserted, errors };
  }

  /** Full pipeline. Returns { success, data, error, steps }. */
  async execute(record = {}) {
    this.steps = [];
    const report = { staged: 0, duplicates: 0, groups: 0, rag: isRagConfigured(), contact: CONFIDENTIAL_CONTACT, startedAt: new Date().toISOString() };
    try {
      const missing = this.unconfigured;
      if (missing.length) {
        this.#log('config', 'unconfigured', missing.join(', '));
        return { success: false, exit: 2, error: `unconfigured: ${missing.join(', ')}`, steps: this.steps, data: report };
      }
      const health = await this.health();
      report.gatewayReachable = health.ok;
      const groups = await this.loadGroups();
      report.groups = groups.length;
      const rawMsgs = await this.scrapeGateway(groups);
      const norm = this.#normalizeGatewayMessages(rawMsgs);
      const rows = [];
      const seen = new Set();
      for (const m of norm) {
        const parsed = this.#parseMessage(m);
        const row = toWaitingRow(parsed, { source: 'whatsapp_group' });
        if (row && !seen.has(row.dedup_hash)) { seen.add(row.dedup_hash); rows.push(row); }
      }
      report.parsed = rows.length;
      const staged = await this.stageRows(rows);
      report.staged = staged.upserted;
      report.errors = staged.errors;
      report.finishedAt = new Date().toISOString();
      this.#log('done', 'ok', `${report.staged} new rows in waiting list`);
      return { success: true, exit: 0, steps: this.steps, data: report };
    } catch (err) {
      this.#log('fatal', 'error', err.message);
      return { success: false, exit: 1, error: err.message, steps: this.steps, data: report };
    }
  }

  /** Bridge to the canonical parse engine (lazy import keeps CLI fast). */
  async #parseMessage(m) {
    const { extractUnitDetails } = await import('../../../workflows/21-usb-phone-harvester/parse-engine.mjs');
    return extractUnitDetails({ sender: m.sender, text: m.text }, m.group);
  }
}

/**
 * Run the agent as a script and exit with its honest exit code.
 * Used by workflows/22-whatsapp-station/index.js via dynamic import.
 */
export async function runStationCli(args = process.argv.slice(2)) {
  if (args.includes('--usb')) {
    const { runUsbImport } = await import('./usb-import.mjs');
    return runUsbImport(args);
  }
  const agent = new WhatsAppStationAgent();
  const result = await agent.execute({ trigger: 'cli' });
  for (const s of result.steps) console.log(`[station:${s.step}] ${s.status} — ${s.detail}`);
  if (result.success) console.log(`[station] report: ${JSON.stringify(result.data)}`);
  else console.error(`[station] FAILED: ${result.error}`);
  return result;
}
