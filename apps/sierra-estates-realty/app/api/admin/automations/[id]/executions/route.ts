import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { AUTOMATION_COLLECTIONS } from '@/lib/models/automation';
import { logger } from '@/lib/logger';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminRequest(_req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const limit = 50;

  try {
    // Verify rule exists
    const ruleDoc = await adminDb
      .collection(AUTOMATION_COLLECTIONS.rules)
      .doc(id)
      .get();

    if (!ruleDoc.exists) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Fetch execution logs (sorted by most recent first)
    const snap = await adminDb
      .collection(AUTOMATION_COLLECTIONS.executionLogs)
      .where('ruleId', '==', id)
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    const executions = snap.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
