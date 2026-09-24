import { NextRequest, NextResponse } from 'next/server';
import { runOpenClawDailyScan } from '../../../../../../scripts/openclaw-daily-scanner';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min timeout

const REPORT_PATH = path.resolve(
  process.cwd(),
  '..',
  '..',
  'packages',
  'whatsapp-shared',
  'daily_scan_report.json'
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetGroup = body.targetGroup || 'Owners August 2026';

    const summary = await runOpenClawDailyScan(targetGroup);

    return NextResponse.json({
      success: true,
      message: `OpenClaw successfully completed daily scan for ${targetGroup}`,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Error executing OpenClaw daily scan',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  let lastReport = null;
  if (fs.existsSync(REPORT_PATH)) {
    try {
      lastReport = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
    } catch {}
  }

  const extractedPath = path.resolve(
    process.cwd(),
    '..',
    '..',
    'packages',
    'whatsapp-shared',
    'inventory_extracted_units.json'
  );
  let totalExtractedUnits = 0;
  let directOwnersCount = 0;

  if (fs.existsSync(extractedPath)) {
    try {
      const units = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
      totalExtractedUnits = units.length;
      directOwnersCount = units.filter(
        (u: any) => u.sourceType === 'owner' || u.isOwner
      ).length;
    } catch {}
  }

  const outreachPath = path.resolve(
    process.cwd(),
    '..',
    '..',
    'packages',
    'whatsapp-shared',
    'pending_owner_outreach.json'
  );
  let pendingOutreachCount = 0;
  if (fs.existsSync(outreachPath)) {
    try {
      const tasks = JSON.parse(fs.readFileSync(outreachPath, 'utf-8'));
      pendingOutreachCount = tasks.length;
    } catch {}
  }

  return NextResponse.json({
    status: 'online',
    agent: 'openclaw',
    monitoredGroup: 'Owners August 2026',
    groupId: '120363044918239011@g.us',
    totalExtractedUnits,
    directOwnersCount,
    pendingOutreachCount,
    lastReport,
  });
}
