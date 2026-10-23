'use strict';
/**
 * state.js — local run-state persistence for the workflow runner.
 * One JSON file per workflow slug under /opt/se/workflows/.state/.
 * Keeps a rolling history (last 20 runs) used for success_rate + log tails.
 */
const fs = require('fs');
const path = require('path');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');

function ensureDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function fileFor(slug) {
  return path.join(STATE_DIR, `${slug}.json`);
}

function load(slug) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(slug), 'utf8'));
  } catch (_) {
    return { slug, lastRun: null, lastDurationMs: null, lastExit: null, lastSummary: '', history: [] };
  }
}

function save(slug, patch, historyEntry = null) {
  ensureDir();
  const st = Object.assign(load(slug), patch, { slug });
  if (historyEntry) {
    st.history = [historyEntry, ...(st.history || [])].slice(0, 20);
    const counted = st.history.filter((h) => h.exit !== 'unconfigured');
    const okCount = counted.filter((h) => h.exit === 'ok').length;
    st.successRate = counted.length ? Math.round((okCount / counted.length) * 1000) / 10 : null;
  }
  const tmp = `${fileFor(slug)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(st, null, 1));
  fs.renameSync(tmp, fileFor(slug));
  return st;
}

function all() {
  ensureDir();
  return fs.readdirSync(STATE_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.tmp'))
    .map((f) => {
      try { return JSON.parse(fs.readFileSync(path.join(STATE_DIR, f), 'utf8')); } catch (_) { return null; }
    })
    .filter(Boolean);
}

function tail(slug, n = 10) {
  const st = load(slug);
  return (st.history || []).slice(0, n);
}

module.exports = { load, save, all, tail, STATE_DIR };
