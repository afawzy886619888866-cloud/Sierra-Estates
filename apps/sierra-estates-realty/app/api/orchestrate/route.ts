import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorService } from '@/lib/services/orchestrator';
import { COLLECTIONS } from '@/lib/models/schema';

/**
 * Trigger Sierra Estates Orchestration Pipeline
 * POST /api/orchestrate
 * Body: { docId: string, collection: keyof typeof COLLECTIONS }
 */
export async function POST(req: NextRequest) {
  try {
    const secretKey = req.headers.get('X-SBR-SECRET-KEY');
    if (secretKey !== process.env.SBR_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized Intelligence Ingestion' }, { status: 401 });
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
    OrchestratorService.runPipeline(docId, collection as keyof typeof COLLECTIONS)
      .then(() => console.log('Pipeline execution finished', { docId }))
      .catch((err) => console.error('Pipeline execution failed', { docId, error: err }));

    return NextResponse.json({ 
      message: 'Orchestration pipeline triggered',
      docId,
      status: 'processing'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
