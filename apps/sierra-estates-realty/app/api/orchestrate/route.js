import { NextResponse } from 'next/server';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { COLLECTIONS } from '@/lib/models/schema';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

/**
 * Trigger Sierra Estates Orchestration Pipeline
 * POST /api/orchestrate
 * Body: { docId: string, collection: keyof typeof COLLECTIONS }
 */
export async function POST(req) {
  try {
    const auth = await verifyRequest(req);
    if (!auth.authenticated) {
      return unauthorizedResponse('Unauthorized Intelligence Ingestion');
    }

    const { docId, collection } = await req.json();

    if (!docId || !collection) {
      return NextResponse.json({ error: 'Missing docId or collection' }, { status: 400 });
    }

    if (!Object.keys(COLLECTIONS).includes(collection)) {
      return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
    }

    // Run the pipeline asynchronously
    // In a production environment, this might be handled by a message queue
    OrchestratorService.runPipeline(docId, collection )
      .then(() => logger.info({ docId }, 'Pipeline execution finished'))
      .catch((err) => logger.error({ docId, error: err }, 'Pipeline execution failed'));

    return NextResponse.json({ 
      message: 'Orchestration pipeline triggered',
      docId,
      status: 'processing'
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
