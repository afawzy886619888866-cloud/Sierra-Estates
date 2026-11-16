'use strict';
/**
 * state.js — local run-state persistence for the workflow runner.
 * One JSON file per workflow slug under /opt/se/workflows/.state/.
 * Keeps a rolling history (last 20 runs) used for success_rate + log tails.
 * Windows-hardened: resilient atomic replace with copy+unlink fallback
 * to prevent EPERM/EBUSY file locking deadlocks when migrating off Linux EC2.
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

/**
 * Windows-safe file writer:
 * Replaces target file with tmp, falling back to copy+unlink or direct write
 * if Windows file locking (EPERM / EBUSY / EACCES) triggers on renameSync.
 */
function safeWriteFileSync(filePath, data) {
  ensureDir();
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tmp, data, 'utf8');
    try {
      fs.renameSync(tmp, filePath);
    } catch (renameErr) {
      if (process.platform === 'win32' || renameErr.code === 'EPERM' || renameErr.code === 'EBUSY' || renameErr.code === 'EACCES') {
        try {
          fs.copyFileSync(tmp, filePath);
          fs.unlinkSync(tmp);
        } catch (_) {
          fs.writeFileSync(filePath, data, 'utf8');
          try { fs.unlinkSync(tmp); } catch (_) {}
        }
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    try {
      fs.writeFileSync(filePath, data, 'utf8');
    } catch (_) {}
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
  safeWriteFileSync(fileFor(slug), JSON.stringify(st, null, 1));
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

module.exports = { load, save, all, tail, STATE_DIR, safeWriteFileSync };
