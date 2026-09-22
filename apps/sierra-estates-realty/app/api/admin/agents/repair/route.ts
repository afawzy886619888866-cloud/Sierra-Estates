import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { autoRepairAllAgents, repairSingleAgent } from '@/lib/services/agent-repair';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const agentId = body.agentId;

    if (agentId && agentId !== 'all') {
      const result = await repairSingleAgent(agentId);
      return NextResponse.json({
        success: true,
        type: 'single',
        agent: result,
        message: result.message,
      });
    }

    const report = await autoRepairAllAgents();
    return NextResponse.json({
      success: true,
      type: 'fleet',
      report,
      message: report.summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Agent repair procedure encountered an error.',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await autoRepairAllAgents();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
