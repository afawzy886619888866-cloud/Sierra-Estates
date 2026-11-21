#!/usr/bin/env node
/**
 * WhatsApp Station — CLI entry (portable skill)
 * ─────────────────────────────────────────────
 *   node src/index.mjs                live gateway sweep → waiting list
 *   node src/index.mjs --usb <dir>    USB phone chat-export import
 *   node src/index.mjs --similar "شقة ميفيدا 150م"   RAG search demo
 *   node src/index.mjs --health       gateway + supabase + rag status
 */
import { runStationCli } from './station-agent.mjs';

const args = process.argv.slice(2);

if (args.includes('--health')) {
  const { WhatsAppStationAgent } = await import('./station-agent.mjs');
  const agent = new WhatsAppStationAgent();
  const health = await agent.health();
  const { isRagConfigured } = await import('./rag.mjs');
  console.log(JSON.stringify({
    gateway: health,
    supabase: agent.unconfigured.length === 0 ? 'configured' : `missing: ${agent.unconfigured.join(', ')}`,
    rag: isRagConfigured() ? 'configured (gemini-embedding-001 · 768d)' : 'GEMINI_API_KEY missing — staging works, vectors skipped',
  }, null, 2));
  process.exit(0);
}

if (args.includes('--similar')) {
  const { embedQuery768Rest, retrieveSimilar } = await import('./rag.mjs');
  const q = args[args.indexOf('--similar') + 1] || '';
  const url = `${(process.env.SUPABASE_URL || '').replace(/\/+$/, '')}/rest/v1/listing_waiting_list?select=id,code,group_name,raw_message,extracted,status&status=eq.PENDING&limit=200`;
  const res = await fetch(url, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` } });
  const rows = res.ok ? await res.json() : [];
  const vec = await embedQuery768Rest(q);
  const hits = retrieveSimilar(vec, rows, { k: 5 });
  console.log(JSON.stringify(hits.map((h) => ({ code: h.row.code, similarity: Number(h.similarity.toFixed(3)), group: h.row.group_name, extract: h.row.extracted })), null, 2));
  process.exit(0);
}

const result = await runStationCli(args);
process.exit(result.exit ?? 1);
