/**
 * Workflow 06: Gateway Sentinel  (new 2026-10 · escalated 2026-10)
 * ───────────────────────────────────────────────────────────────
 * Health probe for the OpenWA WhatsApp gateway. Runs on a 5-minute cron
 * from the workflow runner and gives the admin Studio a live, honest
 * heartbeat instead of stale fictional telemetry.
 *
 * Checks:
 *   1. Gateway reachable (HTTP, 6 s timeout)
 *   2. Session status === 'ready' (engineLoaded, phone, pushName)
 *
 * ESCALATION (2026-10): when the gateway stays down for consecutive
 * probes (default 2 = ~10 minutes) the sentinel:
 *   - appends an alert line to .state/alerts.jsonl (always)
 *   - emails WF_ALERT_EMAIL_TO via SendGrid when SENDGRID_API_KEY is set
 *     (WhatsApp itself is DOWN in this scenario — out-of-band only)
 * and on recovery (healthy probe right after a degraded streak) it:
 *   - appends a recovery line to .state/alerts.jsonl
 *   - sends a short WhatsApp confirmation to WF_ALERT_TO (falls back to
 *     the gateway's own number = "message yourself") — this one CAN use
 *     WhatsApp because the gateway is back.
 *
 * Exit: 0 ready · 1 degraded · 2 unconfigured
 */
const fs = require('fs');
const path = require('path');
const { GatewayClient, normalizeChatId } = require('../lib/gateway-client');

const STATE_FILE = path.join(__dirname, '..', '.state', 'gateway-health.json');
const SENTINEL_STATE = path.join(__dirname, '..', '.state', 'sentinel-state.json');
const ALERTS_FILE = path.join(__dirname, '..', '.state', 'alerts.jsonl');

const FAIL_THRESHOLD = parseInt(process.env.WF_ALERT_FAIL_THRESHOLD || '2', 10);

function readState() {
  try { return JSON.parse(fs.readFileSync(SENTINEL_STATE, 'utf8')); } catch (_) { return { fails: 0, alerted: false }; }
}
function writeState(st) {
  try {
    fs.mkdirSync(path.dirname(SENTINEL_STATE), { recursive: true });
    const tmp = `${SENTINEL_STATE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(st, null, 1));
    fs.renameSync(tmp, SENTINEL_STATE);
  } catch (_) { /* best effort */ }
}
function appendAlert(entry) {
  try {
    fs.mkdirSync(path.dirname(ALERTS_FILE), { recursive: true });
    fs.appendFileSync(ALERTS_FILE, `${JSON.stringify(entry)}\n`);
  } catch (_) { /* best effort */ }
}

async function emailAlert(subject, text) {
  const key = process.env.SENDGRID_API_KEY || '';
  const to = process.env.WF_ALERT_EMAIL_TO || '';
  if (!key || !to) return false;
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(key);
    await sgMail.send({ to, from: process.env.SENDGRID_FROM_EMAIL || 'noreply@sierra-estates.com', subject, text });
    return true;
  } catch (err) {
    console.error(`sentinel: alert email failed: ${err.message}`);
    return false;
  }
}

async function whatsappRecovery(text) {
  try {
    const gw = new GatewayClient();
    const st = await gw.status();
    const target = process.env.WF_ALERT_TO || (st.phone ? `20${String(st.phone).replace(/\D/g, '').replace(/^20/, '')}` : '');
    if (!target) return false;
    await gw.sendText(target, text, { retries: 1 });
    return true;
  } catch (err) {
    console.error(`sentinel: recovery WhatsApp failed: ${err.message}`);
    return false;
  }
}

async function main() {
  const gw = new GatewayClient();
  let health;
  try {
    const st = await gw.status();
    health = { at: new Date().toISOString(), ...st };
  } catch (err) {
    health = { at: new Date().toISOString(), reachable: false, error: err.message };
  }

  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    const tmp = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(health, null, 1));
    fs.renameSync(tmp, STATE_FILE);
  } catch (err) {
    console.error(`state write failed: ${err.message}`);
  }

  const healthy = Boolean(health.reachable) && health.status === 'ready';
  const st = readState();

  if (!healthy) {
    st.fails = (st.fails || 0) + 1;
    st.lastFailAt = health.at;
    if (st.fails >= FAIL_THRESHOLD && !st.alerted) {
      const line = `Gateway UNREACHABLE/degraded for ${st.fails} consecutive probes (${st.fails * 5} min) — status=${health.status || 'unknown'} error=${health.error || 'n/a'}`;
      appendAlert({ at: health.at, kind: 'alert', fails: st.fails, detail: line });
      const emailed = await emailAlert('Sierra Estates — WhatsApp gateway DOWN', line);
      st.alerted = true;
      console.error(`sentinel: ESCALATION fired (email=${emailed ? 'sent' : 'skipped'}) — ${line}`);
    }
    writeState(st);
  } else {
    if (st.alerted || (st.fails || 0) > 0) {
      appendAlert({ at: health.at, kind: 'recovery', afterFails: st.fails });
      const sent = await whatsappRecovery(
        '✅ Sierra Estates — بوابة الواتساب عادت للعمل.\n' +
        `الحالة: ready · الهاتف: ${health.phone || '?'} · الوقت: ${new Date().toISOString()}`
      );
      console.log(`sentinel: RECOVERY after ${st.fails} failed probes (WhatsApp=${sent ? 'sent' : 'skipped'})`);
    }
    st.fails = 0;
    st.alerted = false;
    st.lastOkAt = health.at;
    writeState(st);
  }

  console.log(`SUMMARY ${JSON.stringify({ ...health, fails: st.fails || 0 })}`);

  if (!healthy) {
    console.error('sentinel: gateway UNREACHABLE or degraded');
    process.exit(1);
  }
  console.log('sentinel: gateway healthy, session ready');
  process.exit(0);
}

main().catch((err) => {
  console.error(`sentinel FAILED: ${err.message}`);
  process.exit(1);
});
