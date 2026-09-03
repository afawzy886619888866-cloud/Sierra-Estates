import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { getRecord, listRecords } from '@sierra-estates/db';
import { AUTOMATION_COLLECTIONS } from '@/lib/models/automation';
import { logger } from '@/lib/logger';

export async function GET(
  _req,
  { params }
) {
  const authResult = await verifyAdminRequest(_req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const limit = 50;

  try {
    // Verify rule exists
    const rule = await getRecord(AUTOMATION_COLLECTIONS.rules, id);

    if (!rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Fetch execution logs (sorted by most recent first)
    const executions = await listRecords(AUTOMATION_COLLECTIONS.executionLogs, {
      where: [{ column: 'ruleId', value: id }],
      orderBy: { column: 'startedAt', ascending: false },
      limit,
    });

    return NextResponse.json({
      success: true,
      executions,
      count: executions.length,
    });
  } catch (err) {
    logger.error('Error fetching execution logs:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch execution logs',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
