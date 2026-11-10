import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { OwnerOutreachService, generateOwnerOutreachMessage } from '@/lib/services/OwnerOutreachService';
import { verifyRequest, verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

async function checkAuth(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (auth.authenticated && auth.method === 'secret-key') {
    return null; // internal secret key authorized
  }
  const adminAuth = await verifyAdminRequest(req);
  if (adminAuth.authenticated) {
    return null; // admin authorized
  }
  return unauthorizedResponse();
}

function getWorkflowsStateDir() {
  const direct = path.resolve(process.cwd(), 'workflows/.state');
  if (fs.existsSync(direct)) return direct;
  const monorepoRoot = path.resolve(process.cwd(), '../../workflows/.state');
  if (fs.existsSync(monorepoRoot)) return monorepoRoot;
  return direct;
}

async function triggerRunnerWorkflow(slug: string) {
  const runnerUrl = process.env.WORKFLOW_OPS_URL || 'http://127.0.0.1:2786';
  const apiKey = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${runnerUrl}/api/workflows/${encodeURIComponent(slug)}/run`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(6000),
  });
  return res.json().catch(() => ({ ok: res.ok }));
}

export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  const action = req.nextUrl.searchParams.get('action') || req.nextUrl.searchParams.get('view');

  if (action === 'two-hour-report' || action === 'radar') {
    try {
      const stateDir = getWorkflowsStateDir();
      const reportFile = path.join(stateDir, 'two-hour-outreach-report.json');
      const configFile = path.join(stateDir, 'owner-outreach-config.json');

      let report: any = null;
      if (fs.existsSync(reportFile)) {
        try {
          report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        } catch (_) {}
      }

      const ledgerFile = path.join(stateDir, 'owner-outreach-ledger.jsonl');
      if (fs.existsSync(ledgerFile)) {
        try {
          const lines = fs.readFileSync(ledgerFile, 'utf8').trim().split('\n').filter(Boolean);
          const recent = lines.slice(-10).reverse().map((l) => JSON.parse(l));
          if (!report) report = {};
          report.recent_sent = recent;
        } catch (_) {}
      }

      let config = { continuous: true, cooldownSec: 90, dailyCap: 150, activeHours: [9, 22] };
      if (fs.existsSync(configFile)) {
        try {
          config = { ...config, ...JSON.parse(fs.readFileSync(configFile, 'utf8')) };
        } catch (_) {}
      }

      // Remote runner fallback/sync (essential when Admin OS runs on Vercel while runner is detached on PC/EC2)
      if (!report) {
        try {
          const runnerUrl = (process.env.WORKFLOW_OPS_URL || 'http://127.0.0.1:2786').replace(/\/+$/, '');
          const apiKey = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
          const headers: Record<string, string> = {};
          if (apiKey) headers['X-API-Key'] = apiKey;
          const r = await fetch(`${runnerUrl}/api/outreach/radar`, { headers, signal: AbortSignal.timeout(4000) });
          if (r.ok) {
            const j = await r.json().catch(() => null);
            if (j?.report) report = j.report;
            if (j?.config) config = { ...config, ...j.config };
          }
        } catch (_) {}
      }

      return NextResponse.json({
        success: true,
        report,
        config,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error('[api/admin/whatsapp/owner-outreach] Radar report read failed:', err);
      return NextResponse.json({ error: err.message || 'Failed reading radar report' }, { status: 500 });
    }
  }

  if (action === 'report' || action === 'daily-report') {
    try {
      const report = await OwnerOutreachService.getDailyReport(req.nextUrl.searchParams.get('date') || undefined);
      return NextResponse.json({
        success: true,
        report,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error('[api/admin/whatsapp/owner-outreach] Daily report failed:', err);
      return NextResponse.json({ error: err.message || 'Failed generating daily report' }, { status: 500 });
    }
  }

  try {
    const status = await OwnerOutreachService.getStatus();
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('[api/admin/whatsapp/owner-outreach] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Failed retrieving status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'enqueue';

    if (action === 'trigger-batch') {
      const runRes = await triggerRunnerWorkflow('owner-outreach');
      return NextResponse.json({
        success: true,
        action: 'trigger-batch',
        result: runRes,
        message: 'Owner outreach batch successfully triggered on workflow runner.',
      });
    }

    if (action === 'trigger-two-hour-digest') {
      const runRes = await triggerRunnerWorkflow('outreach-2h-digest');
      return NextResponse.json({
        success: true,
        action: 'trigger-two-hour-digest',
        result: runRes,
        message: '2-hour executive digest successfully dispatched to admin WhatsApp.',
      });
    }

    if (action === 'toggle-continuous') {
      const stateDir = getWorkflowsStateDir();
      const configFile = path.join(stateDir, 'owner-outreach-config.json');
      let config = { continuous: true, cooldownSec: 90, dailyCap: 150, activeHours: [9, 22] };
      if (fs.existsSync(configFile)) {
        try {
          config = { ...config, ...JSON.parse(fs.readFileSync(configFile, 'utf8')) };
        } catch (_) {}
      }
      config.continuous = Boolean(body.continuous !== undefined ? body.continuous : !config.continuous);
      if (Number.isFinite(body.cooldownSec)) config.cooldownSec = Number(body.cooldownSec);
      if (Number.isFinite(body.dailyCap)) config.dailyCap = Number(body.dailyCap);

      try {
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
      } catch (_) {}

      try {
        const runnerUrl = (process.env.WORKFLOW_OPS_URL || 'http://127.0.0.1:2786').replace(/\/+$/, '');
        const apiKey = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        await fetch(`${runnerUrl}/api/outreach/config`, {
          method: 'POST',
          headers,
          body: JSON.stringify(config),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      } catch (_) {}

      return NextResponse.json({
        success: true,
        action: 'toggle-continuous',
        config,
        message: `Continuous outreach mode is now ${config.continuous ? 'ENABLED (نشط تلقائياً)' : 'PAUSED (متوقف مؤقتاً)'}.`,
      });
    }

    if (action === 'preview') {
      const inventory = await OwnerOutreachService.loadEligibleInventory();
      const previewCount = Math.min(Number(body.limit) || 5, 20);
      const preview = inventory.slice(0, previewCount).map((item) => ({
        ...item,
        generatedMessage: generateOwnerOutreachMessage(item),
      }));

      return NextResponse.json({
        success: true,
        action: 'preview',
        totalEligible: inventory.length,
        preview,
      });
    }

    if (action === 'enqueue') {
      const batchSize = Number(body.batchSize) || 40;
      const targetHourOffset = Number(body.targetHourOffset) || 0;

      const result = await OwnerOutreachService.enqueueBatch({ batchSize, targetHourOffset });

      return NextResponse.json({
        success: true,
        action: 'enqueue',
        batchSize,
        result,
        message: `Successfully enqueued ${result.enqueuedCount} owners for WhatsApp outreach.`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    logger.error('[api/admin/whatsapp/owner-outreach] POST failed:', err);
    return NextResponse.json({ error: err.message || 'Outreach operation failed' }, { status: 500 });
  }
}
