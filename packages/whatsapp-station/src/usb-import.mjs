/**
 * WhatsApp Station — USB Phone Import
 * ───────────────────────────────────
 * The owner's path: plug the mobile into the workstation with USB,
 * enable "File transfer / MTP", then either:
 *   • point the Station window / CLI at the phone's WhatsApp export
 *     folder, or
 *   • let --usb auto-discover mounted phone storage and harvest every
 *     WhatsApp chat export (.txt) it can find.
 *
 * Files parsed by the canonical engine's parseWhatsAppExport()
 * (same format WhatsApp "Export chat (.txt without media)" writes),
 * grouped by parseGroupedListings(), masked, deduped and staged into
 * public.listing_waiting_list exactly like a live gateway sweep.
 *
 * Exit: 0 ok · 2 nothing found / unconfigured · 1 error
 */
import fs from 'node:fs';
import path from 'node:path';
import { WhatsAppStationAgent } from './station-agent.mjs';
import { parseGroupedListings, parseWhatsAppExport } from '../../../workflows/21-usb-phone-harvester/parse-engine.mjs';
import { toWaitingRow } from './extraction-engine.mjs';

const CANDIDATE_MOUNTS = [
  '/media', '/run/user', '/mnt', '/media/z', '/Volumes',
];

/** Where phone storage usually shows up after USB file-transfer is enabled. */
export function suggestPhoneMounts() {
  const found = [];
  for (const root of CANDIDATE_MOUNTS) {
    try {
      if (!fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const p = path.join(root, entry.name);
        if (entry.isDirectory()) {
          // gvfs MTP mounts: mtp:host=... ; Windows-style mounts land in /mnt
          if (/mtp|phone|usb|gopro|gvfs|mass|sdcard/i.test(entry.name) || root === '/mnt') found.push(p);
          else {
            try {
              for (const sub of fs.readdirSync(p, { withFileTypes: true })) {
                if (/mtp|phone|usb|sdcard/i.test(sub.name)) found.push(path.join(p, sub.name));
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  return [...new Set(found)];
}

/** Recursively collect .txt chat exports under a folder (depth-capped). */
export function findChatExports(dir, depth = 0, out = []) {
  if (depth > 6 || out.length > 200) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findChatExports(p, depth + 1, out);
    else if (/\.txt$/i.test(e.name) && e.size < 20 * 1024 * 1024) out.push(p);
  }
  return out;
}

/**
 * Import every WhatsApp export under `dir` into the waiting list.
 * Reuses the agent's Supabase staging (same dedupe + RAG path).
 */
export async function runUsbImport(args = []) {
  const dirIdx = args.indexOf('--usb');
  const dir = args[dirIdx + 1] && !args[dirIdx + 1].startsWith('--') ? args[dirIdx + 1] : null;
  const mounts = dir ? [dir] : suggestPhoneMounts();
  const steps = [];

  if (!dir) {
    steps.push({ step: 'usb', status: 'hint', detail: `no --usb <dir> given — auto-discovered mounts: ${mounts.join(', ') || 'NONE (plug the phone in with File Transfer enabled)'}` });
  }

  const files = mounts.flatMap((m) => findChatExports(m));
  steps.push({ step: 'usb', status: files.length ? 'ok' : 'empty', detail: `${files.length} WhatsApp export .txt file(s) under: ${mounts.join(', ') || '(none)'}` });
  if (!files.length) return { success: false, exit: 2, steps, error: 'no WhatsApp exports found' };

  const agent = new WhatsAppStationAgent();
  const missing = agent.unconfigured;
  if (missing.length) return { success: false, exit: 2, steps, error: `unconfigured: ${missing.join(', ')}` };

  const rows = [];
  const seen = new Set();
  for (const file of files) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      const messages = parseWhatsAppExport(text);
      const groupName = path.basename(file, path.extname(file)); // "WhatsApp Chat with عقارات القاهرة الجديدة"
      const units = parseGroupedListings(messages, groupName);
      for (const u of units) {
        const row = toWaitingRow(u, { source: 'usb_import' });
        if (row && !seen.has(row.dedup_hash)) { seen.add(row.dedup_hash); rows.push(row); }
      }
      steps.push({ step: 'parse', status: 'ok', detail: `${path.basename(file)}: ${messages.length} messages → ${units.length} units` });
    } catch (err) {
      steps.push({ step: 'parse', status: 'error', detail: `${path.basename(file)}: ${err.message}` });
    }
  }

  const staged = await agent.stageRows(rows);
  steps.push(...agent.steps.filter((s) => s.step === 'staging' || s.step === 'rag' || s.step.startsWith('rag')));
  const report = { files: files.length, parsed: rows.length, staged: staged.upserted, errors: staged.errors, mounts };
  return { success: true, exit: 0, steps, data: report };
}
