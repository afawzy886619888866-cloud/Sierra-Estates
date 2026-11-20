'use strict';
/**
 * Shared Google Sheets & Environment Loader for Sierra Estates Workflows.
 * Supports both inline JSON credentials (GOOGLE_SERVICE_ACCOUNT_JSON, plain or base64)
 * for Docker / GitHub Actions and file-path credentials (GOOGLE_SERVICE_ACCOUNT_KEY).
 *
 * 2026-11 (perf): createSheetsClient/createCalendarClient are now backed by
 * lib/sheets-http.js (zero-dependency JWT + REST client) instead of the
 * ~45 MB `googleapis` package. The exported call shapes are unchanged, so
 * every consumer keeps working without edits.
 */
const fs = require('fs');
const path = require('path');
const { createSheets, createCalendar, SHEETS_SCOPE, CALENDAR_SCOPE } = require('./sheets-http');

function loadWorkflowEnv(workflowDir = path.resolve(__dirname, '..')) {
  const repoRoot = path.resolve(workflowDir, '..');
  // infra/.secrets.env is the MASTER secrets file (2026-11-01 hardening):
  // read FIRST so its values win over checked-in .env defaults. Optional.
  const secretsFile = path.join(repoRoot, 'infra', '.secrets.env');
  try {
    const dotenv = require('dotenv');
    for (const candidate of [
      secretsFile,
      path.join(workflowDir, '.env'),
      path.join(repoRoot, 'apps', 'sierra-estates-realty', '.env.local'),
      path.join(repoRoot, '.env.local'),
      path.join(repoRoot, '.env'),
    ]) {
      if (fs.existsSync(candidate)) {
        dotenv.config({ path: candidate, override: false, quiet: true });
      }
    }
  } catch (err) {
    // Fallback minimal parser if dotenv is unavailable
    for (const candidate of [
      secretsFile,
      path.join(workflowDir, '.env'),
      path.join(repoRoot, 'apps', 'sierra-estates-realty', '.env.local'),
      path.join(repoRoot, '.env.local'),
      path.join(repoRoot, '.env'),
    ]) {
      if (!fs.existsSync(candidate)) continue;
      const lines = fs.readFileSync(candidate, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m || process.env[m[1]]) continue;
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

function parseJsonOrBase64(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
  if (decoded.startsWith('{')) {
    return JSON.parse(decoded);
  }
  return null;
}

function resolveGoogleCredentials() {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (inlineJson.trim()) {
    try {
      const parsed = parseJsonOrBase64(inlineJson);
      if (parsed && parsed.client_email && parsed.private_key) return parsed;
    } catch (err) {
      console.error(`[google-sheets] Failed parsing GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}`);
    }
  }

  const keyVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
  if (keyVar.trim()) {
    if (keyVar.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(keyVar.trim());
        if (parsed && parsed.client_email && parsed.private_key) return parsed;
      } catch (err) {
        console.error(`[google-sheets] Inline GOOGLE_SERVICE_ACCOUNT_KEY parse failed: ${err.message}`);
      }
    } else if (fs.existsSync(keyVar)) {
      try {
        return JSON.parse(fs.readFileSync(keyVar, 'utf8'));
      } catch (err) {
        console.error(`[google-sheets] File GOOGLE_SERVICE_ACCOUNT_KEY read failed: ${err.message}`);
      }
    }
  }
  return null;
}

function resolveSpreadsheetId() {
  return (
    process.env.GOOGLE_SHEET_ID ||
    process.env.TELEGRAM_MASTER_SHEET_ID ||
    process.env.UNITS_SHEET_ID ||
    process.env.BROKER_INBOX_SHEET_ID ||
    ''
  ).trim();
}

function createSheetsClient(scopes = [SHEETS_SCOPE]) {
  const creds = resolveGoogleCredentials();
  if (!creds) return null;
  // Lightweight zero-dep client; the `scopes` argument is kept for API parity
  // (only the Sheets scope is used by every current caller).
  void scopes;
  return createSheets(creds);
}

/** Calendar v3 client over the same service-account credentials (zero-dep). */
function createCalendarClient() {
  const creds = resolveGoogleCredentials();
  if (!creds) return null;
  return createCalendar(creds);
}

module.exports = {
  loadWorkflowEnv,
  resolveGoogleCredentials,
  resolveSpreadsheetId,
  createSheetsClient,
  createCalendarClient,
};
