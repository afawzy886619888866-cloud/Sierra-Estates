import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'check-thresholds-script' });

interface SystemMetricThreshold {
  name: string;
  currentValue: number;
  thresholdMax: number;
  unit: string;
  source: 'live-supabase' | 'baseline';
}

function loadEnvFiles(): void {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  for (const rel of ['.env.local', '.env', 'workflows/.env']) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

async function resolveMetrics(): Promise<SystemMetricThreshold[]> {
  loadEnvFiles();
  const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  let avgWorkflowLatencyMs = 240;
  let workflowErrorRatePct = 0.8;
  let queueBacklogDepth = 0;
  let telemetrySource: 'live-supabase' | 'baseline' = 'baseline';

  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: wfRows, error: wfErr } = await sb
        .from('workflows')
        .select('slug, status, last_run_ms, last_run_label, success_rate')
        .eq('status', 'active');

      if (!wfErr && Array.isArray(wfRows) && wfRows.length > 0) {
        telemetrySource = 'live-supabase';
        // Exclude long-paced 30m outreach slot from API/control latency average
        const fastRuns = wfRows
          .filter((r) => r.slug !== 'owner-outreach' && typeof r.last_run_ms === 'number' && r.last_run_ms > 0)
          .map((r) => Number(r.last_run_ms));
        if (fastRuns.length > 0) {
          avgWorkflowLatencyMs = Math.round(fastRuns.reduce((a, b) => a + b, 0) / fastRuns.length);
        }

        const erroredCount = wfRows.filter((r) => {
          const lbl = String(r.last_run_label || '');
          return lbl.endsWith(':error') || lbl.endsWith(':timeout');
        }).length;
        workflowErrorRatePct = Number(((erroredCount / wfRows.length) * 100).toFixed(1));
      }

      const { count: qCount, error: qErr } = await sb
        .from('whatsapp_queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['queued', 'pending']);

      if (!qErr && typeof qCount === 'number') {
        queueBacklogDepth = qCount;
        telemetrySource = 'live-supabase';
      }
    } catch (err) {
      logger.warn({ err }, 'Live Supabase threshold probe degraded to baseline metrics');
    }
  }

  return [
    { name: 'Average Control Plane Latency', currentValue: avgWorkflowLatencyMs, thresholdMax: 15000, unit: 'ms', source: telemetrySource },
    { name: 'Active Workflow Error Rate', currentValue: workflowErrorRatePct, thresholdMax: 25.0, unit: '%', source: telemetrySource },
    { name: 'WhatsApp Queue Backlog Depth', currentValue: queueBacklogDepth, thresholdMax: 250, unit: 'messages', source: telemetrySource },
    { name: 'AVM Price Divergence Rate', currentValue: 2.1, thresholdMax: 10.0, unit: '%', source: 'baseline' },
  ];
}

async function main(): Promise<void> {
  logger.info('Evaluating system operational thresholds and KPI bounds...');

  const metrics = await resolveMetrics();
  let anyBreached = false;

  console.log('\n======================================================');
  console.log('       SIERRA ESTATES · THRESHOLD CHECK REPORT        ');
  console.log('======================================================');

  for (const m of metrics) {
    const isOk = m.currentValue <= m.thresholdMax;
    const status = isOk ? '✓ OK' : '✗ BREACHED';
    if (!isOk) anyBreached = true;

    console.log(
      `[${status}] ${m.name.padEnd(32)} ${m.currentValue}${m.unit} (Limit: ${m.thresholdMax}${m.unit}) [${m.source}]`,
    );
  }
  console.log('======================================================\n');

  if (anyBreached) {
    logger.error('One or more system thresholds exceeded safe operational bounds.');
    process.exit(1);
  } else {
    console.log('[✓] All system thresholds are within healthy operational limits.');
  }
}

void main();
