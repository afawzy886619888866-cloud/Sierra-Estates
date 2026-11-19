#!/usr/bin/env node
/**
 * Sierra Estates · OpenClaw ↔ Antigravity Unified MCP Server
 *
 * Bridges Antigravity with:
 *  - Windows / Microsoft PC Manager OpenClaw (PCMClawUbuntu WSL2 + C:\Users\Sierr\.openclaw)
 *  - Engine 1 (Memory): Obsidian shared store + OpenClaw episodic JSONL ledger
 *  - Engine 2 (RAG & GIS): Live real-listings.json snapshot + Supabase metadata
 *  - Engine 3 (Harness & Valuation): DeepSeek/Invariant evaluation + Cairo AVM checks
 *  - Engine 4 (Workflows & Closer): OpenWA (:2785), Workflow Runner (:2786), Admin Bridge (:2790), n8n (:5678), Webhook (:8000)
 *
 * Zero external dependencies — pure Node.js JSON-RPC 2.0 over stdio.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline';

const execFileAsync = promisify(execFile);

const WORKSPACE_ROOT = 'H:/Sierra Estates';
const OPENCLAW_HUB = 'C:/Users/Sierr/.openclaw';
const OPENCLAW_SKILLS_DIR = path.join(OPENCLAW_HUB, 'skills');
const OPENCLAW_MEMORY_FILE = path.join(OPENCLAW_HUB, 'memory', 'episodic.jsonl');
const OBSIDIAN_STORE_PATH = path.join(WORKSPACE_ROOT, 'packages', 'obsidian', 'obsidian-store.json');
const REAL_LISTINGS_PATH = path.join(WORKSPACE_ROOT, 'apps', 'sierra-estates-realty', 'data', 'real-listings.json');
const AGENCY_HELPLINE = '01092048333';

const DAEMONS = [
  { name: 'openwa', url: 'http://127.0.0.1:2785' },
  { name: 'workflow-runner', url: 'http://127.0.0.1:2786/api/health' },
  { name: 'admin-bridge', url: 'http://127.0.0.1:2790' },
  { name: 'n8n', url: 'http://127.0.0.1:5678' },
  { name: 'sierra-webhook', url: 'http://127.0.0.1:8000' },
];

function probeHttp(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode < 500, status: res.statusCode });
    });
    req.on('error', () => resolve({ ok: false, status: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 'timeout' });
    });
  });
}

function listOpenClawSkills() {
  if (!fs.existsSync(OPENCLAW_SKILLS_DIR)) return [];
  return fs
    .readdirSync(OPENCLAW_SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() || d.isSymbolicLink())
    .map((d) => {
      const skillMd = path.join(OPENCLAW_SKILLS_DIR, d.name, 'SKILL.md');
      let description = '';
      if (fs.existsSync(skillMd)) {
        const raw = fs.readFileSync(skillMd, 'utf8').slice(0, 600);
        const m = raw.match(/description:\s*(.+)/i);
        if (m) description = m[1].trim();
      }
      return { name: d.name, description };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function ensureMemoryDir() {
  fs.mkdirSync(path.dirname(OPENCLAW_MEMORY_FILE), { recursive: true });
}

function appendEpisodicMemory(entry) {
  ensureMemoryDir();
  const record = {
    id: `oc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  fs.appendFileSync(OPENCLAW_MEMORY_FILE, JSON.stringify(record) + '\n', 'utf8');
  return record;
}

function readEpisodicMemory(query = '', limit = 15) {
  const results = [];
  if (fs.existsSync(OPENCLAW_MEMORY_FILE)) {
    const lines = fs.readFileSync(OPENCLAW_MEMORY_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(-200)) {
      try {
        const item = JSON.parse(line);
        if (!query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase())) {
          results.push({ source: 'openclaw-episodic', ...item });
        }
      } catch {
        // skip malformed line
      }
    }
  }
  if (fs.existsSync(OBSIDIAN_STORE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(OBSIDIAN_STORE_PATH, 'utf8'));
      const entries = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
      for (const item of entries.slice(-200)) {
        if (!query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase())) {
          results.push({ source: 'obsidian-shared', ...item });
        }
      }
    } catch {
      // ignore if obsidian store is unavailable
    }
  }
  return results.slice(-limit);
}

function queryRagListings({ compound, mode, maxPrice, minArea, query, limit = 10 }) {
  if (!fs.existsSync(REAL_LISTINGS_PATH)) {
    return { totalMatched: 0, items: [], note: 'real-listings.json not found' };
  }
  const raw = JSON.parse(fs.readFileSync(REAL_LISTINGS_PATH, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.listings || raw.data || [];
  const q = (query || '').toLowerCase();
  const comp = (compound || '').toLowerCase();
  const m = (mode || '').toLowerCase();

  const matched = [];
  for (const u of list) {
    if (comp && !String(u.compound || u.cmp || '').toLowerCase().includes(comp)) continue;
    if (m && !String(u.mode || '').toLowerCase().includes(m)) continue;
    if (maxPrice && Number(u.price || 0) > Number(maxPrice)) continue;
    if (minArea && Number(u.area || 0) < Number(minArea)) continue;
    if (q && !JSON.stringify(u).toLowerCase().includes(q)) continue;
    matched.push({
      code: u.code || null,
      compound: u.compound || u.cmp || null,
      zone: u.zone || null,
      type: u.type || null,
      mode: u.mode || null,
      area: u.area || null,
      beds: u.beds || null,
      price: u.price || null,
      finishing: u.finishing || null,
      status: u.status || null,
      // Privacy Lock: omit owner mobile from default RAG output; route privately to AGENCY_HELPLINE only
    });
    if (matched.length >= limit) break;
  }
  return { totalScanned: list.length, returned: matched.length, items: matched };
}

function evaluateHarness({ text = '', price, mode, isPublicGroup = true }) {
  const issues = [];
  const phoneRegex = /(\+?20\s?1[0125]\d{8}|01[0125]\d{8})/g;
  const phonesFound = text.match(phoneRegex) || [];

  if (isPublicGroup && phonesFound.length > 0) {
    issues.push({
      severity: 'CRITICAL',
      rule: 'PUBLIC_GROUP_PRIVACY_LOCK',
      message: `Public group message contains phone number(s): ${phonesFound.join(', ')}. Strip from public chat and forward privately only to ${AGENCY_HELPLINE}.`,
    });
  }
  if (mode && String(mode).toLowerCase().includes('rent') && Number(price) > 400000) {
    issues.push({
      severity: 'HIGH',
      rule: 'RENT_CEILING_GUARD',
      message: `Monthly rent ${price} EGP exceeds 400,000 EGP ceiling. Verify whether this is a resale listing.`,
    });
  }
  return {
    passed: issues.length === 0,
    issues,
    helpline: AGENCY_HELPLINE,
  };
}

async function checkWslPcManager() {
  try {
    const { stdout } = await execFileAsync('wsl.exe', ['-l', '-v'], { timeout: 5000 });
    const cleaned = stdout.replace(/\0/g, '');
    const match = cleaned.match(/PCMClawUbuntu\s+(\w+)\s+(\d)/);
    return {
      installed: Boolean(match),
      state: match ? match[1] : 'Unknown',
      wslVersion: match ? Number(match[2]) : null,
    };
  } catch (err) {
    return { installed: false, state: 'Error', error: String(err.message || err) };
  }
}

async function runTool(name, args = {}) {
  switch (name) {
    case 'openclaw_status': {
      const [wsl, daemonChecks] = await Promise.all([
        checkWslPcManager(),
        Promise.all(DAEMONS.map(async (d) => ({ ...d, ...(await probeHttp(d.url)) }))),
      ]);
      const skills = listOpenClawSkills();
      return {
        hub: OPENCLAW_HUB,
        personaLoaded: fs.existsSync(path.join(OPENCLAW_HUB, 'SOUL.md')),
        skillsCount: skills.length,
        pcManagerWsl: wsl,
        daemons: daemonChecks,
        engines: {
          memory: fs.existsSync(OPENCLAW_MEMORY_FILE) || fs.existsSync(OBSIDIAN_STORE_PATH),
          ragSnapshot: fs.existsSync(REAL_LISTINGS_PATH),
          harness: fs.existsSync(path.join(WORKSPACE_ROOT, 'packages', 'deepseek-harness', 'src', 'index.ts')),
        },
      };
    }

    case 'openclaw_skills_catalog': {
      const skills = listOpenClawSkills();
      const filter = String(args.filter || '').toLowerCase();
      const filtered = filter
        ? skills.filter((s) => s.name.toLowerCase().includes(filter) || s.description.toLowerCase().includes(filter))
        : skills;
      return { total: skills.length, returned: filtered.length, skills: filtered };
    }

    case 'openclaw_rag_query': {
      return queryRagListings(args);
    }

    case 'openclaw_memory_rw': {
      if (args.action === 'write') {
        const saved = appendEpisodicMemory({
          kind: args.kind || 'openclaw-execution',
          entity: args.entity || 'general',
          summary: args.summary || '',
          tags: Array.isArray(args.tags) ? args.tags : ['openclaw-antigravity-bridge'],
        });
        return { ok: true, saved };
      }
      const items = readEpisodicMemory(args.query || '', Number(args.limit || 15));
      return { ok: true, count: items.length, items };
    }

    case 'openclaw_harness_eval': {
      return evaluateHarness(args);
    }

    case 'openclaw_delegate_task': {
      const task = String(args.task || '').trim();
      if (!task) return { ok: false, error: 'Missing required parameter: task' };
      const mode = args.mode || 'auto'; // 'auto' | 'wsl' | 'sierra-runner'

      // Record delegation in shared episodic memory
      const mem = appendEpisodicMemory({
        kind: 'antigravity-delegation',
        entity: args.skill || 'openclaw',
        summary: task,
        tags: ['openclaw-delegation', mode],
      });

      // Try PCMClawUbuntu WSL2 first if requested or running
      const wsl = await checkWslPcManager();
      if ((mode === 'wsl' || mode === 'auto') && wsl.state === 'Running') {
        try {
          const { stdout, stderr } = await execFileAsync(
            'wsl.exe',
            ['-d', 'PCMClawUbuntu', '--', 'bash', '-lc', `openclaw agent --message ${JSON.stringify(task)}`],
            { timeout: 60000 },
          );
          return { ok: true, backend: 'PCMClawUbuntu', memoryId: mem.id, stdout: stdout.trim(), stderr: stderr.trim() };
        } catch (err) {
          if (mode === 'wsl') {
            return { ok: false, backend: 'PCMClawUbuntu', memoryId: mem.id, error: String(err.message || err) };
          }
        }
      }

      // Fallback to Sierra Estates native OpenClaw task runner
      try {
        const { stdout, stderr } = await execFileAsync(
          process.platform === 'win32' ? 'npx.cmd' : 'npx',
          ['tsx', path.join(WORKSPACE_ROOT, 'scripts', 'openclaw-task-runner.ts'), task],
          { cwd: WORKSPACE_ROOT, timeout: 60000 },
        );
        return {
          ok: true,
          backend: 'sierra-openclaw-runner',
          pcManagerWslState: wsl.state,
          memoryId: mem.id,
          stdout: stdout.trim().slice(-4000),
          stderr: stderr.trim().slice(-1000),
        };
      } catch (err) {
        return {
          ok: false,
          backend: 'sierra-openclaw-runner',
          pcManagerWslState: wsl.state,
          memoryId: mem.id,
          error: String(err.message || err),
        };
      }
    }

    case 'openclaw_pc_sync': {
      const wsl = await checkWslPcManager();
      if (wsl.state !== 'Running') {
        return {
          ok: false,
          pcManagerWslState: wsl.state,
          message:
            'PCMClawUbuntu is currently Stopped (its VHDX is held by PC Manager / WSL2). Open Microsoft PC Manager -> OpenClaw once (or start PCMClawUbuntu), then re-run openclaw_pc_sync to mirror all 62 skills, SOUL.md, USER.md, and memory into ~/.openclaw inside WSL2.',
        };
      }
      try {
        const cmd = [
          'mkdir -p ~/.openclaw/skills ~/.openclaw/memory',
          'cp -rf /mnt/c/Users/Sierr/.openclaw/SOUL.md ~/.openclaw/',
          'cp -rf /mnt/c/Users/Sierr/.openclaw/USER.md ~/.openclaw/',
          'cp -rf /mnt/c/Users/Sierr/.openclaw/skills/* ~/.openclaw/skills/',
          'echo SYNC_COMPLETE',
        ].join(' && ');
        const { stdout } = await execFileAsync('wsl.exe', ['-d', 'PCMClawUbuntu', '--', 'bash', '-lc', cmd], {
          timeout: 30000,
        });
        return { ok: true, pcManagerWslState: wsl.state, output: stdout.trim() };
      } catch (err) {
        return { ok: false, error: String(err.message || err) };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const TOOLS = [
  {
    name: 'openclaw_status',
    description: 'Check OpenClaw hub, Microsoft PC Manager WSL2 (PCMClawUbuntu), local Sierra daemons, and 4-Engine wiring status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'openclaw_skills_catalog',
    description: 'List external and Sierra Estates skills installed in OpenClaw.',
    inputSchema: {
      type: 'object',
      properties: { filter: { type: 'string', description: 'Optional keyword filter' } },
    },
  },
  {
    name: 'openclaw_rag_query',
    description: 'Search Sierra Estates live RAG real-listings inventory with automatic owner-phone privacy protection.',
    inputSchema: {
      type: 'object',
      properties: {
        compound: { type: 'string' },
        mode: { type: 'string', description: 'Sale or Rent' },
        maxPrice: { type: 'number' },
        minArea: { type: 'number' },
        query: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'openclaw_memory_rw',
    description: 'Read or write shared episodic memory across OpenClaw and Sierra Obsidian/ECC memory.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['read', 'write'] },
        query: { type: 'string' },
        limit: { type: 'number' },
        kind: { type: 'string' },
        entity: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['action'],
    },
  },
  {
    name: 'openclaw_harness_eval',
    description: 'Evaluate a draft message or listing against Sierra Estates invariants (public group privacy lock, rent ceiling).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        price: { type: 'number' },
        mode: { type: 'string' },
        isPublicGroup: { type: 'boolean' },
      },
    },
  },
  {
    name: 'openclaw_delegate_task',
    description: 'Delegate an autonomous, human-proxy, WhatsApp, or Windows/PC Manager task to OpenClaw.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Clear task instruction for OpenClaw' },
        skill: { type: 'string', description: 'Optional target OpenClaw skill name' },
        mode: { type: 'string', enum: ['auto', 'wsl', 'sierra-runner'] },
      },
      required: ['task'],
    },
  },
  {
    name: 'openclaw_pc_sync',
    description: 'Sync SOUL.md, USER.md, and all OpenClaw skills from C:\\Users\\Sierr\\.openclaw into PCMClawUbuntu WSL2.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    return;
  }

  const { id, method, params } = req;
  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'sierra-openclaw-bridge', version: '3.0.0' },
        },
      });
    } else if (method === 'notifications/initialized') {
      // no response needed
    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    } else if (method === 'tools/call') {
      const output = await runTool(params?.name, params?.arguments || {});
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        },
      });
    } else if (id !== undefined) {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    if (id !== undefined) {
      send({ jsonrpc: '2.0', id, error: { code: -32000, message: String(err.message || err) } });
    }
  }
});
